(function (ErrorCode) {
    ErrorCode[ErrorCode["ERR_OK"] = 0] = "ERR_OK";
    ErrorCode[ErrorCode["ERR_FAIL"] = 1] = "ERR_FAIL";
    ErrorCode[ErrorCode["ERR_SIGN_NOT_MATCH"] = 2] = "ERR_SIGN_NOT_MATCH";
    ErrorCode[ErrorCode["ERR_NO_AUTHRIZED"] = 3] = "ERR_NO_AUTHRIZED";
    ErrorCode[ErrorCode["ERR_REMOTE_ERROR"] = 4] = "ERR_REMOTE_ERROR";

    // 5~15 login fail
    ErrorCode[ErrorCode["ERR_LOGIN_SESSION_INVALID"] = 5] = "ERR_LOGIN_SESSION_INVALID";

    // 16~25 pay fail
    ErrorCode[ErrorCode["ERR_PAY_FAIL"] = 16] = "ERR_PAY_FAIL";

    // 35 ~ 55 setting error
    ErrorCode[ErrorCode["ERR_INVALID_APPID"] = 35] = "ERR_SETTING_INVALID_APPID";

})(exports.ErrorCode || (exports.ErrorCode = {}));
var ErrorCode = exports.ErrorCode;
