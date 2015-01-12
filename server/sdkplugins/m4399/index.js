var crypto = require('crypto');
var rsa = require("node-bignumber");
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    'appId': 'string',
    'appKey': "string",
    'appSecret': "string"
};


var M4399Channel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createStringClient({
        url: "http://m.4399api.com",
        retry: false,
        log: this._logger,
        accept: 'text/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(M4399Channel, SDKPluginBase);

M4399Channel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/openapi/oauth-check.html?';
    var sign = calcMd5([wrapper.cfg.appKey, others, token, wrapper.cfg.appSecret]);
    var obj = {
        uid: others,
        state: token,
        key: wrapper.cfg.appKey,
        sign: sign
    };
    this._logger.debug({qs: u+querystring.stringify(obj)}, 'query string');
    this.client.get(u+querystring.stringify(obj), function (err, req, res) {
        req.log.debug({req: req, err: err, res: res}, 'on result ');
        if (!res.body) {
            req.log.warn('null request body');
            return callback(new Error('null request body'));
        }
        try {
            var obj = JSON.parse(res.body);
            if (obj.code === 100) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                req.log.warn({rsp: obj}, 'Fail to verify login');
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

function calcMd5(params) {
    var md5sum = crypto.createHash('md5');
    for (var i = 0; i < params.length; ++i) {
        if (params[i]) {
            md5sum.update(params[i]);
        }
    }
    return md5sum.digest('hex');
};

M4399Channel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'get',
            path: '/pay'
        }
    ];
};

M4399Channel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    req.log.debug({req: req, params: req.params, body: req.body}, 'recv pay rsp');
    try {
        var obj = req.query;
        if (!obj) {
            self.reply(res, false, {code: 'other_error'});
            return next();
        } else {
            var sign = calcMd5([obj.orderid, obj.uid, obj.money, obj.gamemoney, obj.serverid, obj.secret,
                obj.mark, obj.roleid, obj.time]);
            if (sign !== obj.sign) {
                self.reply(res, false, {code: 'sign_error'});
                return next();
            } else {
                var orderId = obj.mark;
                var uid = obj.uid;
                var payMoney = Math.floor(obj.money * 100);
                var other = {
                    chOrderId: obj.orderid,
                    p_type: obj.p_type,
                    createTime: obj.time,
                    gamemoney: obj.gamemoney,
                    serverid: obj.serverid
                };
                wrapper.userAction.pay(wrapper.channelName, uid, null,
                    orderId, ErrorCode.ERR_OK,
                    null, null, payMoney, other,
                    function (err, result) {
                        if (err) {
                            self._logger.error({err: err}, "fail to pay");
                            self.reply(res, false, {code: 'other_error', msg: err.message});
                            return next();
                        }
                        self._logger.debug({result: result}, "recv result");
                        self.reply(res, true, {money: obj.money.toString(), game_money: obj.gamemoney.toString()});
                        return next();
                    }
                );
            }
        }
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'FAILURE');
        return next();
    }
};

M4399Channel.prototype.reply = function (res, success, body) {
    if (success) {
        body.status = 2;
    } else {
        body.status = 1;
    }
    res.send(body);
};



module.exports =
{
    name: 'm4399',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new M4399Channel(logger, checker, debug);
    }
};

