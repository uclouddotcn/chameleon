/// <reference path="declare/node.d.ts"/>
/// <reference path="declare/adm-zip.d.ts"/>
/// <reference path="declare/async.d.ts"/>
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/*
There are two kinds of files chameleon updater needs
1. version.json
it contains an array of upgrade package info for every package, the format of entry is
{"ver": "TO UPGRADE VERSION", "url": "RELATIVE DOWNLOAD URL", "sha1": "SHA1 SIGN FOR VERIFY"}
2. upgrade package zip
the contents under a zip file as
--
|-- manifest.json  <-- contains upgrade info for this package
|-- changelog.txt  <-- changelog description
|-- ...            <-- upgrade resources
format of manifest.json is:
{
"client" : [upgrade entries],   <-- upgrade entries for client tools
"channel" : [upgrade entries],  <-- upgrade entries for channel settings
"sdk" : [upgrade entries]       <-- upgrade entries for sdks
}
format of upgrade entry is
{
"type": "a",                <-- upgrade type, 'a' for add, 'm' for modify, 'd' for delete
"path": "/relative/path"    <-- relative path to base folder of this kind of upgrade
}
*/
var fs = require('fs');
var pathLib = require('path');
var http = require('http');
var AdmZip = require('adm-zip');
var common = require('./utils');
var async = require('async');

var events = require('events');

var crypto = require('crypto');
var url = require('url');

var Version = common.Version;
var ChameleonError = common.ChameleonError;
var ErrorCode = common.ErrorCode;

var UpgradeFile = (function () {
    function UpgradeFile(path, version) {
        this.path = path;
        this.version = version;
    }
    return UpgradeFile;
})();
exports.UpgradeFile = UpgradeFile;

var ChangeLog = (function () {
    function ChangeLog(version, log) {
        this.version = new Version(version);
        this.log = log;
    }
    return ChangeLog;
})();
exports.ChangeLog = ChangeLog;

var UpgradeInfo = (function () {
    function UpgradeInfo() {
        this.upgradeFiles = new Array();
    }
    Object.defineProperty(UpgradeInfo.prototype, "hasUpgrade", {
        get: function () {
            return this.upgradeFiles.length > 0;
        },
        enumerable: true,
        configurable: true
    });
    return UpgradeInfo;
})();
exports.UpgradeInfo = UpgradeInfo;

var Downloader = (function (_super) {
    __extends(Downloader, _super);
    function Downloader(svrhost, curver, tempPath) {
        _super.call(this);
        this.upgradeInfo = new UpgradeInfo();
        var h = url.parse(svrhost);
        this.hostname = h.hostname;
        this.port = parseInt(h.port);
        this.urlPrefix = h.pathname;
        this.curver = curver;
        this.tempPath = tempPath;
    }
    Downloader.prototype.downloadUpdate = function (lastUpdateTimestamp, callback) {
        var _this = this;
        var funcs = [
            function (cb) {
                _this.fetchUpgradeList('/version.json', lastUpdateTimestamp, cb);
            },
            function (updateList, cb) {
                _this.downloadFromUpdateList(updateList, cb);
            }
        ];
        async.waterfall(funcs, function (err) {
            callback(err, _this.upgradeInfo);
        });
    };

    Downloader.prototype.fetchUpgradeList = function (url, timestamp, callback) {
        var _this = this;
        var req = http.request({
            hostname: this.hostname,
            port: this.port,
            path: this.urlPrefix + url,
            headers: {
                'If-Modified-Since': timestamp
            }
        }, function (res) {
            var p = [];
            res.on('data', function (data) {
                p.push(data);
            });
            res.on('end', function () {
                if (res.statusCode === 304) {
                    console.log("not new version");
                    return callback(null, null);
                } else if (res.statusCode === 200) {
                    var buf = Buffer.concat(p);
                    try  {
                        var upgradeInfo = JSON.parse(buf.toString());
                        var needUpgrade = upgradeInfo.filter(function (item) {
                            var itemVer = new Version(item.ver);
                            return itemVer.cmp(_this.curver) >= 0;
                        }).sort(function (a, b) {
                            var ver_a = new Version(a.ver);
                            var ver_b = new Version(b.ver);
                            return ver_a.cmp(ver_b);
                        });
                        if (needUpgrade.length === 0) {
                            callback(null, null);
                        } else {
                            callback(null, { timestamp: res.headers['last-modified'], needUpgrade: needUpgrade });
                        }
                    } catch (e) {
                        callback(ChameleonError.newFromError(e, 3 /* OP_FAIL */), null);
                    }
                } else {
                    callback(new ChameleonError(3 /* OP_FAIL */, "server return error " + res.statusCode));
                }
            });

            res.setTimeout(100000, function () {
                callback(new ChameleonError(3 /* OP_FAIL */, 'Connect to server error'));
            });
        });
        req.on('error', function (err) {
            callback(ChameleonError.newFromError(err));
        });
        req.end();
    };

    Downloader.prototype.downloadFile = function (url, ver, sha1, callback, lefttimes) {
        var _this = this;
        var f = pathLib.join(this.tempPath, ver + '_' + sha1 + '.zip');
        var downloadFunc = function (callback) {
            var req = http.request({
                hostname: _this.hostname,
                port: _this.port,
                path: _this.urlPrefix + url
            }, function (res) {
                res.setTimeout(200000, function () {
                    callback(new ChameleonError(3 /* OP_FAIL */, "Fail to connect to server"));
                });
                var sha1hash = crypto.createHash('sha1');
                var fstream = fs.createWriteStream(f);
                res.on('data', function (data) {
                    sha1hash.update(data);
                    fstream.write(data);
                });
                res.on('end', function () {
                    fstream.end(function () {
                        var calcedSha1 = sha1hash.digest('hex');
                        if (sha1 !== calcedSha1) {
                            console.log(sha1);
                            return callback(new ChameleonError(3 /* OP_FAIL */, 'sha1 not matched ' + calcedSha1));
                        }
                        callback(null, f);
                    });
                });
                res.on('error', function (err) {
                    fstream.end();
                    callback(new ChameleonError(3 /* OP_FAIL */, "Fail to download file " + url));
                });
            });
            req.on('error', function (err) {
                return callback(ChameleonError.newFromError(err));
            });
            req.end();
        };
        var lefttime = 0;
        downloadFunc(function (err, f) {
            if (err) {
                if (lefttime > 0) {
                    lefttime -= 1;
                    downloadFunc(arguments.callee);
                } else {
                    callback(err);
                }
            } else {
                callback(null, f);
            }
        });
    };

    Downloader.prototype.downloadFromUpdateList = function (updateList, callback) {
        var _this = this;
        if (!updateList) {
            return setImmediate(callback);
        }
        this.upgradeInfo.upgradeTimestamp = updateList.timestamp;
        var funcs = updateList.needUpgrade.map(function (item) {
            return function (cb) {
                _this.downloadFile(item.url, item.ver, item.sha1, function (err, file) {
                    if (err) {
                        return cb(err);
                    } else {
                        _this.upgradeInfo.upgradeFiles.push(new UpgradeFile(file, item.ver));
                        return cb();
                    }
                });
            };
        });
        async.parallel(funcs, function (err) {
            return callback(err);
        });
    };
    return Downloader;
})(events.EventEmitter);
exports.Downloader = Downloader;

var Upgrader = (function (_super) {
    __extends(Upgrader, _super);
    function Upgrader(clientBasePath, channelBasePath, sdkBasePath) {
        _super.call(this);
        this.changelog = new Array();
        this.clientBasePath = clientBasePath;
        this.channelBasePath = channelBasePath;
        this.sdkBasePath = sdkBasePath;
        this.done = 0;
        this.total = 0;
    }
    Upgrader.prototype.upgrade = function (upgradeInfo) {
        var _this = this;
        var upgradeFiles = upgradeInfo.upgradeFiles;
        this.total = upgradeInfo.upgradeFiles.length;
        var funcs = upgradeFiles.sort(function (a, b) {
            var va = new Version(a.version);
            var vb = new Version(b.version);
            return va.cmp(vb);
        }).map(function (f) {
            return function (cb) {
                _this.done++;
                _this.emit('upgrade_proc', _this.done, f.version);
                _this.doUpdate(f, cb);
            };
        });
        var cb = function (err) {
            if (err) {
                _this.emit('upgrade_fail', err);
                return;
            }
            _this.done++;
            _this.emit('upgrade_proc', _this.done);
            _this.emit('upgrade_done', _this.changelog);
        };
        async.series(funcs, cb);
    };

    Upgrader.prototype.setUpdateDone = function (version, changelog) {
        this.changelog.push(new ChangeLog(version, changelog));
    };

    Upgrader.prototype.doUpdate = function (f, cb) {
        var _this = this;
        try  {
            var zf = new AdmZip(f.path);
            var manifestJson = zf.readAsText('manifest.json');
            var p = JSON.parse(manifestJson);
            var changelog = zf.readAsText('changelog.txt');
            async.parallel([
                function (callback) {
                    _this.updateClient(zf, p.client, callback);
                },
                function (callback) {
                    _this.updateChannel(zf, p.channel, callback);
                },
                function (callback) {
                    _this.updateSDK(zf, p.sdk, callback);
                }
            ], function (err) {
                if (err) {
                    return cb(err);
                }
                _this.setUpdateDone(f.version, changelog);
                fs.unlink(f.path);
                cb(null);
            });
        } catch (e) {
            cb(ChameleonError.newFromError(e, 3 /* OP_FAIL */));
        }
    };

    Upgrader.prototype.updateClient = function (zf, clientEntrys, callback) {
        if (!clientEntrys) {
            setImmediate(callback);
            return;
        }
        try  {
            for (var i = 0; i < clientEntrys.length; ++i) {
                var info = clientEntrys[i];
                if (info.type === 'd' || info.type === 'm') {
                    console.log('remove ' + info.path);
                    try  {
                        fs.unlinkSync(pathLib.join(this.clientBasePath, info.path));
                    } catch (e) {
                        console.log('Fail to remove file ' + info.path);
                    }
                }
                if (info.type !== 'd') {
                    console.log('add ' + info.path);
                    var targetPath = pathLib.dirname(pathLib.join(this.clientBasePath, info.path));
                    zf.extractEntryTo('client/' + info.path, targetPath, false, true);
                }
            }
            setImmediate(callback);
        } catch (e) {
            setImmediate(callback, ChameleonError.newFromError(e, 3 /* OP_FAIL */));
        }
    };

    Upgrader.prototype.updateChannel = function (zf, channelEntry, callback) {
        if (!channelEntry) {
            setImmediate(callback);
            return;
        }
        try  {
            for (var i = 0; i < channelEntry.length; ++i) {
                var info = channelEntry[i];
                if (info.type === 'd' || info.type === 'm') {
                    try  {
                        fs.unlinkSync(pathLib.join(this.channelBasePath, info.path));
                    } catch (e) {
                        console.log('Fail to remove file ' + info.path);
                    }
                }
                if (info.type !== 'd') {
                    zf.extractEntryTo('channel/' + info.path, this.channelBasePath, false, true);
                }
            }
            setImmediate(callback);
        } catch (e) {
            setImmediate(callback, ChameleonError.newFromError(e, 3 /* OP_FAIL */));
        }
    };

    Upgrader.prototype.updateSDK = function (zf, entries, callback) {
        if (!entries) {
            setImmediate(callback);
            return;
        }
        try  {
            for (var i = 0; i < entries.length; ++i) {
                var info = entries[i];
                if (info.type === 'd' || info.type === 'm') {
                    try  {
                        fs.unlinkSync(pathLib.join(this.sdkBasePath, info.path));
                    } catch (e) {
                        console.log('Fail to remove file ' + info.path);
                    }
                }
                if (info.type !== 'd') {
                    zf.extractEntryTo('sdk/' + info.path, pathLib.join(this.sdkBasePath, info.path), false, false);
                }
            }
            setImmediate(callback);
        } catch (e) {
            setImmediate(callback, ChameleonError.newFromError(e, 3 /* OP_FAIL */));
        }
    };
    return Upgrader;
})(events.EventEmitter);
exports.Upgrader = Upgrader;
/*
var up = new Upgrader("http://127.0.0.1:8080", new Version("1.3.2"), "/Users/wushauk/temptemp/", "/Users/wushauk/temptemp/test/b", "", "");
up.checkUpgrade(null);
up.on('local_update', function() {
console.log('start local update') ;
}).on('update_done', function(changelogs) {
console.log('update done: ') ;
console.log(changelogs)
}).on('update_fail', function(err) {
console.log('update fail');
console.log('update error: ' + err);
});
*/
//# sourceMappingURL=upgrader.js.map
