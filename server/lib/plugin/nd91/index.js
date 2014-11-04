var querystring = require('querystring');
var util = require('util');

var crypto = require('crypto');
var restify = require('restify');

var _errorcode = require('../common/error-code');
var plugincommon = require('../common/plugin-common');
var SDKPluginBase = require('../../SDKPluginBase');

var ErrorCode = _errorcode.ErrorCode;

var requestUri = "http://service.sj.91.com";

var Nd91Channel = (function () {
    function Nd91Channel(userAction, logger, cfgChecker) {
        SDKPluginBase.call(this, userAction, logger, cfgChecker);
        this.client = restify.createJsonClient({
            url: requestUri,
            retry: false,
            log: logger,
            requestTimeout: 10000,
            connectTimeout: 20000
        });
    }
    util.inherits(Nd91Channel, SDKPluginBase);

    // start a request for verifing the login request to Channel
    Nd91Channel.prototype.verifyLogin = function (wrapper, token, others, callback) {
        var cfg = wrapper.cfg;
        var obj = JSON.parse(others);
        if (!obj.uin) {
            this._logger.error({ others: others }, "uin is missing from others");
            return callback(new Error("can't find uin in other for nd91"));
        }
        var uin = obj.uin;
        var nick = obj.nick;
        var act = 4;
        var sign = calcVerifySessionSign(cfg.appId, act, obj.uin, token, cfg.appKey);
        var q = '/usercenter/AP.aspx?' + querystring.stringify({
            AppId: cfg.appId,
            Act: act,
            Uin: uin,
            SessionId: token,
            Sign: sign
        });

        this.client.get(q, function (err, req, res, obj) {
            req.log.debug({ req: req, err: err, obj: obj, q: q }, 'on result ');
            if (err) {
                req.log.warn({ err: err }, 'request error');
                return callback(err);
            }
            var ret = new plugincommon.VerifyLoginRespond();
            if (parseInt(obj.ErrorCode) === 1) {
                ret.code = 0;
                ret.loginInfo = new plugincommon.UserLoginInfo();
                ret.loginInfo.uid = uin;
                ret.loginInfo.token = token;
                ret.loginInfo.channel = wrapper.channelName;
                ret.loginInfo.name = nick;
                return callback(null, ret);
            } else {
                ret.code = mapErrorCode(parseInt(obj.ErrorCode));
                return callback(null, ret);
            }
        });
    };

    // get callback settings of the channel
    Nd91Channel.prototype.getPayUrlInfo = function () {
        var payCallback = new plugincommon.ChannelSubUrls();
        payCallback.method = 'get';
        payCallback.path = 'pay';
        payCallback.callback = this.onPayCallback.bind(this);
        return [payCallback];
    };

    Nd91Channel.prototype.onPayCallback = function (req, res, next) {
        this._logger.debug({ params: req.params }, 'recv pay callback');
        var params = req.params;

        try {
            var customInfo = params.Note.split('|');
            var wrapper = this._channels[customInfo[0]];
            if (!wrapper) {
                this._userAction.payFail(customInfo[0], params.CooOrderSerial, ErrorCode.ERR_PAY_ILL_CHANNEL);
                res.send(makeRes(1));
                return next();
            }
            var cfg = wrapper.cfg;

            // validates the appid
            if (parseInt(params.AppId) !== cfg.appId) {
                res.send(makeRes(2));
                return next();
            }

            // verify the sign
            var expectSign = calcPaySign(params, cfg.appKey);
            if (expectSign !== params.Sign) {
                res.send(makeRes(5));
                return next();
            }

            var status = mapStatus(parseInt(params.PayStatus));
            this._userAction.pay(wrapper.channelName, params.Uin, null, params.CooOrderSerial, status, params.GoodsId, parseInt(params.GoodsCount), Math.floor(parseFloat(params.OrderMoney) * 100), {
                createTime: params.CreateTime,
                consumeStreamId: params.ConsumeStreamId
            }, this.respondToPayCallback.bind(this, res, next));
        } catch (e) {
            this._logger.error({err: e}, "Fail to pay");
            res.send(makeRes(2));
        }
    };

    Nd91Channel.prototype.respondToPayCallback = function (res, next, err, result) {
        this._logger.debug({ err: err, result: result }, 'respond pay');
        var code = 1;
        var msg = '';
        if (err) {
            code = 0;
            msg = err.message;
            this._logger.warn({ err: err }, 'fail to finish pay');
        }
        res.send(makeRes(code, msg));
        return next();
    };
    return Nd91Channel;
})();
exports.Nd91Channel = Nd91Channel;

function makeRes(errCode, errDesc) {
    var desc = errDesc || "";
    return { ErrorCode: errCode.toString(), ErrorDesc: desc };
}

function calcPaySign(params, appKey) {
    var signStr = [
        params.AppId, params.Act, params.ProductName,
        params.ConsumeStreamId, params.CooOrderSerial,
        params.Uin, params.GoodsId, params.GoodsInfo,
        params.GoodsCount, params.OriginalMoney,
        params.OrderMoney, params.Note, params.PayStatus,
        params.CreateTime, appKey].join('');
    signStr = signStr.toString();
    var md5sum = crypto.createHash('md5');
    md5sum.update(signStr, 'utf-8');
    return md5sum.digest('hex');
}

function calcVerifySessionSign(appId, act, uin, sessionId, appKey) {
    var signStr = [appId.toString(), act.toString(), uin, sessionId, appKey].join('');
    signStr = signStr.toString();
    var md5sum = crypto.createHash('md5');
    md5sum.update(signStr, 'utf-8');
    return md5sum.digest('hex');
}

function mapErrorCode(errorCode) {
    switch (errorCode) {
        case 1:
            return 0 /* ERR_OK */;
        case 11:
            return 5 /* ERR_LOGIN_SESSION_INVALID */;
        case 5:
            return 2 /* ERR_SIGN_NOT_MATCH */;
        default:
            return 1 /* ERR_FAIL */;
    }
}

function mapStatus(errCode) {
    if (errCode == 1) {
        return 0;
    } else {
        return 1;
    }
}

exports.name = 'nd91';
exports.cfgDesc = {
    appId: 'integer',
    appKey: 'string',
    timeout: '?integer'
};

function create( userAction, logger, cfgChecker) {
    return new Nd91Channel(userAction, logger, cfgChecker);
}
exports.createSDK = create;
