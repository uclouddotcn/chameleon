var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var url = require('url');
var util = require('util');
var _ = require('underscore');

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
    var availPluginNames = self.pluginPool.getAllPluginNames();
    var pluginInfos = [];
    for (var i = 0; i < availPluginNames.length; ++i) {
        var name = availPluginNames[i];
        var info = self.getVersionInfo(name);
        try {
            for(var j=0; j < info.length; j++){
                pluginInfos.push(info[j]);
                self.logger.info({info: info[j]}, 'successfully loaded plugin for ' + name);
            }

        } catch (e) {
            self.logger.error( {err: e}, 'invalid plugin module');
        }
    }
    self.pluginInfos = pluginInfos;
    setImmediate(callback);
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
        var pluginInfoList = self.getVersionInfo(name);
        self.pluginInfos = _.reject(self.pluginInfos, {name: name});
        for(var i = 0; i < pluginInfoList.length; i++){
            self.pluginInfos.push(pluginInfoList[i]);
        }
        callback(null, name, ver, path);
    })
};

PluginMgr.prototype.getVersionInfo = function (name) {
    var self = this,
        result = [],
        pluginPath = null,
        ver = null,
        versionList = [];

    var plugin = self.pluginPool.plugins[name];
    for(var v in plugin.newest){
        versionList.push(v);
    }

    if (versionList) {
        for(var i =0; i<versionList.length; i++){
            var pluginInfo = self.pluginPool.getNewestPluginPath(name, versionList[i]);
            self.logger.info({ver: pluginInfo.ver}, 'loading newest plugin for ' + name);
            pluginPath = pluginInfo.p;
            ver = pluginInfo.ver;
            result.push({
                name: name,
                ver: versionList[i],
                p: pluginPath
            });

            self.logger.info({ver: ver}, 'loading plugin for ' + name);
        }
    }

    return result;
};

// deprected
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
        return {
        name: pluginModule.name,
        version: pluginModule.ver,
        path: pluginModule.p
        };
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



