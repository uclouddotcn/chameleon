var restify = require('restify');
var paramChecker = require('./param-checker');
var util = require('util');
var constants = require('./constants');
var fs = require('fs');

var configDir = __dirname + '/../plugin_config';

module.exports.createPluginMgr = function (logger) {
    var mgr = new PluginMgr(logger);
    return mgr;
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
 * @return {array} a list of plugin info
 */
PluginMgr.prototype.getAllPluginInfos = function() {
    ret = [];
    for (var i in this.pluginModules) {
        ret.push(makePluginInfo(this.pluginModules[i]));
    }
    return ret;
};


/**
 * Add a plugin, plugin module must be placed under $ROOT/lib/plugin
 * @name PluginMgr.prototype.addPlugin
 * @function
 * @param {string} name, name of the plugin
 * @param {object} param, the request param item
 * @param {?object} param.cfg, the config item
 * @param {function} callback
 */
PluginMgr.prototype.addPlugin = function(name, param, callback) {
    var self = this;
    var pluginModule = self.pluginModules[name];
    if (pluginInfo) {
         return callback(Error("plugin " + name + " is already loaded"));
    }

    pluginModule = loadPluginModule(self, name); 
    if (pluginModule instanceof Error) {
        callback(pluginModule);
    } else {
        callback(null, makePluginInfo(pluginModule));
    }
};

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
    if (!pluginModule.create ) {
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
    if (!fs.statSync(path).isDirectory()) {
        return;
    }
    try {
        return doLoadPluginModule(self, path);
    } catch (err) {
        self.logger.error(
            {err: err, name: path}, 
            'invalid plugin module');
        return err;
    }
}
/**
 *  load plugin modules under the folder synchronously, 
 *  only called when init the system
 * @name loadPluginModuleSync
 * @function
 * @param {PluginMgr} self
 * @param {string} folder
 */
function loadPluginModuleSync(self, folder) {
    fs.readdirSync(folder).forEach( 
        loadPluginModule.bind(undefined, self));
}


