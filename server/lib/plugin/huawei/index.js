var ursa = require('ursa');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var ErrorCode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    appId: 'string',
    payId: 'string',
    payPrivateKey: 'string'
};


var HuaweiChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.requestUri = "https://api.vmall.com";
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        accept: '*/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(HuaweiChannel, SDKPluginBase);

HuaweiChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/rest.php?';
    var queryObj = {
            nsp_svc: 'OpenUP.User.getInfo',
            nsp_ts: Math.round(Date.now()/1000),
            access_token: token
        };
    this._logger.debug({query: queryObj}, 'post data');
    this.client.get(u+querystring.stringify(queryObj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            if (obj.error) {
                callback(null, {
                    code: ErrorCode.ERR_FAIL
                });
            } else {
                if (obj.userID === others) {
                    callback(null, {
                        code: 0,
                        loginInfo: {
                            uid: obj.userID,
                            token: token,
                            channel: wrapper.channelName,
                            name: obj.userName
                        }
                    });
                } else {
                    callback(null, {
                        code: ErrorCode.ERR_LOGIN_UID_INVALID
                    })
                }
            }
        } catch (e) {
            req.log.warn({err: e}, 'Fail to parse result');
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        }
    });
};

function formatMoney(amount) {
    var y = Math.floor(amount / 100);
    var x = (amount - y * 100).toString();
    if (x.length === 1) {
        x = '0' + x;
    }
    return y.toString() + '.' + x;
}


HuaweiChannel.prototype.pendingPay = function (channelName, params, infoFromSDK, callback) {
    try {
        var wrapper = this._channels[channelName];
        if (!wrapper) {
            return setImmediate(callback, new Error("Fail to find channel " + channelName));
        }
        var orderId = this._userAction.genOrderId();
        var signParams = {
            userID: wrapper.cfg.payId,
            applicationID: wrapper.cfg.appId,
            amount: formatMoney(params.realPayMoney),
            productName: params.productName || "货币",
            productDesc: params.productDesc || params.productName || "货币",
            requestId: orderId
        };
        var sign = this.calcSign(wrapper, signParams);
        var payInfo = {
            sign: sign,
            pn: signParams.productName,
            pd: signParams.productDesc
        }
        setImmediate(callback, null, orderId, params, null, payInfo);
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

HuaweiChannel.prototype.calcSign = function (wrapper, params) {
    if (!wrapper.cfg.payPrivateKeyObj) {
        var pem = makePrivatePemFormat(wrapper.cfg.payPrivateKey);
        wrapper.cfg.payPrivateKeyObj = ursa.createPrivateKey(pem);
    }
    var sortedKeys = Object.keys(params).sort();
    this._logger.debug(sortedKeys);
    var s = sortedKeys.map(function (k) {
        return k+'='+params[k];
    }).join('&');
    return wrapper.cfg.payPrivateKeyObj.hashAndSign('sha1', new Buffer(s, 'utf8'), 'utf8', 'base64');
};

HuaweiChannel.prototype.getPayUrlInfo = function ()  {
    var self = this;
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        }
    ];
};

HuaweiChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var params = req.body;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        var expectSign = params.sign;
        delete params.sign;
        var sign = this.calcSign(wrapper, params);
        if (sign !== expectSign) {
            this.send(res, 1);
            return next();
        }
        var orderId = params.requested;
        var amountStrs = params.amount.split('.');
        var y = parseInt(amountStrs[0]);
        var x = parseInt(amountStrs[1]);
        if (isNaN(y) || isNaN(x)) {
            this._logger.error({amount: params.amount}, "ill amount string");
            this.send(res, 98);
            return next();
        }
        var amount = y * 100 + x;
        if (params.userName !== wrapper.cfg.payId) {
            this.send(res, 97);
            return next();
        }
        var other = {
            notifyTime: params.notifyTime,
            chOrderId: params.orderId,
            payType: params.payType,
            bankId: params.bankId,
            orderTime: params.orderTime,
            tradeTime: params.tradeTime,
            accessMode: params.accessMode
        };
        var status = obj.code === '0' ? ErrorCode.ERR_OK : ErrorCode.ERR_FAIL;
        this._userAction.pay(wrapper.channelName, obj.uid, null,
            orderId, status,
            null, null, amount, other, {keep: obj.orderId},
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
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'ERROR_FAIL');
        return next();
    }

};

HuaweiChannel.prototype.send = function (res, result) {
    res.send({result: result});
};


function getPayStatus(flag) {
    if (flag == '1') {
        return ErrorCode.ERR_OK;
    } else {
        return ErrorCode.ERR_PAY_FAIL;
    }
}


HuaweiChannel.prototype.mapError = function(errorCode) {
    if (errorCode == '1' || errorCode == '200') {
        return ErrorCode.ERR_OK;
    } else if (errorCode == '0' || errorCode == '207') {
        return ErrorCode.ERR_LOGIN_SESSION_INVALID;
    } else if (errorCode == '5') {
        return ErrorCode.ERR_SIGN_NOT_MATCH;
    } else if (errorCode == '205') {
        return ErrorCode.ERR_LOGIN_UID_INVALID;
    } else {
        return ErrorCode.ERR_FAIL;
    }
};

function makePrivatePemFormat(key) {
    var c = [];
    var l = key.length;
    var start = 0;
    while (start < key.length) {
        c.push(key.substr(start, 64));
        start += 64;
    }
    return '-----BEGIN RSA PRIVATE KEY-----\n' + c.join('\n') + '\n-----END RSA PRIVATE KEY-----\n';
}

module.exports =
{
    name: 'huawei',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, checker, debug) {
                return new HuaweiChannel(userAction, logger, checker, debug);
            }
};

