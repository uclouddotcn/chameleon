var crypto = require('crypto');


module.exports.rewriteCfg = function (cfg) {
    cfg["sappPrivateKey"] = calcPrivateKey(cfg["sappKey"], cfg["happSecret"])
    return cfg;
}


function calcPrivateKey(appKey, appSecret) {
    var md5sum = crypto.createHash('md5');
    md5sum.update(appSecret + '#' + appKey);
    return md5sum.digest('hex');
}

