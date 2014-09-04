var fs = require('fs');

var PluginInstMgr = 
function () {
    this.pluginList = {};
}

/**
 *  Get all plugin instance info
 * @name PluginInstMgr.prototype.getAllPluginInstInfo
 * @function
 * @return {array} a list of plugin instance info
 */
PluginInstMgr.prototype.getAllPluginInstInfo = function () {
    ret = [];
    for (var i in this.pluginList) {
        ret.push(makePluginInstanceInfo(this.pluginList[i]));
    }
    return ret;
};


/**
 *  Get plugin instance info by name
 * @name PluginInstMgr.prototype.getPluginInstInfo
 * @function
 * @param {string} name, the name of the plugin instance
 */
PluginInstMgr.prototype.getPluginInstInfo = function (name) {
    return makePluginInstanceInfo(this.pluginList[name]);
};

/**
 *  Start a new plugin instance with name
 * @name PluginInstMgr.prototype.startPluginInst
 * @function
 * @param {String} name, name of the module
 * @param {object} pluginModule, the module of the plugin
 * @param {object} cfg, config of the new plugin instance
 * @param {object} logger
 */
PluginInstMgr.prototype.startPluginInst = 
function (name, pluginModule, cfg, cfgpath, userAction, logger) {
    var self = this;
    if (self.pluginList[name]) {
        throw new Error('plugin instance with name ' + name + 
            'has been started');
    }
    pluginModule.checker.check(cfg);
    var inst = pluginModule.m.create(name, cfg, userAction, logger);
    var pluginInfo = {
        name: name,
        cfg: cfg,
        inst: inst,
        path: cfgpath,
        m: pluginModule
    };
    self.pluginList[name] = pluginInfo;
    logger.info({name: name, cfg: cfg}, 'start plugin inst');
    return pluginInfo;
};

PluginInstMgr.prototype.savePluginInst = 
function (channelName) {
    var self = this;
    var pluginInfo = self.pluginList[channelName];
    if (!pluginInfo) {
        return;
    }
    var newFileName = pluginInfo.path + '.swp';
    var fstream = fs.createWriteStream(newFileName, 
                                  {
                                    flags: 'w',
                                    encoding: 'utf8'
                                  });
    fstream.end(JSON.stringify(pluginInfo.cfg, '\r', 4), 
                function () {
                    fs.rename(newFileName, pluginInfo.path, function (err) {
                        if (err) {
                            self.logger.error(
                                {name: newFileName}, 'fail to rename to');
                        }
                    });
                });
}

/**
 *  Modify the plugin info config
 * @name PluginInstMgr.prototype.modifyPluginInfo
 * @function
 * @param {string} name, name of the plugin
 * @param {object} param, the request param item
 * @param {object} param.cfg, the config item
 * @param {function} callback
 */
PluginInstMgr.prototype.modifyPluginInst = function(name, param) {
    var self = this;
    if (!param.cfg) {
        throw Error("cfg item doesn't exists in request");
    }
    var pluginInfo = self.pluginList[name];
    if (!pluginInfo) {
         throw Error("plugin " + name + " does't exist");
    }

    if (param.cfg) {
        throw new Error('miss cfg in request');
    }

    pluginInfo.m.checker.check(cfg);
    pluginInfo.inst.reloadCfg(cfg);
    this.savePluginInst(self, pluginInfo);
};

/**
 *  Delete the plugin instance
 * @name PluginInstMgr.prototype.stopPlugin
 * @function
 * @param {string} name
 */
PluginInstMgr.prototype.stopPluginInst = function(name) {
    var self = this;
    var pluginInfo = self.pluginList[name];
    if (!pluginInfo) {
        return;
    }
    delete self.pluginList[name];
    deletePluginInfoCfg(pluginInfo);
    return pluginInfo;
};


/**
 * Get the plugin instance by name
 * @name PluginInstMgr.prototype.getPluginImp
 * @function
 * @param {string} name, name of the plugin
 */
PluginInstMgr.prototype.getPluginImp = function (name) {
    var pluginInfo = this.pluginList[name];
    if (!pluginInfo) {
        return null;
    }
    return pluginInfo.inst;
};

/**
 *  Get the list of active plugins
 */
PluginInstMgr.prototype.getActivePluginInfo = function () {
    return this.pluginList;
};

function makePluginInstanceInfo(pluginInst) {
    if (pluginInst) {
        return {name: pluginInst.name, 
                m: pluginInst.m.name,
                info: pluginInst.inst.getInfo(),
                path: pluginInst.path};
    } else {
        return pluginInst;
    }
}

function deletePluginInfoCfg(pluginInfo) {
    fs.unlink(pluginInfo.path);
    pluginInfo = null;
}


module.exports = PluginInstMgr;


