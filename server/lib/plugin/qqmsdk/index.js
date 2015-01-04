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
    wxAppId: 'string',
    wxAppKey: 'string',
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
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    /*
    this.productionClient = restify.createJsonClient({
        url: qqurl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
    this.payClient = restify.createJsonClient({
        url: qqpayUrl,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
    */
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

function getUrl(p, wrapper, openid, appCfg) {
    var appId = appCfg.appId;
    var appKey = appCfg.appKey;
    var timestamp = getNowTimestamp();
    return p + '/?' + querystring.stringify({
        timestamp: timestamp,
        appid: appId,
        sig: getSign(appKey, timestamp),
        openid: openid,
        encode: 1
    });
}

QQMsdkChannel.prototype.getClient = function (wrapper) {
    if (wrapper.cfg._client) {
        return wrapper.cfg._client;
    }
    var qqurl = QQ_MSDK_URL;
    if (wrapper.cfg.test) {
        qqurl = QQ_MSDK_DEBUG_URL;
    }
    var pendingPayCookie = {
        session_id: querystring.escape('openid'),
        session_type: querystring.escape('kp_actoken'),
        org_loc: querystring.escape('/mpay/get_balance_m')
    };
    var wxPendingPayCookie = {
        session_id: querystring.escape('hy_gameid'),
        session_type: querystring.escape('wc_actoken'),
        org_loc: querystring.escape('/mpay/get_balance_m')
    };
    var consumeMoneyCookie = {
        session_id: querystring.escape('openid'),
        session_type: querystring.escape('kp_actoken'),
        org_loc: querystring.escape('/mpay/pay_m')
    };
    var wxConsumeMoneyCookie = {
        session_id: querystring.escape('hy_gameid'),
        session_type: querystring.escape('wc_actoken'),
        org_loc: querystring.escape('/mpay/pay_m')
    };
    var cancelPayCookie = {
        session_id: querystring.escape('openid'),
        session_type: querystring.escape('kp_actoken'),
        org_loc: querystring.escape('/mpay/cancel_pay_m')
    };
    var wxCancelPayCookie = {
        session_id: querystring.escape('hy_gameid'),
        session_type: querystring.escape('wc_actoken'),
        org_loc: querystring.escape('/mpay/cancel_pay_m')
    };

    wrapper.cfg._client = {
        loginClient: restify.createJsonClient({
                url: qqurl,
                retry: false,
                log: this._logger,
                requestTimeout: 10000,
                connectTimeout: 20000
            }),
        cancelPayClient: restify.createJsonClient({
                url: qqurl,
                retry: false,
                log: this._logger,
                requestTimeout: 10000,
                connectTimeout: 20000,
                headers: {
                    'Cookie': Object.keys(cancelPayCookie).map(function (k) {
                        return k + '=' + cancelPayCookie[k];
                    }).join(';')
                }
            }),
        consumeMoneyClient: restify.createJsonClient({
                url: qqurl,
                retry: false,
                log: this._logger,
                requestTimeout: 10000,
                connectTimeout: 20000,
                headers: {
                    'Cookie': Object.keys(consumeMoneyCookie).map(function (k) {
                        return k + '=' + consumeMoneyCookie[k];
                    }).join(';')
                }
            }),
        pendingPayClient: restify.createJsonClient({
                url: qqurl,
                retry: false,
                log: this._logger,
                requestTimeout: 10000,
                connectTimeout: 20000,
                headers: {
                    'Cookie': Object.keys(pendingPayCookie).map(function (k) {
                        return k + '=' + pendingPayCookie[k];
                    }).join(';')
                }
            }),
        wxCancelPayClient: restify.createJsonClient({
            url: qqurl,
            retry: false,
            log: this._logger,
            requestTimeout: 10000,
            connectTimeout: 20000,
            headers: {
                'Cookie': Object.keys(wxCancelPayCookie).map(function (k) {
                    return k + '=' + wxCancelPayCookie[k];
                }).join(';')
            }
        }),
        wxConsumeMoneyClient: restify.createJsonClient({
            url: qqurl,
            retry: false,
            log: this._logger,
            requestTimeout: 10000,
            connectTimeout: 20000,
            headers: {
                'Cookie': Object.keys(wxConsumeMoneyCookie).map(function (k) {
                    return k + '=' + wxConsumeMoneyCookie[k];
                }).join(';')
            }
        }),
        wxPendingPayClient: restify.createJsonClient({
            url: qqurl,
            retry: false,
            log: this._logger,
            requestTimeout: 10000,
            connectTimeout: 20000,
            headers: {
                'Cookie': Object.keys(wxPendingPayCookie).map(function (k) {
                    return k + '=' + wxPendingPayCookie[k];
                }).join(';')
            }
        })
    };
    return wrapper.cfg._client;
}

QQMsdkChannel.prototype.verifyQQLogin = function(wrapper, token, openid, callback) {
    var self = this;
    var client = this.getClient(wrapper);
    var appCfg = {
        appId: wrapper.cfg.qqAppId,
        appKey: wrapper.cfg.qqAppKey
    };
    var u = getUrl('/auth/verify_login', wrapper, openid, appCfg);
    var queryObj = {
        appid: appCfg.appId,
        openid: openid,
        openkey: token,
        userip: '127.0.0.1'
    };
    var result = null;
    client.loginClient.post(u, queryObj, function (err, req, res, obj) {
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
};

QQMsdkChannel.prototype.verifyWXLogin = function(wrapper, token, openid, callback) {
    var self = this;
    var client = this.getClient(wrapper);
    var appCfg = {
        appId: wrapper.cfg.wxAppId,
        appKey: wrapper.cfg.wxAppKey
    };
    var u = getUrl('/auth/check_token', wrapper, openid, appCfg);
    var queryObj = {
        accessToken: token,
        openid: openid
    };
    var result = null;
    client.loginClient.post(u, queryObj, function (err, req, res, obj) {
        if (err) {
            self._logger.debug({err: err}, 'return from channel');
            return callback(err);
        }
        self._logger.debug({obj: obj, req: req}, 'return from channel');
        if (obj.ret !== 0) {
            var e = mapError(obj, 'check_token');
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
};

QQMsdkChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    try {
        var otherObj = JSON.parse(others);
        var pl = otherObj.pl;
        var openid = otherObj.uid;
        if (pl === 'w') {
            self.verifyWXLogin(wrapper, token, openid, callback);
        } else {
            self.verifyQQLogin(wrapper, token, openid, callback);
        }
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
        var platform = infoFromSDK.pl;
        var wrapper = self._channels[channelName];
        if (!wrapper) {
            setImmediate(callback, codeToSdkError(_errorcode.ERR_CHANNLE_NOT_EXIST, 'channel ' + channelName + ' not exits'));
            return;
        }
        self.requestSaving(wrapper, params.uid, accessToken, payToken, pf, pfKey, params.serverId, platform, function (err, obj) {
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
                        params.realPayMoney, params.productId, platform, function (err, obj) {
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
                                params.serverId, params.productId, params.productCount, params.ext, params.realPayMoney, obj.billno, platform);
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
                                        appUid, zoneid, productId, productCount, ext, amount, billno, platform) {
    var self = this;
    var other = {
        chOrderId: billno
    };
    setTimeout(function () {
        self._userAction.payDirect(wrapper.channelName, openid, appUid,
            zoneid, orderId, 0, productId, productCount, amount, other, ext,
            function (err, result) {
                if (err) {
                    self.cancelPay(wrapper, openid, openKey, payToken, pf, pfKey, zoneid, amount, billno, platform, function (err, res) {
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

QQMsdkChannel.prototype.cancelPay = function (wrapper, openid, openkey, payToken, pf, pfkey, zoneid, amt, billno, platform, callback) {
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
        var client = (platform ==='w') ? self.getClient(wrapper).wxCancelPayClient : self.getClient(wrapper).cancelPayClient
        .get(q, function (err, req, res, obj) {
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

QQMsdkChannel.prototype.requestSaving = function (wrapper, openid, openkey, payToken, pf, pfkey, zoneid, platform, callback) {
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
        var client = platform === 'w' ? self.getClient(wrapper).wxPendingPayClient : self.getClient(wrapper).pendingPayClient;
        client.get(q, function (err, req, res, obj) {
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

QQMsdkChannel.prototype.requestPay = function (wrapper, openid, openkey, payToken, pf, pfkey, zoneid, amt, payItem, platform, cb) {
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
        var client = (platform === 'w') ? self.getClient(wrapper).wxConsumeMoneyClient : self.getClient(wrapper).consumeMoneyClient
        client.get(q, function (err, req, res, obj) {
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

