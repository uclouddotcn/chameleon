var restify = require('restify');
var codeToSdkError = require('./sdk-error').codeToSdkError;
var errorCode = require('./cham-error-code');

var AppCallbackSvr = function (cfg) {
    if (!cfg.host || !cfg.payCbUrl ) {
        throw new Error("cofig miss host or payCbUrl");
    }

    this.client = restify.createJsonClient( {
        url: cfg.host,
        version: '*',
        retry: false,
        requestTimeout: 1000,
        connectTimeout: 1000
    });
    this.payCbUrl = cfg.payCbUrl;
    this.host = cfg.host;
};

AppCallbackSvr.prototype.updateCfg = function (cfg) {
    if (this.host !== cfg.host) {
        this.client = restify.createJsonClient( {
            url: cfg.host,
            version: '*',
            retry: false,
            requestTimeout: 20000,
            connectTimeout: 10000
        });
    }
    this.payCbUrl = cfg.payCbUrl;
};

AppCallbackSvr.prototype.pay = function (channel, 
                                         uid, 
                                         appUid,
                                         serverId,
                                         cpOrderId, 
                                         payStatus,
                                         productId,
                                         productCount,
                                         realPayMoney,
                                         ext,
                                         cb) {
    var self = this;
    var postData = {
        channel: channel,
        uid: uid,
        appUid: appUid,
        severId: serverId,
        serverId: serverId,
        cpOrderId: cpOrderId,
        payStatus: payStatus,
        productId: productId,
        productCount: productCount,
        realPayMoney: realPayMoney,
        ext: ext
    };
    self.client.post(self.payCbUrl, postData, function (err, req, res, obj) {
        if (err) {
            return cb(err);
        }
        if (obj.code === 0) {
            return cb(undefined, obj);
        } else {
            var code = obj.code || errorCode.ERR_CHAMELEON_REMOTE_UNKNOWN;
            var err = codeToSdkError(code, null, 'Fail from remote');
            return cb(err);
        }
    });
};

module.exports.create = function (cfg) {
    return new AppCallbackSvr(cfg);
};

