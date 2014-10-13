"use strict";

var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var _errorcode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');
var codeToSdkError = require('../../sdk-error.js').codeToSdkError;

var cfgDesc = {
    qqAppId: 'string',
    qqAppKey: 'string',
    timeout: '?integer'
};

var QQ_MSDK_URL = "http://opensdk.tencent.com";
var QQ_MSDK_DEBUG_URL = "http://opensdktest.tencent.com";

var QQ_PAY_URL_DEV = "http://119.147.19.43";
var QQ_PAY_URL = "http://openapi.tencentyun.com";

var QQMsdkChannel = function(userAction, logger, cfgChecker, debug) {
    var qqurl = QQ_MSDK_URL;
    if (debug) {
        qqurl = QQ_MSDK_DEBUG_URL;
    }
    /*
    var qqpayUrl = QQ_PAY_URL;
    if (debug) {
        qqpayUrl = QQ_PAY_URL_DEV;
    }
    */
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.productionClient = restify.createJsonClient({
        url: qqurl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
    /*
    this.payClient = restify.createJsonClient({
        url: qqpayUrl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
    */
    var pendingPayCookie = {
        session_id: querystring.escape('openid'),
        session_type: querystring.escape('kp_actoken'),
        org_loc: querystring.escape('/mpay/get_balance_m')
    };
    this.pendingPayClient = restify.createJsonClient({
        url: qqurl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000,
        headers: {
            'Cookie': Object.keys(pendingPayCookie).map(function (k) {
                        return k + '=' + pendingPayCookie[k];
                      }).join(';')
        }
    });

    var consumeMoneyCookie = {
        session_id: querystring.escape('openid'),
        session_type: querystring.escape('kp_actoken'),
        org_loc: querystring.escape('/mpay/pay_m')
    };
    this.consumeMoneyClient = restify.createJsonClient({
        url: qqurl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000,
        headers: {
            'Cookie': Object.keys(consumeMoneyCookie).map(function (k) {
                        return k + '=' + consumeMoneyCookie[k];
                      }).join(';')
        }
    });

    var cancelPayCookie = {
        session_id: querystring.escape('openid'),
        session_type: querystring.escape('kp_actoken'),
        org_loc: querystring.escape('/mpay/cancel_pay_m')
    };
    this.cancelPayClient = restify.createJsonClient({
        url: qqurl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000,
        headers: {
            'Cookie': Object.keys(cancelPayCookie).map(function (k) {
                return k + '=' + cancelPayCookie[k];
            }).join(';')
        }
    });

};
util.inherits(QQMsdkChannel, SDKPluginBase);

function getSign(appKey, timestamp) {
    var md5 = crypto.createHash('md5');
    md5.update(appKey+timestamp);
    return md5.digest('hex').toLowerCase();
}

function calcPaySign(secret, method, urlPath, params) {
    var paramsStr = Object.keys(params).sort().map(function (k) {
        return k+'%3D'+querystring.escape(params[k]).replace(/\*/g, '%2A');
    }).join('%26');
    var s = method+'&'+querystring.escape(urlPath)+'&'+paramsStr;
    var shasum = crypto.createHmac('sha1', secret);
    shasum.update(s);
    return shasum.digest('base64');
}

function getNowTimestamp() {
    return Math.round(Date.now()/1000);
}

function getUrl(p, wrapper, openid) {
    var appId = wrapper.cfg.qqAppId;
    var appKey = wrapper.cfg.qqAppKey;
    var timestamp = getNowTimestamp();
    return p + '/?' + querystring.stringify({
        timestamp: timestamp,
        appid: appId,
        sig: getSign(appKey, timestamp),
        openid: openid,
        encode: 1
    });
}

QQMsdkChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    try {
        var otherObj = JSON.parse(others);
        var openid = otherObj.uid;
        var u = getUrl('/auth/verify_login', wrapper, openid);
        var timestamp = getNowTimestamp();
        var queryObj = {
            appid: wrapper.cfg.qqAppId,
            openid: openid,
            openkey: token,
            userip: '127.0.0.1'
        };
        var result = null;
        this.productionClient.post(u, queryObj, function (err, req, res, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self._logger.debug({obj: obj, req: req}, 'return from channel');
            if (obj.ret !== 0) {
                var e = mapError(obj, 'verify_login');
                result = {
                    code: e.code,
                    errmsg: e.message
                };
                callback(null, result);
            } else {
                result = {
                    code: 0,
                    loginInfo: {
                        uid: openid,
                        token: token,
                        channel: wrapper.channelName
                    }
                };
                callback(0, result);
            }
        });
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};


QQMsdkChannel.prototype.getPayUrlInfo = function ()  {
    return [
    ];
};


function mapError(obj) {
    switch (obj.ret) {
        case -21:
        case -22:
        case -23:
        case -34:
        case -71:
        case 1002:
        case 1018:
            return {
                code: _errorcode.ERR_LOGIN_SESSION_INVALID,
                message: {
                    channel: 'qqmsdk',
                    ret: obj.ret,
                    msg: obj.msg
                }
            };
        case -5:
            return {
                code: _errorcode.ERR_SIERR_SIGN_NOT_MATCH,
                message: {
                    channel: 'qqmsdk',
                    ret: obj.ret
                }
            };
        case 0:
            return 0;
        default:
            return {
                code: _errorcode.ERR_FAIL,
                msg: {
                    channel: 'qqmsdk',
                    ret: obj.ret
                }
            };
    }
}

QQMsdkChannel.prototype.pendingPay = function (channelName, params, infoFromSDK, callback) {
    var self = this;
    try {
        var pf = infoFromSDK.p;
        var pfKey = infoFromSDK.pk;
        var accessToken = infoFromSDK.t;
        var payToken = infoFromSDK.pt;
        var wrapper = self._channels[channelName];
        if (!wrapper) {
            setImmediate(callback, codeToSdkError(_errorcode.ERR_CHANNLE_NOT_EXIST, 'channel ' + channelName + ' not exits'));
            return;
        }
        self.requestSaving(wrapper, params.uid, accessToken, payToken, pf, pfKey, params.serverId, function (err, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                callback(err);
                return;
            }
            if (obj.ret == 0) {
                if (isNaN(obj.balance)) {
                    callback(codeToSdkError(_errorcode.ERR_REMOTE_ERROR, 'unexpected input'));
                    return;
                }
                if (obj.balance >= params.realPayMoney) {
                    // 二级货币的存款多于所需要付款的数额，直接开始调用扣款
                    self.requestPay(wrapper, params.uid, accessToken, payToken, pf, pfKey, params.serverId,
                        params.realPayMoney, params.productId, function (err, obj) {
                            if (err) {
                                callback(err);
                                return;
                            }
                            if (obj.ret == 0) {
                                var orderId = self._userAction.genOrderId();
                                var payInfo = {
                                    rest: -1
                                };
                                callback(null, orderId, params, {ignorePending: true}, payInfo);
                                // 扣款成功，发起异步的推送支付成功的流程
                                self.pay(wrapper, orderId, params.uid, accessToken, payToken, pf, pfKey, params.appUid,
                                params.serverId, params.productId, params.productCount, params.ext, params.realPayMoney, obj.billno);
                                // 提示CP服务器，这里已经成功扣款了，只需等待发货推送即可
                            } else if (obj.ret == 1004) {
                                // 之间一定是有另外一个扣款已经运行过了，所以这里直接报错
                                callback(codeToSdkError(_errorcode.ERR_PAY_CANCEL, 'interleaved payments'));
                            } else {
                                // 发生了支付错误，直接返回错误即可
                                callback(codeToSdkError(mapError(obj.ret), 'Fail to consume'));
                            }
                        });
                } else {
                    // 没有足够的存款，计算出需要充值的数额，然后提示玩家去充值
                    var payInfo = {
                        rest: params.realPayMoney - obj.balance
                    };
                    callback(null, self._userAction.genOrderId(), params, {ignorePending: true}, payInfo);
                }
            } else {
                callback(codeToSdkError(mapError(obj.ret), 'fail to get balance'));
            }
        });
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

QQMsdkChannel.prototype.pay = function (wrapper, orderId, openid, openKey, payToken, pf, pfKey,
                                        appUid, zoneid, productId, productCount, ext, amount, billno) {
    var self = this;
    var other = {
        chOrderId: billno
    };
    setTimeout(function () {
        self._userAction.payDirect(wrapper.channelName, openid, appUid,
            zoneid, orderId, 0, productId, productCount, amount, other, ext,
            function (err, result) {
                if (err) {
                    self.cancelPay(wrapper, openid, openKey, payToken, pf, pfKey, zoneid, amount, billno, function (err, res) {
                        if (err) {
                            self._userAction.emitPayCancelFail(wrapper.channelName, orderId, billno, amount,
                                -1);
                            return;
                        }
                        if (res.ret == 0) {
                            self._userAction.emitPayCancel(wrapper.channelName, orderId, billno, amount);
                        } else {
                            self._userAction.emitPayCancel(wrapper.channelName, orderId, billno, amount, res.ret);
                        }
                    })
                }
            }
        );
    }, 1000);
};

QQMsdkChannel.prototype.cancelPay = function (wrapper, openid, openkey, payToken, pf, pfkey, zoneid, amt, billno, callback) {
    var self = this;
    try {
        var req = {
            openid: openid,
            openkey: openkey,
            pay_token: payToken,
            appid: wrapper.cfg.qqAppId,
            ts: Math.round(Date.now()/1000),
            pf: pf,
            pfkey: pfkey,
            zoneid: zoneid,
            amt: amt,
            billno: billno
        };
        var u = '/mpay/cancel_pay_m';
        req.sig = calcPaySign(wrapper.cfg.qqAppKey+'&', 'GET', u, req);
        var q =  u + '?' + querystring.stringify(req);
        self.cancelPayClient.get(q, function (err, req, res, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self._logger.debug({obj: obj}, 'return from channel');
            callback(null, obj);
        });
    } catch (e) {
        self._logger.error({err: e}, 'Fail to parse input');
        setImmediate(callback, new restify.InvalidArgumentError());
    }
};

QQMsdkChannel.prototype.requestSaving = function (wrapper, openid, openkey, payToken, pf, pfkey, zoneid, callback) {
    var self = this;
    try {
        var req = {
            openid: openid,
            openkey: openkey,
            pay_token: payToken,
            appid: wrapper.cfg.qqAppId,
            ts: Math.round(Date.now()/1000),
            pf: pf,
            pfkey: pfkey,
            zoneid: zoneid
        };
        var u = '/mpay/get_balance_m';
        req.sig = calcPaySign(wrapper.cfg.qqAppKey+'&', 'GET', u, req);
        var q =  u + '?' + querystring.stringify(req);
        self.pendingPayClient.get(q, function (err, req, res, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self._logger.debug({obj: obj}, 'return from channel');
            callback(null, obj);
        });
    } catch (e) {
        self._logger.error({err: e}, 'Fail to parse input');
        setImmediate(callback, new restify.InvalidArgumentError());
    }
};

QQMsdkChannel.prototype.requestPay = function (wrapper, openid, openkey, payToken, pf, pfkey, zoneid, amt, payItem, cb) {
    var self = this;
    if (payItem instanceof Function) {
        cb = payItem;
        payItem = null;
    }
    try {
        var req = {
            openid: openid,
            openkey: openkey,
            pay_token: payToken,
            appid: wrapper.cfg.qqAppId,
            ts: Math.round(Date.now()/1000),
            pf: pf,
            pfkey: pfkey,
            zoneid: zoneid,
            amt: amt
        };
        if (payItem) {
            req.payitem = payItem;
        }
        var u = '/mpay/pay_m';
        req.sig = calcPaySign(wrapper.cfg.qqAppKey+'&', 'GET', u, req);
        var q =  u + '?' + querystring.stringify(req);
        self.consumeMoneyClient.get(q, function (err, req, res, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self._logger.debug({obj: obj}, 'return from channel');
            cb(null, obj);
        })
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        cb(new restify.InvalidArgumentError());
    }
};

module.exports =
{
    name: 'qqmsdk',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker, debug) {
        return new QQMsdkChannel(userAction, logger, cfgChecker, debug);
    }
};

