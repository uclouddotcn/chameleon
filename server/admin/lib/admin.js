var restify = require('restify');
var fs = require('fs');
var workerMgr = require('./worker_mgr');

/**
 * 
 * @class Admin
 * @classdesc Admin server module
 * @constructor
 * @param {PluginMgr} pluginMgr - plugin manager
 * @param {Object} options - not used now...
 * @param {object} logger - logger object
 */
var Admin = function(pluginMgr, options, logger) {
    var self = this;
    self.server = restify.createServer({
        name: 'Admin',
        version: '0.0.1',
        log: logger
    });
    self.logger = logger;

    self.pluginMgr = pluginMgr;
    self.server.use(restify.bodyParser());
    self.server.use(restify.queryParser());
    var requestPoster = options.requestPoster || workerMgr;

    self.server.post('/admin', function (req, res, next) {
        try {
            switch (req.body.action) {
                case 'restart':
                    workerMgr.restartWorker(req.body.cfg, function () {
                        res.send({code: 0});
                    });
                    break;
                case 'stop':
                    workerMgr.stop(function () {
                        res.send({code: 0});
                    });
                case 'info':

                default:
                    return next(new restify.InvalidArgumentError(''));
            }
        } catch (e) {
            logger.error({err: e, req: req}, 'Fail to handle admin request');
            return next(new restify.InvalidArgumentError(e.message));
        }
    });

    self.server.get('/monitor', function (req, res, next) {
        var action = req.params.action;
        requestPoster.request('monitor.'+action, req.params, function (err, rsp) {
            if (!err) {
                res.send(rsp);
            }
            return next(err);
        });
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
        requestPoster.request('products.getall', null, function (err, rsp) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send(rsp);
            return next();
        });
    });

    // path for add a product
    self.server.post('/product/:name', function (req, res, next) {
        requestPoster.request('product.new', {product: req.params.name, cfg: req.body}, function (err, rsp) {
            console.log(err);
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send(rsp);
            return next();
        });
    });

    self.server.put('/product/:name', function (req, res, next) {
        requestPoster.request('product.update', {product: req.params.name, cfg: req.body}, function (err, rsp) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send(rsp);
            return next();
        });
    });


    // path for add a plugin instance
    self.server.post('/product/:name/:channelName', function(req, res, next) {
        requestPoster.request('product.addchannel', {
            product: req.params.name,
            channel: req.params.channelName,
            cfg: req.body
        }, function (err, rsp) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send(rsp);
            return next();
        });
    });


    // path for modify a plugin instance settings
    self.server.put('/product/:name/:channelName', function(req, res, next) {
        requestPoster.request('product.updatechannel', {
            product: req.params.name,
            channel: req.params.channelName,
            cfg: req.body
        }, function (err, rsp) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send(rsp);
            return next();
        });
    });

    // path for stop a channel
    self.server.del('/product/:name/:channelName', function(req, res, next) {
        requestPoster.request('product.stopchannel', {
            product: req.params.name,
            channel: req.params.channelName
        }, function (err, rsp) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send(rsp);
            return next();
        });
    });

    self.server.on('uncaughtException', function (req, res, route, error) {
        req.log.error({route: route, err: error}, 'on uncaught exception');
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

module.exports.createAdmin = function(pluginMgr, options, logger) {
    return new Admin(pluginMgr, options, logger);
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

