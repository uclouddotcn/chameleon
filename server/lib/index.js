var createPluginMgr = require('./plugin_mgr').createPluginMgr;
var createAdmin = require('./admin').createAdmin;
var createSDKSvr = require('./sdk_svr').createSDKSvr;
var storageDriver =  require('./event-storage');
var fs = require('fs');
var path = require('path');
var eventLog = require('./event-log');
var ChannelCbSvr = require('./channel-callbacksvr');
var ProductMgr = require('./productmgr');
var Logger = require('./svrlog');
var createPendingOrderStore = 
    require('./pending-order').createPendingOrderStore;
var async = require('async');
var Constants = require('./constants');

function start(cfg, debug) {
    Constants.debug = debug;

    if (!fs.existsSync(Constants.productDir)) {
        fs.mkdirSync(Constants.productDir);
    }

    if (!fs.existsSync(Constants.logDir)) {
        fs.mkdirSync(Constants.logDir);
    }
/*
    if (!fs.existsSync(cfg.logger.cfg.path)) {
        fs.mkdirSync(cfg.logger.cfg.path);
    }
*/
    // create logger first
    var logger = startLogger(cfg.debug, cfg.logger);

    // create pending order store

    var pendingOrderStore = createPendingOrderStore(
        cfg.pendingOrderStoreCfg, logger.svrLogger);

    // create plugin mgr
    var pluginMgr = createPluginMgr(logger.svrLogger);

    // create product mgr
    var productMgr = new ProductMgr(pluginMgr, pendingOrderStore, 
        logger.svrLogger);

    // create sdk svr 
    var sdkSvr = createSDKSvr(
        productMgr, cfg.sdkSvr, logger.svrLogger);

    // start bill log module
    var eventStorageEng = startBillModule(cfg.billCfg, productMgr, logger.svrLogger);
     
    // start other event listen module
    startUserEventListener(productMgr, cfg.eventListenCfg);

    // start channel callback svr
    var channelCbSvr = createChannelCbSvr(cfg.channelCbSvr, productMgr, logger.svrLogger);

    // loading all product configs
    productMgr.loadProductsSync();

    // create admin server
    var adminSvr = createAdmin(pluginMgr, productMgr, 
        cfg.admin, logger.adminLogger);

    var exitFuncs = function () {
        async.series([sdkSvr.close.bind(sdkSvr),
            channelCbSvr.close.bind(channelCbSvr),
            adminSvr.close.bind(adminSvr),
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
        // init admin svr
        adminSvr.listen.bind(
            adminSvr, cfg.admin.port, cfg.admin.host),
        // init the sdk svr 
        sdkSvr.listen.bind(
            sdkSvr, cfg.sdkSvr.port, cfg.sdkSvr.host)
    ], function (err) {
        if (err) {
            throw err;
        }
        adminSvr.registerExitFunc(function () {
            try {
                exitFuncs();
            } catch (e) {
                console.log(e);
                console.log(e.stack)
            }
        });
        console.log('init finished');
    });
}


function startLogger(debug, cfg) {
    return new Logger(debug, cfg);
}


function startUserEventListener(eventCenter, eventListenCfg) {

}

function startBillModule(billCfg, userAction, logger) {
    var storageEng = storageDriver.createStorageDriver(billCfg, logger);
    eventLog.listen(userAction, storageEng);
    return storageEng;
}

function createChannelCbSvr(cfg, productMgr, logger) {
    return new ChannelCbSvr(productMgr, cfg.port, cfg.host, cfg, logger);
}

module.exports.start = start;

