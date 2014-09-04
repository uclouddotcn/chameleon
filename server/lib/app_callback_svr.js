var restify = require('restify');

var AppCallbackSvr = function (cfg) {
    if (!cfg.host || !cfg.payCbUrl ) {
        throw new Error("cofig miss host or payCbUrl");
    }

    this.client = restify.createJsonClient( {
        url: cfg.host,
        version: '*'
    });
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
        return cb(undefined, obj);
    });
};

module.exports.create = function (cfg) {
    return new AppCallbackSvr(cfg);
};

