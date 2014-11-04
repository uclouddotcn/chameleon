var Zip = require('adm-zip');
var pathLib = require('path');
var url = require('url');
var fs = require('fs');
var Http = require('http');


function extractZip(filepath, targetPath) {
    var src = new Zip(filepath);
    src.extractAllTo(targetPath);
}


function main() {
    var channelName = process.argv[2];
    var fileurl = process.argv[3];
    var targetPath = pathLib.join(__dirname, 'lib', 'plugin', channelName);
    if (fs.existsSync(targetPath)) {
        process.exit(1);
        return;
    }
    targetPath = pathLib.join(__dirname, 'lib', 'plugin');
    var urlInfo = url.parse(fileurl);
    if (urlInfo.protocol === 'file:') {
        extractZip(urlInfo.pathname, targetPath);
    } else if (urlInfo.protocol === 'http:') {
        // to support
        throw new Error('non support protocol ' + urlInfo.protocol);
    } else {
        throw new Error('non support protocol ' + urlInfo.protocol);
    }
}

try {
    main();
    process.exit(0);
} catch (e) {
    console.error(e.stack);
    console.error(e);
    process.exit(-1);
}

