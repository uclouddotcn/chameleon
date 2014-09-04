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


var XiaomiChannel = function(name, cfgItem, userAction, logger) {
    this.name = name;
    this.userAction = userAction;
    this.cfgItem = cfgItem;
    this.logger = logger;
    this.reloadCfg(cfgItem);
};

XiaomiChannel.prototype.getInfo = function () {
    return {
        appid : this.cfgItem.appId,
        appKey: this.cfgItem.appKey,
        appSecret: this.cfgItem.appSecret,
        requestUri : this.requestUri
    };
};

XiaomiChannel.prototype.verifyLogin = 
function(token, others, callback) {
    var self = this;
    var params = {
        appId: this.cfgItem.appId,
        session: token,
        uid: others
    };
    params.signature = this.calcSecret(params);
    var q = '/api/biz/service/verifySession.do?' + 
        querystring.stringify(params);
    this.logger.debug({params: params}, 'sending ' + q);
    this.client.get(q, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }  
        if (obj.errcode === 200) {
            callback(null, {
                code: 0,
                loginInfo: {
                    uid: others,
                    token: token,
                    channel: self.name
                }
            });
        } else {
            req.log.debug({errobj: obj}, "Fail to verify login");
            callback(null, {
                code: self.mapError(obj.errcode)
            });
        }
    });
};


function compareQueryPair(a, b) {
    if (a[0] > b[0]) {
        return 1;
    } else if (a[0] < b[0]) {
        return -1;
    } else {
        return 0;
    }
}


XiaomiChannel.prototype.calcSecret = function (params) {
    var paramArray = [];
    for (var key in params) {
        paramArray.push([key, params[key]]);
    }
    paramArray.sort(compareQueryPair);
    var content = '';
    for (var i in paramArray) {
        content += paramArray[i][0]+'='+paramArray[i][1]+'&';
    }
    var hmac = crypto.createHmac('sha1', this.cfgItem.appSecret)
    hmac.write(content.substr(0, content.length-1), 'utf-8');
    return hmac.digest('hex');
}

XiaomiChannel.prototype.getChannelSubDir = function ()  {
    var self = this;
    return [
        {
            method: 'get',
            path: '/pay',
            callback: this.respondsToPay.bind(self)
        }
    ];
};

XiaomiChannel.prototype.getRspMsg = function(errorCode, message) {
    return {
        errcode: errorCode, 
        errMsg: message
    };
}

XiaomiChannel.prototype.respondsToPay = function (req, res, next) {
    var self = this;
    var params = req.params;
    self.logger.debug({req: req}, 'responds to pay');
    var signature = params.signature;
    delete params.signature
    var expectSign = this.calcSecret(params); 
    if (expectSign != signature) {
        self.logger.warn({req: req, expectSign: expectSign,  params: params}, "unmatched sign");
        res.send(this.getRspMsg(1525));
        return next();
    }
    try {
        if (params.appId != this.cfgItem.appId) {
            res.send(this.getRspMsg(1515));
            return next();
        }
        var other = {
            timeStamp: params.payTime,
            orderId: params.orderId,
            partnerGiftConsume: params.partnerGiftConsume
        };
        self.userAction.pay(self.name, params.uid, params.appuid, 
            params.cpOrderId, getPayStatus(params.orderStatus), 
            params.productCode, params.productCount, params.payFee, other,
            function (err, result) {
                if (err) {
                    self.logger.error({err: err}, "fail to pay");
                    res.send(self.getRspMsg(3515));
                    return next();
                }
                self.logger.debug({result: result}, "recv result");
                var rsp = self.getRspMsg(200);
                self.logger.debug({rsp: rsp}, "recv result");
                res.send(rsp);
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        res.send(self.getRspMsg(3515));
        return next();
    }

}

XiaomiChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfgItem;
    this.requestUri = cfgItem.requestUri || "http://mis.migc.xiaomi.com";
    var timeout = cfgItem.timeout || 10;
    this.client = restify.createJsonClient({
        url: this.requestUri,
        retry: false,
        log: this.logger
    });
};

function getPayStatus(flag) {
    if (flag == 'TRADE_SUCCESS') {
        return ErrorCode.ERR_OK;
    } else {
        return ErrorCode.ERR_PAY_FAIL;
    }
}


XiaomiChannel.prototype.mapError = function (errorCode) {
    if (errorCode === 1525) {
        return ErrorCode.ERR_SIGN_NOT_MATCH;
    } else if (errorCode == 1520 || errorCode == 1516) {
        return ErrorCode.ERR_LOGIN_SESSION_INVALID;
    } else if (errorCode == 1515) {
        return ErrorCode.ERR_SETTING_INVALID_APPID;
    } else {
        return ErrorCode.ERR_FAIL;
    }
}

module.exports =
{
    name: 'xiaomi',
    cfgDesc: cfgDesc,
    create: function (name, cfgItem, userAction, logger) {
                return new XiaomiChannel(name, cfgItem, userAction, logger);
            }
};



