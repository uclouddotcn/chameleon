exports.getVersionCode = function (version) {
    var names = version.split('.');
    var major = parseInt(names[0] || '0');
    var medium = parseInt(names[1] || '0');
    var minor = parseInt(names[2] || '0');
    var build = parseInt(names[3] || '0');
    return major * 100 * 100 * 1000 + medium * 100 * 1000 + minor * 1000 + build;
};


exports.formatVersionCode = function (versionCode) {
    var build = versionCode % 1000;
    versionCode = Math.floor(versionCode/1000);
    var minor =  versionCode % 100;
    versionCode = Math.floor(versionCode/100);
    var medium =  versionCode % 100;
    versionCode = Math.floor(versionCode/100);
    var major =  versionCode;
    return major+'.'+medium+'.'+minor+'.'+build;
}


