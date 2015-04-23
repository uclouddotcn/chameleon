var EventEmitter = require('events').EventEmitter;
var util = require('util');
var WError = require('verror').WError;
var path = require('path');
var FuncUnits = require('./functionunits');
var env = require('./env');

// API
module.exports.createPendingOrderStore = function (options, logger) {
    return new PendingOrderStore(options, logger);
};


var DEFAULT_STORE_ENGINE = ['redis', 'leveldb'];

var PendingOrderStore = function (options, logger) {
    if (!options || !options.type ) {
        throw new Error("Missing Pending order");
    }
    var self = this;
    self.logger = logger;
    self.client = null;
    self.ttl = options.ttl || 3600;
    self.status = {
        status: 'initing'
    };
    self.loadKvPlugin(options, logger);
    EventEmitter.call(this);
    self.on('store-fail', function (msg) {
        self.status.status = 'fail';
        self.status.msg = msg;
    });
    self.on('store-ready', function (msg) {
        self.status.status = 'ok';
        if (self.status.msg) {
            delete self.status.msg;
        }
    });
    FuncUnits.register('PendingOrderStore', this);
};

util.inherits(PendingOrderStore, EventEmitter);

/**
 * pending order operation callback
 * @callback PendingOrderStore~opCallback
 * @param {verror~WError} err - operation error
 * @param {Object} res - null or the object fetched from storage
 */


PendingOrderStore.prototype.close = function (callback) {
    this.client.close(callback);
}

/**
 * store pending order
 * @name 
 * @function
 * @param {string} orderId - key
 * @param {Object} orderInfo - the object to store
 * @param {PendingOrderStore~opCallback} callback 
 */
PendingOrderStore.prototype.addPendingOrder = 
function (orderId, orderInfo, callback) {
    var self = this;
    if (!self.client) {
        throw new WError("The pending order store is not inited");
    }
    self.logger.trace(
        {orderId: orderId, order: orderInfo}, 'add order');
    var realCallback = null;
    if (callback) {
        realCallback = function (err)  {
            if (err) {
                return callback(new WError(err, "store pending order failed"));
            }
            callback(null, null);
        };
    }
    self.client.set(orderId, JSON.stringify(orderInfo), self.ttl, 
        realCallback);
};

/**
 * fetch pending order
 * @name 
 * @function
 * @param {string} orderId - key
 * @param {PendingOrderStore~opCallback} callback 
 */
PendingOrderStore.prototype.getPendingOrder = 
function(orderId, callback) {
    var self = this;
    if (!self.client) {
        throw new WError("The pending order store is not inited");
    }
    self.client.get(orderId, 
        function (err, res) { 
            self.logger.trace(
                {orderId: orderId, order: res, err: err}, 'get order');
            if (err) {
                self.logger.debug({err: err}, "get pending order failed");
                return callback(new WError(err, "get pending order failed"));
            }
            if (!res) {
                callback({code: 0});
            } else {
                callback(null, JSON.parse(res));
            }
        });
};

/**
 * delete pending order
 * @name 
 * @function
 * @param {string} orderId - key
 * @param {PendingOrderStore~opCallback} callback 
 */
PendingOrderStore.prototype.deletePendingOrder = 
function(orderId, callback) {
    var self = this;
    if (!self.client) {
        throw new WError("The pending order store is not inited");
    }
    var realCallback = null;
    if (callback) {
        realCallback = function (err)  {
            if (err) {
                return callback(new WError(err, "delete pending order failed"));
            }
            callback(null, null);
        };
    }
    self.logger.trace(
            {orderId: orderId}, 'delete order');
    try {
        self.client.del(orderId, realCallback);
    } catch (e) {
        self.logger.error({err: err}, 'Fail to delete order ' + orderId);
    }
};


PendingOrderStore.prototype.loadKvPlugin = function(option, logger) {
    var name = option.type;
    var defaultIndex = DEFAULT_STORE_ENGINE.indexOf(name);
    var moduleName = name;
    if (defaultIndex >= 0) {
        moduleName = './kvstore/'+moduleName;
    }
    try {
        var m = require(moduleName);
        this.client = m.createClient(this, option, logger, env);
    } catch (e) {
        this.logger.error({err: e}, "Fail to load plugin");
        throw new Error('Fail to load store engine as ' + moduleName + '\n' +
            'Please use check the config file!');
    }
};

