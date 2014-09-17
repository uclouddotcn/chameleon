var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var createSDKError = require('../../sdk-error').codeToSdkError;
var _errorcode = require('../common/error-code');

var cfgDesc = {
    requestUri: '?string',
    appKey: 'string',
    appSecret: 'string',
    timeout: '?integer'
};

var OppoChannel = function(name, cfgItem, userAction, logger) {
    this.defaultUri = "http://thapi.nearme.com.cn";
    this.requestUri = cfgItem.requestUri || this.defaultUri;
    this.name = name;
    this.cfgItem = cfgItem;
    this.userAction = userAction;
    var timeout = cfgItem.timeout || 10;
    this.client = restify.createStringClient({
        url: this.requestUri,
        retry: false,
        log: logger
    });
    this.logger = logger;
};

OppoChannel.prototype.getInfo = function () {
    return {
        cpId: this.cfgItem.cpId,
        apiKey: this.cfgItem.apiKey,
        requestUri: this.cfgItem.requestUri
    };
};

OppoChannel.prototype.getAuthorization = function (token, secret) {
    var time = new Date().getTime()
    var params =  {
        oauth_consumer_key: this.cfgItem.appKey,
        oauth_nonce: time + Math.round(Math.random() * 10),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: time/1000,
        oauth_version: '1.0',
        oauth_token: token
    };
    var sortedParams = getSortedParamArray(params)
    var requestUri = this.requestUri+'/account/GetUserInfoByGame';
    var sign =  calcSign(sortedParams, requestUri, secret, this.cfgItem.appSecret);
    var res = 'OAuth ';
    for (var i in sortedParams) {
        res += sortedParams[i][0]+'="'+sortedParams[i][1]+'",';
    }
    res += 'oauth_signature="'+ sign + '"';
    return res;
};


OppoChannel.prototype.verifyLogin = function(token, others, callback) {
    var self = this;
    var auth = this.getAuthorization(token, others)
    var opts = {
        path: '/account/GetUserInfoByGame',
        headers: {
            'Authorization': auth
        }
    };
    this.client.post(opts, function (err, req, res, data) {
        self.logger.debug({rsp: data}, 'recv from uc');
        if (err) {
            req.log.warn({err: err}, 'fail to get rsp from remote');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
            return;
        }
        try {
            var res = null;
            var obj = JSON.parse(data);
            if (obj['BriefUser']) {
                res = {
                    code: _errorcode.ERR_OK,
                    loginInfo: {
                        uid: obj['BriefUser']['id'],
                        token: token,
                    }
                };
            } else {
                res = {
                    code: _errorcode.ERR_FAIL
                };
            }
            callback(null, res);
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
    t += 'count=' + params.price + '&';
    t += 'attach=' + params.attach;
    var verify = crypto.createVerify('RSA-SHA1');
    verify.write(t, 'utf-8');
    return verify.verify(PERMS, sign, 'base64');
}

OppoChannel.prototype.respondsToPay = function (req, res, next) {
    var params = req.params;
    this.logger.debug({params: params}, 'recv pay callback from uc');
    var result = true
    try {
        if (!this.verifyPaySign(params, params.sign)) {
            send(res, false, 'sign not match');
            return next();
        }
        var attachInfo = JSON.parse(params.attach);
        var uid = attachInfo.u;
        var productId = attachInfo.p;
        var others = {
            notifyId: params.notifyId,
        };
        self.userAction.pay(this.name, uid, null,
            params.partnerOrder, 0,
            productId, params.count, params.price, others,
            function (err, result) {
                if (err) {
                    self.logger.error({err: err}, "fail to pay");
                    send(res, false, 'client responds error');
                    return next();
                }
                self.logger.debug({result: result}, "recv result");
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

OppoChannel.prototype.getChannelSubDir = function ()  {
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(this)
        }
    ];
};


OppoChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfgItem;
    this.client = restify.createJsonClient({
        url: cfgItem.requestUri || this.defaultUri,
        retry: false,
        log: this.logger
    });
};

function send(res, success, msg) {
    var t = 'OK';
    if (!success) {
        t = 'FAIL';
    }
    var res = 'result='+t;
    if (msg) {
        res += '&' + 'resultMsg=' + msg;
    }
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(res),
        'Content-Type': 'text/plain'
    });
    res.write(res);
}

function getSortedParamArray(params) {
    var a = [];
    for (var i in params) {
        a.push([i, params[i].toString()]);
    }
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
    create: function (name, cfgItem, userAction, logger) {
        return new OppoChannel(name, cfgItem, userAction, logger);
    }
};

/*
var obj = {
    oauth_consumer_key : 238569612,
    oauth_nonce : 3297588989,
    oauth_signature_method : 'HMAC-SHA1',
    oauth_token : '8303b9b397f8779de36c4fb1ad85fb97',
    oauth_timestamp : '1332742813',
    oauth_version : "1.0"
};

var param = getSortedParamArray(obj)
var p = calcSign(param, 'http://thapi.nearme.com.cn/account/queryUserInfo.xml', '2be3444192aabc2b1f4581ea3bf139f3', "Ff7Fde6EF3d54508a094eB8b66af619D" )
console.log(p)
*/
