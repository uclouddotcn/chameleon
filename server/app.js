var fs = require('fs');
var restify = require('restify');
var async = require('async');
var chameleon = require('./lib');

function loadConfig(cfgFile) {
    var svfCfgPath = __dirname + '/config/' + cfgFile;
    try {
        var content = fs.readFileSync(svfCfgPath);
        var cfgObj = JSON.parse(content);
        checkSDKSvrCfg(cfgObj);
        checkAdminCfg(cfgObj);
        return cfgObj;
    } catch (err) {
        console.log(cfgFile + " is not a valid json config");
        throw err;
    }
}

function checkSDKSvrCfg(cfgObj) {
    var sdkSvrCfg = cfgObj.sdkSvr;
    if (!sdkSvrCfg) {
        throw new Error("config file missing 'appCallbackSvr'");
    }
    if (!sdkSvrCfg.port) {
        throw new Error("invalid sdkSvr cfg, missing port");
    }
}

function checkAdminCfg(cfgObj) {
    var adminCfg = cfgObj.admin;
    if (!adminCfg) {
        throw new Error("config file missing 'appCallbackSvr'");
    }
    if (!adminCfg.port) {
        throw new Error("invalid sdkSvr cfg, missing port");
    }
    return;
}

/**
 * main entry
 * @name main
 * @function
 */
function main() {
    var cfg = loadConfig('svr.json');
    checkSDKSvrCfg(cfg);
    checkAdminCfg(cfg);
    chameleon.start(cfg);
}

var d = require('domain').create();
d.on('error', function(err) {
    console.error('uncaught exception: ' + err.message);
    console.error('uncaught exception: ' + err.stack);
    throw err;
});
d.run(main);

