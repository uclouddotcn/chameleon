var ursa = require('ursa');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('./common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;
var makePublicKey = commonLib.makePublicPemFormat;
var makePrivateKey = commonLib.makePrivatePemFormat;

var cfgDesc = {
    pubkey: 'string',
    gameCode: 'string',
    gameName: 'string',
    payUrl: 'string',
    cpPrivateKey: 'string'
};


var HtcChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
};
util.inherits(HtcChannel, SDKPluginBase);

HtcChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    try {
        var accountObj = JSON.parse(others);
        if (this.checkSign(wrapper, others, token)) {
            setImmediate(function () {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: accountObj.user_code,
                        token: accountObj.session_id,
                        name: accountObj.user_name,
                        channel: wrapper.channelName
                    }
                })
            });
        } else {
            setImmediate(function () {
                callback(null, {
                    code: ErrorCode.ERR_FAIL
                });
            });
        }
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse login info');
        setImmediate(function () {
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        });
    }
};

HtcChannel.prototype.checkSign = function (wrapper, content, sign) {
    if (!wrapper.cfg.pubkeyObj) {
        wrapper.cfg.pubkeyObj = ursa.createPublicKey(makePublicKey(wrapper.cfg.pubkey));
    }
    return wrapper.cfg.pubkeyObj.hashAndVerify('sha1', new Buffer(content, 'utf8'), new Buffer(sign, 'base64'));
};

HtcChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    try {
        var self = this;
        var orderId = wrapper.userAction.genOrderId();
        var obj = {
            'game_name': wrapper.cfg.gameName,
            'game_code': wrapper.cfg.gameCode,
            'game_order_id': orderId,
            'product_id': params.productId || 'money',
            'product_name': params.productName || '货币',
            'product_des': params.productDesc || params.productName || '货币',
            'amount': params.realPayMoney,
            'notify_url': wrapper.cfg.payUrl,
            'user_code': params.uid,
            'session_id': infoFromSDK.s
        };
        if (!wrapper.cfg.cpPrivateKeyObj) {
            wrapper.cfg.cpPrivateKeyObj = ursa.createPrivateKey(makePrivateKey(wrapper.cfg.cpPrivateKey));
        }
        var s = JSON.stringify(obj);
        var sign = wrapper.cfg.cpPrivateKeyObj.hashAndSign('sha1', JSON.stringify(obj).toString('utf8'), 'utf8', 'base64');
        return callback(null, orderId, params, null, {
            "sign": sign,
            "p": s
         });
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};


HtcChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay'
        }
    ];
};

HtcChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    try {
        var params = querystring.parse(new Buffer(req.body).toString());
        req.log.debug({req: req, params: params}, 'recv pay rsp');
        var order = params.order.substr(1, params.order.length-2);
        if (this.checkSign(wrapper, order, params.sign.substr(1, params.sign.length-2))) {
            var obj = JSON.parse(order);
            if (obj.game_code !== wrapper.cfg.gameCode) {
                this._logger.error('unmatched game code');
                this.send(res, 'game code unmatched');
                return next();
            }
            var retCode = ErrorCode.ERR_OK;
            if (obj.result_code !== 1)  {
                retCode = ErrorCode.ERR_FAIL;
            }
            var others = {
                chOrderId: obj.jolo_order_id,
                createTime: obj.gmt_create,
                payTime: obj.gmt_payment
            };
            wrapper.userAction.pay(wrapper.channelName, null, null,
                obj.game_order_id, retCode,
                null, null, obj.real_amount, others,
                function (err, result) {
                    if (err) {
                        self._logger.error({err: err}, "fail to pay");
                        self.send(res, err.message);
                        return next();
                    }
                    self._logger.debug({result: result}, "recv result");
                    self.send(res, 'success');
                    return next();
                });
        } else {
            this.send(res, "unmatched sign");
            return next();
        }
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, 'ERROR_FAIL');
        return next();
    }

};

HtcChannel.prototype.send = function (res, result) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(result),
        'Content-Type': 'text/plain'
    });
    res.write(result);
};


module.exports =
{
    name: 'htc',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new HtcChannel(logger, checker, debug);
    }
};


