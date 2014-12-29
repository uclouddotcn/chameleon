var constants = require('./constants');
var levelup = require('levelup');
var path = require('path');

function LevelDBClient(options, logger) {
    if (!options) {
        options = {};
    }
    var dbPath = options.path || DEFAULT_LV_DB_PATH;
    var self = this;
    self.db = levelup(dbPath);
    self.logger = logger;
    self.errFunc = function onError (err) {
        self.store.emit(err);
    }
}

LevelDBClient.prototype.set = function (key, value, callback) {
    var self = this;
    self.logger.debug({key: key}, 'level db set');
    self.db.put(key, value, function (err) {
        if (err) {
            return callback(err);
        }
        callback();
        self.logger.trace({key: key}, 'level db set finished');
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

function LocalSettings (cfgfolder, logger) {
    this.db = new LevelDBClient({
        path: path.join(cfgfolder, 'localsetting')
    }, logger);
}

LocalSettings.prototype.get = function (category, name, callback) {
    this.db.get(this._name(category, name), callback);
};

LocalSettings.prototype.set = function (category, name, value) {
    this.db.set(this._name(category, name), value);
};

LocalSettings.prototype._name = function (category, name) {
    return category+':'+name;
};

module.exports = LocalSettings;


