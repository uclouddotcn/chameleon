var Zip = require('adm-zip');
var pathLib = require('path');
var url = require('url');
var fs = require('fs');
var os = require('os');
var Http = require('http');
var crypto = require('crypto');


function downloadFile(fileurl, md5value, callback) {
    var urlInfo = url.parse(fileurl);
    if (urlInfo.protocol === 'file:') {
        console.error(urlInfo.pathname)
        callback(null, urlInfo.pathname);
    } else if (urlInfo.protocol === 'http:') {
        Http.get(urlInfo, function(res) {
            var md5sum = crypto.createHash('md5');
            var tmpfile = pathLib.join(os.tmpDir(), 'chameleon_sdk_plugin'+Date.now()+'.zip');
            var f = fs.createWriteStream(tmpfile, 'w');
            res.on('data', function (d) {
                f.write(d);
                md5sum.update(d);
            });
            res.on ('end', function () {
                var d = md5sum.digest('hex');
                if (md5value && d !== md5value) {
                    callback(new Error('md5 not matched'));
                } else {
                    f.end();
                    console.error(tmpfile);
                    callback(null, tmpfile);
                }
            });
        }).on('error', function(e) {
            callback(e);
        });
    } else {
        throw new Error('non support protocol ' + urlInfo.protocol);
    }
}


function main() {
    var fileurl = process.argv[2];
    var md5value = process.argv[3];
    var sdkPluginPath = process.argv[4];
    downloadFile(fileurl, md5value, function (err, filepath) {
        if (err) {
            console.error(err);
            return process.exit(-3);
        }
        try {
            var src = new Zip(filepath);
            var content = JSON.parse(src.readAsText('package.json'));
            if (!content.name || !content.version) {
                return process.exit(-1);
            }
            console.error(content);
            var targetPath = pathLib.join(sdkPluginPath, content.name+'-'+content.version);
            console.error(targetPath);
            if (fs.existsSync(targetPath)) {
                return process.exit(-2);
            }
            src.extractAllTo(targetPath, true);
            process.stdout.write(new Buffer(JSON.stringify(content)), function () {
                return process.exit(0);
            });
        } catch (e) {
            console.error(e);
            process.exit(-4);
        }
    });
}

if (require.main === module) {
    try {
        main();
    } catch (e) {
        console.error(e.stack);
        console.error(e);
        process.exit(-1);
    }
}
