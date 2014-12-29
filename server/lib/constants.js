/*
 *  global constants of this project
 */

var fs = require('fs');
module.exports.baseDir = __dirname + '/../';
module.exports.pluginDir = __dirname + '/plugin';
module.exports.productDir = __dirname + '/../../products';
module.exports.logDir = __dirname + '/../../log';
module.exports.sdkPluginPoolDir = __dirname + '/../../sdkplugins';
module.exports.configDir = __dirname + '/../../config';
module.exports.billDir = __dirname + '/../../bill';
module.exports.debug = false;


/**
 * load json file from local file
 * @name module.exports.loadJsonCfg
 * @function
 * @param {string} p path of the json file
 */
module.exports.loadJsonCfgSync = function (p) {
    var data = fs.readFileSync(p, {encoding: 'utf8'}); 
    return JSON.parse(data);
};

