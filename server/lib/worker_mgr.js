var cluster = require('cluster');
var constants = require('./constants')
var util = require('util');
var path = require('path');

var Message = require('./message');
var EventEmitter = require('events').EventEmitter;

var Worker = function (version, wid, callback) {
    this.status = 'init';
    this.wid = wid;
    this.version = version;
    this.initCb = callback;
    this.seq = 0;
    this.lastack = 0;
};

Worker.prototype.inited = function () {
    this.status = 'inited';
    if (this.initCb) {
        this.initCb.call(null);
        this.initCb = null;
    }
};

Worker.prototype.onStarted = function () {
    this.status = 'running';
};

Worker.prototype.incSeq = function () {
    this.seq++;
};

Worker.prototype.isOffline = function () {
    return !(this.seq - this.lastack <= 4);
};

Worker.prototype.closed = function () {
    this.status = 'closed';
};

Worker.prototype.onHeartBeat = function (rsp) {
    this.lastack = rsp.seq;
};

var WorkerMgr = function (logger, options) {
    this.status = 'done';
    EventEmitter.call(this);
};
util.inherits(WorkerMgr, EventEmitter);


WorkerMgr.prototype.init = function (logger, pluginInfos, workerCfg, callback) {
    this._logger = logger;
    this.cmds = {};
    this.ver = 0;
    this.worker = null;
    this.num = 0;
    process.env['CHAMELEON_WORKDIR'] = constants.baseDir;
    if (workerCfg.env) {
        for (var i in workerCfg.env) {
            process.env[i] = workerCfg.env[i].replace(/\$CHAMELEON_WORKDIR/g, constants.baseDir);
        }
    }
    cluster.setupMaster({
        exec: __dirname + '/worker.js',
        args: [path.resolve(constants.baseDir, workerCfg.script), constants.baseDir].concat(workerCfg.args)
    });
    this.status = 'init';
    this.pluginInfos = pluginInfos;
    this._startWorker(callback);
};

WorkerMgr.prototype.request = function (msgid, body, callback) {
    if (this.status === 'running') {
        this._doRequest(this.worker.wid, msgid, body, callback);
    } else {
        setImmediate(callback, new Error('not in running state'));
    }
};

WorkerMgr.prototype.restartWorker = function (callback) {
    if (this.status !== 'running') {
        setImmediate(callback, new Error("Not in running state"));
        return;
    }
    var self = this;
    self.ver += 1;
    self.status = 'restarting';
    var workerToClose = this.worker;
    this.worker = null;
    this._startWorker(function (err) {
        if (err) {
            callback(new Error("Fail to create new server: " + err.message));
            this.worker = workerToClose;
            this.status = 'running';
            self.ver -= 1;
            return;
        }
        self._doClose(workerToClose.wid, function () {
            self.status = 'running';
            callback();
        });
    });
};

WorkerMgr.prototype.close = function (callback) {
    if (this.status !== 'running') {
        setImmediate(callback, new Error('not in running state'));
        return;
    }
    this.status = 'closing';
    var self = this;
    this._doClose(this.worker.wid, function (err) {
        if (err) {
            return callback(err);
        }
        self.status = 'closed';
        callback();
    });
};

WorkerMgr.prototype._doClose = function (wid, callback) {
    this._doRequest(wid, '__close', null, function (err) {
        if (err) {
            cluster.workers[wid].kill('SIGKILL');
        }
        callback();
    });
};

WorkerMgr.prototype._startWorker = function (callback) {
    var self = this;
    this._forkChild(function () {
        self._doRequest(self.worker.wid, '__start', self.pluginInfos, callback);
    });
};

WorkerMgr.prototype._startHeartBeat = function () {
    if (this.worker.isOffline()) {
        this._logger.error('worker seems blocked, force restart');
        this._forceRestartWorker();
        return;
    }
    var self = this;
    self.worker.incSeq();
    self.request('__hb', {seq: this.worker.seq, ver: this.worker.version}, function (err, rsp) {
        if (err) {
            self._logger.error({err: err}, 'Fail on request heart beat');
            return;
        }
        if (self.worker.version === rsp.ver) {
            self._logger.info('on heart beat ' + rsp.seq);
            self.worker.onHeartBeat(rsp);
        }
    });
    setTimeout(function () {
        self._startHeartBeat();
    }, 10000)
};

WorkerMgr.prototype._forceRestartWorker = function () {
    this.status = 'restarting';
    var workerToClose = this.worker;
    this.worker = null;
    var self = this;
    self.emit('force-restart');
    cluster.workers[workerToClose.wid].kill('SIGKILL');
    this._startWorker(function (err) {
        if (err) {
            self.logger.error({err: err}, 'Fail to start worker');
            self.emit('fatal-fail', err);
        }
    });
};

WorkerMgr.prototype._onWorkerExit = function (worker, code, signal) {
    this._logger.info({wid: worker.id, code: code, signal: signal}, 'worker finished');
    if (worker.id !== this.worker.wid) {
        return;
    }
    var self = this;
    self.status = 'restarting';
    self.worker = null;
    // unknown restart
    this._startWorker(function (err) {
        if (err) {
            self.emit('fatal-fail', err);
        }
    });
    self.emit('restart');
};

WorkerMgr.prototype._forkChild = function (callback) {
    var self = this;
    var newEnv = process.env;
    var w = cluster.fork(newEnv);
    var wid = w.id;
    this.worker = new Worker(self.ver, wid, callback);
    w.on('message', function (msg) {
        self._onMessage(wid, msg);
    });
    w.on('online', function () {
        self.worker.inited();
    });
    this.num++;
};

WorkerMgr.prototype._onMessage = function (wid, msg) {
    var worker = cluster.workers[wid];
    if (!worker) {
        this._logger.info({msg: msg.header}, "Fail to create inst");
        return;
    }
    switch (msg.header._id) {
        case '__closed':
            worker.closed();
            break;
        default:
            this._onReply(msg);
    }
};

WorkerMgr.prototype._onReply = function (msg) {
    if (!msg.header.rsp) {
        this.logger.error({msg: msg}, "no reply message");
        return;
    }
    var seq = msg.seq;
    var obj = this.cmds[seq];
    if (!obj) {
        this.logger.error({msg: msg}, "no cmd found");
        return;
    }
    if (msg.err) {
        obj.callback.call(null, msg.err);
    } else {
        obj.callback.call(null, null, msg.body);
        if (msg.header._id === '__start') {
            this.worker.onStarted();
            this.status = 'running';
            this._startHeartBeat();
        }
    }
    clearTimeout(obj.timeout);
};

WorkerMgr.prototype._doRequest = function (wid, msgid, body, callback) {
    var msg = new Message(msgid, body);
    var worker = cluster.workers[wid];
    if (worker != null) {
        worker.send(msg);
    } else {
        throw new Error('worker is null');
    }
    var seq = msg.seq;
    this.cmds[seq] = {
        seq: seq,
        timeout: setTimeout(function () {
            callback(new Error("timeout"));
        }, 10000),
        callback: callback
    };
};

var workermgr = new WorkerMgr();

cluster.on('exit', function (worker, code, signal) {
    workermgr._onWorkerExit(worker, code, signal);
});

module.exports = workermgr;

