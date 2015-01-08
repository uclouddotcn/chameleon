var fs = require('fs');
var restify = require('restify');
var async = require('async');
var chameleon = require('./lib');
var program = require('commander');

function loadConfig(cfgFile, debug) {
    var svrCfgPath = null;
    if (debug) {
        svrCfgPath = __dirname + '/config/' + cfgFile;
    } else {
        svrCfgPath = __dirname + '/../config/' + cfgFile;
    }
    try {
        var content = fs.readFileSync(svrCfgPath);
        var cfgObj = JSON.parse(content);
        checkAdminCfg(cfgObj);
        cfgObj._path = svrCfgPath;
        return cfgObj;
    } catch (err) {
        console.log(cfgFile + " is not a valid json config");
        throw err;
    }
}

function checkAdminCfg(cfgObj) {
    var adminCfg = cfgObj.admin;
    if (!adminCfg) {
        throw new Error("config file missing 'appCallbackSvr'");
    }
    if (!adminCfg.port) {
        throw new Error("invalid admin cfg, missing port");
    }
    if (!cfgObj.worker) {
        throw new Error("invalid config, missing worker config");
    }
}

/**
 * main entry
 * @name main
 * @function
 */
function main() {
    program
        .option('-d, --debug', 'use debug mode')
        .option('-s, --singleProcess', 'no cluster mode')
        .option('--sdkplugin <pluginpath>', 'use sdk plugin path')
        .parse(process.argv);
    var cfg = loadConfig('admin.json', program.debug);
    checkAdminCfg(cfg);
    chameleon.main(cfg, {
        debug: program.debug,
        sdkPluginPath: program.sdkplugin,
        singleProcess: program.singleProcess
    });
}

var d = require('domain').create();
d.on('error', function(err) {
    console.error('uncaught exception: ' + err.message);
    console.error('uncaught exception: ' + err.stack);
    throw err;
});
d.run(main);

