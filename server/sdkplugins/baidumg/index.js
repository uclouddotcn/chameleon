var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId: 'integer',
    appKey: 'string',
    appSecret: 'string'
};


var BaidumgChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.requestUri = "http://querysdkapi.91.com";
    this.client = restify.createStringClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(BaidumgChannel, SDKPluginBase);

BaidumgChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var cfgItem = wrapper.cfg;
    var q = '/LoginStateQuery.ashx';
    var postObj = {
        AppID: wrapper.cfg.appId,
        AccessToken: token,
        Sign: this.calcSecret([wrapper.cfg.appId, token, wrapper.cfg.appSecret])
    }
    this.client.post(q, querystring.stringify(postObj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        try {
            obj = JSON.parse(obj);
            if (err) {
                req.log.warn({err: err}, 'request error');
                return callback(err);
            }
            if (obj.ResultCode === 1) {
                callback(null, {
                    code: 0,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                req.log.debug({retObj: obj}, "Fail to verify login");
                callback(null, {
                    code: ErrorCode.ERR_FAIL
                });
            }
        } catch (e) {
            self._logger.error({err: e}, "Fail to parse response");
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        }
    });
};


BaidumgChannel.prototype.calcSecret = function (params) {
    var s = params.join('');
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex').toLowerCase();
};

BaidumgChannel.prototype.getPayUrlInfo = function ()  {
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

BaidumgChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        if (wrapper.cfg.appId !== params.AppID) {
            self.send(res, wrapper, 0, 'ERROR_SIGN');
            return next();
        }
        var cfgItem = wrapper.cfg;
        var expectSign = this.calcSecret([params.AppID, params.OrderSerial, params.CooperatorOrderSerial,
            params.Content, cfgItem.appSecret]);
        if (expectSign != params.Sign) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            self.send(res, wrapper, 0, 'ERROR_SIGN');
            return next();
        }
        var content = new Buffer(params.Content, 'base64').toString();
        var obj = JSON.parse(content);
        var other = {
            chOrderId: params.OrderSerial,
            createTime: obj.StartDateTime,
            payTime: obj.BankDateTime
        };
        var status = ErrorCode.ERR_OK;
        if (obj.OrderStatus !== 1) {
            status = ErrorCode.ERR_FAIL;
        }
        var amount = Math.round(parseFloat(obj.OrderMoney) * 100);
        wrapper.userAction.pay(wrapper.channelName, obj.UID.toString(), null,
            params.CooperatorOrderSerial, status,
            null, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, wrapper, 0, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, wrapper, 1, 'SUCCESS');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, wrapper, 0, 'ERROR_FAIL');
        return next();
    }

};

BaidumgChannel.prototype.send = function (res, wrapper, code, body) {
    res.send({
        AppID: wrapper.cfg.appId,
        ResultCode: code,
        ResultMsg: body,
        Sign: this.calcSecret([wrapper.cfg.appId, code, body])
    });
};


function escape(c) {
    var cc = encodeURIComponent(c);
    return cc.replace(/\*/g, '%2A');
}

module.exports =
{
    name: 'baidumg',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker) {
                return new BaidumgChannel(logger, checker);
            }
};



