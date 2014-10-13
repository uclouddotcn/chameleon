"use strict";

var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var _errorcode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    timeout: '?integer'
};

var QQ_MOB_URL = "http://openapi.tencentyun.com";
var QQ_MOB_DEBUG_URL = "http://119.147.19.43";

var QQMobChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.productionClient = restify.createJsonClient({
        url: QQ_MOB_URL,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(QQMobChannel, SDKPluginBase);


QQMobChannel.prototype.getClient = function (debug) {
    if (debug) {
        return restify.createJsonClient({
            url: QQ_MOB_DEBUG_URL,
            retry: false,
            log: this._logger
        });
    } else {
        return this.productionClient;
    }
};

function calcSign(method, url, param, appKey) {
    var paramArray = [];
    for (var keyname in param) {
        paramArray.push([keyname, param[keyname]]);
    }
    paramArray = paramArray.sort(function (a, b) {
        if (a[0] < b[0]) {
            return -1;
        }
        if (a[0] > b[0]) {
            return 1;
        }
        return 0;
    });
    var paramArrayStr = "";
    for (var i in paramArray) {
        paramArrayStr += paramArray[i][0]+'='+paramArray[i][1]+'&';
    }
    paramArrayStr = paramArrayStr.slice(0, -1);
    paramArrayStr = encodeURIComponent(paramArrayStr);
    paramArrayStr = paramArrayStr.replace(/\*/g, '%2A');
    var urlStr = encodeURIComponent(url);
    var sourceStr = method+'&'+urlStr+'&'+paramArrayStr;
    var secretKey = appKey+'&';
    var encoder = crypto.createHmac('sha1', secretKey);
    encoder.update(sourceStr);
    return encoder.digest('base64');
}

QQMobChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    try {
        var otherObj = JSON.parse(others);
        var pf = otherObj.pf;
        var debug = otherObj.debug;
        var openid = otherObj.openid;
        var expireIn = otherObj.expirein;
        var signObj = {
            openid: openid,
            openkey: token,
            appid: wrapper.cfg.appId,
            pf: pf
        };
        var u = '/v3/user/get_info';
        var sig = calcSign('GET', u, signObj, wrapper.cfg.appKey);
        var queryObj = {
            openid: openid,
            openkey: token,
            appid: wrapper.cfg.appId,
            pf: pf,
            sig: sig
        };
        var q =  u + '?' + querystring.stringify(queryObj);
        var result = null;
        this.getClient().get(q, function (err, req, res, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self._logger.debug({obj: obj}, 'return from channel');
            if (obj.ret !== 0) {
                var e = mapError(obj.ret, 'verify_login');
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
                        name: obj.nickname,
                        expire_in: expireIn,
                        channel: wrapper.channelName,
                        others: JSON.stringify({
                            gender: obj.gender,
                            figureurl: obj.figureurl
                        })
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


QQMobChannel.prototype.getPayUrlInfo = function ()  {
    return [
    ];
};


function mapError(code, method) {
    switch (code) {
        case -21:
        case -22:
        case -23:
        case -34:
        case -71:
        case 1002:
        case 1300:
            return {
                code: _errorcode.ERR_LOGIN_SESSION_INVALID,
                message: {
                    channel: 'qqmob',
                    ret: code
                }
            };
        case -5:
            return {
                code: _errorcode.ERR_SIERR_SIGN_NOT_MATCH,
                message: {
                    channel: 'qqmob',
                    ret: code
                }
            };
        default: 
            return {
                code: _errorcode.ERR_FAIL,
                msg: {
                    channel: 'qqmob',
                    ret: code
                }
            };
    }
}

QQMobChannel.prototype.pendingPay = function (params, infoFromSDK, callback) {
    var self = this;
    try {
        var pf = infoFromSDK.p;
        var pfKey = infoFromSDK.pk;
        var accessToken = infoFromSDK.t;
        var payToken = infoFromSDK.pt;
        var debug = infoFromSDK.debug;
        var productUrl = params.productUrl;
        var wrapper = null;
        var signObj = {
            openid: params.uid,
            openkey: accessToken,
            pay_token: payToken,
            appid: wrapper.cfg.appId,
            ts: Math.ceil(new Date().getTime()/1000),
            payitem: params.productId+'*'+params.singlePrice/10+'*'+params.productCount,
            goodsmeta: params.productName+'*'+params.productDesc,
            goodsurl: params.productUrl || "",
            pf: pf,
            zoneid: params.serverId,
            pfkey: pfKey
        };

        var u = '/mpay/buy_goods_m';
        signObj.sig = calcSign('GET', u, signObj, wrapper.cfg.appKey);
        var q =  u + '?' + querystring.stringify(signObj);
        this.getClient().get(q, function (err, req, res, obj) {
            if (err) {
                self._logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self._logger.debug({obj: obj}, 'return from channel');
            if (obj.ret !== 0) {
                var e = mapError(obj.ret, 'pendingPay');
                callback(e);
            } else {
                callback(null, obj.token, params, obj.url_params);
            }
        });
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

module.exports =
{
    name: 'qqmob',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker) {
                return new QQMobChannel(userAction, logger, cfgChecker);
            }
};




