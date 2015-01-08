var util = require('util');
var WError = require('verror').WError;

var SdkError = function (options) {
    var self = this;
    WError.apply(this, arguments);
    this.code = options.code || -1;
    this.req = options.req;
    this.message = options.msg || self.message;

    WError.call(this);
};

function codeToSdkError(code, req, msg) {
    if (!(req instanceof Object)) {
        req = null;
        msg = req;
    }
    return new SdkError({code: code,
                         msg: msg});
}

util.inherits(SdkError, WError);

module.exports = {
    SdkError: SdkError,
    codeToSdkError: codeToSdkError
};
