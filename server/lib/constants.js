/*
 *  global constants of this project
 */

var fs = require('fs');
module.exports.baseDir = __dirname + '/../';
module.exports.pluginDir = __dirname + '/plugin';
module.exports.productDir = __dirname + '/../products';


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

