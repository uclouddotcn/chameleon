var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var createSDKError = require('../../sdk-error').codeToSdkError;
var _errorcode = require('../common/error-code').ErrorCode;
var SDKPluginBase = require('../../SDKPluginBase');

var cfgDesc = {
    appKey: 'string',
    appSecret: 'string'
};

var OppoChannel = function(userAction, logger, cfgChecker) {
    SDKPluginBase.call(this, userAction, logger, cfgChecker);
    this.requestUri = "http://thapi.nearme.com.cn";
    this.client = restify.createStringClient({
        url: this.requestUri,
        retry: false,
        log: logger,
        requestTimeout: 10000,
        connectTimeout: 20000
    });
};
util.inherits(OppoChannel, SDKPluginBase);

OppoChannel.prototype.getAuthorization = function (cfgItem, token, secret) {
    var time = new Date().getTime();
    var params =  {
        oauth_consumer_key: cfgItem.appKey,
        oauth_nonce: time + Math.round(Math.random() * 10),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: time/1000,
        oauth_version: '1.0',
        oauth_token: token
    };
    var sortedParams = getSortedParamArray(params);
    var requestUri = this.requestUri+'/account/GetUserInfoByGame';
    var sign =  calcSign(sortedParams, requestUri, secret, cfgItem.appSecret);
    var res = 'OAuth ';
    for (var i in sortedParams) {
        res += sortedParams[i][0]+'="'+sortedParams[i][1]+'",';
    }
    res += 'oauth_signature="'+ sign + '"';
    return res;
};


OppoChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var auth = this.getAuthorization(wrapper.cfg, token, others);
    var opts = {
        path: '/account/GetUserInfoByGame',
        headers: {
            'Authorization': auth
        }
    };
    this.client.post(opts, function (err, req, res, data) {
        self._logger.debug({rsp: data}, 'recv from oppo');
        if (err) {
            req.log.warn({err: err}, 'fail to get rsp from remote');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
            return;
        }
        try {
            var result = null;
            var obj = JSON.parse(data);
            if (obj['BriefUser']) {
                result = {
                    code: _errorcode.ERR_OK,
                    loginInfo: {
                        uid: obj['BriefUser']['id'],
                        token: token
                    }
                };
            } else {
                result = {
                    code: _errorcode.ERR_FAIL
                };
            }
            callback(null, result);
        } catch (e) {
            req.log.debug({err: e}, 'unexpect exception from verfiy login rsp');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
        }
    });
};

var PERMS = [
    '-----BEGIN PUBLIC KEY-----',
    'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCmreYIkPwVovKR8rLHWlFVw7YD',
    'fm9uQOJKL89Smt6ypXGVdrAKKl0wNYc3/jecAoPi2ylChfa2iRu5gunJyNmpWZzl',
    'CNRIau55fxGW0XEu553IiprOZcaw5OuYGlf60ga8QT6qToP0/dpiL/ZbmNUO9kUh',
    'osIjEu22uFgR+5cYyQIDAQAB',
    '-----END PUBLIC KEY-----'
].join('\n');

OppoChannel.prototype.verifyPaySign = function (params, sign) {
    var t = '';
    t += 'notifyId=' + params.notifyId + '&';
    t += 'partnerOrder=' + params.partnerOrder + '&';
    t += 'productName=' + params.productName + '&';
    t += 'productDesc=' + params.productDesc + '&';
    t += 'price=' + params.price + '&';
    t += 'count=' + params.count + '&';
    t += 'attach=' + params.attach;
    var verify = crypto.createVerify('RSA-SHA1');
    verify.write(t, 'utf-8');
    return verify.verify(PERMS, sign, 'base64');
};

OppoChannel.prototype.respondsToPay = function (req, res, next) {
    var params = req.params;
    var self = this;
    this._logger.debug({req: req, params: params}, 'recv pay callback from oppo');
    var result = true;
    try {
        if (!this.verifyPaySign(params, params.sign)) {
            send(res, false, 'sign not match');
            return next();
        }
        var attachInfo = JSON.parse(params.attach);
        var wrapper = this._channels[attachInfo.ch];
        if (!wrapper) {
            this._userAction.payFail(attachInfo.ch, params.partnerOrder, _errorcode.ERR_PAY_ILL_CHANNEL);
            send(res, true);
            return next();
        }
        var uid = attachInfo.u;
        var productId = attachInfo.p;
        var others = {
            chOrderId: params.notifyId
        };
        this._userAction.pay(wrapper.channelName, uid, null,
            params.partnerOrder, 0,
            productId, params.count, params.price, others,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    send(res, false, 'client responds error');
                    return next();
                }
                self._logger.debug({result: result}, "recv result");
                send(res, true);
                return next();
            }
        );
    } catch (e) {
        req.log.warn({err: e}, 'fail to responds to pay');
        send(res, false, 'unexpect format');
        return next();
    }
};

OppoChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(this)
        }
    ];
};


function send(res, success, msg) {
    var t = 'OK';
    if (!success) {
        t = 'FAIL';
    }
    var result = 'result='+t;
    if (msg) {
        result += '&' + 'resultMsg=' + msg;
    }
    //result = querystring.escape(result);
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(result),
        'Content-Type': 'text/plain'
    });
    res.write(result);
}

function getSortedParamArray(params) {
    var a = Object.keys(params).map(function (key) {
        return [key, params[key].toString()];
    });
    return a.sort(compareParam);
}

function calcSign(sortedParam, requestUri, tokenSecret, appSecret) {
    var qs = '';
    for (var i in sortedParam) {
        qs += sortedParam[i][0] + '=' + sortedParam[i][1] + '&';
    }
    var baseString = querystring.escape(qs.substr(0, qs.length-1));

    var calcString = 'POST&' + querystring.escape(requestUri) + '&'+ baseString;
    var key = appSecret+'&'+tokenSecret;
    var hmac = crypto.createHmac('sha1', key);
    hmac.write(calcString, 'utf-8');
    return hmac.digest('base64');
}

function compareParam(a, b) {
    if (a[0] < b[0]) {
        return -1;
    } else if (a[0] > b[0]) {
        return 1;
    } else {
        if (a[1] < b[1]) {
            return -1;
        } else if (a[1] > b[1]) {
            return 1;
        } else {
            return 0;
        }
    }
}

module.exports =
{
    name: 'oppo',
    cfgDesc: cfgDesc,
    createSDK: function (userAction, logger, cfgChecker) {
        return new OppoChannel(userAction, logger, cfgChecker);
    }
};

