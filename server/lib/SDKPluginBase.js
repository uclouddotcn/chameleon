"use strict";

function SDKPluginBase(userAction, logger, cfgChecker) {
    this._logger = logger;
    this._checker = cfgChecker;
    this._channels = {};
    this._userAction = userAction;
}

SDKPluginBase.prototype.createPluginWrapper = function (channelName, cfg) {
    this._checker.check(cfg);
    var wrapper = new Wrapper(channelName, cfg, this);
    this._channels[channelName] = wrapper;
    return wrapper;
};

SDKPluginBase.prototype.uninstallChannel = function (channelName) {
    if (this._channels[channelName]) {
        delete this._channels;
    }
};

SDKPluginBase.prototype.verifyLogin = function(wrapper, token, others, callback) {
    throw new Error("Not Implementation");
};

SDKPluginBase.prototype.getPayUrlInfo = function() {
    throw new Error("Not Implementation");
};


SDKPluginBase.prototype.reloadCfg = function (cfgItem) {
    throw new Error("Not Implementation");
};

SDKPluginBase.prototype.getInfo = function () {
    var self = this;
    return {
        cfg: Object.keys(this._channels).map(function (key) {
            return {
                channel: key,
                cfg: self._channels[key].cfg
            }
        })
    };
};


function Wrapper (channelName, cfg, plugin) {
    this.cfg = cfg;
    this.plugin = plugin;
    this.channelName = channelName;
    if (this.plugin.pendingPay) {
        var self = this;
        this.pendingPay = function () {
            self.plugin.pendingPay.apply(self.plugin, arguments);
        }
    }
}

Wrapper.prototype.verifyLogin = function(token, others, callback) {
    this.plugin.verifyLogin(this, token, others, callback);
};

Wrapper.prototype.reloadCfg = function (cfg) {
    this.cfg = cfg;
};

Wrapper.prototype.getPayUrlInfo = function () {
    var subUrls = this.plugin.getPayUrlInfo();
    var self = this;
    return subUrls.map(function (obj) {
        var callback = obj.callback;
        return {
            method: obj.method,
            path: obj.path,
            callback: function (req, res, next) {
                return callback(req, res, next, self);
            }
        }
    });
}

module.exports = SDKPluginBase;
