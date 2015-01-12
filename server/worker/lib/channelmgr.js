var fs = require('fs');
var pathLib = require('path');

var channelLib = require('./channel');

/**
 * channel manager for a product
 * @constructor
 */
function ChannelMgr() {
    this.channels = {};
}

/**
 *  Get all channels
 * @name ChannelMgr.prototype.getAllChannels
 * @function
 * @return {Array} a list of plugin instance info
 */
ChannelMgr.prototype.getAllChannels = function () {
    var self = this;
    var ret = Object.keys(self.channels).map(function (key) {
        return makeChannelInfo(self.channels[key]);
    });
    return ret;
};


/**
 *  Get plugin instance info by name
 * @name ChannelMgr.prototype.getChannelInfo
 * @function
 * @param {string} name the name of the plugin instance
 * @return {object} channel info
 */
ChannelMgr.prototype.getChannelInfo = function (name) {
    var self = this;
    return makeChannelInfo(self.channels[name]);
};

/**
 *  Start a new plugin instance with name
 * @name ChannelMgr.prototype.startChannel
 * @function
 * @param {String} name name of the module
 * @param {array<object>} sdkcfgs object cfgs
 * @param {object} pluginMgr the plugin manager
 * @param {object} userAction user instance of this product
 * @param {object} logger
 */
ChannelMgr.prototype.startChannel = function (name, sdkcfgs, pluginMgr, userAction, logger)  {
    var self = this;
    if (self.channels[name]) {
        throw new Error('plugin instance with name ' + name +
            'has been started');
    }
    var inst = channelLib.createChannel(name, sdkcfgs, pluginMgr, userAction, logger);
    self.channels[name] = inst;
    return inst;
};

/**
 * save channel cfg
 * @param channelName channel name
 * @param localPath config path for this product
 */
ChannelMgr.prototype.saveChannelCfg = function (channelName, localPath) {
    var self = this;
    var channel = self.channels[channelName];
    if (!channel) {
        return;
    }
    var tmpFileName = pathLib.join(localPath, channelName+'.json.swap');
    var target = pathLib.join(localPath, channelName+'.json');
    var output = fs.createWriteStream(tmpFileName,
                                  {
                                    flags: 'w',
                                    encoding: 'utf8'
                                  });
    output.end(JSON.stringify(channel.sdkcfgs, null, "    "),
                function () {
                    fs.rename(tmpFileName, target, function (err) {
                        if (err) {
                            self.logger.error(
                                {name: tmpFileName}, 'fail to rename to');
                        }
                    });
                });
};

/**
 *  Modify the plugin info config
 * @name ChannelMgr.prototype.modifyPluginInfo
 * @function
 * @param {string} name name of the plugin
 * @param {object} cfg the config item
 * @param {string} localPath the config path of the product
 */
ChannelMgr.prototype.modifyChannel = function(name, cfg, localPath) {
    var self = this;
    if (!cfg) {
        throw Error("cfg item doesn't exists in request");
    }
    var channel = self.channels[name];
    if (!channel) {
         throw Error("plugin " + name + " does't exist");
    }

    if (!cfg) {
        throw new Error('miss cfg in request');
    }

    channel.reload(cfg);
};

/**
 *  Delete the plugin instance
 * @name ChannelMgr.prototype.stopChannel
 * @function
 * @param {string} channelName name of the channel
 * @param {string} localPath config path for this product
 */
ChannelMgr.prototype.stopChannel = function(channelName, localPath) {
    var self = this;
    var channel = self.channels[channelName];
    if (!channel) {
        return;
    }
    delete self.channels[channelName];
    var path = pathLib.join(localPath, channelName+'.json');
    fs.unlink(path);
    return channel;
};


/**
 * Get the plugin instance by name
 * @name ChannelMgr.prototype.getChannel
 * @function
 * @param {string} name name of the plugin
 */
ChannelMgr.prototype.getChannel = function (name) {
    var self = this;
    return self.channels[name];
};

function makeChannelInfo(channel) {
    if (channel) {
        return {
            name: channel.name,
            info: channel.getInfo()
        };
    } else {
        return channel;
    }
}


module.exports = {
    create: function () {
        return new ChannelMgr();
    }
};


