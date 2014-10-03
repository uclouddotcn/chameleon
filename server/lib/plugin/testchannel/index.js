var crypto = require('crypto');
var querystring = require('querystring');
var uuid = require('uuid');
var util = require('util');

var async = require('async');
var restify = require('restify');

var SDKPluginBase = require('../../SDKPluginBase');

var TestChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
};
util.inherits(TestChannel, SDKPluginBase);

TestChannel.prototype.getInfo = function () {
    return {};
};

TestChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
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
                channel: wrapper.channelName,
                name: token
            }
        });
    }
};

TestChannel.prototype.getPayUrlInfo = function ()  {
    return [
    ];
};


TestChannel.prototype.pendingPay = function (params, infoFromSDK, callback) {
    var self = this;
    var orderId = uuid.v4();
    var wrapper = this._channels[infoFromSDK.channel];
    if (wrapper) {
        setImmediate(callback, null, orderId, params);
        setTimeout(function () {
            var payStatus = 0;
            if (params.uid === 'test_2') {
                payStatus = -1;
            }

            self._userAction.pay(wrapper.channelName, params.uid, params.appUid,
                orderId, payStatus,
                params.productId, params.productCount, params.realPayMoney, {},
                function (err, result) {
                }
            );
        }, 2000);
    } else {
        var err = new Error();
        err.code = 1;
        setImmediate(callback, err);
    }
};


module.exports =
{
    name: 'test',
    cfgDesc: {},
    createSDK: function (userAction, logger, cfgChecker) {
                return new TestChannel(userAction, logger, cfgChecker);
            }
};



