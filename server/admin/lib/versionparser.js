// do not require any third party module here, it will be used in other scripts
var path = require('path');
var versionparser = require('./versionparser');

function Version(major, medium, minor, build) {
    this.major = major || 0;
    this.medium = medium || 0;
    this.minor = minor || 0;
    this.build = build || 0;
}

Version.prototype.toString = function () {
    return this.major+'.'+this.medium+'.'+this.minor+'.'+this.build;
};

Version.prototype.getId = function () {
    return this.major+'.'+this.medium+'.'+this.minor;
};

Version.prototype.toVersionCode = function () {
    return this.major * 100 * 100 * 1000 + this.medium * 100 * 1000 + this.minor * 1000 + this.build;
};


var getVersionCode = exports.getVersionCode = function (version) {
    var names = version.split('.');
    var major = parseInt(names[0] || '0');
    var medium = parseInt(names[1] || '0');
    var minor = parseInt(names[2] || '0');
    var build = parseInt(names[3] || '0');
    return major * 100 * 100 * 1000 + medium * 100 * 1000 + minor * 1000 + build;
};

exports.getSplitVersionCode = function(version){
    var names = version.split('.');
    var major = parseInt(names[0] || '0');
    var medium = parseInt(names[1] || '0');
    var minor = parseInt(names[2] || '0');
    var build = parseInt(names[3] || '0');

    return [major + '.' + medium + '.' + minor, build];
};

var getVersionFromCode = exports.getVersionFromCode = function (versionCode) {
    var build = versionCode % 1000;
    versionCode = Math.floor(versionCode/1000);
    var minor =  versionCode % 100;
    versionCode = Math.floor(versionCode/100);
    var medium =  versionCode % 100;
    versionCode = Math.floor(versionCode/100);
    var major =  versionCode;
    return new Version(major, medium, minor, build);
};

exports.extractPluginInfo = function (name) {
    var t = name.split('-');
    var pluginName = t[0];
    var versionCode = t[1];
    var version = versionparser.getVersionFromCode(versionCode);
    return {
        name: pluginName,
        version: version
    };
};


exports.formatVersionCode = function (versionCode) {
    var version = getVersionFromCode(versionCode)
    return version.major+'.'+version.medium+'.'+version.minor+'.'+version.build;
};

exports.genDefaultWorkerCfg = function (version) {
    var versionCode = getVersionCode(version);
    return {
        version: version,
        script: path.join(__dirname, '..', '..', 'worker', versionCode.toString(), "worker"),
        "args": [
            "./config/svr.json"
        ],
        "env": {
            "NODE_PATH": "$CHAMELEON_WORKDIR/worker/"+versionCode.toString()+"/worker"+"/node_modules"
        }
    };
};

