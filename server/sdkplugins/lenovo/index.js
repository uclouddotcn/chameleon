var crypto = require('crypto');
var rsa = require("node-bignumber");
var querystring = require('querystring');
var util = require('util');
var parseString = require('xml2js').parseString;

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    'appId': 'string',
    'appKey': "string"
};


var LenovoChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createStringClient({
        url: "http://passport.lenovo.com",
        retry: false,
        log: this._logger,
        accept: 'text/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(LenovoChannel, SDKPluginBase);

LenovoChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/interserver/authen/1.2/getaccountid?';
    var obj = {
        lpsust: token,
        realm: wrapper.cfg.appId
    };
    var self = this;
    this._logger.debug({qs: u+querystring.stringify(obj)}, 'query string');
    this.client.get(u+querystring.stringify(obj), function (err, req, res) {
        req.log.debug({req: req, err: err, res: res}, 'on result ');
        if (!res.body) {
            req.log.warn('null request body');
            return callback(new Error('null request body'));
        }
        try {
            parseString(res.body, function (err, obj) {
                if (err) {
                    req.log.error({err: err}, 'Fail to parse result');
                    return;
                }
                try {
                    if (obj.Error) {
                        var code = self.mapError(obj.Error.Code[0], obj);
                        callback(null, {
                            code: code
                        });
                    } else {
                        callback(null, {
                            code: ErrorCode.ERR_OK,
                            loginInfo: {
                                uid: obj.IdentityInfo.AccountID[0],
                                token: token,
                                channel: wrapper.channelName,
                                name: obj.IdentityInfo.Username[0]
                            }
                        });
                    }
                } catch (e) {
                    req.log.warn({err: e}, 'Fail to parse result');
                    callback(null, {
                        code: ErrorCode.ERR_FAIL
                    });
                }
            });
        } catch (e) {
            req.log.warn({err: e}, 'Fail to parse result');
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        }
    });
};

function formatMoney(amount) {
    var y = Math.floor(amount / 100);
    var x = (amount - y * 100).toString();
    if (x.length === 1) {
        x = '0' + x;
    }
    return y.toString() + '.' + x;
}

function formatTime(d) {
    var s = d.getFullYear();
    if (d.getMonth() < 9) {
        s+= '0';
    }
    s += d.getMonth()+1;
    if (d.getDay() < 10) {
        s+= '0';
    }
    s += d.getDay();
    if (d.getHours() < 10) {
        s+= '0';
    }
    s += d.getHours();
    if (d.getMinutes() < 10) {
        s+= '0';
    }
    s += d.getMinutes();
    if (d.getSeconds() < 10) {
        s+= '0';
    }
    s += d.getSeconds();
    return s;
}

function calcMd5(privateKey, modKey, sign) {
    var signStrs = sign.split(' ');
    if (!signStrs || signStrs.length <= 0) {
        return null;
    }
    var numbers = signStrs.map(function (s) {
        return new rsa.BigInteger(s, 16);
    });
    var result = [];
    for (var i = 0; i < numbers.length; ++i) {
        var a = numbers[i].modPow(privateKey, modKey);
        result += new Buffer(a.toByteArray()).toString();
    }
    return result.trim();
}

function sepKey(key) {
    var b = new Buffer(key, 'base64');
    b = new Buffer(b.toString().substr(40), 'base64');
    var s = b.toString();
    var ss = s.split('+');
    return [new rsa.BigInteger(ss[0], 10), new rsa.BigInteger(ss[1], 10)];
}

LenovoChannel.prototype.checkSign = function (wrapper, data, sign) {
    try {
        var md5sum = crypto.createHash('md5');
        md5sum.update(data);
        var m = md5sum.digest('hex');
        if (!wrapper.cfg.appPrivateKeyObj) {
            var keys = sepKey(wrapper.cfg.appKey);
            wrapper.cfg.appPrivateKeyObj = {
                e: keys[0],
                n: keys[1]
            };
        }
        var expectMd5 = calcMd5(wrapper.cfg.appPrivateKeyObj.e, wrapper.cfg.appPrivateKeyObj.n, sign);
        this._logger.debug({e: expectMd5, m: m}, 'check sign');
        return expectMd5.substr(0, m.length) === m;
    } catch (e) {
        this._logger.error({err: e}, 'Fail to decrypt md5sum');
        return false;
    }
};

LenovoChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay'
        }
    ];
};

LenovoChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    req.log.debug({req: req, params: req.params, body: req.body}, 'recv pay rsp');
    try {
        var inputData = querystring.parse(req.body);
        var params = JSON.parse(inputData.transdata)
        if (params.appid != wrapper.cfg.appId) {
            this._logger.error({appId: params.appid}, "wrong appid");
            this.send(res, "FAILURE");
            return next();
        }
        if (!this.checkSign(wrapper, inputData.transdata, inputData.sign)) {
            this.send(res, "FAILURE");
            return next();
        }
        var orderId = params.exorderno;
        var amount = params.money;
        var status = ErrorCode.ERR_OK;
        if (params.result !== 0) {
            status = ErrorCode.ERR_FAIL;
        }
        var other = {
            waresid: params.waresid,
            chOrderId: params.transid,
            pay_type: params.paytype,
            createTime: params.create_time,
            payTime: params.transtime
        };
        wrapper.userAction.pay(wrapper.channelName, null, null,
            orderId, status,
            null, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, 'FAILURE');
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'SUCCESS');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'FAILURE');
        return next();
    }

};

LenovoChannel.prototype.send = function (res, result) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(result),
        'Content-Type': 'text/plain'
    });
    res.write(result);
};


LenovoChannel.prototype.mapError = function(status, retObj) {
    this._logger.debug({retObj: retObj});
    switch (status) {
        case 'USS-0100':
        case 'USS-0103':
        case 'USS-0104':
            return ErrorCode.ERR_LOGIN_UID_INVALID;
        case 'USS-0101':
        case 'USS-0540':
        case 'USS-0542':
            return ErrorCode.ERR_LOGIN_SESSION_INVALID;
        default:
            this._logger.error({retObj: retObj}, "unexpect error");
            return ErrorCode.ERR_FAIL;
    }
};

module.exports =
{
    name: 'lenovo',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new LenovoChannel(logger, checker, debug);
    }
};


