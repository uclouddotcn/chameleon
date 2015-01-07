/**
 * Created by Administrator on 2014/12/18.
 */
var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var ErrorCode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    appKey: 'string',
    payKey: 'string'
};

var YoukuChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.client = restify.createStringClient({
        url: 'http://sdk.api.gamex.mobile.youku.com',
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};

util.inherits(YoukuChannel, SDKPluginBase);

YoukuChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var q = '/game/user/infomation';
    var postObj = {
        appkey: wrapper.cfg.appkey,
        sessionid: token
    };
    postObj['sign'] = self.calcSign(postObj, wrapper.cfg.payKey);
    this.client.post(q, querystring.stringify(postObj), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj, q: q}, 'on result ');
        try {
            obj = JSON.parse(obj);
            if (err) {
                req.log.warn({err: err}, 'request error');
                return callback(null, { code: ErrorCode.ERR_FAIL});
            }
            callback(null, {
                    code: 0,
                    loginInfo: {
                        uid: obj.uid
                    }
                });
        } catch (e) {
            self._logger.error({err: e}, "Fail to parse response");
            callback(null, {
                code: ErrorCode.ERR_FAIL
            });
        }
    });
};

YoukuChannel.prototype.calcSign = function(paramList, key){
    var params = paramList;
    var url = paramList['url'];
    if(url){
        delete  paramList['url']
    }

    var s = Object.keys(params).sort().map(function(k){
        return k+'='+params[k];
    }).join('&');
    s = url + '?' + s;
    var hmac = crypto.createHmac('md5', key);
    hmac.write(s, 'utf-8');
    return hmac.digest('base64');
};

YoukuChannel.prototype.getPayUrlInfo=function(){
    var self=this;
    return[
        {
            method: 'post',
            path:'/pay',
            callback: this.respondsToPay.bind(self)
        }
    ]
};

YoukuChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    var params = req.params;
    var sign = params['sign'];
    delete params['sign'];
    delete params['passthrough'];
    delete params['result'];
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        var expectSign = self.calcSign(params, wrapper.cfg.payKey);
        if (expectSign !== sign) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            return next(new restify.InvalidArgumentError("unmatched sign"));
        }

        var other = {
            price: params.price,
            passthrough: params.passthrough
        };

        this._userAction.pay(wrapper.channelName, params.uid, null,
            params.apporderID, 0,
            null, null, null, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    self.send(res, { status: 'failed', desc: '通知失败'});
                    return next(new restify.InvalidArgumentError("fail to pay"));
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, { status: 'success', desc: ' 通知成功'});
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        self.send(res, { status: 'failed', desc: '通知失败'});
        return next(new restify.InvalidArgumentError("fail to pay"));
    }

};

YoukuChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'json'
    });
    res.write(body);
};

module.exports =
{
    name: 'youku',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker, debug) {
        return new YoukuChannel(userAction, logger, cfgChecker, debug);
    }
};
