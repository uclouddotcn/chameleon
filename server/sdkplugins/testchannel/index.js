var crypto = require('crypto');
var querystring = require('querystring');
var uuid = require('uuid');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var SDKPluginBase = commonLib.SDKPluginBase;

var TestChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
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


TestChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    var self = this;
    var orderId = uuid.v4();
    if (wrapper) {
        setImmediate(callback, null, orderId, params);
        setTimeout(function () {
            var payStatus = 0;
            if (params.uid === 'test_2') {
                payStatus = -1;
            }

            wrapper.userAction.pay(wrapper.channelName, params.uid, params.appUid,
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
    createSDK: function (logger, cfgChecker) {
                return new TestChannel(logger, cfgChecker);
            }
};



