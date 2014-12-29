"use strict";

var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');
var ursa = require('ursa');

var async = require('async');
var restify = require('restify');

var commonLib = require('./common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;
var makePublicPemFormat = commonLib.makePublicPemFormat;

var cfgDesc = {
    loginAppId: 'string',
    loginAppKey: 'string',
    loginRedirctUrl: 'string',
    payAppId: 'string',
    payAppKey: 'string',
    payPlatKey: 'string'
};

var CoolpadChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.defaultUri = "https://openapi.coolyun.com";
    this.client = restify.createJsonClient({
        url: this.defaultUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(CoolpadChannel, SDKPluginBase);

CoolpadChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    async.waterfall([
        requestAccessToken.bind(
            undefined, self.client, wrapper, token, others),
        requestUserInfo.bind(undefined, self.client, wrapper)
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

CoolpadChannel.prototype.getPayUrlInfo = function ()  {
    var self = this;
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


function requestAccessToken(client, wrapper, token, others, next) {
    var cfgItem = wrapper.cfg;
    var q = '/oauth2/token?' +
        querystring.stringify({
            grant_type: 'authorization_code',
            code: token,
            client_id: cfgItem.loginAppId,
            client_secret: cfgItem.loginAppKey,
            redirect_uri: wrapper.cfg.loginRedirctUrl
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

function requestUserInfo(client, wrapper, rspObj, callback) {
    var accessToken = rspObj.access_token;
    var cfgItem = wrapper.cfg;
    var q = '/oauth2/api/get_user_info?' +
        querystring.stringify({
            access_token: accessToken,
            oauth_consumer_key: cfgItem.loginAppId,
            openid: rspObj.openid
        });
    client.get(q,
        function (err, req, res, obj) {
            req.log.debug({req: req, err: err, obj: obj}, 'on result ');
            if (err) {
                req.log.warn({err: err}, 'request error');
                callback(err);
            } else {
                var loginInfo = {
                    uid: rspObj.openid,
                    token: accessToken,
                    name: obj.nickname,
                    channel: wrapper.channel
                };
                var result = {
                    code: 0,
                    loginInfo: loginInfo
                };
                callback(null, result);
            }
        });
}

function send(res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
}


CoolpadChannel.prototype.respondsToPay = function(req, res, next, wrapper) {
    var self = this;
    self._logger.debug({req: req}, 'responds to pay');
    var params = req.params;
    try {
        if (!checkSign(wrapper, params.transdata, params.sign)) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            send(res, 'FAILURE');
            return next();
        }
        var obj = JSON.parse(params.transdata);
        var orderId = obj.cporderid;
        var amount = parseFloat(obj.money) * 100;
        var other = {
            orderId: obj.transid,
            payType: obj.feetype,
            payTime: obj.paytype
        };
        var status = obj.result === 0 ? ErrorCode.ERR_OK : ErrorCode.ERR_FAIL;
        wrapper.userAction.pay(wrapper.channelName, obj.appuserid, null,
            orderId, status,
            null, 0, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    send(res, 'FAILURE');
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                send(res, 'SUCCESS');
                return next();
            }
        );
    } catch (e) {
        self._logger.warn({err: e}, "Fail to responds to pay");
        send(res, 'FAILURE');
        return next();
    }
}


function checkSign(wrapper, content, sign) {
    if (!wrapper.cfg.payPlatKeyObj) {
        wrapper.cfg.payPlatKeyObj = ursa.createPublicKey(makePublicPemFormat(wrapper.cfg.payPlatKey));
    }
    return wrapper.cfg.payPlatKeyObj.hashAndVerify('md5', new Buffer(content, 'utf8'), new Buffer(sign, 'base64'));
}


module.exports =
{
    name: 'coolpad',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker) {
                return new CoolpadChannel(logger, cfgChecker);
            }
};



