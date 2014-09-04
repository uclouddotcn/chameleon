var util = require('util');
var events = require('events');
var SdkError = require('./sdk-error').SdkError;
var codeToSdkError = require('./sdk-error').codeToSdkError;
var validator = require('validator');
var uuid = require('uuid');
var async = require('async');
var errorCode = require('./cham-error-code');

//   API

// the central role manages the communication among plugin manager, 
// app callback server module and pending order store. 
// It also inherits from the EventEmitter, and other module can listen
// on the action event.
// The events are :
//   login, function (product, channel, uid, newOthers)
//   login-fail, function (product, channel, uid, err)
//
//   pre-pay, function (orderInfo)
//   pay, function (orderInfo)
//   pay-fail, function (orderInfo, code)
//
//   disgard-order, function (orderInfo)
//
var UserAction = 
function(productName, product, appCallbackSvr, pendingOrderStore, eventCenter, logger) {
    this.productName = productName;
    this.product = product;
    this.appCallbackSvr = appCallbackSvr;
    this.pendingOrderStore = pendingOrderStore;
    this.logger = logger;
    this._eventCenter = eventCenter;
};

/**
 * verify the user login request
 * @param {Object} m - channel plugin instance
 * @param {string} token - user session token
 * @param {string} others - other channel information
 * @param {function} callback - function(err, result)
 */
UserAction.prototype.verifyUserLogin = 
function(m, token, others, callback) {
    var self = this;
    m.verifyLogin(token, others,
        function (err, result) {
            if (err) {
                self._eventCenter.emit('login-fail', 
                    self.productName, m.name, err);
                return callback(err);
            }
            if (result.code === 0 && 
                result.loginInfo  &&
                (!result.loginInfo.channel ||
                 !result.loginInfo.uid ||
                 !result.loginInfo.token)) {
                self.logger.error( {result: result},
                    "verify login result must have following fields: channel, uid, token");
                return callback(
                    new SdkError({code:-1, message:'internal error'}));
            }
            self._eventCenter.emit('login', self.productName, result.channel, 
                result.uid, result.others);
            return callback(null, result);
        });
    return self;
};


/**
 *  the user have paid, ask the app server to finish paying
 *  @param {string} channel
 *  @param {string} uid - channel uid
 *  @param {string} appUid - user id in app
 *  @param {string} cpOrderId - app order id 
 *  @param {int} payStatus - payment status, 0 for success
 *  @param {string} productId -
 *  @param {int} productCount - 
 *  @param {int} realPayMoney - how much user have paid( fen)
 *  @param {string} other - other info for this platfrom, which will be logged 
 *  @param {function} callback - function(err, result)
 */
UserAction.prototype.pay =
function(channel, uid, appUid, cpOrderId, payStatus,
         productId, productCount, realPayMoney, other, callback) {

    if (other instanceof Function) {
        callback = other;
        other = undefined;
    }

    var self = this;

    var orderInfo = {
        channel: channel,
        product: this.productName,
        uid: uid,
        appUid: appUid, 
        orderId: cpOrderId,
        productId: productId,
        productCount: productCount,
        realPayMoney: realPayMoney,
        other: other,
        status : payStatus
    };

    async.waterfall([
        // fetch pending order info
        self.pendingOrderStore.getPendingOrder.bind(
            self.pendingOrderStore, cpOrderId),
        // validate the order info from channel
        checkPayCallback.bind(undefined, self, orderInfo),
        // after validation, ask the app callback to pay
        function (cb) {
            self.appCallbackSvr.pay(orderInfo.channel, orderInfo.uid, 
                orderInfo.appUid, orderInfo.serverId, orderInfo.orderId, 
                orderInfo.status, orderInfo.productId, orderInfo.productCount, 
                orderInfo.realPayMoney, orderInfo.ext, cb);
        }
    ], function (err, result) {
        // if emit error somewhere, we just post the error to callback
        if (err instanceof Error) {
            callback(err);
            if (err instanceof SdkError) {
                self._eventCenter.emit('pay-fail', orderInfo, err.code);
            }
            return;
        }

        // some function may want to break the process and post a result
        // to the callback, err will be an object
        if (err instanceof Object) {
            callback(null, err);
        } else {
            // after pay succeeded
            callback(null, result);
            if (result.code === 0 || result.code === '0') {
                self._eventCenter.emit('pay', orderInfo);
                self.pendingOrderStore.deletePendingOrder(cpOrderId);
            } else {
                self._eventCenter.emit('pay-fail', orderInfo, result.code);
            }
            
        }

    });
    return self;
};


/**
 *  add pending order for charging
 *  @param {string} orderId - app order Id, if it's null, a new order id will
 *        be generated instead, use uuid.v4
 *  @param {Object} m - channel plugin instance
 *  @param {string} uid - channel uid
 *  @param {string} appUid - user id in app
 *  @param {string} serverId - the server id
 *  @param {string} currencyCount -
 *  @param {int} realPayMoney - how much user have paid( fen)
 *  @param {int} ratio, how much currency can be bought for ￥1.0, 
 *      if it is null, then a exact match will be required 
 *      when validating the order from channel
 *  @param {string} ext - it will return back to app untouched..
 *  @param {function} callback - function(err, orderId)
 */
/**
 *  add pending order for purchasing products
 *  @param {string} orderId - app order Id, if it's null, a new order id will
 *        be generated instead, use uuid.v4
 *  @param {Object} m - channel plugin instance
 *  @param {string} uid - channel uid
 *  @param {string} appUid - user id in app
 *  @param {string} serverId - the server id
 *  @param {string} productId -
 *  @param {int} productCount - 
 *  @param {int} realPayMoney - how much user have paid( fen)
 *  @param {int} singlePrice - price of per products, if it is null, then a exact 
 *        match will be required when validating the order from channel
 *  @param {string} ext - it will return back to app untouched..
 *  @param {function} callback - function(err, orderId)
 */
UserAction.prototype.pendingPay =
function(orderId, m, uid, appUid, serverId, productId, productCount, 
         realPayMoney, singlePrice, ext, callback) {
    var self = this;
    var pendingOrderInfo = {
        channel: m.name,
        uid: uid,
        appUid: appUid,
        sId: serverId,
        orderId: orderId,
        perPrice: singlePrice,
        pId: productId,
        count: productCount,
        rmb: realPayMoney,
        ext: ext
    };
    addPendingOrder(self, orderId, pendingOrderInfo, callback);
};

UserAction.prototype.genOrderId = function () {
    return uuid.v4();
}


function validatePayOrder(self, pendingOrderInfo, orderInfo) {
    // check if order type match
    if (!pendingOrderInfo) {
        return {
            message: 'order id not found',
            code: errorCode.ERR_CHAMELEON_PAY_NO_ORDER
        };
    }

    if (orderInfo.uid != orderInfo.uid) {
        return {
            message: 'uid not matched',
            code: errorCode.ERR_CHAMELEON_PAY_UID
        };
    }

    if (orderInfo.appUid != orderInfo.appUid) {
        return {
            message: 'app uid not matched',
            code: errorCode.ERR_CHAMELEON_PAY_APPUID
        };
    }

    if (orderInfo.productId && pendingOrderInfo.pId) {
        if (pendingOrderInfo.pId != orderInfo.productId) {
            return {
                message: 'product id not matched',
                code: errorCode.ERR_CHAMELEON_PAY_PRODUCTID
            };
        }
    } else {
        orderInfo.productId = pendingOrderInfo.pId;
    }

    var purchasedProductCount = 
        orderInfo.realPayMoney/pendingOrderInfo.perPrice;

    orderInfo.productCount = purchasedProductCount;
    return null;
}

// callback when the pending order store replies
function checkPayCallback(self, orderInfo, pendingOrderInfo, callback) {
    if (pendingOrderInfo && !orderInfo.appUid) {
        orderInfo.appUid = pendingOrderInfo.appUid;
    }
    var err = validatePayOrder(self, pendingOrderInfo, orderInfo);
    if (err) {
    // if the checking failed, the pending order may be already payed,
    // or there is some internal problem occured, either way we can't help
    // just send the 'ok' to channel, and log the order
        callback({code: 0});
        orderInfo.err = err.code;
        self.logger.error({err: err}, 'Fail to verify order');
        self._eventCenter.emit('disgard-order', orderInfo);
    } else {
        orderInfo.ext = pendingOrderInfo.ext;
        orderInfo.serverId = pendingOrderInfo.sId;
        callback(null);
    }
}

function addPendingOrder(self, orderId, orderInfo, callback) {
    self.pendingOrderStore.addPendingOrder(orderId, orderInfo, 
        function (err, res) {
            if (err) {
                return callback(new Error("fail to store pending order: " + err.toString()));
            }
            var event = 'pre-pay';
            self._eventCenter.emit(event, orderInfo);
            return callback(null, orderId);
        }); 
}


module.exports.createUserAction = 
function(productName, product, appCallbackSvr, pendingOrderStore, eventCenter, logger) {
    var userAction = new UserAction(
        productName, product, appCallbackSvr, pendingOrderStore, eventCenter, logger);
    return userAction;
};


