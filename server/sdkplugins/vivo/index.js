var crypto = require('crypto');
var querystring = require('querystring');
var util = require('util');

var async = require('async');
var restify = require('restify');

var commonLib = require('../_common');
var ErrorCode = commonLib.ErrorCode;
var SDKPluginBase = commonLib.SDKPluginBase;

var cfgDesc = {
    appId: 'string',
    cpId: 'string',
    cpKey: 'string',
    payUrl:'string'
};

var VivoChannel = function(logger, cfgChecker) {
    SDKPluginBase.call(this, logger, cfgChecker);
    this.client = {
        login:restify.createStringClient({
            url: 'https://usrsys.inner.bbk.com',
            retry: false,
            log: logger,
            requestTimeout: 10000,
            connectTimeout: 20000
        }) ,
        pay:restify.createStringClient({
            url: 'https://pay.vivo.com.cn',
            retry: false,
            log: logger,
            requestTimeout: 10000,
            connectTimeout: 20000
        })
    };
};

util.inherits(VivoChannel, SDKPluginBase);

function formatTime(time){
    var year=time.getFullYear().toString();
    var month=time.getMonth()+1;
    if(month<10){
        month='0'+month.toString();
    }else{
        month.toString();
    }
    var date=time.getDate();
    if(date<10){
        date='0'+date.toString();
    }else{
        date.toString();
    }

    var hour=time.getHours();
    if(hour<10){
        hour='0'+hour.toString();
    }else{
        hour.toString();
    }

    var minute=time.getMinutes();
    if(minute<10){
        minute='0'+minute.toString();
    }else{
        minute.toString();
    }

    var second=time.getSeconds();
    if(second<10){
        second='0'+second.toString();
    }else{
        second.toString();
    }

    return year+month+date+hour+minute+second;
}

VivoChannel.prototype.verifyLogin = function(wrapper, token, others, callback) {
    var self = this;
    var q = '/auth/user/info';
    var postObj = {
        access_token: token
    };
    this.client.login.post(q, querystring.stringify(postObj), function (err, req, res, obj) {
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
                        uid: obj.uid,
                        token: token,
                        channel: wrapper.channelName,
                        email:obj.email
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

VivoChannel.prototype.pendingPay=function(wrapper, params, infoFromSDK, callback){
    var self = this;

    try {
        var time=formatTime(new Date());
        var orderID = wrapper.userAction.genOrderId();
        var money = params.realPayMoney;
        var signParams = {
            version:'1.0.0',
            cpId:wrapper.cfg.cpId,
            appId:wrapper.cfg.appId,
            cpOrderNumber: orderID,
            orderTime:time,
            orderAmount:money,
            orderTitle:params.productName||"游戏币",
            orderDesc:params.productDesc||"游戏币",
            extInfo: 'xx'
        };
        if (wrapper.cfg.payUrl)signParams['notifyUrl'] = wrapper.cfg.payUrl;
        if (!wrapper.cfg.cpKeyMd5) {
            var md5 = crypto.createHash('md5');
            md5.update(wrapper.cfg.cpKey, 'utf8');
            wrapper.cfg.cpKeyMd5 = md5.digest('hex').toLowerCase();
        }

        signParams['signature'] = this.calcSign(signParams, wrapper.cfg.cpKeyMd5);
        signParams['signMethod'] = 'MD5';
        this.client.pay.post('/vcoin/trade',signParams,function(err,req,res,data){
            try {
                var obj = JSON.parse(data);
                if (err) {
                    self._logger.error({err: err}, "Fail to create order");
                    return;
                }
                if (obj.respCode == '200') {
                    return callback(null, orderID, params, null, {
                            sign: obj.accessKey,
                            order: obj.orderNumber,
                            title: signParams.orderTitle,
                            desc: signParams.orderDesc
                        });
                } else {
                    self._logger.error({err: err}, "Fail to create order");
                    return callback(err);
                }
            } catch (e){
                self._logger.error({err: e}, 'Fail to parse obj');
                callback(new restify.InvalidArgumentError());
            }
        })
    } catch (e) {
        this._logger.error({err: e}, 'Fail to parse input');
        callback(new restify.InvalidArgumentError());
    }
};

VivoChannel.prototype.calcSign = function(paramList, key){
    var params = {};

    //remove null property
    for(var p in paramList){
        if(paramList[p]){
            params[p] = paramList[p];
        }
    }

    var s = Object.keys(params).sort().map(function(k){
        return k+'='+params[k];
    }).join('&');
    s += ('&' + key);
    var md5sum = crypto.createHash('md5');
    md5sum.update(s,'utf8');
    return md5sum.digest('hex').toLowerCase();
};

VivoChannel.prototype.getPayUrlInfo=function(){
    var self=this;
    return[
        {
            method: 'post',
            path:'/pay'
        },
        {
            method: 'get',
            path: '/pay'
        }
    ]
};

VivoChannel.prototype.respondsToPay = function (req, res, next,  wrapper) {
    var self = this;
    var params = req.params;
    var sign = params['signature'];
    delete params['signature'];
    delete  params['signMethod'];
    if (!wrapper.cfg.cpKeyMd5) {
        var md5 = crypto.createHash('md5');
        md5.update(wrapper.cfg.cpKey, 'utf8');
        wrapper.cfg.cpKeyMd5 = md5.digest('hex').toLowerCase();
    }
    req.log.info({req: req, params: params}, 'recv pay rsp');
    try {
        if (params.cpId !== wrapper.cfg.cpId || params.appId !== wrapper.cfg.appId) {
            self._logger.warn({params: params}, "unmatched app info");
            return next(new restify.InvalidArgumentError("unmatched app info"));
        }
        var expectSign = self.calcSign(params, wrapper.cfg.cpKeyMd5);
        if (expectSign !== sign) {
            self._logger.warn({req: req, params: params}, "unmatched sign");
            return next(new restify.InvalidArgumentError("unmatched app info"));
        }

        var uid = params.uid;
        var orderId = params.cpOrderNumber;
        var amount = parseInt(params.orderAmount);

        var other = {
            chOrderId: params.orderNumber,
            tradeType: params.tradeType,
            payTime: params.payTime
        };
        var status = (params.respCode === '200' && params.tradeStatus == '0000') ? 0 : 1;

        wrapper.userAction.pay(wrapper.channelName, uid, null,
            orderId, status,
            null, null, amount, other,
            function (err, result) {
                if (err) {
                    self._logger.error({err: err}, "fail to pay");
                    return next(new restify.InvalidArgumentError("fail to pay"));
                }
                self._logger.debug({result: result}, "recv result");
                self.send(res, 'success');
                return next();
            }
        );
    } catch (e) {
        req.log.error({err: e}, 'Fail to parse pay notification');
        return next(new restify.InvalidArgumentError("fail to pay"));
    }

};

VivoChannel.prototype.send = function (res, body) {
    res.writeHead(200, {
        'Content-Length': Buffer.byteLength(body),
        'Content-Type': 'text/plain'
    });
    res.write(body);
};

module.exports =
{
    name: 'vivo',
    cfgDesc: cfgDesc,
    createSDK: function (logger, cfgChecker, debug) {
        return new VivoChannel(logger, cfgChecker, debug);
    }
};
