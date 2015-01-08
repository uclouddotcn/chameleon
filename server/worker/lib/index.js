var async = require('async');
var fs = require('fs');
var path = require('path');
var ursa = require('ursa');

var Admin = require('./admin');
var ChannelCbSvr = require('./channel-callbacksvr');
var env = require('./env');
var storageDriver = require('./event-storage');
var eventLog = require('./event-log');
var createPendingOrderStore = require('./pending-order').createPendingOrderStore;
var createPluginMgr = require('./plugin_mgr').createPluginMgr;
var createSDKSvr = require('./sdk_svr').createSDKSvr;
var Logger = require('./svrlog');
var ProductMgr = require('./productmgr');

function startLogger(debug, cfg) {
    return new Logger(debug, cfg);
}

function startBillModule(billCfg, userAction, logger) {
    var storageEng = storageDriver.createStorageDriver(billCfg, logger);
    eventLog.listen(userAction, storageEng);
    return storageEng;
}

function createChannelCbSvr(cfg, productMgr, logger) {
    return new ChannelCbSvr(productMgr, cfg.port, cfg.host, cfg, logger);
}

function loadCfg(cfgFile) {
    try {
        var content = fs.readFileSync(cfgFile);
        var cfgObj = JSON.parse(content);
        cfgObj._path = cfgFile;
        return cfgObj;
    } catch (err) {
        console.error(cfgFile + " is not a valid json config");
        throw err;
    }
}

var exitFuncs = null;

function init(cfgFile, baseDir, pluginInfos, cmdEmitter, callback) {
    try {
        _init(cfgFile, baseDir, pluginInfos, cmdEmitter, callback);
    } catch (e) {
        console.error(e.stack);
        setImmediate(callback, e);
    }
}

function _init(cfgFile, baseDir, pluginInfos, cmdEmitter, callback) {
    env.initFromBaseDir(baseDir);
    var cfg = loadCfg(cfgFile);
    env.debug = cfg.debug;
    // create logger first
    var logger = startLogger(env.debug);

    // create pending order store

    var pendingOrderStore = createPendingOrderStore(cfg.pendingOrderStoreCfg, logger.svrLogger);

    // create plugin mgr
    var pluginMgr = createPluginMgr(logger.svrLogger);

    // create product mgr
    var productMgr = new ProductMgr(pluginMgr, pendingOrderStore, logger.svrLogger);

    // create sdk svr
    var sdkSvr = createSDKSvr(productMgr, cfg.sdkSvr, logger.svrLogger);

    // start bill log module
    var eventStorageEng = startBillModule(cfg.billCfg, productMgr, logger.svrLogger);

    // start channel callback svr
    var channelCbSvr = createChannelCbSvr(cfg.channelCbSvr, productMgr, logger.svrLogger);

    var admin = new Admin(productMgr, productMgr, logger.svrLog(), logger.statLog());

    exitFuncs = function (callback) {
        var closeSvr = function (cb) {
            var svrs = [sdkSvr, channelCbSvr];
            var aliveCount = svrs.length;
            var closeServerCb = function (err) {
                if (aliveCount < 0) {
                    return;
                }
                if (err) {
                    aliveCount = -1;
                    cb(err);
                }
                aliveCount -=1;
                if (aliveCount == 0) {
                    cb();
                }
            };
            for (var i = 0; i < svrs.length; ++i) {
                svrs[i].close(closeServerCb);
            }
            callback();
        };
        async.series([closeSvr,
                pendingOrderStore.close.bind(pendingOrderStore),
                eventStorageEng.close.bind(eventStorageEng)],
            function (err) {
                if (err) {
                    logger.svrLog().error({err: err}, 'Fail to termniate');
                    process.exit(-1);
                }
                logger.svrLog().info({err: err}, 'exit done');
                process.exit(0);
            }
        );
    };

    // init the internal modules sequentially
    async.series([
        function (cb) {
            pluginMgr.loadAllPlugins(pluginInfos);
            productMgr.loadProductsSync();
            setImmediate(cb);
        },
        // init the sdk svr
        sdkSvr.listen.bind(
            sdkSvr, cfg.sdkSvr.port, cfg.sdkSvr.host)
    ], function (err) {
        if (err) {
            return callback(err);
        }
        admin.init(cmdEmitter);
        return callback();
    });
}

function close(callback) {
    if (exitFuncs) {
        exitFuncs(callback);
    } else {
        process.exit(0);
    }
}

module.exports = {
    init: init,
    close: close
};
