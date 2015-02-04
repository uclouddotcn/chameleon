var crypto = require('crypto');
var ursa = require('ursa');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;
var makePrivatePemFormat = commonLib.makePrivatePemFormat;
var makePublicPemFormat = commonLib.makePublicPemFormat;

var cfgDesc = {
    appId: 'string',
    appKey: 'string'
};


var EwanChannel = function(logger, cfgChecker, debug) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.debug = debug;
    var clientUrl = 'http://unionlogin.123cw.cn';
    if (debug) {
        clientUrl = 'http://test.sdk.123cw.cn';
    }
    this._logger.debug({url: clientUrl}, 'using url');
    this.client = restify.createStringClient({
        url: clientUrl,
        retry: false,
        log: this._logger,
        accept: '*/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(EwanChannel, SDKPluginBase);

EwanChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/verifyToken?';
    if (this.debug) {
        u = '/UnionLogin/verifyToken?'
    }
    var sign = calcMd5([others, token, wrapper.cfg.appKey])
    var obj = {
        openid: others,
        token: token,
        sign: sign
    };
    this.client.get(u+querystring.stringify(obj), function (err, req, res) {
        req.log.debug({req: req, err: err, obj: res.body}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            if (res.body === 'success') {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                // error
                callback(null, {
                    code: ErrorCode.ERR_FAIL
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
    var s = params.join('|');
    md5sum.update(s);
    return md5sum.digest('hex');
}

EwanChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'get',
            path: '/pay'
        }
    ];
};

EwanChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var obj = req.query;
    req.log.debug({req: req, params: obj}, 'recv pay rsp');
    try {
        if (!obj) {
            return next(new restify.InvalidArgumentError('missing query infos'));
        }
        var sign = calcMd5([obj.serverid, obj.custominfo, obj.openid,
            obj.ordernum, obj.status, obj.paytype, obj.amount,
            obj.errdesc, obj.paytime, wrapper.cfg.appKey]);
        if (obj.sign !== sign) {
            this.send(res, 100);
            return next();
        }
        var orderId = obj.custominfo;
        var amount = obj.amount;
        var status = ErrorCode.ERR_OK;
        if (status !== '1') {
            status = ErrorCode.ERR_FAIL;
        }
        var other = {
            payTime: obj.paytime,
            chOrderId: obj.ordernum,
            payType: obj.payType
        };
        wrapper.userAction.pay(wrapper.channelName, null, null,
            orderId, status,
            null, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 1);
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'ERROR_FAIL');
        return next();
    }

};

EwanChannel.prototype.send = function (res, result) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(result),
        'Content-Type': 'text/plain'
    });
    res.write(result);
};


module.exports =
{
    name: 'ewan',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new EwanChannel(logger, checker, debug);
    }
};


