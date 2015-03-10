var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var url = require('url');
var util = require('util');

var constants = require('./constants');
var SDKPluginPool = require('./sdk_plugin_pool');
var workerMgr = require('./worker_mgr');


module.exports.createPluginMgr = function (localsettings, logger, pluginPath) {
    pluginPath = pluginPath || constants.sdkPluginPoolDir;
    return new PluginMgr(localsettings, pluginPath, logger);
};


/**
 *  manager class for plugins
 * @class PluginMgr
 * @constructor
 *
 */
function PluginMgr(localsettings, pluginPath, logger) {
    this.lsetting = localsettings;
    this.pluginPool = new SDKPluginPool(pluginPath, logger);
    this.pluginInfos = [];
    this.logger = logger;
    EventEmitter.call(this);
}

util.inherits(PluginMgr, EventEmitter);

PluginMgr.prototype.loadAllPlugins = function (callback) {
    var self = this;
    this.lsetting.get('setting', 'sdkplugins', function (err, ret) {
        self.sdkPluginSetting = null;
        if (err) {
            self.logger.error({err: err}, 'Fail to load previous sdkplugins setting, using newest');
            self.sdkPluginSetting = {};
        } else {
            try {
                self.sdkPluginSetting = JSON.parse(ret);
                if (!self.sdkPluginSetting) {
                    self.sdkPluginSetting={};
                }
            } catch (e) {
                self.logger.error({err: e}, 'Fail to load settings of sdkplugins');
                self.sdkPluginSetting = {};
            }
        }
        var availPluginNames = self.pluginPool.getAllPluginNames();
        var pluginInfos = [];
        for (var i = 0; i < availPluginNames.length; ++i) {
            var name = availPluginNames[i];
            var info = self.getVersionInfo(name);
            try {
                pluginInfos.push(info);
                if (info.ver !== self.sdkPluginSetting[name]) {
                    self.sdkPluginSetting[name] = info.ver;
                }
                self.logger.info({ver: self.sdkPluginSetting[name]}, 'successfully loaded plugin for ' + name);
            } catch (e) {
                self.logger.error( {err: e}, 'invalid plugin module');
            }
        }
        self.pluginInfos = pluginInfos;
        callback(null);
        //doLoadPluginModule(self, plugin)
    });
};

/**
 * Get all plugin module infos
 * @name PluginMgr.prototype.getAllPluginInfos
 * @function
 * @return {Array} a list of plugin info
 */
PluginMgr.prototype.getAllPluginInfos = function() {
    var ret = [];
    var self = this;
    for (var i = 0; i < self.pluginInfos.length; ++i) {
        ret.push(makePluginInfo(self.pluginInfos[i]));
    }
    return ret;
};


/**
 * Add a plugin, plugin module must be placed under $ROOT/lib/plugin
 * @name PluginMgr.prototype.upgradePlugin
 * @function
 * @param {string} fileurl the url of the plugin file
 * @param {string} md5value md5sum
 * @param {function} callback
 */
PluginMgr.prototype.upgradePlugin = function(fileurl, md5value, callback) {
    var self = this;
    self.pluginPool.loadUpgradePlugin(fileurl, md5value, function (err, name, ver, path) {
        if (err) {
            return callback(err);
        }
        for (var i = 0; i < self.pluginInfos.length; ++i) {
            var info = self.pluginInfos[i];
            if (info.name === name) {
                self.pluginInfos[i] = self.getVersionInfo(name);
            }
        }
        callback(null, name, ver, path);
    })
};

PluginMgr.prototype.getVersionInfo = function (name) {
    var self = this;
    var pluginPath = null;
    var ver = self.sdkPluginSetting[name];
    if (ver) {
        pluginPath = self.pluginPool.getPluginPath(name, ver);
    }
    if (!pluginPath) {
        // the last loading plugin is missing, use newest as default
        var pluginInfo = self.pluginPool.getNewestPluginPath(name);
        self.logger.info({ver: pluginInfo.ver}, 'loading newest plugin for ' + name);
        pluginPath = pluginInfo.p;
        ver = pluginInfo.ver;
    }
    self.logger.info({ver: ver}, 'loading plugin for ' + name);
    return {
        name: name,
        ver: ver,
        p: pluginPath
    }
};

PluginMgr.prototype.usePluginAtVersion = function (name, version, callback) {
    var p= this.pluginPool.getPluginPath(name, version);
    if (p === null) {
        setImmediate(callback, new Error("Plugin not exists: " + name + '@' + version));
        return;
    }
    var self = this;
    workerMgr.request('plugin.use', {name:name, ver: version, p: p}, function(err) {
        if (err) {
            return callback(err);
        }
        self.sdkPluginSetting[name] = version;
        self.lsetting.get('setting', 'sdkplugins', function (err, data) {
            if (err) {
                self.logger.error({err: err}, "Fail to get local settings");
                return;
            }
            var sdkplugins = {};
            try {
                sdkplugins = JSON.parse(data);
            } catch (e) {
                self.logger.error({err: e}, "Fail to parse local plugin data");
            }
            self.logger.info({name: name, version: version}, "using special plugin version");
            sdkplugins[name] = version;
            self.lsetting.set('setting', 'sdkplugins', JSON.stringify(sdkplugins));
        });
        callback();
    });
};

function makePluginInfo(pluginModule) {
    if (pluginModule) {
        return {name: pluginModule.name,
                version: pluginModule.ver,
                path: pluginModule.p};
    } else {
        return pluginModule;
    }
}

function doLoadPluginModule(self, ver, path) {
    var pluginModule = require(path);
    if (!pluginModule.name ) {
        throw new Error('plugin ' + path + 
            ' miss required field name');
    }
    if (!pluginModule.createSDK ) {
        throw new Error('plugin ' + path + 
            ' miss required function create');
    }
    if (!pluginModule.cfgDesc ) {
        throw new Error('plugin ' + path + 
            ' miss required function cfgDesc');
    }
    var checker = paramChecker.createChecker(pluginModule.cfgDesc);
    var pluginModuleInfo = {
        name: pluginModule.name,
        m: pluginModule,
        path: path,
        version: ver,
        plugin: pluginModule.createSDK(self.logger, checker, constants.debug)
    };
    self.pluginModules[pluginModule.name] = pluginModuleInfo;
    self.logger.info({name: pluginModuleInfo.name}, 'load plugin module');
    return pluginModuleInfo;
}


