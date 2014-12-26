var cluster = require('cluster');
var path = require('path');
var util = require('util');
var StubBase = require('./cluster_helper').StubBase;

function ClientStub (master, workerid, logger) {
    this.activeWorker = workerid;
    // 0 -- init
    // 1 -- started
    // -1 -- dead
    this.status = 0;
    this.master = master;
    StubBase.call(this, logger);
}

util.inherits(ClientStub, StubBase);

ClientStub.prototype.__send = function (r) {
    this.master.send(this.activeWorker, r);
}

ClientStub.prototype.__onStart = function (rsp) {
    this.status = 1;
    this.emit('__started', rsp);
};

ClientStub.prototype.__onClose = function () {
    this.status = -1;
};

var Master = function () {
    cluster.setupMaster({
        exec: path.join(__dirname, 'worker.js')
    });
    this.workers = {};
};

Master.prototype.restartWorker = function (name, p, arg, logger) {
    var self = this;
    var stub = this.workers[name];
    if (!worker) {
        return null;
    }
}

Master.prototype.startWorker = function (name, p, arg, logger) {
    var self = this;
    var worker = cluster.fork();
    var stub = new ClientStub(self, worker.id, logger);
    worker.on('online', function () {
        console.log('online')
        worker.send({
            header: {
                msg: '__start'
            },
            p: p,
            arg: arg
        });
    });
    worker.on('message', function (msg) {
        switch (msg.header.msg) {
            case '__start':
                stub.__onStart(msg.body);
                self.workers[name] = stub;
                break;
            default:
                stub.__onMsg(msg);
        }
    });
    return stub;
};

Master.prototype._startWorker = function (name, p, arg, logger, stub) {
    var self = this;
    var worker = cluster.fork();
    if (!stub) {
        stub = new ClientStub(self, worker.id, logger);
    }
    worker.on('online', function () {
        console.log('online')
        worker.send({
            header: {
                msg: '__start'
            },
            p: p,
            arg: arg
        });
    });
    worker.on('message', function (msg) {
        switch (msg.header.msg) {
            case '__start':
                stub.__onStart(msg.body);
                self.workers[name] = stub;
                break;
            case '__onStop':
                stub.__onStop(worker.id);
                if (stub.isDone()) {
                    self._removeWorker(stub);
                    this.workers
                }
            default:
                stub.__onMsg(msg);
        }
    });
    return stub;
};

Master.prototype._removeWorker = function (stub) {
    for (var i in this.workers) {
        if (this.workers[i] == stub) {
            delete this.workers[i];
            break;
        }
    }
}

var master = new Master();

module.exports.startWorker = function(name, p, arg, logger) {
    return master.startWorker(name, p, arg, logger);
};



