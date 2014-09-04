var restify = require('restify');
var querystring = require('querystring');

var UCloudChannel = function(name, cfgItem, userAction, logger) {
    this.name = name;
    this.cfgItem = cfgItem;
    this.userAction = userAction;
    this.logger = logger;
};

UCloudChannel.prototype.verifyLogin = function (token, others, cb)  {
    var uid = Math.random() * 100000 + 1000;
    cb(null, uid, token, others);
};

UCloudChannel.prototype.getChannelSubDir = function ()  {
    var self = this;

    return [
        {
            method: 'post',
            path: '/pay',
            callback: respondsToPay.bind(undefined, self)
        }];
};

UCloudChannel.prototype.getInfo = function () {
    return {};
}


UCloudChannel.prototype.reloadCfg = function (cfg)  {
    this.cfgItem = cfg;
}


function respondsToPay (self, req, res, next) {
    var cb = function (err, code) {return payCb(res, next, err, code);};
    var params = req.params;
    var extObj = querystring.parse(params.ext, '|');
    self.userAction.pay(self.name,
                        params.uid,
                        params.appUid,
                        params.orderId,
                        params.status,
                        params.productId,
                        params.productCount,
                        params.paymoney,
                        {
                            username: params.username
                        },
                        cb);
}

function payCb(res, next, err, code) {
    if (err) {
        return next(err);
    }
    code = parseInt(code.code);
    res.send({code: code});
    return next();
}


var cfgDesc = {
    appid : 'string',
    appkey: 'string'
};

module.exports =
{
    name: 'ucloud',
    cfgDesc: cfgDesc,
    create: function (name, cfgItem, userAction, logger) {
                return new UCloudChannel(name, cfgItem, userAction, logger);
            }
};



