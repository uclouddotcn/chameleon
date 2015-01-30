var AdmZip = require('adm-zip');
var child_process = require('child_process');
var fs = require('fs');
var path = require('path');
var versionparser = require(path.join(__dirname, '..', 'lib', 'versionparser'));
var toVersionCode = versionparser.getVersionCode;
var genDefaultWorkerCfg = versionparser.genDefaultWorkerCfg;
var baseDir = path.join(__dirname, '..', '..');
var workerDir = path.join(baseDir, 'worker');

function main(callback) {
    var workerzip = process.argv[2];
    var toInstallCfg = process.argv[3];
    var zipf = new AdmZip(workerzip);
    var packageContent = JSON.parse(zipf.readAsText('worker/package.json'));
    var versionCode = toVersionCode(packageContent.version);
    var tmpFolder = path.join(workerDir, 'tmp-'+versionCode);
    var targetFolder = path.join(workerDir, versionCode.toString());
    zipf.extractAllTo(tmpFolder, true);
    child_process.exec('node ' + path.join(tmpFolder, 'worker', 'bootstrap.js'), function (err, stdout, stderr) {
        if (err) {
            console.error(stderr);
            console.error(err.stack);
            callback(err);
            return;
        }
        fs.rename(tmpFolder, targetFolder, function (err) {
            if (err) {
                return callback(err);
            }
            if (toInstallCfg === 'true') {
                var cfg = genDefaultWorkerCfg(packageContent.version);
                fs.writeFileSync(path.join(baseDir, 'config', 'worker.json'), JSON.stringify(cfg, null, '\t'));
            }
            callback(null, err);
        });
    });
}


try {
    main(function (err, targetFolder) {
        if (err) {
            console.error(err.message);
            console.error(err.stack);
            return process.exit(-1);
        }
        // NOTICE: should only log this information to stdout
        //         otherwise, other dependant script will not function properly
        console.log(targetFolder); // other script will use this output
        process.exit(0);
    });
} catch (err) {
    console.error(err.message);
    console.error(err.stack);
    process.exit(-1)
}


