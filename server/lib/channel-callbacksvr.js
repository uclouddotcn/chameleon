var restify = require('restify');
var util = require('util');

// API


/**
 *  the server listen to the callback request from channel
 * @class channelCallbackSvr
 * @constructor
 * @param {object} productMgr
 * @param {number} port
 * @param {?string} host
 * @param {?object} options
 * @param {?object} logger
 *
 */
var ChannelCallbackSvr = 
function (productMgr, port, host, options, logger) {
    var self = this;
    self.server = restify.createServer({
        name: 'ChannelCallbackSvr',
        version: '0.0.1',
        log: logger
    });

    self.server.use(restify.bodyParser({ mapParams: true }));
    self.server.use(restify.queryParser({ mapParams: true }));

    self.server.on('uncaughtException', function (req, res, route, error) {
        req.log.error({err: error}, 'uncaughtException')
    });
    this.server.listen(port, host, options);
    this.subDirs = {};
    productMgr.on('start-inst', self._onStartChannel.bind(self));
    productMgr.on('end-inst', self._onRemoveChannel.bind(self));
    self.logger = logger;
};


/**
 * install the path for the plugin
 * @param {object} channelInfo
 */
ChannelCallbackSvr.prototype._onStartChannel = function (channelInfo) {
    var self = this;
    var productName = channelInfo.product;
    var channel = channelInfo.channel;
    var subDirs = channel.getPayUrl();
    var serverSubDirs = [];
    // walk through the sub dirs, make sure all of 
    // them are valid
    for (var i in subDirs) {
        if (!(subDirs[i].method in SUPPORT_METHOD)) {
            self.logger.error(
                {name: channel.name, subdir: subDirs[i]},
                'unsupport method');
            return;
        }
        var method = self.server[subDirs[i].method].bind(self.server);
        serverSubDirs.push({
            path: subDirs[i].path,
            method: method,
            callback: subDirs[i].callback
        });
    }
    addSubDir(self, productName, channel.name, serverSubDirs);
    self.logger.info({product: productName, channel: channel.name},
        'install product')
};


/**
 *  While the a plugin instance is removed
 * @name ChannelCallbackSvr.prototype._onRemoveChannel
 * @function
 * @param {object} pluginInstInfo
 */
ChannelCallbackSvr.prototype._onRemoveChannel = function (pluginInstInfo) {
    var channel = pluginInstInfo.channel;
    var productName = pluginInstInfo.product;
    var name = productName + ':' + channel.name;
    var subDirInfo = self.subDirs[name];
    if (subDirInfo) {
        self.logger.error({name: name}, 
            'sub dir info does\' exists');
        return;
    }
    subDirInfo.subpath.forEach(function (path) {
        self.server.rm(path);
    });
    delete self.subDirs[name];
    self.logger.info({product: productName, channel: channel.name},
        'uninstall product')
};

// internal
//

function addSubDir(self, productName, channelName, subDirs) {
    var name = productName+':'+channelName;
    if (self.subDirs[name]) {
        self.logger.warn({name: name}, 'overwriting path');
        self.subDirs[name].subpath.forEach(
            function (path) {
                self.server.rm(path);
            }
        );
    }
    var pluginPathInfo = {
        subpath: []
    };
    var parentPath = util.format('/%s/%s', productName, channelName);    
    subDirs.forEach(function (dir) {
        var urlPath = parentPath + '/' + dir.path;
        pluginPathInfo.subpath.push(urlPath);
        dir.method(urlPath, dir.callback);
        self.logger.info({urlpath: urlPath}, 
            'add channel callback path');
    });
    self.subDirs[name] = pluginPathInfo;
}

/**
 *  support http method from plugin
 */
var SUPPORT_METHOD = {'get': 1, 'post': 1};

module.exports = ChannelCallbackSvr;

