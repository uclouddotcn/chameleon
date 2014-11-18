var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var pathLib =  require('path');
var util = require('util');
var constants = require('./constants');
var Product = require('./product');
var restify = require('restify');
var async = require('async');

var ProductMgr = function(pluginMgr, pendingOrderStore, logger) {
    this.products = {};
    this._pluginMgr = pluginMgr;
    this._pendingOrder = pendingOrderStore;
    this._logger = logger;
    EventEmitter.call(this);
};

util.inherits(ProductMgr, EventEmitter);

/**
 * load products from local folders
 * @name ProductMgr.prototype._loadProducts
 * @function
 */
ProductMgr.prototype.loadProductsSync = function () {
    var cfgpath = constants.productDir;
    var self = this;
    fs.readdirSync(cfgpath).forEach(function (fileName) {
        var p = pathLib.join(cfgpath, fileName);
        if (!fs.statSync(p).isDirectory()) {
            return;
        }
        try {
            self._loadProductSync(fileName, p);
        } catch (err) {
            self._logger.error( {err: err, name: p}, 
                'invalid plugin module');
            throw err;
        }
    });
};

ProductMgr.prototype.addProduct = function (name, productCfg, cb) {
    var cfgpath = constants.productDir;
    var p = pathLib.join(cfgpath, name);
    var self = this;
    try {
        var product = Product.createProduct(name, p, productCfg, this, this._pendingOrder, self._pluginMgr, this._logger);
        self._newProductDir(name, p, productCfg, function (err) {
            if (err) {
                return cb(err);
            }
            self.products[name] = product;
            product.loadAllChannels({});
            self.emit('start-product', {name: name, product: product});
            return cb();
        });
    } catch (e) {
        cb(new restify.InvalidArgumentError(e.message));
    }
};

ProductMgr.prototype._newProductDir = function (name, productPath, productCfg, cb) {
    fs.mkdir(productPath, function (err) {
        if (err) {
            return cb(new restify.InternalError(err.message));
        }
        var productCfgPath = pathLib.join(productPath, '_product.json');
        fs.writeFile(productCfgPath, JSON.stringify(productCfg), 
            function (err) {
                if (err) {
                    fs.rmdir(productPath)
                }
                cb(err);
            });
    });
};


/**
 * load single product synchronous
 * @name ProductMgr.prototype._loadProductSync
 * @function
 * @param {string} productName the name of the product
 * @param {string} cfgpath the path of the product config
 */
ProductMgr.prototype._loadProductSync = function (productName, cfgpath) {
    var self = this;    
    var productCfg = null;
    var channelCfg = {};
    fs.readdirSync(cfgpath).forEach(function (fileName) {
        var p = cfgpath + '/' + fileName;
        if (!fs.statSync(p).isFile() || pathLib.extname(fileName) !== '.json') {
            return;
        }
        if (fileName === '_product.json') {
            productCfg = constants.loadJsonCfgSync(p);
        } else {
            var name = pathLib.basename(fileName, '.json');
            channelCfg[name] = constants.loadJsonCfgSync(p);
        }
    });
    if (!productCfg) {
        throw new Error('Product '+productName+
        ' must have "product.json" under the config');
    }
    var product = Product.createProduct(productName, cfgpath, productCfg, this,
        self._pendingOrder, self._pluginMgr, self._logger);
    product.loadAllChannels(channelCfg);
    self.products[productName] = product;
    self.emit('start-product', {name: productName, product: product});
};

module.exports = ProductMgr;

