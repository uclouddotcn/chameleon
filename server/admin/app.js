var fs = require('fs');
var chameleon = require('./lib');
var program = require('commander');

function loadConfig(cfgFile, debug) {
    var svrCfgPath = __dirname + '/../config/' + cfgFile;
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
}

/**
 * main entry
 * @name main
 * @function
 */
function main() {
    program
        .option('-s, --singleProcess', 'no cluster mode')
        .option('--sdkplugin <pluginpath>', 'use sdk plugin path')
        .parse(process.argv);
    var debug = process.env.NODE_ENV === 'development';
    var cfg = loadConfig('admin.json', debug);
    checkAdminCfg(cfg);
    chameleon.main(cfg, {
        debug: debug,
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

