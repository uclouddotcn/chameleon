var fs = require('fs');
var path = require('path');
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

module.exports.initFromBaseDir = function (baseDir) {
    module.exports.debug = false;
    module.exports.baseDir = baseDir;
    module.exports.billDir = path.join(baseDir, 'bill');
    module.exports.logDir = path.join(baseDir, 'log');
    module.exports.productDir = path.join(baseDir, '..', 'products');
}


