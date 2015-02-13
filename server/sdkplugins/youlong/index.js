/**
 * Created by Administrator on 2014/12/18.
 */
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    pid: 'string',
    pkey: 'string'
};

var YoulongChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createJsonClient({
        url: 'http://api.411game.com',
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};

util.inherits(YoulongChannel, SDKPluginBase);

YoulongChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var q = '/validation.do';
    var sign = this.calcSign(token+wrapper.cfg.pid+wrapper.cfg.pkey);
    var postObj = {
        UserName: token,
        PID: wrapper.cfg.pid,
        flag: sign
    };
    this._logger.debug({token: token}, "receive request");
    this.client.post(q, postObj, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        try {
            if (err) {
                req.log.warn({err: err}, 'request error');
                return callback(null, { code: ErrorCode.ERR_FAIL});
            }
            if (obj.userState  == 1) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: token,
                        token: token
                    }
                });
            } else {
                callback(null, {
                    code: ErrorCode.ERR_LOGIN_SESSION_INVALID
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

YoulongChannel.prototype.calcSign = function(s){
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex').toUpperCase();
};

YoulongChannel.prototype.getPayUrlInfo=function(){
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

YoulongChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    var params = req.params;
    var sign = params['flag'];
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        var expectSign = self.calcSign(params.orderId+params.userName+params.amount+params.extra+wrapper.cfg.pkey);
        if (expectSign !== sign) {
            self._logger.warn({e: expectSign, r: sign}, "unmatched sign");
            return next(new restify.InvalidArgumentError("error"));
        }

        var orderId = params.orderId;
        wrapper.userAction.pay(wrapper.channelName, params.userName, null,
            orderId, ErrorCode.ERR_OK,
            null, null, params.amount*100, null,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, 'failed');
                    return next(new restify.InvalidArgumentError("fail to pay"));
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'OK');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'failed');
        return next(new restify.InvalidArgumentError("fail to pay"));
    }

};

YoulongChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};

module.exports =
{
    name: 'youlong',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker, debug) {
        return new YoulongChannel(logger, cfgChecker, debug);
    }
};
