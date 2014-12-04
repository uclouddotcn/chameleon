/// <reference path="declare/node.d.ts"/>
/// <reference path="declare/adm-zip.d.ts"/>
/// <reference path="declare/async.d.ts"/>

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


import fs = require('fs');
import pathLib = require('path');
import http = require('http');
import AdmZip = require('adm-zip');
import common = require('./utils');
import async = require('async');
import util = require('util');
import events = require('events');
import child_process = require('child_process');
import crypto = require('crypto');
import url = require('url');

import Version = common.Version;
import ChameleonError = common.ChameleonError;
import ErrorCode = common.ErrorCode;
import CallbackFunc = common.CallbackFunc;

export class UpgradeFile {
    path: string;
    version: string;
    constructor(path, version) {
        this.path = path;
        this.version = version;
    }
}


export class ChangeLog {
    version: Version;
    log: string;
    constructor(version: string, log: string) {
        this.version = new Version(version);
        this.log = log;
    }
}

export class UpgradeInfo {
    upgradeTimestamp: string;
    upgradeFiles: UpgradeFile[] = new Array<UpgradeFile>();

    get hasUpgrade() : boolean {
        return this.upgradeFiles.length > 0;
    }
}

export class Downloader extends events.EventEmitter {
    hostname: string;
    port: number;
    curver: Version;
    tempPath: string;
    urlPrefix: string;
    private upgradeInfo: UpgradeInfo = new UpgradeInfo();

    constructor (svrhost, curver, tempPath) {
        super();
        var h = url.parse(svrhost);
        this.hostname = h.hostname;
        this.port = parseInt(h.port);
        this.urlPrefix = h.pathname;
        this.curver =  curver;
        this.tempPath = tempPath;
    }

    downloadUpdate(lastUpdateTimestamp, callback: CallbackFunc<UpgradeInfo>) {
        var funcs = [
            (cb) => {
                this.fetchUpgradeList('/version.json', lastUpdateTimestamp, cb);
            },
            (updateList, cb) => {
                this.downloadFromUpdateList(updateList, cb)
            }
        ];
        async.waterfall(funcs, (err) => {
            callback(err, this.upgradeInfo);
        })
    }

    private fetchUpgradeList(url, timestamp, callback) {
        var req = http.request({
            hostname: this.hostname,
            port: this.port,
            path: this.urlPrefix+url,
            headers: {
                'If-Modified-Since': timestamp
            }
        }, (res) => {
            var p = [];
            res.on('data', (data) => {
                p.push(data);
            });
            res.on('end', () => {
                if (res.statusCode === 304) {
                    console.log("not new version");
                    return callback(null, null);
                } else if (res.statusCode === 200) {
                    var buf = Buffer.concat(p);
                    try {
                        var upgradeInfo = JSON.parse(buf.toString());
                        var needUpgrade = upgradeInfo.filter( (item) => {
                            var itemVer = new Version(item.ver);
                            return itemVer.cmp(this.curver) >= 0;
                        }).sort((a, b) => {
                            var ver_a = new Version(a.ver);
                            var ver_b = new Version(b.ver);
                            return ver_a.cmp(ver_b);
                        });
                        if (needUpgrade.length === 0) {
                            callback(null, null);
                        } else {
                            callback(null, {timestamp: res.headers['last-modified'], needUpgrade: needUpgrade});
                        }
                    } catch (e) {
                        callback(ChameleonError.newFromError(e, ErrorCode.OP_FAIL), null);
                    }
                } else {
                    callback(new ChameleonError(ErrorCode.OP_FAIL, "server return error " + res.statusCode))
                }
            });

            res.setTimeout(100000, () => {
                callback(new ChameleonError(ErrorCode.OP_FAIL, 'Connect to server error'));
            });
        });
        req.on('error', (err) => {
            callback(ChameleonError.newFromError(err));
        })
        req.end();
    }

    private downloadFile(url: string, ver: string, sha1: string, callback: CallbackFunc<string>, lefttimes?: number) {
        var f = pathLib.join(this.tempPath, ver+'_'+sha1+'.zip');
        var downloadFunc = (callback) => {
            var req = http.request({
                hostname: this.hostname,
                port: this.port,
                path: this.urlPrefix+url
            }, (res) => {
                res.setTimeout(200000, () => {
                    callback(new ChameleonError(ErrorCode.OP_FAIL, "Fail to connect to server"));
                });
                var sha1hash = crypto.createHash('sha1');
                var fstream = fs.createWriteStream(f);
                res.on('data', (data) => {
                    sha1hash.update(data);
                    fstream.write(data);
                });
                res.on('end', () => {
                    fstream.end(function () {
                        var calcedSha1 = sha1hash.digest('hex');
                        if (sha1 !== calcedSha1) {
                            console.log(sha1);
                            return callback(new ChameleonError(ErrorCode.OP_FAIL, 'sha1 not matched ' + calcedSha1));
                        }
                        callback(null, f);
                    });
                });
                res.on('error', (err) => {
                    fstream.end();
                    callback(new ChameleonError(ErrorCode.OP_FAIL, "Fail to download file " + url));
                })
            });
            req.on('error', (err) => {
                return callback(ChameleonError.newFromError(err));
            });
            req.end();
        };
        var lefttime = 0;
        downloadFunc((err, f) => {
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
    }

    private downloadFromUpdateList(updateList: {timestamp: string; needUpgrade: {ver: string; url: string; sha1: string}[]}, callback: CallbackFunc<any>) {
        if (!updateList) {
            return setImmediate(callback);
        }
        this.upgradeInfo.upgradeTimestamp = updateList.timestamp;
        var funcs = updateList.needUpgrade.map((item) => {
            return (cb) => {
                this.downloadFile(item.url, item.ver, item.sha1, (err, file) => {
                    if (err) {
                        return cb(err);
                    } else {
                        this.upgradeInfo.upgradeFiles.push(new UpgradeFile(file, item.ver));
                        return cb();
                    }
                });
            }
        });
        async.parallel(funcs, (err) => {
            return callback(err);
        });
    }

}

export class Upgrader extends events.EventEmitter {
    clientBasePath: string;
    channelBasePath: string;
    sdkBasePath: string;
    total: number;
    done: number;
    changelog: ChangeLog[] = new Array<ChangeLog>();

    constructor (clientBasePath: string, channelBasePath: string, sdkBasePath: string) {
        super();
        this.clientBasePath = clientBasePath;
        this.channelBasePath = channelBasePath;
        this.sdkBasePath = sdkBasePath;
        this.done = 0;
        this.total = 0;
    }

   upgrade(upgradeInfo: UpgradeInfo) {
        var upgradeFiles = upgradeInfo.upgradeFiles;
        this.total = upgradeInfo.upgradeFiles.length;
        var funcs = upgradeFiles.sort(function (a, b) {
            var va = new Version(a.version);
            var vb = new Version(b.version);
            return va.cmp(vb);
        }).map((f) => {
            return (cb) => {
                this.done++;
                this.emit('upgrade_proc', this.done, f.version);
                this.doUpdate(f, cb);
            }
        });
        var cb = (err) => {
            if (err) {
                this.emit('upgrade_fail', err);
                return;
            }
            this.done++;
            this.emit('upgrade_proc', this.done);
            this.emit('upgrade_done', this.changelog);
        };
        async.series(funcs, cb)
    }

    private setUpdateDone(version: string, changelog: string) {
        this.changelog.push(new ChangeLog(version, changelog));
    }

    private doUpdate(f: UpgradeFile, cb: CallbackFunc<any>) {
        try {
            var zf = new AdmZip(f.path);
            var manifestJson = zf.readAsText('manifest.json');
            var p = JSON.parse(manifestJson);
            var changelog = zf.readAsText('changelog.txt');
            async.parallel([
                (callback) => { this.updateClient(zf, p.client, callback);},
                (callback) => { this.updateChannel(zf, p.channel, callback);},
                (callback) => { this.updateSDK(zf, p.sdk, callback);}
            ], (err) => {
                if (err) {
                    return cb(err);
                }
                this.setUpdateDone(f.version, changelog);
                fs.unlink(f.path);
                cb(null);
            });
        } catch (e) {
            cb(ChameleonError.newFromError(e, ErrorCode.OP_FAIL));
        }
    }

    private updateClient(zf: AdmZip, clientEntrys: {type: string; path: string}[], callback: CallbackFunc<any>) {
        if (!clientEntrys) {
            setImmediate(callback);
            return;
        }
        try {
            for (var i = 0; i < clientEntrys.length; ++i) {
                var info = clientEntrys[i];
                if (info.type === 'd' || info.type === 'm') {
                    console.log('remove ' + info.path);
                    try {
                        fs.unlinkSync(pathLib.join(this.clientBasePath, info.path));
                    } catch (e) {
                        console.log('Fail to remove file ' + info.path);
                    }
                }
                if (info.type !== 'd') {
                    console.log('add ' + info.path);
                    var targetPath = pathLib.dirname(pathLib.join(this.clientBasePath, info.path));
                    zf.extractEntryTo('client/'+info.path, targetPath, false, true);
                }
            }
            setImmediate(callback);
        } catch (e) {
            setImmediate(callback, ChameleonError.newFromError(e, ErrorCode.OP_FAIL));
        }
    }

    private updateChannel(zf: AdmZip, channelEntry: {type: string; path: string}[], callback: CallbackFunc<any>) {
        if (!channelEntry) {
            setImmediate(callback);
            return;
        }
        try {
            for (var i = 0; i < channelEntry.length; ++i) {
                var info = channelEntry[i];
                if (info.type === 'd' || info.type === 'm') {
                    try {
                        fs.unlinkSync(pathLib.join(this.channelBasePath, info.path));
                    } catch (e) {
                        console.log('Fail to remove file ' + info.path);
                    }
                }
                if (info.type !== 'd') {
                    zf.extractEntryTo('channel/'+info.path, this.channelBasePath, false, true);
                }
            }
            setImmediate(callback);
        } catch (e) {
            setImmediate(callback, ChameleonError.newFromError(e, ErrorCode.OP_FAIL));
        }
    }

    private updateSDK(zf: AdmZip, entries: {type: string; path: string}[], callback: CallbackFunc<any>) {
        if (!entries) {
            setImmediate(callback);
            return;
        }
        try {
            for (var i = 0; i < entries.length; ++i) {
                var info = entries[i];
                if (info.type === 'd' || info.type === 'm') {
                    try {
                        fs.unlinkSync(pathLib.join(this.sdkBasePath, info.path));
                    } catch (e) {
                        console.log('Fail to remove file ' + info.path);
                    }
                }
                if (info.type !== 'd') {
                    zf.extractEntryTo('sdk/'+info.path, pathLib.join(this.sdkBasePath, info.path), false, false);
                }
            }
            setImmediate(callback);
        } catch (e) {
            setImmediate(callback, ChameleonError.newFromError(e, ErrorCode.OP_FAIL));
        }
    }

}
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
