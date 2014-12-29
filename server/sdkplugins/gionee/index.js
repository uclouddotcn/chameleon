var crypto = require('crypto');
var ursa = require('ursa');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('./common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;
var makePrivatePemFormat = commonLib.makePrivatePemFormat;
var makePublicPemFormat = commonLib.makePublicPemFormat;

var cfgDesc = {
    appKey: 'string',
    secretKey: 'string',
    privateKey: 'string',
    publicKey: 'string',
    payUrl: '?string'
};


var GioneeChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
};
util.inherits(GioneeChannel, SDKPluginBase);

GioneeChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var u = '/account/verify.do';
    var obj = {
        ts: Math.floor(Date.now()/1000),
        nonce: Math.random().toString()
    };
    var self = this;
    var sign = this.calcMac(wrapper, 'id.gionee.com',  '443', obj.ts,  obj.nonce,  'POST',  u);
    var auth = 'MAC ' +
        'id="'+wrapper.cfg.appKey+'"' +
        ',ts="'+obj.ts+'"' +
        ',nonce="'+obj.nonce+'"' +
        ',mac="'+sign+'"';
    this._logger.debug({auth: auth}, 'post data');
    var client = restify.createJsonClient({
        url: "https://id.gionee.com",
        retry: false,
        log: this._logger,
        accept: '*/*',
        headers: {
            'Authorization': auth
        },
        requestTimeout: 10000,
        connectTimeout: 20000
    });
    client.post(u, JSON.parse(token), function (err, req, res, obj) {
        req.log.debug({req: req, err: err, obj: obj}, 'on result ');
        if (err) {
            req.log.warn({err: err}, 'request error');
            return callback(err);
        }
        try {
            if (!obj.r) {
                callback(null, {
                    code: ErrorCode.ERR_OK,
                    loginInfo: {
                        uid: others,
                        token: token,
                        channel: wrapper.channelName
                    }
                });
            } else {
                // error
                var code = self.mapError(obj.r, obj);
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

function formatMoney(amount) {
    var y = Math.floor(amount / 100);
    var x = (amount - y * 100).toString();
    if (x.length === 1) {
        x = '0' + x;
    }
    return y.toString() + '.' + x;
}


GioneeChannel.prototype.pendingPay = function (wrapper, params, infoFromSDK, callback) {
    try {
        var self = this;
        var client = restify.createJsonClient({
            url: "https://pay.gionee.com",
            retry: false,
            log: this._logger,
            accept: '*/*',
            requestTimeout: 10000,
            connectTimeout: 20000
        });
        var money = formatMoney(params.realPayMoney);
        var orderId = wrapper.userAction.genOrderId().replace(/-/g, '');
        var time = formatTime(new Date());
        var signParams = {
            //player_id: params.uid,
            api_key: wrapper.cfg.appKey,
            deal_price: money,
            deliver_type: "1",
            out_order_no: orderId,
            subject: params.productName || "货币",
            submit_time: time,
            total_fee: money
        };
        if (wrapper.cfg.payUrl)
            signParams['notify_url'] = wrapper.cfg.payUrl;
        var sign = this.calcSign(wrapper, signParams);
        signParams['sign'] = sign;
        signParams['player_id'] = params.uid;
        console.log(signParams)
        client.post('/order/create', signParams, function (err, req, res, obj) {
            if (err) {
                this._logger.error({err: err}, "Fail to create order");
                return;
            }
            if (obj.status === '200010000') {
                return callback(null, obj.out_order_no, params, null, {time: time});
            } else {
                return self.mapError(obj.status, obj);
            }
        });
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

function formatTime(d) {
    var s = d.getFullYear().toString();
    if (d.getMonth() < 9) {
        s+= '0';
    }
    s += d.getMonth()+1;
    if (d.getDate() < 10) {
        s+= '0';
    }
    s += d.getDate();
    if (d.getHours() < 10) {
        s+= '0';
    }
    s += d.getHours();
    if (d.getMinutes() < 10) {
        s+= '0';
    }
    s += d.getMinutes();
    if (d.getSeconds() < 10) {
        s+= '0';
    }
    s += d.getSeconds();
    return s;
}

GioneeChannel.prototype.checkSign = function (wrapper, params, sign) {
    var s = Object.keys(params).sort().map(function (k) {
        return k+'='+params[k];
    }).join('&');
    if (!wrapper.cfg.publicKeyObj) {
        wrapper.cfg.publicKeyObj = ursa.createPublicKey(makePublicPemFormat(wrapper.cfg.publicKey));
    }
    return wrapper.cfg.publicKeyObj.hashAndVerify('sha1', new Buffer(s, 'utf8'), new Buffer(sign, 'base64'));
}

GioneeChannel.prototype.calcSign = function (wrapper, params, includeKey, sep) {
    includeKey = includeKey || false;
    sep = sep || '';
    var s = Object.keys(params).sort().map(function (k) {
        if (includeKey) {
            return k+'='+params[k];
        } else {
            return params[k];
        }
    }).join(sep);
    if (!wrapper.cfg.privateKeyObj) {
        wrapper.cfg.privateKeyObj = ursa.createPrivateKey(makePrivatePemFormat(wrapper.cfg.privateKey));
    }
    return wrapper.cfg.privateKeyObj.hashAndSign('sha1', s.toString('utf8'), 'utf8', 'base64');
};

GioneeChannel.prototype.getPayUrlInfo = function ()  {
    return [
        {
            method: 'post',
            path: '/pay'
        }
    ];
};

GioneeChannel.prototype.respondsToPay = function (req, res, next, wrapper) {
    var self = this;
    var params = req.params;
    req.log.debug({req: req, params: params}, 'recv pay rsp');
    try {
        if (params.api_key !== wrapper.cfg.appKey) {
            this.send(res, "unmatched apikey");
            return next();
        }
        var expectSign = params.sign;
        delete params.sign;
        if (!this.checkSign(wrapper, params, expectSign)) {
            this.send(res, "unmatched sign");
            return next();
        }
        var orderId = params.out_order_no;
        var amountStrs = params.deal_price.split('.');
        var y = parseInt(amountStrs[0]);
        var x = parseInt(amountStrs[1]);
        if (isNaN(y) || isNaN(x)) {
            this._logger.error({amount: params.amount}, "ill amount string");
            this.send(res, "unknown pay amount");
            return next();
        }
        var amount = y * 100 + x;
        var other = {
            create_time: params.create_time,
            close_time: params.close_time
        };
        wrapper.userAction.pay(wrapper.channelName, null, null,
            orderId, ErrorCode.ERR_OK,
            null, null, amount, other,
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

GioneeChannel.prototype.send = function (res, result) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(result),
        'Content-Type': 'text/plain'
    });
    res.write(result);
};

GioneeChannel.prototype.calcMac = function ( wrapper, host,  port,  timestamp,  nonce,  method,  uri) {
   var s = timestamp + '\n'
    + nonce + '\n'
    + method.toUpperCase() + '\n'
    + uri + '\n'
    + host.toLowerCase() + '\n'
    + port + '\n'
    + '\n';
    var signer = crypto.createHmac('sha1', wrapper.cfg.secretKey);
    signer.update(s);
    return signer.digest('base64');
}


GioneeChannel.prototype.mapError = function(status, retObj) {
    this._logger.debug({retObj: retObj});
    switch (status) {
        case '1011':
            return ErrorCode.ERR_LOGIN_SESSION_INVALID;
        default:
            this._logger.error({retObj: retObj}, "unexpect error");
            return ErrorCode.ERR_FAIL;
    }
};

module.exports =
{
    name: 'gionee',
    cfgDesc: cfgDesc,
    createSDK: function (logger, checker, debug) {
        return new GioneeChannel(logger, checker, debug);
    }
};


