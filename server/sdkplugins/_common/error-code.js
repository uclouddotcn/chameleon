(function (ErrorCode) {
    ErrorCode[ErrorCode["ERR_OK"] = 0] = "ERR_OK";
    ErrorCode[ErrorCode["ERR_FAIL"] = 1] = "ERR_FAIL";
    ErrorCode[ErrorCode["ERR_SIGN_NOT_MATCH"] = 2] = "ERR_SIGN_NOT_MATCH";
    ErrorCode[ErrorCode["ERR_NO_AUTHRIZED"] = 3] = "ERR_NO_AUTHRIZED";
    ErrorCode[ErrorCode["ERR_REMOTE_ERROR"] = 4] = "ERR_REMOTE_ERROR";

    // 5~15 login fail
    ErrorCode[ErrorCode["ERR_LOGIN_SESSION_INVALID"] = 5] = "ERR_LOGIN_SESSION_INVALID";
    ErrorCode[ErrorCode["ERR_LOGIN_UID_INVALID"] = 6] = "ERR_LOGIN_UID_INVALID";

    // 16~25 pay fail
    ErrorCode[ErrorCode["ERR_PAY_FAIL"] = 16] = "ERR_PAY_FAIL";
    ErrorCode[ErrorCode["ERR_PAY_CANCEL"] = 17] = "ERR_PAY_CANCEL";
    ErrorCode[ErrorCode["ERR_PAY_ILL_CHANNEL"] = 18] = "ERR_PAY_ILL_CHANNEL";
    // 对于二级货币托管的情况，我们已经直接扣款成功了！
    ErrorCode[ErrorCode["ERR_PAY_DONE"] = 19] = "ERR_PAY_DONE";

    // 35 ~ 55 setting error
    ErrorCode[ErrorCode["ERR_INVALID_APPID"] = 35] = "ERR_SETTING_INVALID_APPID";
    ErrorCode[ErrorCode["ERR_CHANNLE_NOT_EXIST"] = 36] = "ERR_CHANNLE_NOT_EXIST";

})(exports.ErrorCode || (exports.ErrorCode = {}));
var ErrorCode = exports.ErrorCode;
