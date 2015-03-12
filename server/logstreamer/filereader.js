var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var utils = require('util');
var assert = require('assert');

var MAX_READ_BYTES = 10240;
var MAX_PENDING_TASK = 1000;

function TaskPool (maxItemNum) {
    this.pendings = new Array(maxItemNum + 1);
    this.headIdx = 0;
    this.endIdx = 1;
    var self = this;
    Object.defineProperty(this, 'isFull', {
        get: function () {
            return self.headIdx === self.endIdx;
        }
    })
}

TaskPool.prototype.append = function (task) {
    if (this.isFull) {
        throw new Error('Task Pool is full');
    }
    var idx = this.endIdx;
    this.endIdx++;
    if (this.endIdx === this.pendings.length) {
        this.endIdx = 0;
    }
    this.pendings[idx] = task;
    return idx;
};

TaskPool.prototype.getTask = function (idx) {
    assert.ok((this.headIdx === this.endIdx) || (this.headIdx < this.endIdx) && (idx < this.endIdx) ||
        (this.headIdx > this.endIdx) && ((idx < this.headIdx && idx < this.endIdx) || (idx > this.headIdx && idx > this.endIdx)));
    return this.pendings[idx];
};

TaskPool.prototype.top = function () {
    var topIdx = this.headIdx + 1;
    topIdx = topIdx >= this.pendings.length ? 0 : topIdx;
    if (topIdx === this.endIdx) {
        // empty
        return null;
    }
    return this.pendings[topIdx];
};

TaskPool.prototype.pop = function () {
    var idxToProceed = this.headIdx+1;
    if (idxToProceed === this.pendings.length) {
        idxToProceed = 0;
    }
    if (idxToProceed === this.endIdx) {
        // empty task pool
        return;
    }
    this.pendings[idxToProceed] = null;
    this.headIdx = idxToProceed;
};

TaskPool.prototype.forEach = function (func) {
    var nowIdx = this.headIdx + 1;
    while (nowIdx != this.endIdx) {
        if (nowIdx === this.pendings.length) {
            nowIdx = 0;
        }
        nowIdx++;
        func(nowIdx, this.pendings[nowIdx]);
    }
};

function Reader(bufBytes) {
    bufBytes = bufBytes || MAX_READ_BYTES;
    this.blocked = false;
    this.buf = new Buffer(bufBytes);
    this.nowIdx = 0;
    var self = this;
    this.onReadable = function () {
        self.consume();
    };
    this.onDataEnd = function () {
        self.emit('end');
    };
    this.onWaitMore = function () {
        self.emit('wait-more');
    };
    EventEmitter.call(Reader, this);
}
utils.inherits(Reader, EventEmitter);

Reader.prototype.consume = function () {
    var fileInfos = this.fileInfos;
    var fd = fileInfos.fd;
    var streamDrained = false;
    var lineBuf = null;
    while (true) {
        var buffer = fd.read();
        if (buffer == null) {
            streamDrained = true;
            break;
        }
        var nowIdx = 0;
        for (var i = 0; i < buffer.length; ++i) {
            if (buffer[i] === 10 /*'\n'*/) {
                fileInfos.offset += i - nowIdx + 1;
                fileInfos.recordNum += 1;
                if (this.nowIdx !== 0) {
                    buffer.copy(this.buf, this.buf.nowIdx, nowIdx, i);
                    lineBuf = this.buf.slice(0);
                } else {
                    lineBuf = buffer.slice(nowIdx, i);
                }
                this.emit('new-record', lineBuf, fileInfos.recordNum, fileInfos.offset);
                nowIdx = i + 1;
                if (this.blocked) {
                    if (nowIdx < buffer.length) {
                        fd.unshift(buffer.slice(nowIdx));
                    }
                    break;
                }
            }
        }
        if (this.blocked) {
            break;
        } else {
            if (nowIdx < buffer.length) {
                buffer.copy(this.buf, 0, nowIdx);
                this.nowIdx = buffer.length - nowIdx;
            }
        }
    }
    if (streamDrained) {
        fd.once('readable', this.onReadable);
    }
};

Reader.prototype.setNewFile = function (fileInfos) {
    if (this.fileInfos) {
        this.closeNow();
    }
    this.fileInfos = fileInfos;
    var self = this;
    var fd = fileInfos.fd;
    if (!self.blocked) {
        fd.once('readable', self.onReadable);
    }
    fd.on('end', self.onDataEnd);
    fd.on('wait-more', self.onWaitMore);
};

Reader.prototype.setBlocked = function (blocked) {
    if (this.blocked && !blocked) { // from blocked to non-blocked
        this.consume();
    }
    if (!this.blocked && blocked) {
        this.fileInfos.fd.removeListener('readable', this.onReadable);
    }
    this.blocked = blocked;
};

Reader.prototype.closeNow = function () {
    var fileInfos = this.fileInfos;
    this.fileInfos = null;
    fileInfos.fd.removeListener('readable', this.onReadable);
    fileInfos.fd.removeListener('end', this.onDataEnd);
    fileInfos.fd.removeListener('wait-more', this.onWaitMore);
    fileInfos.fd.close();
};



function LogPostion (logger, callback) {
    var self = this;
    self.logger = logger;
    self.timeoutHandle = null;
    self.data = {};
    Object.defineProperty(self, 'name', {
        get: function () {
            return self.data.name;
        }
    });

    Object.defineProperty(self, 'offset', {
        get: function () {
            return self.data.offset;
        }
    });

    Object.defineProperty(self, 'recordNum', {
        get: function () {
            return self.data.recordNum;
        }
    });
    fs.readFile(LogPostion.POS_FILE, function (err, data) {
        if (err) {
            return callback();
        }
        try {
            var obj = JSON.parse(data);
            self.data = obj;
        } catch (e) {

        }
        callback();
    });
}

LogPostion.POS_FILE = path.join(__dirname, 'lastpos.txt');

LogPostion.prototype.save = function (name, offset, recordNum) {
    var self = this;
    var toSave = false;
    var lastRecordNum = this.data.recordNum || 0;
    if (this.data.name !== name || lastRecordNum + 100 < recordNum) {
        toSave = true;
    }
    this.data.name = name;
    this.data.offset = offset;
    this.data.recordNum = recordNum;
    if (toSave) {
        this.saveToDB();
    } else {
        this.timeoutHandle = this.timeoutHandle || setTimeout(function () {
            self.timeoutHandle = null;
            self.saveToDB()
        }, 10000);
    }
};

LogPostion.prototype.saveToDB = function (cb) {
    var self = this;
    fs.writeFile(LogPostion.POS_FILE, JSON.stringify(this.data), function (err) {
        if (err) {
            self.logger.error({err: err}, 'Fail to write to file');
        } else {
            self.lastFlushTime = Date.now();
            self.logger.info('the new last pos is write to file');
            if (self.timeoutHandle) {
                clearTimeout(self.timeoutHandle);
                self.timeoutHandle = null;
            }
        }
        if (cb) {
            cb(err);
        }
    });
};


/*
    LastPosition {
        name : string      --- name of the last file
        offset: integer    --- file offset of last record
        recordNum: integer   --- the line number of the last record
    }

    LogFile {
        recordNum: integer   --- the line number of lines which are consumed
        offset: integer    --- the offset of current file
        _id: string        --- unique identity of current file
        fd: FileDescriptor --- the readable stream of the log file
    }

    FilePat {
        open(_id: string, offset: integer): LogFile    --- open the last position, or if lastPos is null, figure out the oldest log
        next(currentLogFile: LogFile): LogFile    --- open the next file
        checkIfHaveNew(currentLogFile: LogFile): bool  --- if we have new file there
        close(currentLogFile: LogFile): Void    -- close the file
    }

    LineHandler {
        attached (fileReader: FileReader) : the line handler is attached to the file reader
        onNewLine(recordId: integer, data: string, Callback: (err: HandleError): void)
        HandleError {
            fatal: bool     --- indicate the handler encounters an temporary unrecovrable error, the file reader will
                                block all the op, until resume is called
            data: string     --- the data for retrying
        }
    }
*/
function FileReader(filePat, logger, lineHandler, callback) {
    this.filePat = filePat;
    this.logger = logger;
    var self = this;
    self.state = 'init';
    self.taskPool = new TaskPool(MAX_PENDING_TASK);
    self.readBuf = new Reader();
    self.readBuf.on('new-record', function (data, recordNum, offset) {
        self.state = 'r';
        self.onNewLine(data, recordNum, offset);
    });
    self.readBuf.on('wait-more', function () {
        self.state = 'w';
    });
    self.readBuf.on('error', function () {
        self.readBuf.closeNow();
        // restart the file processing if we encounter an error at reader
        self.nowf = null;
    });
    self.nowf = null;
    self.lineHandler = lineHandler;
    self.lineHandler.attached(self);
    this.lastPos = new LogPostion(logger, function (err, data) {
        if (err) {
            return callback(new Error('Fail to init file reader: ' + err.message));
        }
        self.tick();
    });
}

FileReader.prototype.stop = function () {
    this.state = 'b';
    this.readBuf.setBlocked(true);
};

FileReader.prototype.close = function (cb) {
    this.readBuf.setBlocked(true);
    this.readBuf.closeNow();
    var self = this;
    this.lineHandler.close(function () {
        self.lastPos.saveToDB(cb);
        self.logger.info('server close done');
    });
};

FileReader.prototype.resume = function () {
    var self = this;
    this.taskPool.forEach(function (idx, task) {
        if (task.data) {
            var data = task.data;
            delete task.data;
            self._startTask(idx, task, data)
        }
    });
    if (!this.taskPool.isFull) {
        this.readBuf.setBlocked(false);
    }
};

FileReader.prototype._startTask = function (idx, task, data) {
    var self = this;
    var ttl = 3; // retry 3 times until we are dead!!
    var recordId = task._id;
    function HandleNewLine(_id, data) {
        self.lineHandler.onNewLine(idx, _id, data, NewlineCallback);
        ttl--;
    }
    function NewlineCallback(err, taskIdx) {
        var task = null;
        if (err) {
            if (err.fatal) {
                // fatal error, we should block the whole processing here
                self.stop();
                task = self.taskPool.getTask(taskIdx);
                task.data = err.data;
            }
            if (ttl === 0) {
                // TODO: add dead func
                self.logger.error({err: err, data: err.data}, 'Fail to handle bill');
                // NOTE: recoverable error, we should not return here, we just record the bad case and set the task is done
                // otherwise we will block all the handling for a single failure
            } else {
                setTimeout(HandleNewLine(recordId, data), 2000);
            }
            return;
        }
        task = self.taskPool.getTask(taskIdx);
        task.done = true;
        self.collectDoneTasks();
    }
    HandleNewLine(recordId, data);
};

FileReader.prototype.onNewLine = function (data, recordNum, offset) {
    var _id = this.nowf.recordNum*1000000 + this.nowf._id;
    var task = {
        fileid: this.nowf._id,
        _id: _id,
        fileOffset: offset,
        recordNum: recordNum,
        done: false
    };
    var idx = this.taskPool.append(task);
    this._startTask(idx, task, data);
    if (this.taskPool.isFull) {
        this.readBuf.setBlocked(true);
    }
};

FileReader.prototype.collectDoneTasks = function () {
    var latestDoneTask = null;
    while (true) {
        var topTask = this.taskPool.top();
        if (!topTask || !topTask.done) {
            break;
        }
        latestDoneTask = topTask;
        this.taskPool.pop();
    }
    if (latestDoneTask) {
        this.lastPos.save(latestDoneTask.fileid,
            latestDoneTask.fileOffset,
            latestDoneTask.recordNum);
    }
};

FileReader.prototype.tick = function () {
    if (!this.nowf) {
        var lastPos = this.lastPos;
        // try get an available file here to handle
        this.nowf = this.filePat.open(
            lastPos.name,
            lastPos.offset,
            lastPos.recordNum
        );
        this.logger.info({lastpos: lastPos.data}, 'open new log file');
        this.readBuf.setNewFile(this.nowf);
    }
    if (this.state === 'w' && this.filePat.checkIfHaveNew(this.nowf)) {
        var newf = this.filePat.next(this.nowf);
        if (newf) {
            this.nowf = newf;
            this.logger.info({newf: newf._id}, 'open new log file');
            this.readBuf.setNewFile(this.nowf);
            this.lastPos.save(newf._id, 0, 0);
        }
    }
    setTimeout(this.tick.bind(this), 5000)
};

if (process.env['NODE_ENV'] === 'test') {
    module.exports = {
        FileReader: FileReader,
        TaskPool: TaskPool,
        Reader: Reader
    }
} else {
    module.exports = FileReader;
}


