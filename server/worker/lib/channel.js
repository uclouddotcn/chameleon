var restify = require('restify');

/**
 * channel of a product
 * @param name name of this channel
 * @param sdkcfgs sdk configs
 * @param sdkMgr sdk manager from product
 * @param userAction user action
 * @param logger logger object
 * @constructor
 */
function Channel (name, sdkcfgs, sdkMgr, userAction, logger) {
    this.name = name;
    this.apis = {};
    this._logger = logger;
    this._userAction = userAction;
    this.sdkMgr = sdkMgr;
    this.sdkcfgs = sdkcfgs;
    this.reload(sdkcfgs);
}

Channel.prototype.reload = function (sdkcfgs) {
    var self = this;
    var apis = {};
    sdkcfgs.sdks.forEach(function (cfg) {
        try {
            var inst = self.sdkMgr.getPlugin(self.name, cfg.name, cfg.cfg);
            var types = cfg.type.split(',');
            types.forEach(function (t) {
                apis[t] = inst;
            })
        } catch (e) {
            console.log('Fail to create api ' + cfg.name + ' for channel ' + self.name);
            self._logger.error({err: e, channel: cfg.name}, 'Fail to create apis for channel ');
        }
    });
    self.apis = apis;
    self.sdkcfgs = sdkcfgs
};

Channel.prototype.verifyLogin = function (token, others, callback) {
    if (!this.apis.user) {
        throw new restify.InvalidArgumentError("no user api installed for this channel");
    }
    this.apis.user.verifyLogin(token, others, callback);
};

Channel.prototype.pendingPay = function (params, infoFromSDK, callback) {
    var self = this;
    if (!this.apis.pay) {
        throw new restify.InvalidArgumentError("no pay api installed for this channel");
    }
    var payApi = this.apis.pay;
    var userPendingFunc = function (orderId, params, payInfo) {
        self._userAction.pendingPay(
            orderId,
            payApi,
            params.uid,
            params.appUid,
            params.serverId,
            params.productId,
            params.productCount,
            params.realPayMoney,
            params.singlePrice,
            params.ext,
            self.name,
            function (err, orderId)  {
                callback(err, orderId, payInfo);
            });
    };
    if (payApi.pendingPay) {
        payApi.pendingPay(this.name, params, infoFromSDK, function (err, orderId, params, options, payInfo) {
            if (err) {
                return callback(err);
            }
            if (options && options.ignorePending) {
                self._userAction.emitPrePay(
                    orderId,
                    payApi,
                    params.uid,
                    params.appUid,
                    params.serverId,
                    params.productId,
                    params.productCount,
                    params.realPayMoney,
                    params.singlePrice,
                    params.ext,
                    self.name);
                setImmediate(callback, null, orderId, payInfo);
            } else {
                return userPendingFunc(orderId, params, payInfo);
            }
        });
    } else {
        var orderId = this._userAction.genOrderId();
        userPendingFunc(orderId, params);
    }
};

Channel.prototype.getInfo = function () {
    return this.sdkcfgs;
};

Channel.prototype.getPayUrl = function () {
    if (!this.apis.pay) {
        return [];
    }
    return this.apis.pay.getPayUrlInfo();
};


Channel.prototype.uninstall = function () {
    this.sdkMgr.uninstallChannel(this.name);
}

module.exports = {
    /**
     * channel of a product
     * @param name name of this channel
     * @param sdkcfgs sdk configs
     * @param sdkMgr sdk manager from product
     * @param userAction user action
     * @param logger logger object
     */
    createChannel: function (name, sdkcfgs, sdkMgr, userAction, logger) {
        return new Channel(name, sdkcfgs, sdkMgr, userAction, logger);
    }
};

