var restify = require('restify');
var util = require('util');
var pathLib = require('path');
var fs = require('fs');
var _ = require('underscore');

var createAppCbSvr = require('./app_callback_svr').create;
var ChannelMgr = require('./channelmgr');
var env = require('./env');
var UserAction = require('./user-events');
var paramChecker = require('./param-checker');

/**
 * every products will have one instance, manage
 * the url handlers for this product
 * @class Product
 * @constructor
 * @param {string} productName  product name
 * @param {string} cfgPath  config path of this product
 * @param {object} cfg config
 * @param {object} eventCenter event notify board
 * @param {object} pendingOrderStore storage of the pending order
 * @param {object} pluginMgr the plugin manager
 * @param {object} logger logger object
 */

function Product(productName, cfgPath, cfg, eventCenter, pendingOrderStore, pluginMgr, logger) {
    checkAppCallbackSvrCfg(cfg);
    logger.info({name: productName, cfg: cfg}, 'creating products');
    this._productName = productName;
    this._cfgPath = cfgPath;
    this._appcbsvr = createAppCbSvr(cfg.appcb);
    this.channelMgr = ChannelMgr.create();
    this._eventCenter = eventCenter;
    this._userAction = UserAction.createUserAction(productName,
        this, this._appcbsvr, pendingOrderStore, eventCenter, logger);
    this._logger = logger;
    this._sdkMgr = new SDKPluginManager(pluginMgr, this._userAction, this._logger);
    this.cfg = cfg;
}

Product.prototype.getChannel = function (name) {
    return this.channelMgr.getChannel(name);
};

Product.prototype.updateCfg = function (cfg, cb) {
    try {
        checkAppCallbackSvrCfg(cfg);
        this._appcbsvr.updateCfg(cfg.appcb);
        var productCfgPath = pathLib.join(this._cfgPath, '_product.json');
        fs.writeFile(productCfgPath, JSON.stringify(cfg), function (err) {
            if (err) {
                return cb(new Error("Fail to write to file"));
            }
            cb();
        });
    } catch (e) {
        cb(e);
    }
};

Product.prototype.productInfo = function(){
    var result = {};
    result['name'] = this._productName;
    result['plugin'] = [];
    var pluginInstances = this._sdkMgr.getAllPluginInsts();
    for(var sdkName in pluginInstances){
        var pluginInst = pluginInstances[sdkName];
        if(pluginInst.inst){
            result['plugin'].push({
                channelName: pluginInst.inst.channelName,
                version: pluginInst.version,
                path: pluginInst.path
            });
        }
    }

    return result;
};

/**
 * load all channels
 * @param channelCfg dict of the channel configs
 */
Product.prototype.loadAllChannels = function (channelCfg) {
    var self = this;
    try {
        Object.keys(channelCfg).forEach(function (key) {
            self.startChannel(key, channelCfg[key]);
        });
        if (process.env['CHAMELEON_MODE'] === 'PRE_PRODUCTION') {
            self._logger.info('In PRE_PRODUCTION mode, adding test channel');
            // start test channel
            this.startChannel("test", {
                sdks: [
                    {
                        name: 'testchannel',
                        type: 'user,pay',
                        cfg: {}
                    }
                ]
            });
        }
    } catch (e) {
        self._logger.error({err: e}, 'Fail to start prodcut');
        throw new Error('product('+this._productName+') fail to start!' + e.message);
    }
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
 * @name Product.prototype.startChannel
 * @function
 * @param {string} name         name of the channel
 * @param {object} cfg          product cfg
 */
Product.prototype.startChannel = function (name, cfg) {
    var self = this;
    var channel =
        self.channelMgr.startChannel(
            name, cfg, self._sdkMgr, self._userAction, self._logger);
    self._eventCenter.emit('start-inst',
        {product: self._productName, productInst: self, channel: channel});
};

/**
 * save the channel config
 * @param {string} channelName channel name
 */
Product.prototype.saveChannelCfg = function (channelName) {
    this.channelMgr.saveChannelCfg(channelName, this._cfgPath);
};

Product.prototype.modifyChannel = function (channelName, cfg) {
    this.channelMgr.modifyChannel(channelName, cfg, this._cfgPath);
};

/**
 * Stop the plugin for channel ${channelName}
 * @name Product.prototype.stopPlugin
 * @function
 * @param {string} channelName the name of the channel
 */
Product.prototype.stopPlugin = function (channelName) {
    var self = this;
    var channel = self.channelMgr.stopChannel(channelName);
    self._eventCenter.emit('end-inst',
        {product: self._productName, productInst: self, channel: channel});
};

Product.prototype.verifyLogin = 
function (req, res, next) {
    var params = req.params;
    var channelName = params.channel;
    var channel = this.channelMgr.getChannel(params.channel);
    if (!channel) {
        throw new Error(util.format('Not channel ' + params.channel + ' for product ' + this._productName));
    }
    this._userAction.verifyUserLogin( channel,
        req.params.token,
        req.params.others,
        channelName,
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

Product.prototype.parsePayToken = function (token) {
    var obj = JSON.parse(token);
    var channel = obj.ch;
    if (channel === undefined ) {
        throw new Error("missing channel or sdk in token");
    }
    return {
        channel: obj.ch,
        i: obj.i
    };
};

Product.prototype.pendingPay =function(req, res, next) {
    var params = req.params;
    var tokenInfo = this.parsePayToken(params.token);
    var channelName = tokenInfo.channel;
    var infoFromSDK = tokenInfo.i;
    var channel = this.channelMgr.getChannel(channelName);
    if (!channel) {
        throw new restify.InvalidArgumentError('Not channel ' + channelName + ' for product ' + this._productName);
    }
    channel.pendingPay(params, infoFromSDK, function (err, orderId, payInfo) {
        if (err) {
            if (err.code) {
                res.send({code: err.code});
                next();
            } else {
                next(err);
            }
            return;
        }
        if (!payInfo) {
            payInfo = "";
        }
        res.send({code: 0,
            orderId: orderId, payInfo: JSON.stringify(payInfo)});
        next();
    });
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

function getShortVersion(version){
    var names = version.split('.');
    var major = parseInt(names[0] || '0');
    var medium = parseInt(names[1] || '0');
    var minor = parseInt(names[2] || '0');
    var build = parseInt(names[3] || '0');

    return major + '.' + medium + '.' + minor;
}

function SDKPluginManager (pluginMgr, userAction, logger) {
    this.pluginMgr = pluginMgr;
    var self = this;
    this._userAction = userAction;
    this._logger = logger;
    this._plugins = {};
}

/**
 *  get the plugin wrapper for a channel
 * @param channelName channel name
 * @param sdkname sdk name
 * @param cfg config setting
 * @returns {object} plugin wrapper
 */
SDKPluginManager.prototype.getPlugin = function (channelName, sdkname, cfg, version) {
    var pluginModuleInfo = _.find(this.pluginMgr.pluginInfos, function(info){
        return info.name === sdkname && getShortVersion(info.version) === version;
    });
    this._logger.info({sdkname: sdkname, cfg: cfg, version: version}, 'get plugin');
    if(!pluginModuleInfo){
        throw new Error('Fail to find pluginModuleInfo at version: ' + sdkname+':'+version);
    }
    var pluginModule = require(pluginModuleInfo.path);
    if (pluginModule == null) {
        throw new Error("Fail to create plugin " + sdkname);
    }
    if (!pluginModule.name ) {
        throw new Error('plugin ' + path +
        ' miss required field name');
    }
    if (!pluginModule.createSDK ) {
        throw new Error('plugin ' + path +
        ' miss required function create');
    }
    if (!pluginModule.cfgDesc ) {
        throw new Error('plugin ' + path +
        ' miss required function cfgDesc');
    }
    var checker = paramChecker.createChecker(pluginModule.cfgDesc);
    var pluginInst = this._plugins[sdkname];
    var plugin = null;
    if (!pluginInst) {
        plugin = pluginModule.createSDK(this._logger, checker, env.debug);
        pluginInst = {
            plugin: plugin,
            version: version,
            path: pluginModuleInfo.path
        };
        this._plugins[sdkname] = pluginInst;
    } else {
        plugin = pluginInst.plugin;
    }
    var inst = plugin.createPluginWrapper(this._userAction, channelName, cfg);
    if (inst == null) {
        throw new Error("Fail to create plugin wrapper" + channelName);
    }
    pluginInst['inst'] = inst;
    return inst;
};

SDKPluginManager.prototype.getAllPluginInfos = function(){
    return this.pluginMgr.pluginInfos;
}

SDKPluginManager.prototype.getAllPluginInsts = function(){
    return this._plugins;
}

SDKPluginManager.prototype.uninstallChannel = function (channelName) {
    for (var sdkname in this._plugins) {
        var pluginInst = this._plugins[sdkname];
        if (pluginInst.inst.channelName === channelName) {
            pluginInst.inst = null;
            return;
        }
    }
};


module.exports = {
    createProduct: function (productName, cfgPath, cfg, eventCenter, pendingOrderStore, pluginMgr, logger) {
        return new Product(productName, cfgPath, cfg, eventCenter, pendingOrderStore, pluginMgr, logger);
    }
};


