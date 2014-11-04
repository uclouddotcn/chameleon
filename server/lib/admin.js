var restify = require('restify');
var constants = require('./constants');
var pathLib = require('path');
var fs = require('fs');
var Constants = require('./constants');
var EventSummarizer = require('./event-summarizer');
var FunctionUnits = require('./functionunits');

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
    self.server.use(restify.bodyParser());
    self.server.use(restify.queryParser());
    self.productSum = EventSummarizer.createEventSum(productMgr);

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
        res.send(JSON.stringify(infos));
        return next();
    });

    // path for adding a plugin 
    self.server.post('/plugin', function(req, res, next) {
        var fileurl = req.params.fileurl;
        var index = fileurl.lastIndexOf('/');
        if (index < 0 || index == fileurl.length) {
            return next(new restify.InvalidArgumentError('illegal file name'));
        }
        var filename = fileurl.substr(index+1);
        index = filename.lastIndexOf('.');
        if (index < 0) {
            return next(new restify.InvalidArgumentError('illegal file name'));
        }
        var pluginName = filename.substr(0, index);
        self.pluginMgr.addPlugin(pluginName, req.params.fileurl, function(err, info) {
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
            return productMgr.products[key].productName();
        });
        res.send(JSON.stringify(products));
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
            res.send(JSON.stringify(showProductInfo));
            return next();
        }
    });
    */

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
    self.server.post('/product/:name/:channelName', function(req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            fs.readFile(pathLib.join(Constants.productDir, req.params.name, req.params.channelName+'.json'), {encoding: 'utf-8'},
            function (err, data) {
                if (err) {
                    return next(new restify.ResourceNotFoundError("cant find channel config under product"));
                }
                try {
                    product.startChannel(req.params.channelName, JSON.parse(data));
                    res.send(JSON.stringify({code: 0}));
                } catch (e) {
                    return next(new restify.InvalidArgumentError(e.message));
                }
                return next();
            });
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
    self.server.del('/product/:name/:channelName', function(req, res, next) {
        var product = productMgr.products[req.params.name];
        if (!product) {
            return next(new restify.ResourceNotFoundError(req.params.name));
        } else {
            var err = product.stopChannel(req.params.channelName);
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

