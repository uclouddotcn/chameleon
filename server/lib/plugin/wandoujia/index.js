var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var sdkerror = require('../../sdk-error');
var ErrorCode = require('../common/error-code').ErrorCode;

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    requestUri: '?string'
};


var WandoujiaChannel = function(name, cfgItem, userAction, logger) {
    this.logger = logger;
    this.requestUri = cfgItem.requestUri || "https://pay.wandoujia.com/";
    this.name = name;
    this.cfgItem = cfgItem;
    this.userAction = userAction;
    this.wdjPublicKey = ["-----BEGIN PUBLIC KEY-----",
        "MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCd95FnJFhPinpNiE/h4VA6bU1r",
        "zRa5+a25BxsnFX8TzquWxqDCoe4xG6QKXMXuKvV57tTRpzRo2jeto40eHKClzEgj",
        "x9lTYVb2RFHHFWio/YGTfnqIPTVpi7d7uHY+0FZ0lYL5LlW4E2+CQMxFOPRwfqGz",
        "Mjs1SDlH7lVrLEVy6QIDAQAB",
        "-----END PUBLIC KEY-----"].join('\n');
    var timeout = cfgItem.timeout || 10;
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: logger
    });
    this.logger = logger;
};

WandoujiaChannel.prototype.getInfo = function () {
    return {
        appId : this.cfgItem.appId,
        requestUri : this.requestUri
    };
};

WandoujiaChannel.prototype.verifyLogin = 
function(token, others, callback) {
    var self = this;
    var q = '/api/uid/check?' + 
        querystring.stringify({
            uid: others,
            token: token,
            appkey_id: this.cfgItem.appId,
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
                    channel: self.name
                }
            });
        } else {
            req.log({body: res.body}, "Fail to verify login");
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
}

WandoujiaChannel.prototype.getChannelSubDir = function ()  {
    var self = this;
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
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


WandoujiaChannel.prototype.respondsToPay = function (req, res, next) {
    var self = this;
    var params = req.params;
    self.logger.debug({req: req, params: params}, "on rsp for pay");
    if (!self.verify(params.content, this.wdjPublicKey, params.sign)) {
        self.logger.warn({req: req, params: params}, "invalid sign");
        self.send(res, 'invalid sign');
        return next();
    }
    try {
        var rspObj = JSON.parse(params.content);
        var other = {
            timeStamp: rspObj.timeStamp,
            channelOrderId: rspObj.orderId,
            chargeType: rspObj.chargeType,
            cardNo: rspObj.cardNo
        };
        var amount = Math.round(parseFloat(params.amount) * 100);
        var infoObj = querystring.parse(params.aid);
        self.userAction.pay(self.name, rspObj.buyerId, null, 
            rspObj.out_trade_no, 0, 
            null, null, rspObj.money, other,
            function (err, result) {
                if (err) {
                    self.logger.error({err: err}, "fail to pay");
                    self.send(res, err.message);
                    return next();
                }
                self.logger.debug({result: result}, "recv result");
                self.send(res, 'success');
                return next();
            }
        );
    } catch (e) {
        req.log.warn({err: e}, 'Fail to parse pay notification');
        self.send(res, 'invalid content');
        return next();
    }

}


WandoujiaChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfgItem;
    this.requestUri = cfgItem.requestUri || "https://pay.wandoujia.com/";
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: this.logger
    });
};


module.exports =
{
    name: 'wandoujia',
    cfgDesc: cfgDesc,
    create: function (name, cfgItem, userAction, logger) {
                return new WandoujiaChannel(name, cfgItem, userAction, logger);
            }
};



