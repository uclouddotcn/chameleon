var fs =  require('fs');
var Stream = require('stream').Stream;
var EventEmitter = require('events').EventEmitter;

var Readable = Stream.Readable;
var util = require('util');

var kMinPoolSpace = 128;


function isUndefined (t) {
    return typeof t === 'undefined';
}

function isNumber(arg) {
    return typeof arg === 'number';
}


var pool;

function allocNewPool(poolSize) {
    pool = new Buffer(poolSize);
    pool.used = 0;
}

util.inherits(ReadStream, Readable);

function ReadStream(path, options) {
    if (!(this instanceof ReadStream))
        return new ReadStream(path, options);

    // a little bit bigger buffer and water marks by default
    options = util._extend({
        highWaterMark: 64 * 1024
    }, options || {});

    Readable.call(this, options);

    this.path = path;
    this.fd = options.hasOwnProperty('fd') ? options.fd : null;
    this.flags = options.hasOwnProperty('flags') ? options.flags : 'r';
    this.mode = options.hasOwnProperty('mode') ? options.mode : 438; /*=0666*/

    this.start = options.hasOwnProperty('start') ? options.start : undefined;
    this.end = options.hasOwnProperty('end') ? options.end : undefined;
    this.autoClose = options.hasOwnProperty('autoClose') ?
        options.autoClose : true;
    this.pos = undefined;

    if (!isUndefined(this.start)) {
        if (!isNumber(this.start)) {
            throw TypeError('start must be a Number');
        }
        if (isUndefined(this.end)) {
            this.end = Infinity;
        } else if (!isNumber(this.end)) {
            throw TypeError('end must be a Number');
        }

        if (this.start > this.end) {
            throw new Error('start must be <= end');
        }

        this.pos = this.start;
    }

    if (!isNumber(this.fd))
        this.open();

    this.on('end', function() {
        if (this.autoClose) {
            this.destroy();
        }
    });

    var self = this;
    this.onFileChange = function (curr, prev) {
        console.log(curr.mtime > prev.mtime)
        if (curr.mtime > prev.mtime) {
            fs.unwatchFile(self.path, self.onFileChange);
            self.read();
        }
    }
}

fs.FileReadStream = fs.ReadStream; // support the legacy name

ReadStream.prototype.open = function() {
    var self = this;
    fs.open(this.path, this.flags, this.mode, function(er, fd) {
        if (er) {
            if (self.autoClose) {
                self.destroy();
            }
            self.emit('error', er);
            return;
        }

        self.fd = fd;
        self.emit('open', fd);
        // start the flow of data.
        self.read();
    });
};

ReadStream.prototype._read = function(n) {
    if (!isNumber(this.fd))
        return this.once('open', function() {
            this._read(n);
        });

    if (this.destroyed)
        return;

    if (!pool || pool.length - pool.used < kMinPoolSpace) {
        // discard the old pool.
        pool = null;
        allocNewPool(this._readableState.highWaterMark);
    }

    // Grab another reference to the pool in the case that while we're
    // in the thread pool another read() finishes up the pool, and
    // allocates a new one.
    var thisPool = pool;
    var toRead = Math.min(pool.length - pool.used, n);
    var start = pool.used;

    if (!isUndefined(this.pos))
        toRead = Math.min(this.end - this.pos + 1, toRead);

    // already read everything we were supposed to read!
    // treat as EOF.
    if (toRead <= 0)
        return this.push(null);

    // the actual read.
    var self = this;
    fs.read(this.fd, pool, pool.used, toRead, this.pos, onread);

    // move the pool positions, and internal position for reading.
    if (!isUndefined(this.pos))
        this.pos += toRead;
    pool.used += toRead;

    function onread(er, bytesRead) {
        if (er) {
            if (self.autoClose) {
                self.destroy();
            }
            self.emit('error', er);
        } else {
            var b = null;
            if (bytesRead > 0) {
                b = thisPool.slice(start, start + bytesRead);
                self.push(b);
            } else {
                self.push('');
                self.emit('wait-more');
                fs.watchFile(self.path, self.onFileChange);
            }
        }
    }
};


ReadStream.prototype.destroy = function() {
    if (this.destroyed)
        return;
    this.destroyed = true;

    if (isNumber(this.fd))
        this.close();
};


ReadStream.prototype.close = function(cb) {
    var self = this;
    if (cb)
        this.once('close', cb);
    if (this.closed || !isNumber(this.fd)) {
        if (!isNumber(this.fd)) {
            this.once('open', close);
            return;
        }
        return process.nextTick(this.emit.bind(this, 'close'));
    }
    this.closed = true;
    close();

    function close(fd) {
        fs.close(fd || self.fd, function(er) {
            if (er)
                self.emit('error', er);
            else
                self.emit('close');
        });
        self.fd = null;
    }
};

module.exports = {
    createReadStream : function(path, options) {
        return new ReadStream(path, options);
    }
};


