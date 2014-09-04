/// <reference path="../user-events.d.ts" />
var crypto = require('crypto');
var restify = require('restify');
var querystring = require('querystring');
var _errorcode = require('../common/error-code');
var plugincommon = require('../common/plugin-common');

var ErrorCode = _errorcode.ErrorCode;

var requestUri = "http://service.sj.91.com";

var Nd91Channel = (function () {
    function Nd91Channel(name, cfg, userAction, logger) {
        this.name = name;
        this.cfg = cfg;
        this.userAction = userAction;
        var timeout = cfg.timeout || 10;
        this.client = restify.createJsonClient({
            url: requestUri,
            retry: false,
            log: logger
        });
        this.logger = logger;
    }
    // start a request for verifing the login request to Channel
    Nd91Channel.prototype.verifyLogin = function (token, others, callback) {
        var _this = this;
        var obj = JSON.parse(others);
        if (!obj.uin) {
            this.logger.error({ others: others }, "uin is missing from others");
            return callback(new Error("can't find uin in other for nd91"));
        }
        var uin = obj.uin;
        var nick = obj.nick;
        var act = 4;
        var sign = calcVerifySessionSign(this.cfg.appId, act, obj.uin, token, this.cfg.appKey);
        var q = '/usercenter/AP.aspx?' + querystring.stringify({
            AppId: this.cfg.appId,
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
            if (parseInt(obj.ErrorCode) === 1) {
                var ret = new plugincommon.VerifyLoginRespond();
                ret.code = 0;
                ret.loginInfo = new plugincommon.UserLoginInfo();
                ret.loginInfo.uid = uin;
                ret.loginInfo.token = token;
                ret.loginInfo.channel = _this.name;
                ret.loginInfo.name = nick;
                return callback(null, ret);
            } else {
                var ret = new plugincommon.VerifyLoginRespond();
                ret.code = mapErrorCode(parseInt(obj.ErrorCode));
                return callback(null, ret);
            }
        });
    };

    // get specific info of this channel
    Nd91Channel.prototype.getInfo = function () {
        return {
            appId: this.cfg.appId,
            appKey: this.cfg.appKey
        };
    };

    // get callback settings of the channel
    Nd91Channel.prototype.getChannelSubDir = function () {
        var payCallback = new plugincommon.ChannelSubUrls();
        payCallback.method = 'get';
        payCallback.path = 'pay';
        payCallback.callback = this.onPayCallback.bind(this);
        return [payCallback];
    };

    // reload cfg
    Nd91Channel.prototype.reloadCfg = function (cfg) {
        this.cfg = cfg;
        this.client = restify.createJsonClient({
            url: requestUri,
            retry: false,
            log: this.logger
        });
        return this;
    };

    Nd91Channel.prototype.onPayCallback = function (req, res, next) {
        this.logger.debug({ params: req.params }, 'recv pay callback');
        var params = req.params;

        // validates the appid
        if (parseInt(params.AppId) !== this.cfg.appId) {
            res.send(makeRes(2));
            return next();
        }

        // verify the sign
        var expectSign = calcPaySign(params, this.cfg.appKey);
        if (expectSign !== params.Sign) {
            res.send(makeRes(5));
            return next();
        }

        var status = mapStatus(parseInt(params.PayStatus));
        this.userAction.pay(this.name, params.Uin, null, params.CooOrderSerial, status, params.GoodsId, parseInt(params.GoodsCount), Math.floor(parseFloat(params.OrderMoney) * 100), {
            createTime: params.CreateTime,
            consumeStreamId: params.ConsumeStreamId
            }, this.respondToPayCallback.bind(this, res, next));
    };

    Nd91Channel.prototype.respondToPayCallback = function (res, next, err, result) {
        this.logger.debug({ err: err, result: result }, 'respond pay');
        var code = 1;
        var msg = '';
        if (err) {
            code = 0;
            msg = err.message;
            this.logger.warn({ err: err }, 'fail to finish pay');
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

function create(name, cfgItem, userAction, logger) {
    return new Nd91Channel(name, cfgItem, userAction, logger);
}
exports.create = create;
