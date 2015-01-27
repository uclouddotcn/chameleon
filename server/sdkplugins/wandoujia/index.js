var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var restify = require('restify');
var async = require('async');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId: 'string',
    appKey: 'string'
};


var WandoujiaChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.requestUri = "https://pay.wandoujia.com/";
    this.wdjPublicKey = ["-----BEGIN PUBLIC KEY-----",
        "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCd95FnJFhPinpNiE/h4VA6bU1r",
        "zRa5+a25BxsnFX8TzquWxqDCoe4xG6QKXMXuKvV57tTRpzRo2jeto40eHKClzEgj",
        "x9lTYVb2RFHHFWio/YGTfnqIPTVpi7d7uHY+0FZ0lYL5LlW4E2+CQMxFOPRwfqGz",
        "Mjs1SDlH7lVrLEVy6QIDAQAB",
        "-----END PUBLIC KEY-----"].join('\n');
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(WandoujiaChannel, SDKPluginBase);

WandoujiaChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var q = '/api/uid/check?' +
        querystring.stringify({
            uid: others,
            token: token,
            appkey_id: wrapper.cfg.appId
        });
    this.client.get(q, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }  
        if (res.body == 'true') {
            callback(null, {
                code: 0,
                loginInfo: {
                    uid: others,
                    token: token,
                    channel: wrapper.channelName
                }
            });
        } else {
            req.log.debug({body: res.body}, "Fail to verify login");
            callback(null, {
                code: -1
            });
        }
    });
};


WandoujiaChannel.prototype.verify = function (content, publickey, sign) {
    var verify = crypto.createVerify('RSA-SHA1');
    verify.write(content, 'utf-8');
    return verify.verify(publickey, sign, 'base64');
};

WandoujiaChannel.prototype.getPayUrlInfo = function ()  {
    var self = this;
    return [
        {
            method: 'post',
            path: '/pay'
        }
    ];
};


WandoujiaChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};


WandoujiaChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var params = req.params;
    self._logger.debug({req: req, params: params}, "on rsp for pay");
    if (!self.verify(params.content, this.wdjPublicKey, params.sign)) {
        self._logger.warn({req: req, params: params}, "invalid sign");
        self.send(res, 'invalid sign');
        return next();
    }
    try {
        var rspObj = JSON.parse(params.content);
        var other = {
            timeStamp: rspObj.timeStamp,
            chOrderId: rspObj.orderId,
            chargeType: rspObj.chargeType,
            cardNo: rspObj.cardNo
        };
        wrapper.userAction.pay(wrapper.channelName, rspObj.buyerId.toString(), null,
            rspObj.out_trade_no, 0, 
            null, null, rspObj.money, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'success');
                return next();
            }
        );
    } catch (e) {
        req.log.warn({err: e}, 'Fail to parse pay notification');
        self.send(res, 'invalid content');
        return next();
    }

};


module.exports =
{
    name: 'wandoujia',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker) {
                return new WandoujiaChannel(logger, cfgChecker);
            }
};



