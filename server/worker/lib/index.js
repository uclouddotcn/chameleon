var async = require('async');
var fs = require('fs');
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
        console.log(cfgFile + " is not a valid json config");
        throw err;
    }
}

function init(cfgFile, pluginInfos, cmdEmitter, callback) {
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

    var admin = new Admin(productMgr, productMgr, logger.statLog());

    var exitFuncs = function () {
        async.series([sdkSvr.close.bind(sdkSvr),
                channelCbSvr.close.bind(channelCbSvr),
                pendingOrderStore.close.bind(pendingOrderStore),
                eventStorageEng.close.bind(eventStorageEng)],
            function (err) {
                if (err) {
                    logger.error({err: err}, 'Fail to termniate');
                    return;
                }
                process.exit(0);
            }
        );
    };

    process.on('SIGTERM', function () {
        logger.svrLogger.info("on SIGTERM");
        exitFuncs();
    });

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
        admin.registerExitFunc(exitFuncs);
        return callback();
    });
}

module.exports = {
    init: init
};
