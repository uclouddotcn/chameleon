var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('./common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appKey: 'string',
    appSecret: 'string'
};


var AnzhiChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.requestUri = "http://user.anzhi.com";
    this.client = restify.createStringClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        accept: '*/*',
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(AnzhiChannel, SDKPluginBase);

function getFormattedTime() {
    var d = new Date();
    var m = d.getMonth();
    if (m < 10) {
        m = '0' + m.toString();
    }
    var month = d.getMonth().toString();
    if (month.length == 1) {
        month = '0' + month;
    }
    var date = d.getDate().toString();
    if (date.length == 1) {
        date = '0' + date;
    }
    var hour = d.getHours().toString();
    if (hour.length == 1) {
        hour = '0' + hour;
    }
    var minute = d.getMinutes().toString();
    if (minute.length == 1) {
        minute = '0' + minute;
    }
    var seconds = d.getSeconds().toString();
    if (seconds.length == 1) {
        seconds = '0' + seconds;
    }
    var milisec = d.getMilliseconds().toString();
    if (milisec.length == 1) {
        milisec = '00' + milisec;
    } else if (milisec.length == 2) {
        milisec = '0' + milisec;
    }
    return d.getFullYear()+month+date+hour+minute+seconds+milisec;
}

AnzhiChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var cfgItem = wrapper.cfg;
    var u = '/web/api/sdk/third/1/queryislogin';
    var queryObj = {
            appkey: cfgItem.appKey,
            sid: token,
            time: getFormattedTime(),
            sign: this.calcSecret([cfgItem.appKey, token, cfgItem.appSecret])
        };
    this._logger.debug({query: queryObj}, 'post data');
    this.client.post(u, queryObj, function (err, req, res, data) {
        req.log.debug({req: req, err: err, data: data}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            // 我他妈真的要给安智的开发给跪了
            data = data.replace(/'/g, '"');
            var obj = JSON.parse(data);
            var code = self.mapError(obj.sc);
            if (code === 0) {
                callback(null, {
                    code: 0,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                req.log.debug({code: obj.sc}, "Fail to verify login");
                callback(null, {
                    code: code
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

AnzhiChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    var self = this;
    try {
        var orderId = wrapper.genOrderId();
        orderId = 'anzhi' + orderId.replace(/-/g, '');
        setImmediate(callback, null, orderId, params);
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

AnzhiChannel.prototype.calcSecret = function (params) {
    var s = params.join('');
    return new Buffer(s).toString('base64')
};

AnzhiChannel.prototype.getPayUrlInfo = function ()  {
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

AnzhiChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        var obj = this.decrypt(wrapper, params.data);
        req.log.debug({params: obj}, 'recv pay rsp');
        var orderId = obj.cpInfo;
        var other = {
            "notifyTime": obj.notifyTime,
            chOrderId: obj.orderId
        };
        var status = obj.code === 1 ? ErrorCode.ERR_OK : ErrorCode.ERR_FAIL;
        wrapper.userAction.pay(wrapper.channelName, obj.uid, null,
            orderId, status,
            null, null, obj.orderAmount, other, {keep: obj.orderId},
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, err.message);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'success');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'ERROR_FAIL');
        return next();
    }

};

AnzhiChannel.prototype.decrypt = function (wrapper, data) {
    var c = crypto.createDecipheriv('des-ede3', new Buffer(wrapper.cfg.appSecret), new Buffer(0));
    var d = c.update(data, 'base64', 'utf8');
    d += c.final('utf8');
    return JSON.parse(d);
}

AnzhiChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};


function getPayStatus(flag) {
    if (flag == '1') {
        return ErrorCode.ERR_OK;
    } else {
        return ErrorCode.ERR_PAY_FAIL;
    }
}


AnzhiChannel.prototype.mapError = function(errorCode) {
    if (errorCode == '1' || errorCode == '200') {
        return ErrorCode.ERR_OK;
    } else if (errorCode == '0' || errorCode == '207') {
        return ErrorCode.ERR_LOGIN_SESSION_INVALID;
    } else if (errorCode == '5') {
        return ErrorCode.ERR_SIGN_NOT_MATCH;
    } else if (errorCode == '205') {
        return ErrorCode.ERR_LOGIN_UID_INVALID;
    } else {
        return ErrorCode.ERR_FAIL;
    }
};

function escape(c) {
    var cc = encodeURIComponent(c);
    return cc.replace(/\*/g, '%2A');
}

module.exports =
{
    name: 'anzhi',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
                return new AnzhiChannel(logger, checker, debug);
            }
};



