var _errorcode = require('./error-code');
var _plugincommon = require('./plugin-common');

exports.ErrorCode = _errorcode.ErrorCode;
exports.VerifyLoginRespond = _plugincommon.VerifyLoginRespond;
exports.UserLoginInfo = _plugincommon.UserLoginInfo;
exports.ChannelSubUrls = _plugincommon.ChannelSubUrls;

function makePrivatePemFormat(key) {
    if (!key || key.length < 0) {
        throw new Error('illegal key ' + key);
    }
    var c = [];
    var l = key.length;
    var start = 0;
    while (start < key.length) {
        c.push(key.substr(start, 64));
        start += 64;
    }
    //console.log('-----BEGIN RSA PRIVATE KEY-----\n' + c.join('\n') + '-----END RSA PRIVATE KEY-----');
    return '-----BEGIN RSA PRIVATE KEY-----\n' + c.join('\n') + '\n-----END RSA PRIVATE KEY-----\n';
}

function makePublicPemFormat(key) {
    if (!key || key.length < 0) {
        throw new Error('illegal key ' + key);
    }
    var c = [];
    var l = key.length;
    var start = 0;
    while (start < key.length) {
        c.push(key.substr(start, 64));
        start += 64;
    }
    //console.log('-----BEGIN RSA PRIVATE KEY-----\n' + c.join('\n') + '-----END RSA PRIVATE KEY-----');
    return '-----BEGIN PUBLIC KEY-----\n' + c.join('\n') + '\n-----END PUBLIC KEY-----\n';
}
exports.makePrivatePemFormat = makePrivatePemFormat;
exports.makePublicPemFormat = makePublicPemFormat;


