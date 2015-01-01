"use strict";

var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    requestUri: '?string',
    appId: 'string',
    appSecret: 'string',
    appKey: 'string',
    timeout: '?integer'
};

var QihuChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.defaultUri = "https://openapi.360.cn";
    this.client = restify.createJsonClient({
        url: this.defaultUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(QihuChannel, SDKPluginBase);

QihuChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    async.waterfall([
        //requestAccessToken.bind(
        //    undefined, self.client, wrapper.cfg, token, others),
        requestUserInfo.bind(undefined, self.client, token)
    ], function (err, result){
        if (err) {
            return callback(err);
        }
        if (result.loginInfo) {
            result.loginInfo.channel = wrapper.channelName;
        }
        callback(null, result);
    });
};

QihuChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay'
        },
        {
            method: 'get',
            path: '/pay'
        }
    ];
};


function requestAccessToken(client, cfgItem, token, others, next) {
    var q = '/oauth2/access_token?' + 
        querystring.stringify({
            grant_type: 'authorization_code',
            code: token,
            client_id: cfgItem.appKey,
            client_secret: cfgItem.appSecret,
            redirect_uri: 'oob'
        });

    client.get(q, 
        function (err, req, res, obj) {
            req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
            if (err) {
                req.log.warn({err: err}, 'request error');
                return next(err);
            }  
            next(null, obj);
        });
}

function requestUserInfo(client, accessToken, callback) {
    var q = '/user/me.json?' +
        querystring.stringify({
            access_token: accessToken,
            fields: 'id,name,avatar,sex,area'
        });
    client.get(q,
        function (err, req, res, obj) {
            req.log.debug({req: req, err: err, obj: obj}, 'on result ');
            if (err) {
                req.log.warn({err: err}, 'request error');
                callback(err);
            } else {
                var loginInfo = {
                    uid: obj.id,
                    token: accessToken,
                    name: obj.name,
                    avatar: obj.avatar, 
                    others: JSON.stringify({
                        sex: obj.sex,
                        area: obj.area,
                        nick: obj.nick
                    })
                };
                var result = {
                    code: 0,
                    loginInfo: loginInfo
                };
                callback(null, result);
            }
        });
}

function calcPrivateKey(appKey, appSecret) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(appSecret + '#' + appKey);
    return md5sum.digest('hex');
}

function send(res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
}



QihuChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    self._logger.debug({req: req}, 'responds to pay');
    var params = req.params;
    try {
        var expectSign = calcPaySign(wrapper.cfg.appSecret, params);
        if (expectSign != params.sign) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            send(res, 'error');
            return next();
        }
        var other = {
            orderId: params.order_id
        };
        wrapper.userAction.pay(wrapper.channelName, params.user_id, params.app_uid,
            params.app_order_id, getPayStatus(params.gateway_flag),
            params.product_id, 0, params.amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    send(res, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                send(res, 'ok');
                return next();
            }
        );
    } catch (e) {
        self._logger.warn({err: e}, "Fail to responds to pay");
        send(res, 'error');
        return next();
    }
}

function compareParam(a, b) {
    if (a[0] < b[0]) {
        return -1;
    } else if (a[0] > b[0]) {
        return 1;
    } else {
        return 0;
    }
}

function filterFunc(a) {
    return a[1] && a[1].length !== 0;
}

function calcSign(appSecret, input) {
    var calcInput = input.filter(filterFunc);
    calcInput.sort(compareParam);
    var s = calcInput.map(function(a) {return a[1];}).join('#');
    var md5sum = crypto.createHash('md5');
    md5sum.update(s + '#' + appSecret);
    return md5sum.digest('hex');
}

function calcPaySign(secret, params) {
    return calcSign(secret, [
        ["app_key", params.app_key],
        ["product_id", params.product_id],
        ["amount", params.amount],
        ["app_uid", params.app_uid],
        ["app_ext1", params.app_ext1],
        ["app_ext2", params.app_ext2],
        ["user_id", params.user_id],
        ["order_id", params.order_id],
        ["gateway_flag", params.gateway_flag],
        ["sign_type", params.sign_type],
        ["app_order_id", params.app_order_id]
    ]);
}

function getPayStatus(flag) {
    if (flag === 'success') {
        return 0;
    } else {
        return -1;
    }
}

module.exports =
{
    name: 'qihu',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker) {
                return new QihuChannel(logger, cfgChecker);
            }
};



