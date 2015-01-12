"use strict";

function SDKPluginBase(logger, cfgChecker) {
    this._logger = logger;
    this._checker = cfgChecker;
}

SDKPluginBase.prototype.createPluginWrapper = function (userAction, channelName, cfg) {
    this._checker.check(cfg);
    return new Wrapper(userAction, channelName, cfg, this);
};

SDKPluginBase.prototype.verifyLogin = function(wrapper, token, others, callback) {
    throw new Error("Not Implementation");
};

SDKPluginBase.prototype.getPayUrlInfo = function() {
    throw new Error("Not Implementation");
};


function Wrapper (userAction, channelName, cfg, plugin) {
    this.cfg = cfg;
    this.plugin = plugin;
    this.channelName = channelName;
    this.userAction = userAction;
    if (this.plugin.pendingPay) {
        var self = this;
        this.pendingPay = function (channelName, params, infoFromSDK, callback) {
            self.plugin.pendingPay.call(self.plugin,
                self, params, infoFromSDK, callback);
        }
    }
}

Wrapper.prototype.verifyLogin = function(token, others, callback) {
    this.plugin.verifyLogin(this, token, others, callback);
};

Wrapper.prototype.reloadCfg = function (cfg) {
    this.cfg = cfg;
};

Wrapper.prototype.replacePlugin = function (plugin) {
    this.plugin = plugin;
};

Wrapper.prototype.genOrderId = function () {
    return this.userAction.genOrderId();
};


Wrapper.prototype.getPayUrlInfo = function () {
    var subUrls = this.plugin.getPayUrlInfo();
    var self = this;
    return subUrls.map(function (obj) {
        return {
            method: obj.method,
            path: obj.path,
            callback: function (req, res, next) {
                return self.plugin.respondsToPay(req, res, next, self);
            }
        }
    });
}

module.exports = SDKPluginBase;
