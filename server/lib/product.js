var createAppCbSvr = require('./app_callback_svr').create;
var PluginInstMgr = require('./plugininst-mgr');
var UserAction = require('./user-events');
var util = require('util');
var SdkError = require('./sdk-error.js').SdkError;

/**
 * every products will have one instance, manage
 * the url handlers for this product
 * @class Product
 * @constructor
 */

var Product = 
function(productName, cfg, eventCenter, pendingOrderStore, logger) {
    checkAppCallbackSvrCfg(cfg);
    logger.info({name: productName, cfg: cfg}, 'creating products');
    this._productName = productName;
    this._appcbsvr = createAppCbSvr(cfg.appcb);
    this.pluginInstMgr = new PluginInstMgr();
    this._eventCenter = eventCenter;
    this._userAction = UserAction.createUserAction(productName, 
        this, this._appcbsvr, pendingOrderStore, eventCenter, logger);
    this._logger = logger;
};


Product.prototype.loadAllPlugins = 
function (pluginMgr, pluginCfgs) {
    for (var channelName in pluginCfgs) {
        this.startPluginInst(pluginMgr, channelName, 
            pluginCfgs[channelName]);
    }
    this.startPluginInst(pluginMgr, 'test', {});
};

/**
 * product name
 * @Product.prototype.productName
 * @function
 * @return {string} the name of the product
 */
Product.prototype.productName = 
function() {
    return this._productName;
};

/**
 * start a plugin inst under this product
 * @name Product.prototype.startPluginInst
 * @function
 * @param {PluginMgr} Product.prototype.pluginMgr
 * @param {string} name, name of the channel
 * @param {object} pluginCfg, channel plugin config
 */
Product.prototype.startPluginInst = function (pluginMgr, name, pluginCfg) {
    var self = this;
    var m = pluginMgr.pluginModules[name];
    if (!m) {
        throw new Error('There is not plugin for channel '+ name);
    }
    var pluginInfo = 
        this.pluginInstMgr.startPluginInst(
            name, m, pluginCfg.cfg, pluginCfg.p, this._userAction, this._logger);
    this._eventCenter.emit('start-inst', 
        {product: this._productName, productInst: self, pluginInfo: pluginInfo});
};

Product.prototype.savePluginInst = function (channelName) {
    this.pluginInstMgr.savePluginInst(channelName);
};

Product.prototype.modifyPluginInst = function (channelName) {
    this.pluginInstMgr.modifyPluginInst(channelName, cfg);
};

/**
 * Stop the plugin for channel ${channelName}
 * @name Product.prototype.stopPlugin
 * @function
 * @param {string} channelName, the name of the channel
 */
Product.prototype.stopPlugin = function (channelName) {
    var self = this;
    var pluginInfo = this.pluginInstMgr.stopPluginInst(channelName);
    this._eventCenter.emit('end-inst', 
        {product: this._productName, productInst: self, pluginInfo: pluginInfo});
};

Product.prototype.verifyLogin = 
function (req, res, next) {
    var params = req.params;
    var channelName = params.channel;
    var pluginInst = this.pluginInstMgr.getPluginImp(channelName);
    if (!pluginInst) {
        throw new Error(util.format('Not channel %s for product %s'), 
            channelName, this._productName);
    }
    this._userAction.verifyUserLogin( pluginInst,
        req.params.token,
        req.params.others,
        function (err, result)  {
            if (err) {
                if (err.code) {
                    res.send({code: err.code});
                } else {
                    next(err);
                }
                return;
            } 
            res.send(result);
            next();
        });
};

Product.prototype.pendingPay =
function(req, res, next) {
    var self = this;
    var params = req.params;
    var channelName = params.channel;
    var pluginInst = this.pluginInstMgr.getPluginImp(channelName);
    if (!pluginInst) {
        throw new Error(util.format('Not channel %s for product %s'), 
            channelName, this._productName);
    }

    var userPendingFunc = function (orderId, params, payInfo) {
        self._userAction.pendingPay(
            orderId,
            pluginInst, 
            params.uid,
            params.appUid,
            params.serverId, 
            params.productId,
            params.productCount,
            params.realPayMoney,
            params.singlePrice,
            params.ext,
            function (err, orderId)  {
                if (err) {
                    if (err.code) {
                        res.send({code: err.code});
                    } else {
                        next(err);
                    }
                    return;
                } 
                if (!payInfo) {
                    payInfo = "";
                }
                res.send({code: 0, 
                    orderId: orderId, payInfo: payInfo});
                next();
            });
    };

    if (pluginInst.pendingPay) {
        pluginInst.pendingPay(params, function (err, orderId, params, payInfo) {
            if (err) {
                if (err.code) {
                    res.send({code: err.code});
                } else {
                    next(err);
                }
                return;
            } 
            return userPendingFunc(orderId, params, payInfo);
        });
    } else {
        var orderId = this._userAction.genOrderId();
        userPendingFunc(orderId, params);
    }
};

function checkAppCallbackSvrCfg(cfgObj) {
    if (!cfgObj) {
        throw new Error("empty cfg for this product");
    }
    var appCallbackCfg = cfgObj.appcb;
    if (!appCallbackCfg) {
        throw new Error("config file missing 'appCallbackSvr'");
    }
    if (!appCallbackCfg.host ||
        !appCallbackCfg.payCbUrl ) {
        throw new Error("invalid appCallbackSvr cfg, missing host" + 
        "or payCbUrl");
    }
}

module.exports = Product;


