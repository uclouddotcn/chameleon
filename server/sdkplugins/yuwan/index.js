var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId : 'string',
    appKey: 'string'
};

var YuwanChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createJsonClient({
        url: 'http://sdk.yuwan8.com',
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};

util.inherits(YuwanChannel, SDKPluginBase);

YuwanChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var q = '/index.php/user_center?';
    var act = 4;
    var merId = wrapper.cfg.appId;
    var appKey = wrapper.cfg.appKey;
    var uid = others;
    var session = token;
    var sign = this.calcSign(merId+act+uid+session+appKey);
    token = others;
    var postObj = {
        MerId: merId,
        Act: act,
        Uin: uid,
        SessionKey: session,
        EncString: sign
    };
    this._logger.debug({token: token}, "receive request");
    this.client.get(q+querystring.stringify(postObj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        try {
            if (err) {
                req.log.warn({err: err}, 'request error');
                return callback(null, { code: ErrorCode.ERR_FAIL});
            }
            if (obj.ErrorCode === 1) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: uid,
                        token: session
                    }
                });
            } else if (obj.ErrorCode === 0) {
                callback(null, {
                    code: ErrorCode.ERR_LOGIN_SESSION_INVALID,
                    msg: obj.ErrorDesc
                });
            } else {
                callback(null, {
                    code: ErrorCode.ERR_INVALID_APPID,
                    msg: obj.ErrorDesc
                });
            }
        } catch (e) {
            self._logger.error({err: e}, "Fail to parse response");
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        }
    });
};

YuwanChannel.prototype.calcSign = function(s){
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex');
};

YuwanChannel.prototype.getPayUrlInfo=function(){
    return[
        {
            method: 'get',
            path:'/pay'
        }
    ]
};


function getMoney(s) {
    return Math.floor(parseFloat(s)*100)
}

function getStatus(s) {
    if (typeof s === 'string') {
        return parseInt(s);
    } else {
        return s;
    }
}

YuwanChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    var params = req.params;
    var sign = params.EncString;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        if (params.MerId !== wrapper.cfg.appId) {
            self._logger.warn({e: expectSign, r: sign}, "unmatched app id");
            return next(new restify.InvalidArgumentError("error"));
        }
        if (getMoney(params.Money) !== getMoney(params.PaymentFee)) {
            self._logger.warn({m:params.Money, p: params.PaymentFee}, "unmatched payment");
            return next(new restify.InvalidArgumentError("error"));
        }
        var expectSign = self.calcSign(params.MerId+params.OrderId+params.Money+wrapper.cfg.appKey);
        if (expectSign !== sign) {
            self._logger.warn({e: expectSign, r: sign}, "unmatched sign");
            return next(new restify.InvalidArgumentError("error"));
        }

        var orderId = params.OrderId;
        var status = getStatus(params.PaymentStatusCode) === 0 ? ErrorCode.ERR_OK : ErrorCode.ERR_FAIL;
        var money = getMoney(params.PaymentFee);

        wrapper.userAction.pay(wrapper.channelName, null, null,
            orderId, status,
            null, null, money, null,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, 'failed');
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'success');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'failed');
        return next(new restify.InvalidArgumentError("fail to pay"));
    }

};

YuwanChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};

module.exports =
{
    name: 'yuwan',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker, debug) {
        return new YuwanChannel(logger, cfgChecker, debug);
    }
};
