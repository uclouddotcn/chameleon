var VError = require('verror');
var utils = require('util');

var ChamError = function(errCode) {
    this.errcode = errCode;
    VError.call(this, Array.prototype.slice(arguments, 1));
}

utils.inherits(ChamError, VError);

module.exports = ChamError;

