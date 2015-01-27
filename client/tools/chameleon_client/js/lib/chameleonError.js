/**
 * Created by Administrator on 2015/1/12.
 */
function ChameleonError(code, message, name) {
    this.errorCode = code;
    this.message = message;
    this.name = name;
}

module.exports = ChameleonError;