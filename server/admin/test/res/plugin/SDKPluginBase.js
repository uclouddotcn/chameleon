"use strict";

function SDKPluginBase(userAction, logger, cfgChecker) {
    this._logger = logger;
    this._checker = cfgChecker;
    this._userAction = userAction;
}

SDKPluginBase.prototype.createPluginWrapper = function (channelName, cfg) {
    this._checker.check(cfg);
    var wrapper = new Wrapper(channelName, cfg, this);
    return wrapper;
};

SDKPluginBase.prototype.verifyLogin = function(wrapper, token, others, callback) {
    throw new Error("Not Implementation");
};

SDKPluginBase.prototype.getPayUrlInfo = function() {
    throw new Error("Not Implementation");
};


function Wrapper (channelName, cfg, plugin) {
    this.cfg = cfg;
    this.plugin = plugin;
    this.channelName = channelName;
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
}

Wrapper.prototype.getPayUrlInfo = function () {
    var subUrls = this.plugin.getPayUrlInfo();
    var self = this;
    return subUrls.map(function (obj) {
        var callback = obj.callback;
        return {
            method: obj.method,
            path: obj.path,
            callback: function (req, res, next) {
                return callback.call(self.plugin, req, res, next, self);
            }
        }
    });
}

module.exports = SDKPluginBase;
