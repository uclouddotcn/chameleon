var levelup = require('levelup');
var path = require('path');

function LevelDBClient(store, options) {
    if (!options) {
        options = {};
    }
    var dbPath = options.path || DEFAULT_LV_DB_PATH;
    var self = this;
    self.db = levelup(dbPath);
    self.store = store;
    self.timeoutPool = {};
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


var DEFAULT_LV_DB_PATH = 
    path.join(__dirname, '../../../../log/pending-order.db');

module.exports = {
    createClient: function (store, options) {
        return new LevelDBClient(store, options);
    }
}


