var crypto = require('crypto');
var querystring = require('querystring');
var restify = require('restify');
var util = require('util');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    'appKey': "string",
    'payKey': "string"
};


var MzwChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createJsonClient({
        url: "http://sdk.muzhiwan.com",
        retry: false,
        log: this._logger,
        accept: 'text/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(MzwChannel, SDKPluginBase);

MzwChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/oauth2/getuser.php?';
    var obj = {
        token: token,
        appkey: wrapper.cfg.appKey
    };
    this._logger.debug({qs: u+querystring.stringify(obj)}, 'query string');
    this.client.get(u+querystring.stringify(obj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj}, 'on result ');
        if (!res.body) {
            req.log.warn('null request body');
            return callback(new Error('null request body'));
        }
        try {
            if (obj.code === '1') {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: obj.user.uid,
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

MzwChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'get',
            path: '/pay'
        }
    ];
};

MzwChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    req.log.debug({req: req, params: req.params, query: req.query}, 'recv pay rsp');
    try {
        var obj = req.query;
        if (!obj) {
            return next(new restify.InvalidArgumentError());
        } else {
            if (obj.appkey !== wrapper.cfg.appKey) {
                this._logger.error({appkey: obj.appkey}, 'wrong app key');
                self.reply(res, 'ERROR');
                return next();
            }
            var sign = calcMd5([
                obj.appkey,
                obj.orderID,
                obj.productName,
                obj.productDesc,
                obj.productID,
                obj.money,
                obj.uid,
                obj.extern,
                wrapper.cfg.payKey
            ]);
            if (obj.sign !== sign) {
                this._logger.error({expected: obj.sign, sign: sign}, 'unmatched sign');
                self.reply(res, 'ERROR');
                return next();
            }
            var orderId = obj.extern;
            var uid = obj.uid;
            var payMoney = parseInt(obj.money)*100;
            var other = {
                chOrderId: orderId
            };
            wrapper.userAction.pay(wrapper.channelName, uid, null,
                orderId, ErrorCode.ERR_OK,
                null, null, payMoney, other,
                function (err, result) {
                    if (err) {
                        self._logger.error({err: err}, "fail to pay");
                        self.reply(res, "ERROR");
                        return next();
                    }
                    self._logger.debug({result: result}, "recv result");
                    self.reply(res, 'SUCCESS');
                    return next();
                }
            );
        }
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        return next(new restify.InvalidArgumentError("ERROR"));
    }
};

MzwChannel.prototype.reply = function (res, result) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(result),
        'Content-Type': 'text/plain'
    });
    res.write(result);
};



module.exports =
{
    name: 'mzw',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new MzwChannel(logger, checker, debug);
    }
};

