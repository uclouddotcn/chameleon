var constants = require('../constants');
//var paramChecker = require('../param-checker');
var SDKPluginPool = require('./sdk_plugin_pool');
var fs = require('fs');
var EventEmitter = require('events').EventEmitter;
var url = require('url');
var util = require('util');


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
    this.pluginModules = {};
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
            try {
                pluginInfos.push({
                    ver: ver,
                    p: pluginPath
                });
                if (ver !== self.sdkPluginSetting[name]) {
                    self.sdkPluginSetting[name] = ver;
                }
                self.logger.info({ver: self.sdkPluginSetting[name]}, 'successfully loaded plugin for ' + name);
            } catch (e) {
                self.logger.error( {err: e, name: pluginPath}, 'invalid plugin module');
            }
        }
        callback(null, pluginInfos);
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
    for (var i = 0; i < self.pluginModules.length; ++i) {
        ret.push(makePluginInfo(self.pluginModules[i]));
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
        callback(null, name, ver, path);
    })
};

PluginMgr.prototype.usePluginAtVersion = function (name, version) {
    var p= this.pluginPool.getPluginPath(name, version);
    this.sdkPluginSetting[name] = version;
    var self = this;
    this.lsetting.get('setting', 'sdkplugins', function (err, data) {
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
    /*
    //var pluginModule = doLoadPluginModule(this, version, p);
    if (pluginModule instanceof Error) {
    } else {
        this.pluginModules[name] = pluginModule;
        this.emit('plugin-upgrade', name, pluginModule);
    }
    return pluginModule;
    */
};

function makePluginInfo(pluginModule) {
    if (pluginModule) {
        return {name: pluginModule.name,
                path: pluginModule.path};
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


