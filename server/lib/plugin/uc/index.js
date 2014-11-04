"use strict";
var async = require('async');
var crypto = require('crypto');
var restify = require('restify');

var querystring = require('querystring');
var util = require('util');

var createSDKError = require('../../sdk-error').codeToSdkError;
var _errorcode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    cpId: 'integer',
    gameId: 'integer',
    apiKey: 'string',
};

var UCChannel = function(userAction, logger, cfgChecker, debug) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    if (debug) {
        this.defaultUri = "http://sdk.test4.g.uc.cn";
    } else {
        this.defaultUri = "http://sdk.g.uc.cn";
    }
    this.client = restify.createJsonClient({
        url: this.defaultUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};

util.inherits(UCChannel, SDKPluginBase);

UCChannel.prototype.calcSign = function (s) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex').toLocaleLowerCase();
};

UCChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var sign = this.calcSign(wrapper.cfg.cpId+'sid='+token+wrapper.cfg.apiKey);
    var params = {
        id: (new Date()).getTime()/1000,
        service: "ucid.user.sidInfo",
        data: {
            sid: token
        },
        game: {
            cpId: wrapper.cfg.cpId,
            gameId: wrapper.cfg.gameId,
            channelId: '2',
            serverId: 0
        },
        sign: sign
    };
    this.client.post('/ss', params, function (err, req, res, obj) {
        self._logger.debug({rsp: obj}, 'recv from uc');
        if (err) {
            req.log.warn({err: err}, 'fail to get rsp from remote');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
            return;
        }
        try {
            var result = null;
            if (obj.state.code === 1) {
                result = {
                    code: _errorcode.ERR_OK,
                    loginInfo: {
                        uid: obj.data.ucid.toString(),
                        token: token,
                        name: obj.data.nickName
                    }
                };
            } else {
                if (obj.state.code === 10) {
                    req.log.warn({params: params}, 'param error');
                    result = {
                        code: _errorcode.ERR_FAIL
                    };
                } else {
                    result = {
                        code: _errorcode.ERR_LOGIN_SESSION_INVALID
                    }
                }
            }
            callback(null, result);
        } catch (e) {
            req.log.warn({err: e}, 'unexpect exception from verfiy login rsp');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
        }
    });
};

UCChannel.prototype.respondsToPay = function (req, res, next) {
    var params = req.params;
    this._logger.debug({params: params}, 'recv pay callback from uc');
    var result = true;
    var self = this;
    try {
        var data = params.data;
        var customInfos = data.callbackInfo.split('|');
        var channel = customInfos[0];
        var wrapper = this._channels[channel];
        if (!wrapper) {
            this._userAction.payFail(channel, data.cpOrderId, _errorcode.ERR_PAY_ILL_CHANNEL);
            send(res, true);
            return next();
        }
        var cfgItem = wrapper.cfg;
        var sign = this.calcSign(cfgItem.cpId+
            'amount='+data.amount+
            'callbackInfo='+data.callbackInfo+
            'cpOrderId='+data.cpOrderId+
            'failedDesc='+data.failedDesc+
            'gameId='+data.gameId+
            'orderId='+data.orderId+
            'orderStatus='+data.orderStatus+
            'payWay='+data.payWay+
            'serverId='+data.serverId+
            'ucid='+data.ucid+
            cfgItem.apiKey);
        if (data.gameId != cfgItem.gameId) {
            result = false;
        }
        if (params.sign !== sign) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            send(res, false);
            return next();
        }
        var amount = Math.round(parseFloat(data.amount) * 100);
        var others = {
            serverId: data.serverId,
            payWay: data.payWay
        };
        self._userAction.pay(wrapper.channelName, data.ucid, null,
            data.cpOrderId, getPayStatus(data.orderStatus),
            null, 0, amount, others,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    send(res, false);
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                send(res, true);
                return next();
            }
        );
    } catch (e) {
        req.log.warn({err: e}, 'fail to responds to pay');
        send(res, false);
        return next();
    }
};

UCChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(this)
        }
    ];
};

function send(res, success) {
    var t = 'SUCCESS';
    if (!success) {
        t = 'FAILURE';
    }
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(t),
        'Content-Type': 'text/plain'
    });
    res.write(t);
}

function getPayStatus(orderStatus) {
    if (orderStatus === 'S') {
        return 0;
    } else {
        return -1;
    }
}

module.exports =
{
    name: 'uc',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker, debug) {
                return new UCChannel(userAction, logger, cfgChecker, debug);
            }
};



