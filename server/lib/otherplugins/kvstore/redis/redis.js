var redis = require('redis');
var WError = require('verror').WError;

/**
 *  Redis client
 * @class RedisClient, for the pending order storage
 * @param store the logic instance holding this client
 * @param options the config for redis client
 * @param logger logger
 */
function RedisClient (store, options, logger) {
    if (!options.instance) {
        throw new Error("have no instance config in redis");
    }
    this.activeClients = [];
    this.clients = [];
    this.client = null;
    this.logger = logger;
    for (var i in options.instance) {
        var instCfg = options.instance[i];
        this.createClient(instCfg);
    }
    this.store = store;
}

Object.defineProperty(RedisClient.prototype, "activeClient", {
    get: function() {
        return this.activeClients[0];
    }
});

RedisClient.prototype.createClient = function (instCfg) {
    if (!instCfg.port) {
        throw new Error("cant find 'port' in redis cfg");
    }
    var client = redis.createClient(instCfg.port, instCfg.host, {
        enable_offline_queue: false, // disable the offline queue, use ourself
        retry_max_delay: 10000 // retry delay at most 10s
    });
    this.clients.push(client);
    var self = this;
    client.on('error', function (err) {
        self.logger.error({err: err}, "redis client on error");
    });
    client.on('ready', function (err) {
        self.logger.debug('redis event ready');
        var i = self.activeClients.length;
        self.activeClients.push(client);
        if (i === 0) {
            self.store.emit('store-ready');
        }
    });
    client.on('end', function () {
        self.logger.debug('redis event end');
        for (var i in self.activeClients) {
            if (self.activeClients[i] == client) {
                self.activeClients.splice(i, 1);
                break;
            }
        }
        if (self.activeClients.length === 0) {
            if (self.closecb) {
                self.closecb();
                self.closecb = null;
            } else {
                self.store.emit('store-fail', 'redis instance all dead');
            }
        }
    });
};

RedisClient.prototype.set = function (key, value, timeout, callback) {
    var self = this;
    if (!self.activeClient) {
        if (callback) {
            callback(new Error('all redis client gone'));
        }
        return;
    }
    self.activeClient.set(key, value, 'EX', timeout, function (err, res) {
        if (err) {
            self.logger.error({err: err}, 'fail to set clients');
        }
        if (callback) {
            callback(err, res);
        }
    });
};

RedisClient.prototype.get = function (key, callback) {
    var self = this;
    if (!self.activeClient) {
        if (callback) {
            callback(new Error('all redis client gone'));
        }
        return;
    }
    self.activeClient.get(key, function (err, res) {
        if (err) {
            self.logger.error({err: err}, 'fail to set clients');
        }
        if (callback) {
            callback(err, res);
        }
    });
};

RedisClient.prototype.del = function (key, callback) {
    var self = this;
    if (!self.activeClient) {
        if (callback) {
            callback(new Error('all redis client gone'));
        }
        return;
    }
    self.activeClient.del(key, function (err, res) {
        if (err) {
            self.logger.error({err: err}, 'fail to set clients');
        }
        if (callback) {
            callback(err, res);
        }
    });
};

RedisClient.prototype.close = function (callback) {
    for (var i in this.clients) {
        this.clients[i].quit();
    }
    this.closecb = callback;
};

module.exports = {
    createClient: function (store, options, logger) {
        return new RedisClient(store, options, logger);
    }
}



