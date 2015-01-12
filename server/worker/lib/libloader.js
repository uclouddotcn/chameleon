var pathLib = require('path');

module.exports.loadModule = function (paths) {
    var pluginPath = pathLib.join.apply(undefined, [__dirname].concat(paths));
    try {
        return require(pluginPath);
    } catch (e) {
        throw new Error('Fail to load plugin at ' + pluginPath);
    }
}

