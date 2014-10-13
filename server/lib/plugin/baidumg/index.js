var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var ErrorCode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    appSecret: 'string',
    requestUri: '?string'
};


var BaidumgChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.requestUri = "http://sdk.m.duoku.com";
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(BaidumgChannel, SDKPluginBase);

BaidumgChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var cfgItem = wrapper.cfg;
    var q = '/openapi/sdk/checksession?' + 
        querystring.stringify({
            appid: cfgItem.appId,
            appKey: cfgItem.appKey,
            uid: others,
            sessionid: token,
            clientsecret: this.calcSecret([cfgItem.appId,
                cfgItem.appKey, others, token, cfgItem.appSecret])
        });
    this.client.get(q, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }  
        if (obj.error_code == '0') {
            callback(null, {
                code: 0,
                loginInfo: {
                    uid: others,
                    token: token,
                    channel: wrapper.channelName
                }
            });
        } else {
            req.log.debug({code: obj.error_code}, "Fail to verify login");
            callback(null, {
                code: self.mapError(obj.error_code)
            });
        }
    });
};


BaidumgChannel.prototype.calcSecret = function (params) {
    var s = params.join('');
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex').toLowerCase();
};

BaidumgChannel.prototype.getPayUrlInfo = function ()  {
    var self = this;
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        },
        {
            method: 'get',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        }
    ];
};

BaidumgChannel.prototype.respondsToPay = function (req, res, next) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        var customInfos = params.aid.split('|');
        var channel = customInfos[0]
        var wrapper = this._channels[channel];
        if (!wrapper) {
            this._userAction.payFail(channel, params.orderid, ErrorCode.ERR_PAY_ILL_CHANNEL);
            self.send(res, 'SUCCESS');
            return next();
        }
        var cfgItem = wrapper.cfg;
        var expectSign = this.calcSecret([params.amount, params.cardtype,
            params.orderid, params.result, params.timetamp,
            cfgItem.appSecret, escape(params.aid)]);
        if (expectSign != params.client_secret) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            self.send(res, 'ERROR_SIGN');
            return next();
        }
        var other = {
            chOrderId: params.order_id
        };
        var amount = Math.round(parseFloat(params.amount) * 100);
        var infoObj = querystring.parse(params.aid);
        this._userAction.pay(wrapper.channelName, infoObj.uid, infoObj.appuid,
            params.orderid, getPayStatus(params.result), 
            infoObj.pid, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'SUCCESS');
                return next();
            }
        );
    } catch (e) {
        req.log({err: e}, 'Fail to parse pay notification');
        self.send(res, 'ERROR_FAIL');
        return next();
    }

};

BaidumgChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};


function getPayStatus(flag) {
    if (flag == '1') {
        return ErrorCode.ERR_OK;
    } else {
        return ErrorCode.ERR_PAY_FAIL;
    }
}


BaidumgChannel.prototype.mapError = function(errorCode) {
    if (errorCode == '101') {
        return 5;
    } else if (errorCode == '103') {
        return 2;
    } else if (errorCode == '11') {
        return 13;
    } else if (errorCode == '1' ||
               errorCode == '2' ||
               errorCode == '3' ||
               errorCode == '4' ||
               errorCode == '7') {
        return 4;
    } else {
        return 1;
    }
};

function escape(c) {
    var cc = encodeURIComponent(c);
    return cc.replace(/\*/g, '%2A');
}

module.exports =
{
    name: 'baidumg',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, checker) {
                return new BaidumgChannel(userAction, logger, checker);
            }
};



