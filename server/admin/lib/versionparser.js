// do not require any third party module here, it will be used in other scripts
var path = require('path');

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
}

exports.formatVersionCode = function (versionCode) {
    var build = versionCode % 1000;
    versionCode = Math.floor(versionCode/1000);
    var minor =  versionCode % 100;
    versionCode = Math.floor(versionCode/100);
    var medium =  versionCode % 100;
    versionCode = Math.floor(versionCode/100);
    var major =  versionCode;
    return major+'.'+medium+'.'+minor+'.'+build;
}

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

