(function (ErrorCode) {
    ErrorCode[ErrorCode["UNKNOWN"] = 1] = "UNKNOWN";
    ErrorCode[ErrorCode["SDK_PATH_ILLEGAL"] = 2] = "SDK_PATH_ILLEGAL";
    ErrorCode[ErrorCode["OP_FAIL"] = 3] = "OP_FAIL";
    ErrorCode[ErrorCode["CFG_ERROR"] = 4] = "CFG_ERROR";
})(exports.ErrorCode || (exports.ErrorCode = {}));
var ErrorCode = exports.ErrorCode;

var Version = (function () {
    function Version(ver) {
        var t = ver.split('.');
        this.major = parseInt(t[0]);
        this.medium = parseInt(t[1]);
        if (t.length == 3) {
            this.minor = parseInt(t[2]);
        } else {
            this.minor = 0;
        }
    }
    Version.prototype.cmp = function (that) {
        if (this.major > that.major) {
            return 1;
        } else if (this.major < that.major) {
            return -1;
        } else {
            if (this.medium < that.medium) {
                return -1;
            } else if (this.medium > that.medium) {
                return 1;
            } else {
                if (this.minor < that.minor) {
                    return -1;
                } else if (this.minor > that.minor) {
                    return 1;
                } else {
                    return 0;
                }
            }
        }
    };

    Version.prototype.isMajorUpgrade = function (that) {
        return (this.major > that.major) || (this.major === that.major && this.medium > that.medium);
    };

    Version.prototype.toString = function () {
        return this.major + '.' + this.medium + '.' + this.minor;
    };
    return Version;
})();
exports.Version = Version;

var ChameleonError = (function () {
    function ChameleonError(code, message, name) {
        if (typeof message === "undefined") { message = ""; }
        if (typeof name === "undefined") { name = ""; }
        this.name = name;
        this.message = message;
        this.errCode = code;
    }
    ChameleonError.newFromError = function (err, code) {
        if (typeof code === "undefined") { code = 1 /* UNKNOWN */; }
        console.log(err);
        var e = new ChameleonError(code);
        e.name = err.name;
        e.message = err.message;
        return e;
    };
    return ChameleonError;
})();
exports.ChameleonError = ChameleonError;
//# sourceMappingURL=utils.js.map
