var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var sdkerror = require('../../sdk-error');
var ErrorCode = require('../common/error-code').ErrorCode;

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    paymentKey: 'string'
};


var DangleChannel = function(name, cfgItem, userAction, logger) {
    this.logger = logger;
    this.requestUri = cfgItem.requestUri || "http://connect.d.cn/";
    this.name = name;
    this.cfgItem = cfgItem;
    this.userAction = userAction;
    var timeout = cfgItem.timeout || 10;
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: logger
    });
    this.logger = logger;
};

DangleChannel.prototype.getInfo = function () {
    return {
        appId : this.cfgItem.appId,
        appKey : this.cfgItem.appKey
    };
}

DangleChannel.prototype.calcSecret = function (s) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex').toLowerCase();
};


DangleChannel.prototype.verifyLogin =
    function(token, others, callback) {
        var self = this;
        var sig = this.calcSecret(token+'|'+self.cfgItem.appKey);
        var q = '/open/member/info?' +
            querystring.stringify({
                app_id: self.cfgItem.appId,
                mid: others,
                token: token,
                sig: sig
            });
        this.client.get(q, function (err, req, res, obj) {
            req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
            if (err) {
                req.log.warn({err: err}, 'request error');
                return callback(err);
            }
            if (obj.error_code) {
                req.log.debug({body: res.body}, "Fail to verify login");
                callback(null, {
                    code: self.mapError(obj.error_code),
                    msg: obj.error_msg
                });
            } else {
                callback(null, {
                    code: 0,
                    loginInfo: {
                       uid: obj.memberId,
                       token: obj.token,
                       name: obj.nickname,
                       channel: self.name
                    }
                });
            }
        });
    };


DangleChannel.prototype.getChannelSubDir = function ()  {
    var self = this;
    return [
        {
            method: 'get',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        }
    ];
};


DangleChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};


DangleChannel.prototype.respondsToPay = function (req, res, next) {
    var self = this;
    var params = req.params;
    try {
        var success = 0;
        if (params.result !== '1') {
            success = -1;
        }
        var money = Math.ceil(parseFloat(params.money) * 100);
        var channelOrderNo = params.order;
        var uid = params.mid;
        var timestamp = params.time;
        var sign = params.signature;
        var calcString = "order="+params.order+
            "&money="+params.money+
            "&mid="+params.mid+
            "&result="+params.result+
            "&ext="+params.ext+
            "&key="+self.cfgItem.paymentKey;
        var expectSign = self.calcSecret(calcString);
        if (expectSign !== calcString) {
            self.send(res, 'invalid sign');
            return next();
        }
        var obj = JSON.parse(params.ext);
        if (obj.o === undefined) {
            req.log.error("illegal rsp format from dangle, missing order no");
            self.send(res, 'missing correct ext');
            return next();
        }
        var other = {
            chOrderId: channelOrderNo,
            timestamp: timestamp
        }
        self.userAction.pay(self.name, uid, null, obj.o,
            success, obj.p, null, money, other,
        function (err, result) {
            if (err) {
                self.logger.error({err: err}, "fail to pay");
                self.send(res, err.message);
                return next();
            }
            self.logger.debug({result: result}, "recv result");
            self.send(res, 'success');
            return next();
        });
    } catch (e) {
        req.log.warn({err: e}, 'Fail to parse pay notification');
        self.send(res, 'invalid content');
        return next();
    }

}


DangleChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfgItem;
    this.requestUri = cfgItem.requestUri || "http://connect.d.cn/";
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: this.logger
    });
};

DangleChannel.prototype.mapError = function (errorCode) {
    switch (errorCode) {
        case 100:
        case 220:
        case 221:
        case 222:
            return ErrorCode.ERR_LOGIN_SESSION_INVALID;
        case 223:
            return ErrorCode.ERR_LOGIN_UID_INVALID;
        case 101:
            return ErrorCode.ERR_FAIL;
        case 103:
            return ErrorCode.ERR_PAY_CANCEL;
        case 104:
            return ErrorCode.ERR_PAY_FAIL;
        case 239:
            return ErrorCode.ERR_PAY_FAIL;
        default:
            return ErrorCode.ERR_FAIL;
    }
}


module.exports =
{
    name: 'dangle',
    cfgDesc: cfgDesc,
    create: function (name, cfgItem, userAction, logger) {
        return new DangleChannel(name, cfgItem, userAction, logger);
    }
};


