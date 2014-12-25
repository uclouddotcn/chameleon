var restify = require('restify');
var paramChecker = require('./param-checker');
var url = require('url');
var util = require('util');
var constants = require('./constants');
var fs = require('fs');
var childProcess = require('child_process');
var pathLib = require('path');
var cluster = require('./cluster/master');

module.exports.createPluginMgr = function (logger) {
    return new PluginMgr(logger);
};


/**
 *  manager class for plugins
 * @class PluginMgr
 * @constructor
 *
 */
function PluginMgr(logger) {
    var self = this;
    this.pluginModules = {};
    this.logger = logger;
    loadPluginModuleSync(self, constants.pluginDir);
}


/**
 * Get all plugin module infos
 * @name PluginMgr.prototype.getAllPluginInfos
 * @function
 * @return {Array} a list of plugin info
 */
PluginMgr.prototype.getAllPluginInfos = function() {
    var ret = [];
    for (var i in this.pluginModules) {
        ret.push(makePluginInfo(this.pluginModules[i]));
    }
    return ret;
};


/**
 * Add a plugin, plugin module must be placed under $ROOT/lib/plugin
 * @name PluginMgr.prototype.addPlugin
 * @function
 * @param {string} name name of the plugin
 * @param {object} fileurl the url of the plugin file
 * @param {function} callback
 */
PluginMgr.prototype.addPlugin = function(name, fileurl, callback) {
    var self = this;
    var pluginModule = self.pluginModules[name];
    if (pluginModule) {
        return setImmediate(callback(Error("plugin " + name + " is already loaded")));
    }
    self.loadPlugin(name, fileurl, function (err) {
        if (err) {
            return callback(err);
        }
        pluginModule = loadPluginModule(self, name);
        if (pluginModule instanceof Error) {
            callback(pluginModule);
        } else {
            callback(null, makePluginInfo(pluginModule));
        }
    })
};

PluginMgr.prototype.loadPlugin = function(name, fileurl, callback) {
    var self = this;
    var cp = childProcess.execFile('node', [pathLib.join(__dirname, '..', 'upgrade.js'), name, fileurl],
        {timeout: 10000}, function (err, stdin, stdout) {
            if (!err) {
                callback(null);
            } else {
                var code = err.code;
                self.logger.error({err: err}, 'Fail to load plugin');
                if (code === 1) {
                    callback(new Error('exists plugin module'));
                } else {
                    callback(new Error('unknown error'));
                }
            }
        });
}

function makePluginInfo(pluginModule) {
    if (pluginModule) {
        return {name: pluginModule.name,
                path: pluginModule.path};
    } else {
        return pluginModule;
    }
}

function doLoadPluginModule(self, path) {
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
    var pluginModuleInfo = {
        name: pluginModule.name,
        m: pluginModule,
        path: path,
        checker: paramChecker.createChecker(pluginModule.cfgDesc)
    }; 
    self.pluginModules[pluginModule.name] = pluginModuleInfo;
    self.logger.info({name: pluginModuleInfo.name}, 'load plugin module');
    return pluginModuleInfo;
}


function loadPluginModule(self, fileName) {
    var path = constants.pluginDir + '/' + fileName;
    if (fileName == 'common') {
        return;
    }
    try {
        if (!fs.statSync(path).isDirectory()) {
            return;
        }
        return doLoadPluginModule(self, path);
    } catch (err) {
        self.logger.error(
            {err: err, name: path}, 
            'invalid plugin module');
        return err;
    }
}


