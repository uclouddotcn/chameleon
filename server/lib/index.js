var createPluginMgr = require('./plugin_mgr').createPluginMgr;
var createAdmin = require('./admin').createAdmin;
var createSDKSvr = require('./sdk_svr').createSDKSvr;
var storageDriver =  require('./event-storage');
var path = require('path');
var eventLog = require('./event-log');
var ChannelCbSvr = require('./channel-callbacksvr');
var ProductMgr = require('./productmgr')
var Logger = require('./svrlog');
var createPendingOrderStore = 
    require('./pending-order').createPendingOrderStore;
var async = require('async');

function start(cfg) {
    // create logger first
    var logger = startLogger(cfg.debug, cfg.logger)

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
    startBillModule(cfg.billCfg, productMgr, logger.svrLogger);
     
    // start other event listen module
    startUserEventListener(cfg.eventListenCfg);

    // start channel callback svr
    createChannelCbSvr(cfg.channelCbSvr, productMgr, logger.svrLogger);

    // loading all product configs
    productMgr.loadProductsSync();

    // create admin server
    var adminSvr = createAdmin(pluginMgr, productMgr, 
        cfg.admin, logger.adminLogger);

    // init the internal modules sequentially
    async.series([
        // init admin svr
        adminSvr.listen.bind(
            adminSvr, cfg.admin.port, cfg.admin.host),
        // init the sdk svr 
        sdkSvr.listen.bind(
            sdkSvr, cfg.sdkSvr.port, cfg.sdkSvr.host),
    ], function (err, result) {
        if (err) {
            throw err;
        }
        console.log('init finished');
    });
}


function startLogger(debug, cfg) {
    return new Logger(debug, cfg);
}


var BILL_BUNYAN_LOGGER = {
    name: 'bunyan',
    cfg: {
        path: path.join(__dirname, '../log/bill.log')
    }
};

function startUserEventListener(eventListenCfg) {
}

function startBillModule(billCfg, userAction, logger) {
    if (!billCfg) {
        billCfg = BILL_BUNYAN_LOGGER;
    }
    var storageEng = storageDriver.createStorageDriver(billCfg, logger);
    eventLog.listen(userAction, storageEng);
}

function createChannelCbSvr(cfg, productMgr, logger) {
    new ChannelCbSvr(productMgr, cfg.port, cfg.host, cfg, logger);
}

module.exports.start = start;

