
var MockLogger = function() {

};
exports.MockLogger = MockLogger;

MockLogger.prototype.makeMsg = function (obj, msg) {
    if (obj instanceof String) {
        msg = obj;
        obj = null;
    }
    var output = msg + ': ';
    if (obj) {
        output += JSON.stringify(obj);
    }
    return output;
};

MockLogger.prototype.debug = function (obj, msg) {
    console.log(this.makeMsg(obj, msg));
};

MockLogger.prototype.error = function (obj, msg) {
    console.error(this.makeMsg(obj, msg));
};

MockLogger.prototype.info = function (obj, msg) {
    console.info(this.makeMsg(obj, msg));
};

var LocalSettings = function () {
    this.val = {};
    this.setExpect = null;
};
exports.LocalSettings = LocalSettings;

LocalSettings.prototype.set = function (category, name, value) {
    if (this.setExpect) {
        this.setExpect(this, category, name, value);
    }
    this.val[category+':'+name] = value;
};

LocalSettings.prototype.get = function (category, name, callback) {
    var v = this.val[category+':'+name];
    setImmediate(callback, null, v);
};

