var childProcess = require('child_process');
var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var versionparser = require('./versionparser');

var extractPluginInfo = versionparser.extractPluginInfo;

function SDKPluginInfo (name) {
    this.name = name;
    this.versions = {};
    this.newest = {};
}

SDKPluginInfo.prototype.addVersion = function (ver, p) {
    this.versions[ver.toString()] = p;
    var index = ver.getId();
    var value = ver.build;
    if(this.newest[index]){
        if(this.newest[index] < value) this.newest[index] = value;
    }else{
        this.newest[index] = value;
    }
};

SDKPluginInfo.prototype.getNewestPath = function (splitVersion) {
    var value = this.newest[splitVersion];
    return this.versions[splitVersion + '.' + value];
};

SDKPluginInfo.prototype.getVersionPath = function (ver) {
    return this.versions[ver];
};

SDKPluginInfo.prototype.getNewestVersion = function (splitVersion) {
    return splitVersion + '.' + this.newest[splitVersion];
};

function SDKPluginPool(chPluginPoolDir, logger) {
    this.chdir = chPluginPoolDir;
    this.plugins = {};
    this._logger = logger;
    this.collectAvailPlugin();
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

SDKPluginPool.prototype.getNewestPluginPath = function (name, version) {
    var pInfo = this.plugins[name];
    if (!pInfo) {
        return null;
    }

    var splitVersion = versionparser.getSplitVersionCode(version);
    if(splitVersion.length !== 2){
        return null;
    }
    return {
        ver: pInfo.getNewestVersion(splitVersion[0]),
        p: pInfo.getNewestPath(splitVersion[0])
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
                    self.addNewPlugin(name[2], versionparser.getVersionFromCode(upgradeInfo.versionCode));
                    callback(null, name[2], upgradeInfo.version, self.getPluginPath(name[2], upgradeInfo.version));
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
        this.plugins[name] = pInfo;
    }
    if (!p) {
        p = path.join(this.chdir, name+'-'+version.toVersionCode());
    }
    pInfo.addVersion(version, p);
};

module.exports = SDKPluginPool;

