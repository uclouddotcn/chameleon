var EventSummarizer = require('./event-summarizer');
var FunctionUnits = require('./functionunits');
var restify = require('restify');

function Admin(productMgr, eventCenter, statLogger) {
    this.exitFunc = null;
    this.productMgr = productMgr;
    this.eventCollector = new EventSummarizer(eventCenter, statLogger);
}

Admin.prototype.init = function (emitter) {
    var self = this;
    emitter.register('monitor.event', function (req, callback) {
        if (req && req.product) {
            var res = self.eventCollector.getProductSummary(req.product);
            if (res instanceof Error) {
                callback(res);
            } else {
                callback(null, res);
            }
        } else {
            callback(null, self.eventCollector.getSummary());
        }
    });

    emitter.register('monitor.status', function (req, callback) {
        var status = FunctionUnits.getStatus();
        callback(null, status);
    });

    emitter.register('products.getall', function (req, callback) {
         var products = Object.keys(self.productMgr.products).map(function (key) {
            return self.productMgr.products[key].productName();
         });
         callback(null, products);
    });

    emitter.register('product.new', function (req, callback) {
        if (!req.product || !req.cfg) {
            callback(new Error("Invalid Arguments"));
            return;
        }
        var product = self.productMgr.products[req.product];
        if (product) {
            callback(new Error("Product existed: " + req.product));
            return;
        }
        self.productMgr.addProduct(req.product, req.cfg, function (err) {
            callback(err);
        });
    });

    emitter.register('product.update', function (req, callback) {
        var product = self.productMgr.products[req.product];
        if (!product) {
            callback(new Error("Product not existed: " + req.product));
            return;
        }
        product.updateCfg(req.cfg, function (err) {
            callback(err);
        });
    });

    emitter.register('product.addchannel', function (req, callback) {
        var product = self.productMgr.products[req.product];
        if (!product) {
            return callback(new Error('Product not found: ' + req.product));
        } else {
            try {
                if (product.getChannel(req.channel)) {
                    product.modifyChannel(req.channel, req.cfg);
                } else {
                    product.startChannel(req.channel, req.cfg);
                }
                product.saveChannelCfg(req.channel);
                callback(null);
            } catch (e) {
                callback(e);
            }
        }
    });

    emitter.register('product.updatechannel', function (req, callback) {
        var product = self.productMgr.products[req.product];
        if (!product) {
            return callback(new Error('Product not found: ' + req.product));
        } else {
            try {
                product.modifyChannel(
                    req.channel, req.cfg);
                product.saveChannelCfg(req.channel);
                callback(null);
            } catch (e) {
                callback(e);
            }
        }
    });

    emitter.register('product.stopchannel', function (req, callback) {
        var product = self.productMgr.products[req.product];
        if (!product) {
            return callback(new Error('Product not found: ' + req.product));
        } else {
            var err = product.stopChannel(req.channel);
            callback(err);
        }
    });
};

Admin.prototype.registerExitFunc = function (exitFunc) {
    this.exitFunc = exitFunc;
};

module.exports = Admin;