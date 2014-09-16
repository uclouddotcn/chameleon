var restify = require('restify');
var querystring = require('querystring');
var async = require('async');
var crypto = require('crypto');
var createSDKError = require('../../sdk-error').codeToSdkError;
var _errorcode = require('../common/error-code');

var cfgDesc = {
    requestUri: '?string',
    cpId: 'integer',
    gameId: 'integer',
    apiKey: 'string',
    timeout: '?integer'
};

var UCChannel = function(name, cfgItem, userAction, logger) {
    this.defaultUri = "http://sdk.g.uc.cn";
    this.name = name;
    this.cfgItem = cfgItem;
    this.userAction = userAction;
    var timeout = cfgItem.timeout || 10;
    this.client = restify.createJsonClient({
        url: cfgItem.requestUri || this.defaultUri,
        retry: false,
        log: logger
    });
    this.logger = logger;
};

UCChannel.prototype.getInfo = function () {
    return {
        cpId: this.cfgItem.cpId,
        apiKey: this.cfgItem.apiKey,
        requestUri: this.cfgItem.requestUri
    };
};

UCChannel.prototype.calcSign = function (s) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(s);
    return md5sum.digest('hex').toLocaleLowerCase();
};

UCChannel.prototype.verifyLogin =
function(token, others, callback) {
    var self = this;
    var sign = this.calcSign(this.cfgItem.cpId+'sid='+token+this.cfgItem.apiKey);
    var params = {
        id: (new Date()).getTime()/1000,
        service: "ucid.user.sidInfo",
        data: {
            sid: token
        },
        game: {
            cpId: this.cfgItem.cpId,
            gameId: this.cfgItem.gameId,
            channelId: '2',
            serverId: 0
        },
        sign: sign
    };
    this.client.post('/ss', params, function (err, req, res, obj) {
        self.logger.debug({rsp: obj}, 'recv from uc');
        if (err) {
            req.log.warn({err: err}, 'fail to get rsp from remote');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
            return;
        }
        try {
            var res = null;
            if (obj.state.code === 1) {
                res = {
                    code: _errorcode.ERR_OK,
                    loginInfo: {
                        uid: obj.data.ucid,
                        token: token,
                        name: obj.data.nickName
                    }
                };
            } else {
                if (obj.state.code === 10) {
                    req.log.warn({params: params}, 'param error');
                    res = {
                        code: _errorcode.ERR_FAIL
                    };
                } else {
                    res = {
                        code: _errorcode.ERR_LOGIN_SESSION_INVALID
                    }
                }
            }
            callback(null, res);
        } catch (e) {
            req.log.warn({err: e}, 'unexpect exception from verfiy login rsp');
            callback(createSDKError(_errorcode.ERR_FAIL, req, 'Fail to verify login'));
        }
    });
};

UCChannel.prototype.respondsToPay = function (req, res, next) {
    var params = req.params;
    this.logger.debug({params: params}, 'recv pay callback from uc');
    var result = true
    try {
        var data = params.data;
        var sign = this.calcSign(this.cfgItem.cpId+
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
            this.cfgItem.apiKey);
        if (data.gameId != this.cfgItem.gameId) {
            result = false;
        }
        if (params.sign !== sign) {
            self.logger.warn({req: req, params: params}, "unmatched sign");
            send(res, false);
            return next();
        }
        var amount = Math.round(parseFloat(data.amount) * 100);
        var others = {
            serverId: data.serverId,
            payWay: data.payWay
        };
        self.userAction.pay(this.name, data.ucid, null,
            data.orderId, getPayStatus(data.orderStatus),
            null, null, amount, others,
            function (err, result) {
                if (err) {
                    self.logger.error({err: err}, "fail to pay");
                    send(res, false);
                    return next();
                }
                self.logger.debug({result: result}, "recv result");
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

UCChannel.prototype.getChannelSubDir = function ()  {
    return [
        {
            method: 'post',
            path: '/pay',
            callback: this.respondsToPay.bind(this)
        }
    ];
};


UCChannel.prototype.reloadCfg = function (cfgItem) {
    this.cfgItem = cfgItem;
    this.client = restify.createJsonClient({
        url: cfgItem.requestUri || this.defaultUri,
        retry: false,
        log: this.logger
    });
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
    create: function (name, cfgItem, userAction, logger) {
                return new UCChannel(name, cfgItem, userAction, logger);
            }
};



