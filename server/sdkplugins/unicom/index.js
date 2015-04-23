var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');
var xml2js = require('xml2js');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    cpId: 'string',
    channelId: 'string',
    appId : 'string',
    appKey: 'string',
    appSecret: 'string'
};

function formatNumber(n) {
    if (n < 10) {
        return "0" + n;
    } else {
        return n
    }
}

function getNowFormatDate() {
    var date = new Date();
    var month = formatNumber(date.getMonth() + 1);
    var strDate = formatNumber(date.getDate());
    var hour = formatNumber(date.getHours());
    var minute = formatNumber(date.getMinutes());
    var seconds = formatNumber(date.getSeconds());
    var currentdate = date.getFullYear() + month + strDate
        + hour + minute + seconds;
    return currentdate;
}

var UnicomChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = restify.createJsonClient({
        url: 'http://open.wostore.cn',
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};

util.inherits(UnicomChannel, SDKPluginBase);

UnicomChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var q = '/oauth2/auth/validate_oauth2_cp';
    var appId = wrapper.cfg.appId;
    var appSecret = wrapper.cfg.appSecret;
    this.client.post({
        path: q,
        headers: {
            client_id: appId,
            client_secret: appSecret,
            access_token: token
        }
    }, {}, function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        try {
            if (err) {
                req.log.warn({err: err}, 'request error');
                return callback(null, { code: ErrorCode.ERR_FAIL});
            }
            if (obj.user_id === others) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: others,
                        token: token
                    }
                });
            } else {
                callback(null, {
                    code: ErrorCode.ERR_LOGIN_SESSION_INVALID,
                    msg: obj.ErrorDesc
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

UnicomChannel.prototype.calcSign = function(s){
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex');
};

UnicomChannel.prototype.getPayUrlInfo=function(){
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

UnicomChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    try {
        var orderId = wrapper.genOrderId();
        orderId = orderId.replace(/-/g, '');
        params.channelExt = {

        };
        setImmediate(callback, null, orderId, params);
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};


UnicomChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    this._logger.debug({req: req, body: req.body}, 'receive pay callback');
    try {
        var methodid = req.query.serviceid;
        if (methodid === 'validateorderid') {
            self.validateOrder(req.body, res, next, wrapper);
        } else {
            self.doPay(obj, res, next, wrapper);
        }
    } catch (e) {
        this._logger.debug({err: e, obj: obj}, 'fail to handle call');
        return next(new restify.InvalidArgumentError('unknown error'));
    }
};

UnicomChannel.prototype.doPay = function (body, res, next, wrapper) {
    var self = this;
    self._logger.debug({body: body}, 'in do pay');
    xml2js.parseString(body, function (err, result) {
        var sign = null,
            orderid = null,
            orderTime = null,
            cpId = null,
            appId = null,
            fid = null,
            consumeCode = null,
            payfee = null,
            payType = null,
            hRet = null,
            status = null,
            expectSign = null,
            payStatus = null;
        if (err) {
            return next(restify.InvalidArgumentError('unknown request'));
        }
        try {
            sign = result.callbackReq.signMsg[0];
            orderid = result.callbackReq.orderid[0];
            orderTime = result.callbackReq.ordertime[0];
            cpId = result.callbackReq.cpid[0];
            appId = result.callbackReq.appid[0];
            fid = result.callbackReq.fid[0];
            consumeCode = result.callbackReq.consumeCode[0];
            payfee = parseInt(result.callbackReq.payfee[0]);
            payType = result.callbackReq.payType[0];
            hRet = parseInt(result.callbackReq.hRet[0]);
            status = result.callbackReq.status[0];

            expectSign = self.calcMd5(
                "orderid="+orderid+
                "&ordertime="+orderTime+
                "&cpid="+cpId+
                "&appid="+appId+
                "&fid="+fid+
                "&consumeCode="+consumeCode+
                "&payfee="+payfee+
                "&payType="+payType+
                "&hRet="+hRet+
                "&status="+status+
                "&key="+wrapper.cfg.appSecret
            );
            if (expectSign !== sign) {
                self._logger.warn({e: expectSign, r: sign}, 'unmatched sign');
                return next(restify.InvalidArgumentError('ill request'));
            }

            if (appId !== wrapper.cfg.appId || cpId !== wrapper.cfg.cpId || fid !== wrapper.cfg.channelId) {
                self._logger.warn('unmatched vendor info');
                return next(restify.InvalidArgumentError('ill request'));
            }

            payStatus = hRet === 0 ? ErrorCode.ERR_OK : ErrorCode.ERR_FAIL;
            var others = {
                payType: payType,
                orderTime: orderTime,
                consumeCode: consumeCode
            };
            wrapper.userAction.pay(wrapper.channelName, null, null,
                orderid, payStatus,
                null, null, payfee, others,
                function (err, result) {
                    if (err) {
                        self._logger.error({err: err}, "fail to pay");
                        return next(restify.InvalidArgumentError(''));
                    }
                    self._logger.debug({result: result}, "recv result");
                    self.send(res, self.rspToPay());
                    return next();
                }
            );
        } catch (e) {
            return next(restify.InvalidArgumentError('unknown request'));
        }
    });
};

UnicomChannel.prototype.rspToPay = function () {
    return '<?xml version="1.0" encoding="UTF-8"?>' +
        '<callbackRsp>1</callbackRsp>';
};

UnicomChannel.prototype.rspToValidate = function (code, record, wrapper) {
    if (code === 1) {
        return '<?xml version="1.0" encoding="UTF-8"?>' +
               '<paymessages>' +
                    '<checkOrderIdRsp>1</checkOrderIdRsp>' +
               '</paymessages>';

    } else {
        var chExtInfo = record.channelext;
        if (!chExtInfo) {
            return '<?xml version="1.0" encoding="UTF-8"?>' +
                '<paymessages>' +
                '<checkOrderIdRsp>1</checkOrderIdRsp>' +
                '</paymessages>';
        }
        return '<?xml version="1.0" encoding="UTF-8"?>' +
            '<paymessages>' +
                '<checkOrderIdRsp>0</checkOrderIdRsp>' +
                '<checkOrderIdRsp>'+record.uid+'</checkOrderIdRsp>' +
                '<ipaddress>'+'192168000001'+'</ipaddress>' +
                '<serviceid>'+chExtInfo.serviceid+'</serviceid>' +
                '<cpid>'+wrapper.cfg.cpId+'</cpid>' +
                '<ordertime>'+getNowFormatDate()+'</ordertime>' +
                '<imei>'+'xxx'+'</imei>' +
                '<appversion>'+'1.0'+'</appversion>'+
            '</paymessages>';
    }
}


UnicomChannel.prototype.validateOrder = function (body, res, next, wrapper) {
    var self = this;
    self._logger.debug({body: body}, 'in validate order');
    xml2js.parseString(body, function (err, result) {
        var sign = null,
            orderid = null,
            expectSign = null;
        if (err) {
            return next(restify.InvalidArgumentError('unknown request'));
        }
        try {
            sign = result.checkOrderIdReq.signMsg[0];
            orderid = result.checkOrderIdReq.orderid[0];
            expectSign = self.calcMd5("orderid="+orderid+"&Key="+wrapper.cfg.appSecret);
            if (expectSign !== sign) {
                self._logger.warn({e: expectSign, r: sign}, 'unmatched sign');
                return next(restify.InvalidArgumentError('ill request'));
            }
            wrapper.userAction.requestOrderInfo(orderid, function (err, record) {
                if (err || record) {
                    self.send(res, self.rspToValidate(1));
                    return next();
                }
                self.send(res, self.rspToValidate(0, record, wrapper));
                return next();
            });
        } catch (e) {
            return next(restify.InvalidArgumentError('unknown request'));
        }
    });
};


UnicomChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};

module.exports =
{
    name: 'unicom',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker, debug) {
        return new UnicomChannel(logger, cfgChecker, debug);
    }
};
