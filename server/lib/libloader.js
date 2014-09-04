var pathLib = require('path');

module.exports.loadModule = function (paths) {
    var pluginPath = pathLib.join.apply(undefined, [__dirname].concat(paths));
    try {
        var m = require(pluginPath);
        return m;
    } catch (e) {
        throw new Error('Fail to load plugin at ' + pluginPath);
    }
}

