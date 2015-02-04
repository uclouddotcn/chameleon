var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');

function SDKPluginInfo (name) {
    this.name = name;
    this.versions = {};
    this.newest = null;
}

SDKPluginInfo.prototype.addVersion = function (ver, p) {
    if (typeof ver === 'string') {
        ver = parseInt(ver);
    }
    this.versions[ver] = p;
    if (!(this.newest > ver)) {
        this.newest = ver;
    }
};

SDKPluginInfo.prototype.getNewestPath = function () {
    return this.versions[this.newest];
};

SDKPluginInfo.prototype.getVersionPath = function (ver) {
    if (typeof ver === 'string') {
        try {
            ver = parseInt(ver);
        } catch (e) {
            this._logger.error({err: e}, 'fail to get version');
            return null;
        }
    }
    return this.versions[ver];
};

SDKPluginInfo.prototype.getNewestVersion = function () {
    return this.newest;
};

function SDKPluginPool(chPluginPoolDir, logger) {
    this.chdir = chPluginPoolDir;
    this.plugins = {};
    this._logger = logger;
    this.collectAvailPlugin();
}

function extractPluginInfo (name) {
    var r = /([a-z0-9_]+)(-(\d+))?$/;
    var p = r.exec(name);
    if (!p) {
        return null;
    }
    return {
        name: p[1],
        version: p[3] ? parseInt(p[3]) : 0
    }
}

// sync operation, only used during initialization
SDKPluginPool.prototype.collectAvailPlugin = function () {
    var pfs = fs.readdirSync(this.chdir);
    for (var i = 0; i < pfs.length; ++i) {
        var p = path.join(this.chdir, pfs[i]);
        if (!fs.statSync(p).isDirectory() || pfs[i][0] === '_') {
            continue;
        }
        var nameInfo = extractPluginInfo(pfs[i]);
        if (!nameInfo) {
            this._logger.warn({name: pfs[i]}, 'ignore unknown folder in sdk plugins');
            continue;
        }
        var pInfo = this.plugins[nameInfo.name];
        if (!pInfo) {
            pInfo = this.plugins[nameInfo.name] = new SDKPluginInfo(nameInfo.name);
        }
        pInfo.addVersion(nameInfo.version, p);
    }
};

SDKPluginPool.prototype.getAllPluginNames = function () {
    return Object.keys(this.plugins);
};

SDKPluginPool.prototype.getNewestPluginPath = function (name) {
    var pInfo = this.plugins[name];
    if (!pInfo) {
        return null;
    }
    return {
        ver: pInfo.getNewestVersion(),
        p: pInfo.getNewestPath()
    };
};

SDKPluginPool.prototype.loadUpgradePlugin = function (fileurl, md5value, callback) {
    var self = this;
    childProcess.execFile('node', [path.join(__dirname, '..', 'script', 'installSDK.js'), fileurl, md5value, self.chdir],
        {timeout: 10000}, function (err, stdout, stderr) {
            self._logger.debug({stderr: stderr, stdout: stdout}, 'recv');
            if (!err) {
                try {
                    var upgradeInfo = JSON.parse(stdout.toString());
                    var name = upgradeInfo.name.split('-');
                    self.addNewPlugin(name[2], upgradeInfo.version);
                    callback(null, name[2], upgradeInfo.version, self.getPluginPath(upgradeInfo.name, upgradeInfo.version));
                } catch (e) {
                    self._logger.error({err: e});
                    callback(e);
                }
            } else {
                var code = err.code;
                self._logger.error({err: err, stderr: stderr}, 'Fail to load plugin');
                if (code === 1) {
                    callback(new Error('exists plugin module'));
                } else {
                    callback(new Error('unknown error'));
                }
            }
        });
};

SDKPluginPool.prototype.getPluginPath = function (name, lastVersion) {
    var pInfo = this.plugins[name];
    if (!pInfo) {
        return null;
    }
    return pInfo.getVersionPath(lastVersion);
};

SDKPluginPool.prototype.addNewPlugin = function (name, version, p) {
    var pInfo = this.plugins[name];
    if (pInfo == null) {
        pInfo = new SDKPluginInfo(name);
        this.plugins[pInfo.name] = pInfo;
    }
    if (!p) {
        p = path.join(this.chdir, name+'-'+version);
    }
    pInfo.addVersion(version, p);
};

module.exports = SDKPluginPool;

