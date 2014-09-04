var path = require('path')
var levelup = require('levelup');

var DEFAULT_LV_DB_PATH = 
    path.join(__dirname, '../data/pending-order.db');

var DBInstance = function(callback) {
    var self = this;
    var dbPath = DEFAULT_LV_DB_PATH;
    levelup(dbPath, function (err, db) {
        if (err) {
            return callback(err);
        }
        self.db = db;
        return callback(null);
    });
}

DBInstance.prototype.get =
function(table, key, callback) {
    var self = this;
    var queryKey = table + '-' + key;
    self.db.get(queryKey, function (err, obj) {
        if (err) {
            return callback(err);
        }
        return callback(null, obj);
    });
};

DBInstance.prototype.set =
function(table, key, value, callback) {
    var self = this;
    var queryKey = table + '-' + key;
    self.db.put(queryKey, value, callback);
};

DBInstance.prototype.del = 
function(table, key, callback) {
    var queryKey = table + '-' + key;
    self.db.del(queryKey, callback);
}

function createDBInstance(options) {
    return new DBInstance(options);
}


module.exports = {
    create: createDBInstance
}

