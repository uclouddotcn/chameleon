var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var sdkerror = require('../../sdk-error');
var uuid = require('uuid');

var TestChannel = function(name, cfgItem, userAction, logger) {
    this.name = name;
    this.userAction = userAction;
    this.logger = logger;
};

TestChannel.prototype.getInfo = function () {
    return {};
};

TestChannel.prototype.verifyLogin = 
function(token, others, callback) {
    var self = this;
    if (token === 'test_1') {
        setImmediate(callback, null, {
            code: -1
        });
    } else {
        setImmediate(callback, null, {
            code: 0,
            loginInfo: {
                uid: token,
                token: token + '_session',
                channel: 'test',
                name: token
            }
        });
    }
};

TestChannel.prototype.getChannelSubDir = function ()  {
    var self = this;
    return [
    ];
};


TestChannel.prototype.reloadCfg = function (cfgItem) {
};

TestChannel.prototype.pendingPay = function (params, callback) {
    var self = this;
    var orderId = uuid.v4();
    setImmediate(callback, null, orderId, params);
    setTimeout(function () {
        var payStatus = 0;
        if (params.uid === 'test_2') {
            payStatus = -1;
        } 

        self.userAction.pay(self.name, params.uid, params.appUid, 
            orderId, payStatus, 
            params.productId, params.productCount, params.realPayMoney, {},
            function (err, result) {
            }
        );
    }, 2000);
}


module.exports =
{
    name: 'test',
    cfgDesc: {},
    create: function (name, cfgItem, userAction, logger) {
                return new TestChannel(name, cfgItem, userAction, logger);
            }
};



