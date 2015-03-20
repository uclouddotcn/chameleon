var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');
var url = require('url');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId: 'string',
    appName: 'string',
    merchantId: 'string',
    merchantPasswd: 'string',
    channelId: 'string',
    payUrl: 'string'
};

var SYSTEM_ID = 300021;


var MopoChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createStringClient({
        url: "http://111.1.17.152:10015",
        retry: false,
        log: this._logger,
        accept: '*/*',
        requestTimeout: 10000,
        connectTimeout: 20000,
        rejectUnauthorized: false,
        headers: {
            'Content-type': ' x-www-form-urlencoded'
        }
    });
};
util.inherits(MopoChannel, SDKPluginBase);

MopoChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/skyppa/index!check.action?';
    var obj = {
        skyid: others,
        token: token
    };
    this.client.get(u+querystring.stringify(obj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            if (obj === 'true') {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                callback(null, {
                    code: ErrorCode.ERR_FAIL
                });
            }
        } catch (e) {
            req.log.warn({err: e}, 'Fail to parse result');
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        }
    });
};

MopoChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    try {
        var orderId = wrapper.userAction.genOrderId();
        var payMethod = '3rd';
        var gameType = '1';
        var notifyAddress = encodeURIComponent(wrapper.cfg.payUrl);
        var appName = wrapper.cfg.appName;
        var appVersion = '1';
        var price = params.realPayMoney || 100;
        var channelId = wrapper.cfg.channelId;
        var merchantId = wrapper.cfg.merchantId;
        var appId = wrapper.cfg.appId;
        var payType = 3;
        var productName = params.productName || "游戏币";
        var signParams = "merchantId=" + merchantId +
            "&appId=" + appId +
            "&notifyAddress=" + notifyAddress +
            "&appName=" + appName +
            "&appVersion=" + appVersion +
            "&payType=" + payType +
            "&price=" + price +
            "&orderId=" + orderId +
            "&key="+wrapper.cfg.merchantPasswd;
        var sign = this.calcSign(wrapper, signParams);
        var orderInfo =  "notifyAddress=" + notifyAddress
        + "&merchantId=" + wrapper.cfg.merchantId
        + "&appId=" + appId
        + "&orderId=" + orderId
        + "&appName=" + appName
        + "&appVersion=" + appVersion
        + "&price=" + price
        + "&payMethod=" + payMethod
        + "&gameType=" + gameType
        + "&systemId=" + SYSTEM_ID
        + "&payType=" + payType
        + "&productName=" + productName
        + "&channelId=" + channelId
        + "&merchantSign=" + sign;
        setImmediate(callback, null, orderId, params, null, orderInfo);
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

MopoChannel.prototype.calcSign = function (wrapper, params) {
    var signer = crypto.createHash('md5');
    signer.update(params, 'utf8');
    return signer.digest('hex').toUpperCase();
};

MopoChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'get',
            path: '/pay'
        }
    ];
};

MopoChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        var expectSign = params.signMsg;
        var query = url.parse(req.url, false).search.substr(1);

        var lastIndex = query.lastIndexOf('&signMsg=');
        if (lastIndex < 0) {
            req.log.error({body: query}, 'illegal rsp from remote');
            this.send(res, 1);
            return next();
        }
        var signBody = query.substr(0, lastIndex)+'&key='+wrapper.cfg.merchantPasswd;
        var orderId = params.orderId;
        var sign = this.calcSign(wrapper, signBody);
        if (sign !== expectSign) {
            this.log.error({orderId: orderId, e: sign, r: expectSign}, 'sign no match');
            this.send(res, 1);
            return next();
        }
        if (parseInt(params.resultCode) !== 0) {
            // 文档上说他们返回失败了，但是不代表真的支付失败了, 所以失败了我们就当什么事情都没发生过
            // 没办法，总是有这么傻逼的事情傻逼的人，live with it
            this.send(res, 0);
            return next();
        }
        var amount = parseInt(params.realAmount);
        if (isNaN(amount)) {
            this._logger.error({amount: params.realAmount}, "ill amount string");
            this.send(res, 1);
            return next();
        }
        var other = {
            chOrderId: params.payNum,
            payTime: params.payTime,
            payType: params.cardType
        };
        wrapper.userAction.pay(wrapper.channelName, null, null,
            orderId, ErrorCode.ERR_OK,
            null, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(1);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 0);
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, ErrorCode.ERR_FAIL);
        return next();
    }

};

MopoChannel.prototype.send = function (res, result) {
    var body = 'result='+result;
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};


module.exports =
{
    name: 'mopo',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new MopoChannel(logger, checker, debug);
    }
};


