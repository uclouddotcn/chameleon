var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var restify = require('restify');
var async = require('async');
var ErrorCode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    appSecret: 'string',
    requestUri: '?string'
};


var XiaomiChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.requestUri = "http://mis.migc.xiaomi.com";
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: this._logger,
        connectTimeout: 10
    });
};
util.inherits(XiaomiChannel, SDKPluginBase);

XiaomiChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var params = {
        appId: wrapper.cfg.appId,
        session: token,
        uid: others
    };
    params.signature = this.calcSecret(params);
    var q = '/api/biz/service/verifySession.do?' + 
        querystring.stringify(params);
    this._logger.debug({params: params}, 'sending ' + q);
    this.client.get(q, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }  
        if (obj.errcode === 200) {
            callback(null, {
                code: 0,
                loginInfo: {
                    uid: others,
                    token: token,
                    channel: wrapper.channelName
                }
            });
        } else {
            req.log.debug({errobj: obj}, "Fail to verify login");
            callback(null, {
                code: self.mapError(obj.errcode)
            });
        }
    });
};


function compareQueryPair(a, b) {
    if (a[0] > b[0]) {
        return 1;
    } else if (a[0] < b[0]) {
        return -1;
    } else {
        return 0;
    }
}


XiaomiChannel.prototype.calcSecret = function (wrapper, params) {
    var paramArray = [];
    for (var key in params) {
        paramArray.push([key, params[key]]);
    }
    paramArray.sort(compareQueryPair);
    var content = '';
    for (var i in paramArray) {
        content += paramArray[i][0]+'='+paramArray[i][1]+'&';
    }
    var hmac = crypto.createHmac('sha1', wrapper.cfg.appSecret);
    hmac.write(content.substr(0, content.length-1), 'utf-8');
    return hmac.digest('hex');
};

XiaomiChannel.prototype.getPayUrlInfo = function ()  {
    var self = this;
    return [
        {
            method: 'get',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        }
    ];
};

XiaomiChannel.prototype.getRspMsg = function(errorCode, message) {
    return {
        errcode: errorCode, 
        errMsg: message
    };
};

XiaomiChannel.prototype.respondsToPay = function (req, res, next) {
    var self = this;
    var params = req.params;
    self._logger.debug({req: req}, 'responds to pay');
    var signature = params.signature;
    delete params.signature;
    try {
        var channelName = params.cpUserInfo;
        var wrapper = this._channels[channelName];
        if (!wrapper) {
            this._userAction.payFail(channelName, params.cpOrderId, ErrorCode.ERR_PAY_ILL_CHANNEL);
            res.send(this.getRspMsg(200));
            return next();
        }

        var expectSign = this.calcSecret(params);
        if (expectSign != signature) {
            self._logger.warn({req: req, expectSign: expectSign,  params: params}, "unmatched sign");
            res.send(this.getRspMsg(1525));
            return next();
        }
        if (params.appId != wrapper.cfg.appId) {
            res.send(this.getRspMsg(1515));
            return next();
        }
        var other = {
            timeStamp: params.payTime,
            orderId: params.orderId,
            partnerGiftConsume: params.partnerGiftConsume
        };
        self._userAction.pay(wrapper.channelName, params.uid, params.appuid,
            params.cpOrderId, getPayStatus(params.orderStatus), 
            params.productCode, params.productCount, params.payFee, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    res.send(self.getRspMsg(3515));
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                var rsp = self.getRspMsg(200);
                self._logger.debug({rsp: rsp}, "recv result");
                res.send(rsp);
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        res.send(self.getRspMsg(3515));
        return next();
    }

};

function getPayStatus(flag) {
    if (flag == 'TRADE_SUCCESS') {
        return ErrorCode.ERR_OK;
    } else {
        return ErrorCode.ERR_PAY_FAIL;
    }
}


XiaomiChannel.prototype.mapError = function (errorCode) {
    if (errorCode === 1525) {
        return ErrorCode.ERR_SIGN_NOT_MATCH;
    } else if (errorCode == 1520 || errorCode == 1516) {
        return ErrorCode.ERR_LOGIN_SESSION_INVALID;
    } else if (errorCode == 1515) {
        return ErrorCode.ERR_SETTING_INVALID_APPID;
    } else {
        return ErrorCode.ERR_FAIL;
    }
};

module.exports =
{
    name: 'xiaomi',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker) {
                return new XiaomiChannel(userAction, logger, cfgChecker);
            }
};



