var fs = require('fs');
var path = require('path');
var assert = require('assert');
var TailStream = require('./tail_stream');

function BillFilePat (basefolder) {
    this.basedir = basefolder;
    this.pat = new RegExp('^bill_(\\d+)_(\\d+)_(\\d+)\\.log$');
    this._startWatching();
}

function composeId (year, month, day) {
    return (year - 2000)*1000 + month*50 + day;
}

BillFilePat.prototype._startWatching = function () {
    var items = fs.readdirSync(this.basedir);
    var gotFiles = [];
    for (var i = 0; i < items.length; ++i) {
        var item = items[i];
        var fileInfo = this._parseFilename(item);
        if (!fileInfo) {
            continue;
        }
        gotFiles.push({
            _id: composeId(fileInfo.year, fileInfo.month, fileInfo.day),
            item: item,
            dateInfo: fileInfo
        });
    }
    function compareItem (a, b) {
        return a._id - b._id;
    }
    this.logfiles = gotFiles.sort(compareItem);
    var self = this;
    fs.watch(this.basedir, function (event, filename) {
        if (event !== 'rename') {
            return;
        }
        fs.exists(path.join(this.basedir, filename), function (existed) {
            if (existed) {
                var newItem = self._parseFilename(filename);
                var _id = composeId(newItem.year, newItem.month, newItem.day);
                self.logfiles.push({
                    _id: _id,
                    item: filename,
                    dateInfo: fileInfo
                });
                self.logfiles = self.logfiles.sort(compareItem)
            } else {
                var removedItem = self._parseFilename(filename);
                if (removedItem) {
                    var _id = composeId(removedItem.year, removedItem.month, removedItem.day)
                    for (var i = 0 ; i < self.logfiles.length; ++i) {
                        if (self.logfiles[i]._id === _id) {
                            self.logfiles.splice(i, 1);
                        }
                    }
                }
            }
        });
    });
};

BillFilePat.prototype.open = function ( _id , offset, lineNum) {
    if (_id) {
        var filename = this._turnIdToFile(_id);
        if (fs.existsSync(path.join(this.basedir, filename))) {
            return this._open({
                _id: _id,
                item: filename
            }, offset, lineNum);
        } else {
            var nextId = this._getNext(_id);
            return this._open(nextId, 0, 0);
        }
    } else {
        var item = this._findOldestItem();
        return this._open(item, 0, 0);
    }
};


BillFilePat.prototype.next = function (currentFile) {
    var nextId = this._getNext(currentFile._id);
    return this._open(nextId, 0, 0);
};

BillFilePat.prototype.checkIfHaveNew = function (currentFile)  {
    var nextId = this._getNext(currentFile._id);
    if (nextId == null) {
        return false;
    }
    var filename = this._turnIdToFile(nextId._id);
    return fs.existsSync(path.join(this.basedir, filename));
};

BillFilePat.prototype.close = function (currentFile)  {
    currentFile.fd.close();
};

BillFilePat.prototype._parseFilename = function (filename) {
    var matched = this.pat.exec(filename);
    if (matched) {
        return {
            year: parseInt(matched[1]),
            month: parseInt(matched[2]),
            day:  parseInt(matched[3])
        };
    } else {
        return null;
    }
};

BillFilePat.prototype._getNext = function (_id) {
    var nextItem = null;
    for (var i = 0; i < this.logfiles.length; ++i) {
        if (this.logfiles[i]._id > _id) {
            nextItem = this.logfiles[i];
            break;
        }
    }
    if (!nextItem) {
        return null;
    } else {
        return {
            _id: nextItem._id,
            item: nextItem.item
        }
    }
};

BillFilePat.prototype._parseId = function (_id) {
    try {
        var idnum = parseInt(_id);
    } catch (e) {
        return null;
    }
    var year = 2000+Math.floor(idnum/1000);
    idnum = idnum % 1000;
    var month = Math.floor(idnum / 50);
    idnum = idnum % 50;
    var day = idnum;
    return {
        year: year,
        month: month,
        day: day
    };
};

BillFilePat.prototype._findOldestItem = function () {
    var item = this.logfiles[0];
    return {
        _id: item._id,
        item: item.item
    };
};

BillFilePat.prototype._open = function (item, offset, lineNum) {
    if (!item) {
        return null;
    } else {
        var fp = path.join(this.basedir, item.item);
        if (!fs.existsSync(fp)) {
            return null;
        }
        var fd = TailStream.createReadStream(fp, {
            flags: 'r',
            start: offset
        });
        return {
            recordNum: lineNum,
            _id: item._id,
            fd: fd,
            offset: offset
        }
    }
};

BillFilePat.prototype._turnIdToFile = function (_id) {
    var fileInfo = this._parseId(_id);
    if (!fileInfo) {
        return null;
    }
    return composeBillFile(fileInfo);
};


function composeBillFile(fileInfo) {
    return 'bill_'+fileInfo.year+'_'+fileInfo.month+'_'+fileInfo.day+'.log';
}

module.exports = BillFilePat;

