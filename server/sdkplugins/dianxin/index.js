var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    clientId: 'string',
    clientSecret: 'string',
    numId: 'string',
    cpId: 'string',
    appKey: 'string'
};

var DianxinChannel = function(logger, cfgChecker, debug) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createStringClient({
        url: "https://open.play.cn",
        retry: false,
        log: this._logger,
        accept: '*/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};

util.inherits(DianxinChannel, SDKPluginBase);

DianxinChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var signSort = ['client_id', 'sign_method', 'version', 'timestamp', 'client_secret', 'code'];
    var postData = {
        client_id: wrapper.cfg.clientId,
        client_secret: wrapper.cfg.clientSecret,
        code: token,
        grant_type: 'authorization_code',
        scope: 'all',
        sign_method: 'md5',
        version: '1.0',
        timestamp: Math.round(Date.now()/1000),
        sign_sort: signSort.join('&')
    };
    var sign = this.calcMd5(wrapper, postData, signSort);
    postData.signature = sign;
    this._logger.debug({req: postData}, 'request');
    this.client.post('/oauth/token', postData, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            obj = JSON.parse(obj);
            if (!obj.error) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: obj.user_id,
                        token: obj.access_token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                req.log.warn({obj: obj}, 'Fail to oauth');
                // error
                callback(null, {
                    code: ErrorCode.ERR_LOGIN_SESSION_INVALID
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

DianxinChannel.prototype.getPayUrlInfo=function(){
    return[
        {
            method: 'post',
            path:'/pay'
        },
        {
            method: 'get',
            path:'/pay'
        }
    ]
};

DianxinChannel.prototype.calcMd5 = function (wrapper, postData, signSort) {
    var s = signSort.map(function (k) {
        return postData[k];
    }).join('');
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex');
};

DianxinChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    var obj = req.body;
    this._logger.debug({req: req, obj: obj}, 'receive pay callback');
    try {
        if (obj.method === 'check') {
            self.if1(obj, res, next, wrapper);
        } else if (obj.method === 'callback') {
            self.if2(obj, res, next, wrapper);
        } else {
            return next(new restify.InvalidArgumentError('unknown method'));
        }
    } catch (e) {
        this._logger.debug({err: e, obj: obj}, 'fail to handle call');
        return next(new restify.InvalidArgumentError('unknown error'));
    }
};

DianxinChannel.prototype.if2 = function (params, res, next, wrapper) {
    var self = this;
    params.md5 = wrapper.cfg.appKey;
    var sign =
        this.calcMd5(wrapper, params, ['cp_order_id', 'correlator', 'result_code', 'fee', 'pay_type', 'method', 'appKey']);
    if (sign !== params.sign) {
        this._logger.error({sign: sign, expect: params.sign}, 'sign not match');
        return next(new restify.InvalidArgumentError('error'));
    }
    var orderId = params.cp_order_id;
    var amount = parseInt(params.fee) * 100;
    var others = {
        chOrderId: params.correlator,
        payType: params.pay_type
    };
    wrapper.userAction.pay(wrapper.channelName, null, null,
        orderId, status,
        null, null, amount, others,
        function (err, result) {
            if (err) {
                self._logger.error({err: err}, "fail to pay");
                self.send(self.respToIf2(-1, orderId));
                return next();
            }
            self._logger.debug({result: result}, "recv result");
            self.send(self.respToIf2(0, orderId));
            return next();
        }
    );
};


DianxinChannel.prototype.if1 = function (params, res, next, wrapper) {
    var self = this;
    params.appKey = wrapper.cfg.appKey;
    var sign =
        this.calcMd5(wrapper, params, ['cp_order_id', 'correlator', 'result_code', 'fee', 'pay_type', 'method', 'appKey']);
    if (sign !== params.sign) {
        this._logger.error({sign: sign, expect: params.sign}, 'sign not match');
        return next(new restify.InvalidArgumentError('error'));
    }
    wrapper.userAction.requestOrderInfo(params.cp_order_id, function (err, record) {
        if (err || record) {
            res.send(self.respToIf1(params, '', 0, -1));
            return next();
        }
        res.send(self.respToIf1(params, record.uid, record.rmb, 0));
        return next();
    });
};

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


DianxinChannel.prototype.respToIf1 = function (params, uid, fee, ifpay) {
    return '<sms_pay_check_resp>' +
                '<cp_order_id>' + params.cp_order_id + '</cp_order_id>' +
                '<correlator>' + params.correlator + '</correlator>' +
                '<game_account>' + uid + '</game_account>' +
                '<fee>' + params.fee + '</fee>' +
                '<if_pay>' + params.if_pay + '</if_pay>' +
                '<order_time>' + formatTime(new Date()) + '</order_time>' +
            '</sms_pay_check_resp>'
};

DianxinChannel.prototype.respToIf2 = function (ret, orderid) {
    return "<cp_notify_resp>" +
                "<h_ret>" + ret + "</hret>" +
                "<cp_order_id>" + orderid + "</cp_order_id>"
           "</cp_notify_resp>"
};

DianxinChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'application/xml'
    });
    res.write(body);
};

module.exports =
{
    name: 'dianxin',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker, debug) {
        return new DianxinChannel(userAction, logger, cfgChecker, debug);
    }
};
