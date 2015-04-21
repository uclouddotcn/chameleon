var levelup = require('levelup');
var path = require('path');


function LevelDBClient(store, options, logger, env) {
    if (!options) {
        options = {};
    }
    var dbPath = options.path || path.join(env.billDir, 'pending-order.db');
    var self = this;
    self.db = levelup(dbPath);
    self.store = store;
    self.timeoutPool = {};
    self.logger = logger;
    self.errFunc = function onError (err) {
        self.store.emit(err);
    }
}

LevelDBClient.prototype.set = function (key, value, timeout, callback) {
    var self = this;
    self.store.logger.debug({key: key}, 'level db set');
    self.db.put(key, value, function (err) {
        if (err) {
            return callback(err);
        } 
        self.store.logger.debug({timeout: timeout}, 'timeout set to ' + timeout);
        var timeoutObj = setTimeout(function () {
            self.db.del(key);
        }, timeout*1000);
        self.timeoutPool[key] = timeoutObj;
        callback();
        self.store.logger.trace({key: key}, 'level db set finished');
    });
};

LevelDBClient.prototype.get = function (key, callback) {
    var self = this;
    self.db.get(key, function (err, obj) {
        if (err) {
            if (err.notFound) {
                return callback(null, null);
            } else {
                return callback(err);
            }
        }
        return callback(null, obj);
    });
};

LevelDBClient.prototype.del = function (key, callback) {
    var self = this;
    delete self.timeoutPool[key];
    self.db.del(key, callback);
};

LevelDBClient.prototype.close = function (callback) {
    console.log("level db exit");
    this.db.close(callback);
};


module.exports = {
    createClient: function (store, options, logger, env) {
        return new LevelDBClient(store, options, logger, env);
    }
}


