var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId: 'string',
    appSecret: 'string'
};


var MeizuChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createStringClient({
        url: "https://api.game.meizu.com",
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
util.inherits(MeizuChannel, SDKPluginBase);

MeizuChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/game/security/checksession';
    var obj = {
        app_id: wrapper.cfg.appId,
        session_id: token,
        uid: others,
        ts: Date.now()
    };
    var self = this;
    var sign = this.calcSign(wrapper, obj, true, '&');
    obj['sign_type'] = 'md5';
    obj['sign'] = sign;
    this.client.post(u, querystring.stringify(obj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            obj = JSON.parse(obj);
            if (obj.code === 200) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                var code = self.mapError(obj.code, obj);
                callback(null, {
                    code: code
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

function formatMoney(amount) {
    var y = Math.floor(amount / 100);
    var x = (amount - y * 100).toString();
    if (x.length === 1) {
        x = '0' + x;
    }
    return y.toString() + '.' + x;
}

function formatTime(d) {
    var s = d.getFullYear();
    if (d.getMonth() < 9) {
        s+= '0';
    }
    s += d.getMonth()+1;
    if (d.getDay() < 10) {
        s+= '0';
    }
    s += d.getDay();
    if (d.getHours() < 10) {
        s+= '0';
    }
    s += d.getHours();
    if (d.getMinutes() < 10) {
        s+= '0';
    }
    s += d.getMinutes();
    if (d.getSeconds() < 10) {
        s+= '0';
    }
    s += d.getSeconds();
    return s;
}


MeizuChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    try {
        var orderId = wrapper.userAction.genOrderId().replace(/-/g, '');
        var payType = 1;
        if (params.realPayMoney !== 0) {
            payType = 0;
        }
        var signParams = {
            app_id: wrapper.cfg.appId,
            cp_order_id: orderId,
            uid: params.uid,
            product_id: params.productId || 'money',
            product_subject: params.productName || '游戏币',
            product_body: params.productDesc || '',
            product_unit: '',
            buy_amount: params.productCount,
            product_per_price: formatMoney(params.singlePrice),
            total_price: formatMoney(params.realPayMoney),
            create_time: Math.floor(Date.now()/1000),
            pay_type: payType,
            user_info: params.appUid
        };
        if (payType === 0) {
            signParams['total_price'] = formatMoney(params.realPayMoney);
        }
        var sign = this.calcSign(wrapper, signParams, true, '&');
        signParams['sign_type'] = 'md5';
        signParams['sign'] = sign;
        signParams['total_price'] = formatMoney(params.realPayMoney);
        setImmediate(callback, null, orderId, params, null, signParams);
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
}

MeizuChannel.prototype.calcSign = function (wrapper, params, includeKey, sep) {
    includeKey = includeKey || false;
    sep = sep || '';
    var s = Object.keys(params).sort()
        .map(function (k) {
        if (includeKey) {
            return k+'='+params[k];
        } else {
            return params[k];
        }
    }).join(sep);
    this._logger.debug("sign string: " + s);
    var signer = crypto.createHash('md5');
    signer.update(s, 'utf8');
    signer.update(':');
    signer.update(wrapper.cfg.appSecret);
    return signer.digest('hex').toLowerCase();
};

MeizuChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay'
        }
    ];
};

MeizuChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        if (params.app_id !== wrapper.cfg.appId) {
            this.send(res, ErrorCode.ERR_FAIL, "unmatched appId");
            return next();
        }
        var expectSign = params.sign;
        delete params.sign;
        delete params.sign_type;
        var sign = this.calcSign(wrapper, params, true, '&');
        if (sign !== expectSign) {
            this.send(res, ErrorCode.ERR_FAIL, "unmatched sign");
            return next();
        }
        var orderId = params.cp_order_id;
        var amountStrs = params.total_price.split('.');
        var y = parseInt(amountStrs[0]);
        var x = parseInt(amountStrs[1]);
        if (isNaN(y) || isNaN(x)) {
            this._logger.error({amount: params.amount}, "ill amount string");
            this.send(res, ErrorCode.ERR_FAIL, "unknown pay amount");
            return next();
        }
        var amount = y * 100 + x;
        var other = {
            notify_time: params.notify_time,
            notify_id: params.notify_id,
            chOrderId: params.order_id,
            pay_type: params.pay_type,
            createTime: params.create_time,
            payTime: params.pay_time
        };
        wrapper.userAction.pay(wrapper.channelName, params.uid, null,
            orderId, ErrorCode.ERR_OK,
            params.product_id, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, ErrorCode.ERR_FAIL, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, ErrorCode.ERR_OK);
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, ErrorCode.ERR_FAIL);
        return next();
    }

};

MeizuChannel.prototype.send = function (res, result, msg) {
    var code = '200';
    if (result !== ErrorCode.ERR_OK) {
        code = '120014';
        this._logger.error({msg: msg}, 'fail to pay');
    }
    res.send({
        code: code
    });
};


MeizuChannel.prototype.mapError = function(status, retObj) {
    this._logger.debug({retObj: retObj});
    switch (status) {
        case 198005:
            return ErrorCode.ERR_LOGIN_SESSION_INVALID;
        default:
            this._logger.error({retObj: retObj}, "unexpect error");
            return ErrorCode.ERR_FAIL;
    }
};

module.exports =
{
    name: 'meizu',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new MeizuChannel(logger, checker, debug);
    }
};


