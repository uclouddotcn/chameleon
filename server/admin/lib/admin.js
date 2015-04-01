var restify = require('restify');
var child_process = require('child_process');
var versionParser = require('./versionparser');
var VError = require('verror');
var fs = require('fs');
var fse = require('fs-extra');
var async = require('async');
var path = require('path');
//var Encryption = require('./encryption');
var workerMgr = require('./worker_mgr');
var constants = require('./constants');

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
    self.server.use(restify.bodyParser({
        mapParams: true
    }));
    self.server.use(restify.queryParser({
        mapParams: true
    }));
    var requestPoster = options.requestPoster || workerMgr;

    self.server.post('/admin', function (req, res, next) {
        try {
            switch (req.params.action) {
                case 'start':
                    if (workerMgr.status !== 'stop') {
                        return next(new restify.InvalidArgumentError('worker may be already started, ' +
                        'using restart if you really know what you are doing'));
                    } else {
                        if (req.params.cfg) {
                            self.startWorkerAndSave(req.params.cfg, function (err) {
                                if (err) {
                                    return next(new restify.InvalidArgumentError(err.message));
                                } else {
                                    res.send(workerMgr.info);
                                }
                                return next();
                            });
                        } else {
                            self.startWorkerFromFile(function (err) {
                                if (err) {
                                    return next(new restify.InvalidArgumentError(err.message));
                                } else {
                                    res.send(workerMgr.info);
                                }
                                return next();
                            })
                        }
                    }
                    break;
                case 'restart':
                    workerMgr.restartWorker(req.params.cfg, function (err) {
                        if (err) {
                            return next(new restify.InvalidArgumentError(err.message));
                        } else {
                            if (req.params.cfg) {
                                saveWorkerCfg(req.params.cfg);
                            }
                            res.send(workerMgr.info);
                        }
                        return next();
                    });
                    break;
                case 'stop':
                    workerMgr.stop(function () {
                        res.send();
                        return next();
                    });
                    break;
                case 'info':
                    var msg = workerMgr.info;
                    if (!res) {
                        msg = 'worker is no started';
                    }
                    res.send(msg);
                    return next();
                    break;
                default:
                    return next(new restify.InvalidArgumentError(''));
            }
        } catch (e) {
            logger.error({err: e, req: req}, 'Fail to handle admin request');
            return next(new restify.InvalidArgumentError(e.message));
        }
    });

    self.server.post('/worker/install', function (req, res, next) {
        var s = req.params.workerzipFile;
        child_process.exec('node ' + path.join(__dirname, '..', 'script', 'installworker.js') + ' ' + s, function (err, stdout, stderr) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.send();
            return next();
        });
    });

    self.server.post('/worker/start', function (req, res, next) {
        var cfg = versionParser.genDefaultWorkerCfg(req.params.version);
        if (workerMgr.status === 'running') {
            workerMgr.restartWorker(cfg, function (err) {
                if (err) {
                    return next(new restify.InvalidArgumentError(err.message));
                } else {
                    saveWorkerCfg(cfg);
                    res.send(workerMgr.info);
                }
                return next();
            });
        } else {
            self.startWorkerAndSave(cfg, function (err) {
                if (err) {
                    return next(new restify.InvalidArgumentError(err.message));
                }
                res.send(workerMgr.info);
                return next();
            });
        }
    });

    self.server.get('/worker/info', function (req, res, next) {
        var msg = workerMgr.info;
        if (!res) {
            msg = 'worker is no started';
        }
        res.send(msg);
        return next();
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
    self.server.get('/sdk', function (req, res, next) {
        var infos = pluginMgr.getAllPluginInfos().map(formatPluginInfo);
        res.send(infos);
        return next();
    });

    // path for adding a plugin 
    self.server.post('/sdk', function(req, res, next) {
        self.pluginMgr.upgradePlugin(req.params.fileurl, req.params.md5value, function(err, info, version, path) {
            if (err) {
                req.log.info({err:err}, 'fail to add plugin');
                return next(new restify.InvalidArgumentError(err.message));
            }
            var showChannelInfo = {
                name: info,
                version: version,
                path: path
            };
            res.send(showChannelInfo);
            return next();
        });
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
    /*self.server.post('/product', function (req, res, next) {
        req.log.info({params: req.params}, 'recv products');
        var zipfile = req.params.zipfile;
        child_process.exec('node ' + path.join(__dirname, '..', 'script', 'installProducts.js') + ' ' + zipfile, function (err, stdout, stderr) {
            if (err) {
                return next(new restify.InvalidArgumentError(err.message));
            }
            workerMgr.restartWorker(null, function (err) {
                req.log.debug({err: err}, 'worker restarted');
                if (err) {
                    return next(new restify.InternalError('Fail to restart worker: ' + err.message));
                }
                res.send('');
                return next();
            });
        });
    });*/

    self.server.get('/product', function(req, res, next){
        requestPoster.request('product.getproduct', {product: req.params.product}, function(err, productInfo){
            if (err) {
                req.log.info({err:err}, 'fail to get product');
                return next(new restify.InvalidArgumentError(err.message));
            }
            res.json(productInfo);
            return next();
        });
    });

    //path for update server config
    //var encryption = new Encryption(path.join(constants.baseDir, 'config', 'key'));
    self.server.post('/product', function(req, res, next){
        var product;
        try{
            req.log.info({params: req.body}, 'receive product config');
            //product = JSON.parse(req.params.product);
            //product = encryption.decrypt(decodeURIComponent(req.params.product));
            product = JSON.parse(req.body);
        }catch (e){
            req.log.error({err: e}, 'Fail to load product');
            return next(new restify.InvalidArgumentError("load product failed."));
        }

        var productConfigPath = path.join(constants.productDir, product['name']);
        async.series([
            function(callback){
                if(fs.existsSync(productConfigPath)){
                    fse.move(productConfigPath, '.'+productConfigPath + '.backup', true, function(err){
                        if(err) {
                            return callback(new restify.InvalidArgumentError(err.message));
                        }
                        callback(null);
                    });
                }else{
                    callback(null);
                }
            },
            function(callback){
                fse.outputJSON(productConfigPath, product, function(err){
                    if(err){
                        return callback(new restify.InvalidArgumentError(err.message));
                    }
                    callback(null);
                });
            },
            function(callback){
                workerMgr.restartWorker(null, function (err) {
                    req.log.debug({err: err}, 'worker restarted');
                    if (err) {
                        return callback(new restify.InternalError('Fail to restart worker: ' + err.message));
                    }
                    callback(null);
                });
            }
        ], function(err){
            if(err){
                return next(err);
            }
            res.send('Update product success.');
            next();
        });

    });

    /*
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
    */

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
};

Admin.prototype.close = function (callback) {
    this.logger.info('admin server exit');
    return this.server.close(callback);
};

Admin.prototype.registerExitFunc = function (func) {
    this.exitFunc = func;
};

Admin.prototype.startWorkerFromFile = function (callback) {
    var cfgpath = getWorkerCfgPath();
    var self = this;
    fs.exists(cfgpath, function (exists) {
        if (exists) {
            fs.readFile(cfgpath, 'utf8', function (err, content) {
                if (err) {
                    callback(new VError(err, 'Fail to read config from ' + cfgpath));
                    self.logger.error({err: err}, 'Fail to read config');
                    return;
                }
                try {
                    var workerCfg = JSON.parse(content);
                } catch (e) {
                    self.logger.error({err: e}, 'Fail to read config');
                    return callback(new VError(err, 'Fail to parse json'))
                }
                self.startWorker(workerCfg, callback);
            });
        } else {
            setImmediate(callback);
        }
    });
};

Admin.prototype.startWorkerAndSave = function (workercfg, callback) {
    this.startWorker(workercfg, function (err) {
        if (err) {
            return callback(err);
        }
        saveWorkerCfg(workercfg);
        callback();
    });
};

function saveWorkerCfg(cfg) {
    var cfgpath = getWorkerCfgPath();
    fs.writeFile(cfgpath, JSON.stringify(cfg, null, '\t'));
}

Admin.prototype.startWorker = function (workercfg, callback) {
    var self = this;
    workerMgr.init(self.logger, self.pluginMgr, workercfg, function (err) {
        if (err) {
            self.logger.error({err: err}, "Fail to init worker");
            callback(err);
            return;
        }
        callback(null, null);
    });
};

function getWorkerCfgPath () {
    return path.join(constants.baseDir, 'config', 'worker.json');
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

