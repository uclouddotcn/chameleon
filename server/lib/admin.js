var restify = require('restify');
var constants = require('./constants');
var pathLib = require('path');

/**
 * 
 * @class Admin
 * @classdesc Admin server module
 * @constructor
 * @param {PluginMgr} pluginMgr - plugin manager
 * @param {ProductMgr} productMgr - product manager
 * @param {Object} options - not used now...
 * @param {object} logger - logger object
 */
var Admin = function(pluginMgr, productMgr, options, logger) {
    var self = this;
    self.server = restify.createServer({
        name: 'Admin',
        version: '0.0.1',
        log: logger
    });
    self.logger = logger;

    self.pluginMgr = pluginMgr;
    self.productMgr = productMgr;
    self.server.use(restify.bodyParser({mapParams:false}));
    self.server.use(restify.queryParser());

   self.server.get('cmd', function (req, res, next) {
       var params = req.params;
       if (!params) {
           res.send({code: -1, msg: 'empty request arguments'});
           next();
           return;
       }
       if (params.cmd === 'exit') {
           self.exit();
           setTimeout(function () {
               res.send({code: 0});
               next();
           }, 1000);
       } else {
           res.send({code: -1, msg: 'unknown cmd'});
           next();
       }
   })

    // path for get all plugins
    self.server.get('/plugins', function (req, res, next) {
        var infos = pluginMgr.getAllPluginInfos().map(formatPluginInfo);
        res.send(JSON.stringify(infos));
        return next();
    });

    // path for adding a plugin 
    self.server.post('/plugin/:name', function(req, res, next, obj) {
        self.pluginMgr.addPlugin(req.params.name, req.body, function(err, info) {
            if (err) {
                req.log.info({err:err}, 'fail to add plugin');
                return next(new restify.InvalidArgumentError(err.message));
            }
            var showChannelInfo = doFormatPluginInfo(info);
            res.send(JSON.stringify(showChannelInfo));
            return next();
        });
    });

    // path for getting all product instance
    self.server.get('/products', function(req, res, next) {
        var products = Object.keys(productMgr.products).map(function (key) {
            return productMgr.products[key];
        });
        res.send(JSON.stringify(products));
        return next();
    });

    // path for getting a specific plugin instance
    self.server.get('/product/:name', function (req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            var showProductInfo = doFormatProductInfo(product);
            res.send(JSON.stringify(showProductInfo));
            return next();
        }
    });

    // path for add a product
    self.server.post('/product/:name', function (req, res, next) {
        var product = productMgr.products[req.params.name];
        if (product) {
            return next(new restify.InvalidArgumentError('duplicate products'));
        } else {
            productMgr.addProduct(req.params.name, req.body, function (err) {
                if (err) {
                    return next(err);
                }
                res.send({code: 0});
                return next();
            });
        }
    });

    // path for add a plugin instance
    self.server.post('/product/:name/:channelName', function(req, res, next, obj) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            try {
                product.startChannel(req.params.channelName, obj);
                product.saveChannelCfg(req.params.channelName);
                res.send(JSON.stringify({code: 0}));
            } catch (e) {
                return next(new restify.InvalidArgumentError(e.message));
            }
            return next();
        }
    });


    // path for modify a plugin instance settings
    self.server.put('/product/:name/:channelName', function(req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            try {
                product.modifyChannel(
                    req.params.channelName, req.body);
                product.saveChannelCfg(req.params.channelName);
                res.send(JSON.stringify({code: 0}));
            } catch (e) {
                return next(new restify.InvalidArgumentError(e.message));
            }
            return next();
        }
    });

    // path for stop a plugin 
    self.server.del('/plugin_inst/:name', function(req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            var err = product.stopChannel(req.params.name);
            if (err) {
                return next(restify.InvalidArgumentError(err.toString()));
            }
            res.send(JSON.stringify({code: 0}));
            return next();
        }
    });

    self.server.on('uncaughtException', function (req, res, route, error) {
        req.log.error({err: error}, 'on uncaught exception');
    });
};

/**
 *  admin server start listening
 * @name Admin.prototype.listen
 * @method
 * @param {int} port - which port to listen to 
 * @param {string} host - which interface to listen to 
 * @param {function} next - function (err)
 */
Admin.prototype.listen = function(port, host, next) {
    var self = this;
    self.server.listen(port, host, function() {
        next(); 
    });
    self.server.once('error', function(err) {
        next(err);
    });
};

Admin.prototype.exit = function () {
    if (this.exitFunc) {
        this.exitFunc();
    }
}

Admin.prototype.close = function (callback) {
    this.logger.info('admin server exit');
    return this.server.close(callback);
};

Admin.prototype.registerExitFunc = function (func) {
    this.exitFunc = func;
}

module.exports.createAdmin = function(pluginMgr, productMgr, options, logger) {
    return new Admin(pluginMgr, productMgr, options, logger);
};

// internal functions

function formatPluginInfo(pluginInfo) {
    return doFormatPluginInfo(pluginInfo);
}

function doFormatProductInfo(product) {
    return {
        name: product.productName,
        channels: product.channelMgr.getAllChannels().map(
            formatPluginInfo)
    };
}


function doFormatPluginInfo(pluginInfo) {
    return pluginInfo;
}

