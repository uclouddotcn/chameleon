function RequestPoster() {
    this.cmdHandler = {};
}

RequestPoster.prototype.request = function (msgid, body, callback) {
    var func = this.cmdHandler[msgid];
    func(body, function (err, body) {
        callback(err, body);
    });
};

RequestPoster.prototype.register = function (cmdid, handler) {
    this.cmdHandler[cmdid] = handler;
};


module.exports = RequestPoster;

