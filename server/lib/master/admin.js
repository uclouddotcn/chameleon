var restify = require('restify');
var fs = require('fs');
var EventSummarizer = require('../event-summarizer');
var FunctionUnits = require('../functionunits');

/**
 * 
 * @class Admin
 * @classdesc Admin server module
 * @constructor
 * @param {PluginMgr} pluginMgr - plugin manager
 * @param {ProductMgr} productMgr - product manager
 * @param {Object} options - not used now...
 * @param {object} logger - logger object
 * @param {object} statLogger - statistics logger object
 */
var Admin = function(pluginMgr, productMgr, options, logger, statLogger) {
    var self = this;
    self.server = restify.createServer({
        name: 'Admin',
        version: '0.0.1',
        log: logger
    });
    self.logger = logger;

    self.pluginMgr = pluginMgr;
    self.productMgr = productMgr;
    self.server.use(restify.bodyParser());
    self.server.use(restify.queryParser());
    self.productSum = EventSummarizer.createEventSum(productMgr, statLogger);

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
    });

    self.server.get('/monitor/status', function (req, res, next) {
        res.send(FunctionUnits.getStatus());
        return next();
    })

    self.server.get('/monitor/event', function (req, res, next) {
        var result = self.productSum.getSummary();
        res.send(result);
        return next();
    });

    self.server.get('/monitor/event/:productName', function (req, res, next) {
        var productName = req.params.productName;
        var result = self.productSum.getProductSummary(productName);
        if (res instanceof Error) {
            return next(new restify.InvalidArgumentError(res.message));
        } else {
            res.send(result);
            return next();
        }
    });

    // path for get all plugins
    self.server.get('/plugins', function (req, res, next) {
        var infos = pluginMgr.getAllPluginInfos().map(formatPluginInfo);
        res.send(infos);
        return next();
    });

    // path for adding a plugin 
    self.server.post('/plugin', function(req, res, next) {
        self.pluginMgr.upgradePlugin(req.params.fileurl, req.params.md5value, function(err, info) {
            if (err) {
                req.log.info({err:err}, 'fail to add plugin');
                return next(new restify.InvalidArgumentError(err.message));
            }
            var showChannelInfo = doFormatPluginInfo(info);
            res.send({code: 0, channel: showChannelInfo});
            return next();
        });
    });

    self.server.put('/plugin/:name', function(req, res, next) {
        var newInst = self.pluginMgr.usePluginAtVersion(name, req.params.version);
        if (newInst instanceof Error) {
            return next(new restify.InvalidArgumentError(newInst.message));
        } else {
            res.send({code: 0});
            return next();
        }
    });

    // path for getting all product instance
    self.server.get('/products', function(req, res, next) {
        var products = Object.keys(productMgr.products).map(function (key) {
            return productMgr.products[key].productName();
        });
        res.send(products);
        return next();
    });

    // path for getting a specific plugin instance
    /*
    self.server.get('/product/:name', function (req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            var showProductInfo = doFormatProductInfo(product);
            res.send(showProductInfo);
            return next();
        }
    });
    */

    // path for add a product
    self.server.post('/product/:name', function (req, res, next) {
        var product = productMgr.products[req.params.name];
        if (product) {
            product.updateCfg(req.body, function (err) {
                if (err) {
                    return next(new restify.InvalidArgumentError(e.message));
                }
                res.send({code: 0});
                return next();
            });
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
    self.server.post('/product/:name/:channelName', function(req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            try {
                if (product.getChannel(req.params.channelName)) {
                    product.modifyChannel(req.params.channelName, req.body);
                } else {
                    product.startChannel(req.params.channelName, req.body);
                }
                product.saveChannelCfg(req.params.channelName);
                res.send({code: 0});
                return next();
            } catch (e) {
                return next(new restify.InvalidArgumentError(e));
            }
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
                res.send({code: 0});
            } catch (e) {
                return next(new restify.InvalidArgumentError(e.message));
            }
            return next();
        }
    });

    // path for stop a plugin 
    self.server.del('/product/:name/:channelName', function(req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            var err = product.stopChannel(req.params.channelName);
            if (err) {
                return next(restify.InvalidArgumentError(err.toString()));
            }
            res.send({code: 0});
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
    setImmediate(callback);
    return this.server.close();
};

Admin.prototype.registerExitFunc = function (func) {
    this.exitFunc = func;
}

module.exports.createAdmin = function(pluginMgr, productMgr, options, logger, statLogger) {
    return new Admin(pluginMgr, productMgr, options, logger, statLogger);
};

// internal functions

function formatPluginInfo(pluginInfo) {
    return doFormatPluginInfo(pluginInfo);
}

function doFormatProductInfo(product) {
    return {
        name: product._productName,
        cfg: product.cfg,
        channels: product.channelMgr.getAllChannels().map(
            formatPluginInfo)
    };
}


function doFormatPluginInfo(pluginInfo) {
    return pluginInfo;
}

