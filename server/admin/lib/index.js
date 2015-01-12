var assert = require('assert');
var async = require('async');
var bunyan = require('bunyan');
var cluster = require('cluster');
var fs = require('fs');
var path = require('path');

var createAdmin = require('./admin').createAdmin;
var constants = require('./constants');
var LocalSettings = require('./localsettings');
var createPluginMgr = require('./plugin_mgr').createPluginMgr;
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

function ensureBaseDirReady() {
    var folders = [
        path.join(constants.baseDir, 'log'),
        path.join(constants.baseDir, 'bill'),
        path.join(constants.baseDir, 'bill')
    ];
    for (var i = 0; i < folders.length; ++i) {
        if (!fs.existsSync(folders[i])) {
            fs.mkdirSync(folders[i]);
        }
    }
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
    ensureBaseDirReady();

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
                main(path.join(constants.baseDir, './server/config/svr.json'), constants.baseDir, data, requestPoster, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, requestPoster);
                });
            } else {
                workerMgr.init(adminLogger, data, cfg.worker, function (err) {
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
            process.exit();
        }
        adminLogger.info("init done");
    });
};




