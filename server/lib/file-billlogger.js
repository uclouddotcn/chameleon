var fs = require('fs');
var pathLib = require('path');

function FileBillLogger (path, options) {
    this.path = path;
    this.rotQueue = [];
    this.rotating = false;
    this._init();
}

FileBillLogger.prototype._init = function () {
    var nowDate = new Date();
    this.rotAt = (new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate())).getTime();
    this.stream = fs.createWriteStream(this.getFileName(nowDate),
        {flags: 'a', encoding: 'utf8'});
    this._setupNextRot();
}

FileBillLogger.prototype._setupNextRot = function () {
    var self = this;
    this.rotAt = this._nextRotTime();
    this.timeout = setTimeout(
        function () { self.rotate(); },
            this.rotAt - Date.now());
}

FileBillLogger.prototype.record = function (s) {
    this.stream.write(JSON.stringify(s)+'\n');
};

FileBillLogger.prototype.close = function (callback) {
    var self = this;
    this.stream.end(function () {
        self.stream = null;
        callback();
    });
};

FileBillLogger.prototype.getFileName = function (d) {
    return pathLib.join(this.path, ['bill', d.getFullYear(), d.getMonth()+1, d.getDate()].join('_')+'.log');
};

FileBillLogger.prototype.alive = function () {
    return !!this.stream;
};

FileBillLogger.prototype._nextRotTime = function () {
    return this.rotAt + 24 * 60 * 60 * 1000;
};

FileBillLogger.prototype.rotate = function () {
    this.stream = fs.createWriteStream(this.getFileName(new Date(this.rotAt)),
        {flags: 'a', encoding: 'utf8'});
    this._setupNextRot();
};

FileBillLogger.prototype.write = function write(s) {
    return this.stream.write(s);
};

module.exports = FileBillLogger;
