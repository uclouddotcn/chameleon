var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId: 'string',
    signKey: 'string'
};


var AnfengChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.requestUri = "http://api.qcwan.com";
    this.client = restify.createStringClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        accept: '*/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(AnfengChannel, SDKPluginBase);

AnfengChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var cfgItem = wrapper.cfg;
    var otherobj = null;
    var u = '/info/uc';
    try {
        otherobj = JSON.parse(others);
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse other field');
        return setImmediate(callback, e);
    }
    var queryObj = {
        appId: cfgItem.appId,
        ucid: otherobj.ucid,
        uid: otherobj.uid,
        uuid: token
    };
    queryObj.sign = this.calcSecret(queryObj, wrapper.cfg.signKey);
    this._logger.debug({query: queryObj}, 'post data');
    this.client.post(u, queryObj, function (err, req, res, data) {
        req.log.debug({req: req, err: err, data: data}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            data = JSON.parse(data);
            if (data.returnCode === 0 ) {
                callback(null, {
                    code: 0,
                    loginInfo: {
                        uid: otherobj.ucid,
                        token: token,
                        channel: wrapper.channelName,
                        nick: otherobj.uid
                    }
                });
            } else {
                req.log.error({code: data.returnCode, msg: data.msg},
                    "Fail to verify login");
                callback(null, {
                    code: data.returnCode
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

AnfengChannel.prototype.calcSecret = function (params, signKey) {
    var sortedKeys = Object.keys(params).sort();
    var md5sum = crypto.createHash('md5');
    for (var i = 0; i < sortedKeys.length; i++) {
        var key = sortedKeys[i];
        md5sum.update(key+'='+params[key]+'&', 'utf8');
    }
    md5sum.update('signKey='+signKey, 'utf8');
    return md5sum.digest('hex');
};

AnfengChannel.prototype.getPayUrlInfo = function ()  {
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

AnfengChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    req.log.debug({req: req, params: req.body}, 'recv pay rsp');
    try {
        var params = querystring.parse(req.body);
        if (params.vid !== wrapper.cfg.appId) {
            req.log.error({appId: params.vid}, 'App ID not matched');
            self.send(res, 'SUCCESS');
            return next();
        }
        var sign = params.sign;
        delete params.sign;
        var expectSign = this.calcSecret(params, wrapper.cfg.signKey);
        if (sign !== expectSign) {
            req.log.error({e: expectSign, r: sign}, 'unmached sign');
            self.send(res, 'FAIL');
            return next();
        }
        var uid = params.ucid;
        var realPayMoney = Math.floor(parseFloat(params.fee) * 100);
        var orderId =  params.vorderid;
        var other = {
            nick: params.uid,
            chOrderId: params.sn,
            createTime: params.createTime,
            productName: params.subject
        };
        var status = ErrorCode.ERR_OK;
        wrapper.userAction.pay(wrapper.channelName, uid, null,
            orderId, status,
            null, null, realPayMoney, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, "FAIL");
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'SUCCESS');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'FAIL');
        return next();
    }

};

AnfengChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};

module.exports =
{
    name: 'anfeng',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
                return new AnfengChannel(logger, checker, debug);
            }
};



