var cluster = require('cluster');
var assert = require('assert');
var async = require('async');
var constants = require('./constants');
var path = require('path');

var createPluginMgr = require('./plugin_mgr').createPluginMgr;
var LocalSettings = require('./localsettings');
var bunyan = require('bunyan');
var workerMgr = require('./worker_mgr');
var createAdmin = require('./admin').createAdmin;

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
    constants.configDir = cfg._path;

    var adminLogger = defaultAdminLoggerCfg()
    var localSettings = new LocalSettings(path.dirname(cfg._path), adminLogger);

    var pluginMgr = createPluginMgr(localSettings, adminLogger);
    async.waterfall([
        function (callback) {
            pluginMgr.loadAllPlugins(callback);
        },
        function (data, callback) {
            if (options.singleProcess) {
                var main = require('../worker/lib/index').init;
                var requestPoster = new (require('./inproc_requestposter'))();
                main(constants.configDir, data, requestPoster, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, requestPoster);
                });
            } else {
                workerMgr.init(adminLogger, data, constants.configDir, function (err) {
                    if (err) {
                        adminLogger.error({err: err}, "Fail to init worker");
                        callback(err);
                        return;
                    }
                    callback(null, null);
                });
            }
        },
        function (requestPoster, callback) {
            var admin = createAdmin(pluginMgr, {requestPoster:requestPoster}, adminLogger);
            admin.listen(cfg.admin.port, cfg.admin.host, function (err) {
                callback(err);
            });
        }
    ], function (err) {
        if (err) {
            adminLogger.error({err: err}, "Fail to start server");
        }
        adminLogger.info("init done");
    });
};




