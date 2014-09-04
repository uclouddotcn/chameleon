var restify = require('restify');
var ChamError = require('./chamerror');
var ErrorCode = require('./error-code');

var ChameleonClient = function (sdkUrl, logger) {
    this.client = restify.createJsonClient({
        url: sdkUrl,
        log: logger
    });
    this.logger = logger;
}

ChameleonClient.prototype.verifyLogin = 
function (channel, token, others, callback) {
    var req = {
        channel: channel,
        token: token,
        others: others
    };
    this.logger.debug('send login request');
    this.client.post('/ucloud/verify_login', req, function (err, req, _res, obj) {
        req.log.debug('recv login rsp');
        if (err) {
            req.log.error({err: err}, 'error request login');
            return callback(new ChamError(ErrorCode.ERR_VERIFY_LOGIN_ERR, err));
        }
        if (obj.code !== 0) {
            return callback(new ChamError(ErrorCode.ERR_VERIFY_LOGIN_ERR, 
                "fail to verify %d", obj.code));
        }
        req.log.info('responds to ' + JSON.stringify(obj));
        return callback(null, obj);
    });
};

ChameleonClient.prototype.pendingCharge = 
function (channel, uid, payToken, appUid, amount, callback) {
    var self = this;
    var params = {
        channel: channel,
        uid: uid,
        appUid: appUid.toString(10),
        token: payToken,
        serverId: "0",
        productCount: amount,
        realPayMoney: amount * 10, // ￥1.0 can buy 10 currency
        singlePrice: 10,
        ext: "c", // something will return back when callback from server
    };
    self.client.post('/ucloud/pending_pay', params, function (err, req, res, obj) {
        if (err) {
            req.log.error({err: err}, 'error request login');
            return callback(new ChamError(ErrorCode.ERR_FAIL_PENDING_CHARGE, err));
        }
        var result = null;
        if (obj.code == 0) {
            result = {
                code: obj.code,
                chargeInfo: {
                    orderId: obj.orderId,
                    uid: params.uid,
                    appUid: params.appUid,
                    serverId: params.serverId,
                    currencyCount: params.productCount,
                    realPayMoney: params.realPayMoney,
                    ratio: params.singlePrice,
                    payInfo: obj.payInfo,
                }
            };
        } else {
            result  = {code : obj.code};
        }
        req.log.info('responds to ' + JSON.stringify(result));
        return callback(null, result);
    })
};

ChameleonClient.prototype.pendingBuy = 
function (channel, uid, token, appUid, productId, amount, singlePrice, callback) {
    var self = this;
    var params = {
        channel: channel,
        uid: uid,
        token: token,
        appUid: appUid,
        serverId: "0",
        productId: productId,
        productCount: parseInt(amount),
        realPayMoney: amount * singlePrice,
        singlePrice: parseInt(singlePrice),
        ext: "b", // something will return back when callback from server
    };
    self.client.post('/ucloud/pending_pay', params, function (err, req, res, obj) {
        if (err) {
            req.log.error({req: req, err: err}, 'error request buy');
            return callback(new ChamError(ErrorCode.ERR_FAIL_PENDING_BUY, err));
        }
        var result = null;
        if (obj.code == 0) {
            result = {
                code: obj.code,
                buyinfo: {
                    orderId: obj.orderId,
                    uid: params.uid,
                    appUid: params.appUid,
                    serverId: params.serverId,
                    productId: params.productId,
                    productCount: params.productCount,
                    realPayMoney: params.realPayMoney,
                    payInfo: obj.payInfo
                }
            }
        } else {
            result = {code : obj.code};
        }
        req.log.info('responds to ' + JSON.stringify(result));
        return callback(null, result);
    });
};

module.exports.create = function (sdkUrl, logger) {
    return new ChameleonClient(sdkUrl, logger);
}

