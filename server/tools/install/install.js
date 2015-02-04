#!/usr/bin/env node
var AdmZip = require('./scriptdependant/adm-zip');
var program = require('./scriptdependant/commander');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');

ADMIN_DEFAULT_CFG = {
    "debug": false,
    "admin": {
            "port": "8083",
            "host": "0.0.0.0"
    }
}

function ensureDirExists(p) {
    if (!fs.existsSync(p)) {
        fs.mkdirSync(p);
    }
}

function series (funcs, callback) {
    var rest = funcs.splice(0);
    function cb(err) {
        if (err) {
            return callback(err);
        }
        if (rest.length > 0) {
            var next = rest[0];
            rest = rest.splice(1);
            setImmediate(wrapper, next, arguments.callee);
        } else {
            callback();
        }
    }
    function wrapper (f, cb) {
        try {
            f(cb);
        } catch (err) {
            cb(err);
        }
    }
    var next = rest[0];
    rest = rest.splice(1);
    wrapper(next, cb);
}

function installAdmin(installPath, callback) {
    var dstpath = path.resolve(process.cwd(), installPath);
    if (!dstpath) {
        throw new Error("must provide dstpath");
    }
    var adminPath = path.join(__dirname, 'admin.zip');
    var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
    var adminTargetPath = path.join(dstpath, 'admin-'+manifest.version);;
    var productDir = path.join(dstpath, 'admin_production');
    var backupDir = path.join(dstpath, 'admin_last');
    series([
        function (cb) {
            console.log('checking target path');
            if (fs.existsSync(adminTargetPath)) {
                child_process.exec('rm -rf ' + adminTargetPath, function (err) {
                    cb(err);
                })
            } else {
                cb();
            }
        },
        function (cb) {
            console.log('extracting zip file');
            var zipf = new AdmZip(adminPath);
            zipf.extractAllTo(adminTargetPath, true);
            setImmediate(cb);
        },
        function (cb) {
            console.log('install all dependant');
            var childFolder = path.join(adminTargetPath, 'admin');
            child_process.exec('npm install &> /dev/null', {
                cwd: childFolder,
            }, function (err, stdout, stderr) {
                cb();
            });
        },
        function (cb) {
            console.log('rename to production folder');
            if (fs.existsSync(productDir)) {
                if (fs.existsSync(backupDir)) {
                    child_process.exec('rm -rf ' + backupDir, function (err) {
                        if (err) {
                            return cb(err);
                        }
                        backupNowProduction(cb);
                    });
                } else {
                    backupNowProduction(cb);
                }
            } else {
                renameTargetToProduction(cb);
            }
            function backupNowProduction(cb) {
                fs.rename(productDir, backupDir, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    renameTargetToProduction(cb);
                });
            }
            function renameTargetToProduction (cb) {
                fs.rename(path.join(adminTargetPath, 'admin'), productDir, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    fs.rmdirSync(adminTargetPath);
                    cb();
                })
            }
        },
        function (cb) {
            var productionSymDir = path.join(dstpath, 'admin');
            if (fs.existsSync(productionSymDir)) {
                fs.unlink(productionSymDir);
            }
            fs.symlink(productDir, productionSymDir, cb);
        },
        function (cb) {
            var cfgpath = path.join(dstpath, 'config');
            ensureDirExists(cfgpath);
            ensureDirExists(path.join(dstpath, 'log'));
            ensureDirExists(path.join(dstpath, 'bill'));
            ensureDirExists(path.join(dstpath, 'worker'));
            ensureDirExists(path.join(dstpath, 'sdkplugins'));
            ensureDirExists(path.join(dstpath, 'products'));
            var adminCfgPath = path.join(cfgpath, 'admin.json');
            if (!fs.existsSync(adminCfgPath)) {
                fs.writeFileSync(adminCfgPath, JSON.stringify(ADMIN_DEFAULT_CFG, null, '\t'));
            }
            setImmediate(cb);
        }
    ], function (err) {
        if (err) {
            //console.error(err);
            //console.error(err.stack);
            console.error('Fail to install admin: ' + err);
            callback(err)
            return;
        }
        callback();
        console.log('finished installing admin');
    });
}

function installWorker(version, installPath, installcfg, callback) {
    var scriptPath = path.join(installPath, 'admin', 'script', 'installWorker.js');
    var workerPath = path.join(__dirname, 'worker_' + version.replace()+'.zip');
    var toInstallCfg = installcfg ? 'true' : 'false';
    child_process.exec('node ' + scriptPath + ' ' + workerPath + ' ' + toInstallCfg, {
    }, function (err, stdout, stderr) {
        if (err) {
            console.error(stderr);
        }
        callback(err);
    });
}

function installAllSDKs(installPath, callback) {
    try {
        var sdkpluginPath = path.join(__dirname, 'sdkplugins');
        var commonZip = new AdmZip(path.join(sdkpluginPath, '_common.zip'));
        var targetSDKPath = path.join(installPath, 'sdkplugins');
        var scriptPath = path.join(installPath, 'admin', 'script', 'installSDK.js');
        commonZip.extractAllTo(targetSDKPath, true);
        var pat = /^[a-z].+\.zip$/g
        var items = fs.readdirSync(sdkpluginPath).filter(function (item) {
            return pat.exec(item) != null;
        });
        var funcs = items.map(function (item) {
            return function (cb) {
                child_process.exec('node ' + scriptPath + ' ' + path.join(sdkpluginPath, item), function(err, stdout, stderr) {
                    if (err) {
                        console.error(stderr);
                    }
                    cb(err);
                });
            }
        });
        series(funcs, callback);
    } catch (e) {
        console.error(e);
        return setImmediate(callback, e);
    }
}

function createNew(installPath) {
    var dstpath = path.resolve(process.cwd(), installPath);
    if (!dstpath) {
        throw new Error("must provide dstpath");
    }
    var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
    series([function (cb) {
        installAdmin(installPath, cb);
    }, function (cb) {
        installWorker(manifest.version, installPath, true, cb)
    }, function (cb) {
        installAllSDKs(installPath, cb);
    }], function (err) {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Successfully create new instance at ' + installPath);
    });
}

function main() {
    program
        .usage('[options] bootstrapping chameleon')

    program
        .command('install-new <installPath>')
        .description('create an new chameleon server, it will install all components')
        .action(function (installPath) {
            createNew(installPath);
        });

    program
        .command('install-admin <installPath>')
        .description('install admin server only')
        .action(function (installPath) {
            installAdmin(installPath, function (err) {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log('Successfully install admin server at ' + installPath);
            })
        });

    program
        .command('install-worker <installPath>')
        .description('install worker server only')
        .action(function (installPath) {
            var dstpath = path.resolve(process.cwd(), installPath);
            if (!dstpath) {
                throw new Error("must provide dstpath");
            }
            var manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json')));
            installWorker(manifest.version, installPath, false, function (err) {
                if (err) {
                    console.error(err);
                    return;
                }
                console.log('Successfully install worker server at ' + installPath);
            });
        });

    program.parse(process.argv);

    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }

}

main();
