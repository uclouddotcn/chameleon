var redis = require('redis');

/**
 *  Redis client
 * @class RedisClient, for the pending order storage
 * @param store, the logic instance holding this client
 * @param options, the config for redis client
 */
function RedisClient (store, options) {
    var self = this;
    if (!options || !options.port) {
        throw new Error("options for redis client must have port");
    }
    self.client = redis.createClient(options.port, 
                                     options.host, 
                                     options);
    self.client.on('error', function (err) {
        store.emit('error', 
            new WError(err, 'PendingOrderStore internal error'));
    });
}

RedisClient.prototype.set = function (key, value, timeout, callback) {
    var self = this;
    self.client.set(key, value, 'EX', timeout, callback);
};

RedisClient.prototype.get = function (key, callback) {
    var self = this;
    self.client.get(key, callback);
};

RedisClient.prototype.del = function (key, callback) {
    var self = this;
    self.client.del(key, callback);
};

module.exports = {
    createClient: function (store, options) {
        return new RedisClient(store, options);
    }
}



