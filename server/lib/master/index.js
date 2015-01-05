var cluster = require('cluster');
var assert = require('assert');
var constants = require('../constants');
var path = require('path');

var createPluginMgr = require('./plugin_mgr').createPluginMgr;
var LocalSettings = require('./localsettings');
var bunyan = require('bunyan');
var workerMgr = require('./worker_mgr');

function defaultAdminLoggerCfg(level) {
    var infoLv = 'info';
    if (level) {
        infoLv = level;
    }
    return bunyan.createLogger({
        name: 'admin',
        streams: [
            {
                type: 'rotating-file',
                path: path.join(constants.logDir, 'adminsvr.log'),
                level: infoLv,
                period: '1d',
                count: 4
            }
        ],
        serializers: bunyan.stdSerializers
    });
}

exports.main = function (cfg, options) {
    assert(cluster.isMaster, "should only run in master mode");
    if (options.debug) {
        constants.debug = options.debug;
    }

    if (options.sdkPluginPath) {
        constants.sdkPluginPoolDir = path.resolve(process.cwd(), options.sdkPluginPath);
    }

    var adminLogger = defaultAdminLoggerCfg()
    var localSettings = new LocalSettings(path.dirname(cfg._path), adminLogger);

    var pluginMgr = createPluginMgr(localSettings, adminLogger);
    pluginMgr.loadAllPlugins(function (err, data) {
        if (err) {
            console.log(err)
            process.exit(-1);
        }
        workerMgr.init(data, function (err) {
            if (err) {
                console.log(err)
                process.exit(-1);
            }
            console.log('worker done');
        });
    });
};




