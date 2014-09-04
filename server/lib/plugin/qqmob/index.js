var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var sdkerror = require('../../sdk-error');
var _errorcode = require('../common/error-code');

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    timeout: '?integer'
};

var QQ_MOB_URL = "http://openapi.tencentyun.com";
var QQ_MOB_DEBUG_URL = "http://119.147.19.43";

var QQMobChannel = function(name, cfgItem, userAction, logger) {
    this.name = name;
    this.cfgItem = cfgItem;
    this.userAction = userAction;
    var timeout = cfgItem.timeout || 3;
    this.productionClient = restify.createJsonClient({
        url: QQ_MOB_URL,
        retry: false,
        log: logger
    });
    this.logger = logger;
};


QQMobChannel.prototype.getInfo = function () {
    return {
        appid : this.cfgItem.appId,
        appKey: this.cfgItem.appKey,
        timeout: this.timeout,
    };
};

QQMobChannel.prototype.getClient = function (debug) {
    if (debug) {
        return restify.createJsonClient({
            url: QQ_MOB_DEBUG_URL,
            retry: false,
            log: this.logger
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
    paramArrayStr = paramArrayStr.replace(/\*/g, '%2A')
    var urlStr = encodeURIComponent(url);
    var sourceStr = method+'&'+urlStr+'&'+paramArrayStr;
    var secretKey = appKey+'&';
    var encoder = crypto.createHmac('sha1', secretKey);
    encoder.update(sourceStr);
    return encoder.digest('base64');
}

QQMobChannel.prototype.verifyLogin = 
function(token, others, callback) {
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
            appid: this.cfgItem.appId,
            pf: pf
        };
        var u = '/v3/user/get_info';
        var sig = calcSign('GET', u, signObj, this.cfgItem.appKey);
        var queryObj = {
            openid: openid,
            openkey: token,
            appid: this.cfgItem.appId,
            pf: pf,
            sig: sig
        };
        var q =  u + '?' + querystring.stringify(queryObj);
        var result = null;
        this.getClient().get(q, function (err, req, res, obj) {
            if (err) {
                self.logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self.logger.debug({obj: obj}, 'return from channel');
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
                        channel: self.name,
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
        this.logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};


QQMobChannel.prototype.getChannelSubDir = function ()  {
    var self = this;
    return [
    ];
};


QQMobChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfg;
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
                    ret: code,
                }
            };
        case -5:
            return {
                code: _errorcode.ERR_SIERR_SIGN_NOT_MATCH,
                message: {
                    channel: 'qqmob',
                    ret: code,
                }
            };
        default: 
            return {
                code: _errorcode.ERR_FAIL,
                msg: {
                    channel: 'qqmob',
                    ret: code,
                }
            };
    }
}

QQMobChannel.prototype.pendingPay = function (params, callback) {
    var self = this;
    try {
        var tokenObj = JSON.parse(params.token);
        var pf = tokenObj.p;
        var pfKey = tokenObj.pk;
        var accessToken = tokenObj.t;
        var payToken = tokenObj.pt;
        var debug = tokenObj.debug;
        var productUrl = params.productUrl;
        var signObj = {
            openid: params.uid,
            openkey: accessToken,
            pay_token: payToken,
            appid: this.cfgItem.appId,
            ts: Math.ceil(new Date().getTime()/1000),
            payitem: params.productId+'*'+params.singlePrice/10+'*'+params.productCount,
            goodsmeta: params.productName+'*'+params.productDesc,
            goodsurl: params.productUrl || "",
            pf: pf,
            zoneid: params.serverId,
            pfkey: pfKey,
        };

        var u = '/mpay/buy_goods_m';
        var sig = calcSign('GET', u, signObj, this.cfgItem.appKey);
        signObj.sig = sig; 
        var q =  u + '?' + querystring.stringify(signObj);
        this.getClient().get(q, function (err, req, res, obj) {
            if (err) {
                self.logger.debug({err: err}, 'return from channel');
                return callback(err);
            }
            self.logger.debug({obj: obj}, 'return from channel');
            if (obj.ret !== 0) {
                var e = mapError(obj.ret, 'pendingPay');
                callback(e);
            } else {
                callback(null, obj.token, params, obj.url_params);
            }
        });
    } catch (e) {
        this.logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

module.exports =
{
    name: 'qqmob',
    cfgDesc: cfgDesc,
    create: function (name, cfgItem, userAction, logger) {
                return new QQMobChannel(name, cfgItem, userAction, logger);
            }
};




