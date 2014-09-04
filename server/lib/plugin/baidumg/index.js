var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var sdkerror = require('../../sdk-error');
var ErrorCode = require('../common/error-code').ErrorCode;

var cfgDesc = {
    appId: 'string',
    appKey: 'string',
    appSecret: 'string',
    requestUri: '?string'
};


var BaidumgChannel = function(name, cfgItem, userAction, logger) {
    this.requestUri = cfgItem.requestUri || "http://sdk.m.duoku.com";
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

BaidumgChannel.prototype.getInfo = function () {
    return {
        appid : this.cfgItem.appId,
        appKey: this.cfgItem.appKey,
        appSecret: this.cfgItem.appSecret
    };
};

BaidumgChannel.prototype.verifyLogin = 
function(token, others, callback) {
    var self = this;
    var q = '/openapi/sdk/checksession?' + 
        querystring.stringify({
            appid: this.cfgItem.appId,
            appKey: this.cfgItem.appKey,
            uid: others,
            sessionid: token,
            clientsecret: this.calcSecret([this.cfgItem.appId, 
                this.cfgItem.appKey, others, token, this.cfgItem.appSecret])
        });
    this.client.get(q, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }  
        if (obj.error_code == '0') {
            callback(null, {
                code: 0,
                loginInfo: {
                    uid: others,
                    token: token,
                    channel: self.name
                }
            });
        } else {
            req.log.debug({code: obj.error_code}, "Fail to verify login");
            callback(null, {
                code: self.mapError(obj.error_code)
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

BaidumgChannel.prototype.getChannelSubDir = function ()  {
    var self = this;
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        },
        {
            method: 'get',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        }
    ];
};

BaidumgChannel.prototype.respondsToPay = function (req, res, next) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    var expectSign = this.calcSecret([params.amount, params.cardtype, 
        params.orderid, params.result, params.timetamp, 
        this.cfgItem.appSecret, escape(params.aid)]); 
    if (expectSign != params.client_secret) {
        self.logger.warn({req: req, params: params}, "unmatched sign");
        self.
        self.send(res, 'ERROR_SIGN');
        return next();
    }
    try {
        var other = {
            orderId: params.order_id,
        };
        var amount = Math.round(parseFloat(params.amount) * 100);
        var infoObj = querystring.parse(params.aid);
        self.userAction.pay(self.name, infoObj.uid, infoObj.appuid, 
            params.orderid, getPayStatus(params.result), 
            infoObj.pid, null, amount, other,
            function (err, result) {
                if (err) {
                    self.logger.error({err: err}, "fail to pay");
                    self.send(res, err.message);
                    return next();
                }
                self.logger.debug({result: result}, "recv result");
                self.send(res, 'SUCCESS');
                return next();
            }
        );
    } catch (e) {
        req.log({err: e}, 'Fail to parse pay notification');
        self.send(res, 'ERROR_FAIL');
        return next();
    }

};

BaidumgChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};


BaidumgChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfgItem;
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: this.logger
    });
};

function getPayStatus(flag) {
    if (flag == '1') {
        return ErrorCode.ERR_OK;
    } else {
        return ErrorCode.ERR_PAY_FAIL;
    }
}


BaidumgChannel.prototype.mapError = function(errorCode) {
    if (errorCode == '101') {
        return 5;
    } else if (errorCode == '103') {
        return 2;
    } else if (errorCode == '11') {
        return 13;
    } else if (errorCode == '1' ||
               errorCode == '2' ||
               errorCode == '3' ||
               errorCode == '4' ||
               errorCode == '7') {
        return 4;
    } else {
        return 1;
    }
};

function escape(c) {
    var cc = encodeURIComponent(c);
    return cc.replace(/\*/g, '%2A');
}

module.exports =
{
    name: 'baidumg',
    cfgDesc: cfgDesc,
    create: function (name, cfgItem, userAction, logger) {
                return new BaidumgChannel(name, cfgItem, userAction, logger);
            }
};



