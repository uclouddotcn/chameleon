var fs = require('fs');
var path = require('path');
var AdmZip = require('adm-zip');
var versionparser = require(path.join(__dirname, '..', 'lib', 'versionparser'));
var toVersionCode = versionparser.getVersionCode;

function extractInfo (obj) {
    if (!obj.name) {
        throw new Error('Fail to find name in package.json');
    }
    if (!obj.version) {
        throw new Error('Fail to find version in package.json');
    }
    if (!obj.sdkversion) {
        throw new Error('Fail to find sdkversion in package.json');
    }
    var pat = /^chameleon-sdk-([a-zA-Z1-9]+)$/;
    var sdkname = pat.exec(obj.name);
    if (!sdkname) {
        throw new Error('invalid name field in package.json');
    }
    return {
        sdkname: sdkname[1],
        version: obj.version,
        versionCode: toVersionCode(obj.version)
    }
}


function main() {
    var sdkzip = process.argv[2];
    if (!sdkzip || !fs.existsSync(sdkzip)) {
        throw new Error('must provide a valid zip file: ' + sdkzip);
    }
    var sdkpluginFolder = path.join(__dirname, '..', '..', 'sdkplugins');
    var zipf = new AdmZip(sdkzip);
    var entries = zipf.getEntries();
    var pat = /^[a-zA-Z1-9]+\/package.json$/
    var packageEntry = entries.filter(function (entry) {
        return pat.exec(entry.entryName) != null;
    });
    if (!packageEntry || packageEntry.length === 0) {
        throw new Error('could not find package.json: ' + sdkzip);
    }
    packageEntry = packageEntry[0];
    var obj = JSON.parse(zipf.readAsText(packageEntry));
    var packageInfo = extractInfo(obj);
    var tmpFolder = path.join(__dirname, 'tmp-'+packageInfo.sdkname+packageInfo.versionCode);
    var targetFolder = path.join(sdkpluginFolder, packageInfo.sdkname+'-'+packageInfo.versionCode.toString());
    zipf.extractAllTo(tmpFolder, true);
    fs.renameSync(path.join(tmpFolder, packageInfo.sdkname), targetFolder);
    fs.rmdirSync(tmpFolder);
    obj.versionCode = packageInfo.versionCode;
    process.stdout.write(JSON.stringify(obj));
}

try {
    main();
} catch (e) {
    console.error('Fail to install sdk: ' + e.messgae + '\n' + e.stack);
    process.exit(-1);
}

