var path = require('path');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

function StubBase (logger) {
    // 0 -- init
    // 1 -- started
    // -1 -- dead
    this.rqst = {};
    this.logger = logger;
    EventEmitter.call(this);
}

util.inherits(StubBase, EventEmitter);

StubBase.prototype.__onMsg = function (msg) {
    if (msg.header.rsp) {
        var _id = msg.header._id
        if (this.rqst[_id]) {
            this.rqst[_id](msg.body.err, msg.body.value);
        } else {
            this.logger.info({id: _id, rsp: msg.body}, "fail to find reply callback");
        }
    } else {
        this.emit(msg.header.msg, msg.body);
    }
};

StubBase.prototype.request = function (msgid, reqid, rqst, callback) {
    this.rqst[reqid] = callback;
    var r = {
        header: {
            msg: msgid,
            _id: reqid
        },
        body: rqst
    };
    this.__send(r);
};

StubBase.prototype.reply = function (header, err, value) {
    header.rsp = true;
    var r = {
        header: header,
        body: {
            err: err,
            value: value
        }
    };
    this.__send(r)
};

module.exports.StubBase = StubBase;

