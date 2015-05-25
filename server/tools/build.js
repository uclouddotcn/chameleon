#!/usr/bin/env node
var child_process = require('child_process');
var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var colors = require('colors');
var program = require('commander');
var npm  = require('npm');

var PROJ_PATH = path.join(__dirname, '..');

function Build() {
    this.tempDir = path.join(process.cwd(), '.build');
    this.outputDir = path.join(process.cwd(), 'output')
    this.buildFull = false;
    if (fs.existsSync(this.tempDir)) {
        // removing the directory
        fs.removeSync(this.tempDir)
    }
    fs.mkdirsSync(this.tempDir);
}

Build.prototype.parseOption = function(option) {
    if (option.output) {
        this.outputDir = path.resolve(option.output);
    }
    fs.ensureDirSync(this.outputDir);
    if (option.full) {
        this.buildFull = true;
    }
};

Build.prototype.buildPackage = function (packageName, fullBuild, outputPath, callback) {
    var packagePath = path.join(PROJ_PATH, packageName);
    var gabage = [];
    var installPath = null;
    var tarFile = null;
    var opts = {};
    var self = this;
    var outputFile = null;
    if (!fullBuild) {
        opts["ignore-scripts"] = true;
    }
    npm.load(opts, function (err){
        if (err) {
            return callback(err);
        }
        async.series([
            function (cb) {
                npm.commands.pack([packagePath], true, function (err, fileName) {
                    if (err) {
                        return cb(err);
                    }
                    tarFile = fileName[0];
                    outputFile = path.resolve(outputPath, path.basename(tarFile, '.tgz')+'.zip');
                    gabage.push(path.resolve(tarFile));
                    cb(null)
                });
            },
            function (cb) {
                installPath = path.join(self.tempDir, packageName);
                fs.mkdirsSync(installPath);
                child_process.exec('tar xf ' + tarFile + ' -C '+ installPath + ' --strip-components=1', function (err, stdout, stderr){
                    if (err) {
                        error('Fail to export package ' + packageName + ': ' + err.message);
                        return cb(err);
                    }
                    cb(null);
                });
            },
            function (cb) {
                npm.commands.install(installPath, [], cb);
            },
            function (cb) {
                if (self.buildFull) {
                    // mark the full build
                    fs.writeJSONFileSync(path.join(installPath, 'release.json'), {});
                }
                child_process.exec('zip -r ' + outputFile + ' * > /dev/null', {
                    cwd: installPath
                }, function (err, stdout, stderr) {
                    if (err) {
                        error('Fail to export package ' + packageName + ': ' + err.message);
                        error(err)
                        return cb(err);
                    }
                    cb(null);
                });
            }
        ], function (err) {
            for (var i = 0; i < gabage.length; ++i) {
                fs.removeSync(gabage[i]);
            }
            callback(err);
        });
    });
};

Build.prototype.buildWorker = function () {
    this._buildWorker(this.outputDir, function (err) {
        if (err) {
            return error("Fail to build worker " + err.message);
        }
        info("Build Worker Done");
    });
};

Build.prototype._buildAdmin = function (folder, cb) {
    info("start building admin");
    this.buildPackage('admin', this.buildFull, folder, cb);
};

Build.prototype._buildWorker = function (folder, cb) {
    info("start building worker");
    this.buildPackage('worker', this.buildFull, folder, cb);
};

Build.prototype._exportAllPlugins = function (folder, callback) {
    fs.ensureDirSync(folder);
    var srcPath = path.join(PROJ_PATH, 'sdkplugins');
    var items = fs.readdirSync(srcPath);
    var funcs = items.filter(function (item) {
        return fs.statSync(path.join(srcPath, item)).isDirectory() &&
            item.substr(0, 1) !== '_' &&
            item.substr(0, 1) !== '.';
    }).map(function (item) {
        return function (cb) {
            exportSDK(item, folder, cb);
        }
    });
    async.parallelLimit(funcs, 5, function (err) {
        if (err) {
            return callback(err);
        }
        exportSDKCommon(folder, function (e) {
            callback(e);
        });
    });
};

Build.prototype.buildAll = function (version) {
    var outputPath = path.join(this.tempDir, 'output');
    if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(outputPath);
    } else {
        fs.removeSync(outputPath);
        fs.mkdirSync(outputPath);
    }
    var sdkOutputPath = path.join(outputPath, 'sdkplugins');
    async.series([
        this._buildAdmin.bind(this, outputPath),
        this._buildWorker.bind(this, outputPath),
        outputManifest.bind(null, version, path.join(outputPath, 'manifest.json')),
        this._exportAllPlugins.bind(this, sdkOutputPath),
        function (cb) {
            fs.copy(path.join(__dirname, 'install'), outputPath, cb);
        },
        zipAll.bind(null, version, outputPath)
    ], function (err) {
        if (err) {
            error('on error: ' + err.message + ': \n'  + err.stack);
        } else {
            info("on finished");
        }
    });
};


function error(message) {
    console.error(('[ERROR]: '+JSON.stringify(message)).red);
}

function warn(message) {
    console.error(('[WARN]: '+message).yellow);
}

function info(message) {
    if (message instanceof Object) {
        message = JSON.stringify(message);
    }
    console.error(('[INFO]: '+message).green);
}

function exportWorker(destPath, callback) {
    info('export worker');
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', destPath, 'HEAD', 'worker'], {
        cwd: path.join(__dirname, '..')
    }, function (err, stdout, stderr){
        if (err) {
            error('Fail to export worker: ' + err.message);
            return callback(err);
        }
        callback();
    });
}

function exportAdmin(destPath, callback) {
    info('export admin');
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', destPath, 'HEAD', 'admin'], {
        cwd: path.join(__dirname, '..')
    }, function (err, stdout, stderr) {
        if (err) {
            error('Fail to export worker: ' + err.message);
            return callback(err);
        }
        callback();
    });
}

function outputManifest(version, dest, callback) {
    info('output manifest');
    var manifest = {
        version: version
    };
    fs.writeFile(dest, JSON.stringify(manifest, 4), callback);
}

function zipAll(version, dirToZip, callback) {
    info('zip all');
    var sversion = version.replace(/\./g, '_');
    var dest = path.join(__dirname, 'chameleon_'+sversion+'.zip');
    child_process.exec('rm -f ' +dest + '&& zip -r '+dest+ ' *', {
        cwd: dirToZip
    }, callback);
}

function exportSDK(sdkname, folder, callback) {
    info('export SDK ' + sdkname);
    var srcPath = path.join(__dirname, '..', 'sdkplugins');
    var packageName = path.join(srcPath, sdkname, 'package.json');
    try {
        var d = require(packageName);
    } catch (e) {
        throw new Error('Fail to find sdk ' + sdkname);
    }
    var v = d.version;
    var targetName = path.resolve(folder, sdkname+'_'+ v.replace(/\./g, '_')+'.zip');
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', targetName, 'HEAD', sdkname], {
        cwd: srcPath
    }, function (err, stdout, stderr){
        callback(err, targetName);
    });
}

function exportSDKCommon(folder, callback) {
    var srcPath = path.join(__dirname, '..', 'sdkplugins');
    var targetName = path.resolve(folder, '_common.zip');
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', targetName, 'HEAD', '_common'], {
        cwd: srcPath
    }, function (err, stdout, stderr){
        callback(err, targetName);
    });
}

function buildSDKPlugin(sdkname, folder) {
    folder = folder || process.cwd();
    exportSDK(sdkname, folder, function (err, targetName) {
        if (err) {
            error('Fail to export sdk: ' + err.message);
            return;
        }
        info('export sdk ' + sdkname + ' to ' + targetName);
    })
}


function main() {
    var b = new Build();
    program
        .usage('[option] build the server');

    program
        .command('buildall <version>')
        .description('build all, admin, worker, sdkplugins')
        .option('-o,--output <folder>', 'output folder')
        .option('-f,--full', 'fully build(including building the native module)')
        .action(function (version, option) {
            b.parseOption(option);
            b.buildAll(version);
        });

    program
        .command('build-sdk <sdkname>')
        .description('build sdkplugin')
        .option('-o,--output <folder>', 'output folder')
        .option('-f,--full', 'fully build(including building the native module)')
        .action(function (sdkname, option) {
            buildSDKPlugin(sdkname, option.output);
        });

    program
        .command('build-worker')
        .description('build worker')
        .option('-o,--output <folder>', 'output folder')
        .option('-f,--full', 'fully build(including building the native module)')
        .action(function (option) {
            b.parseOption(option);
            b.buildWorker();
        });

    program.parse(process.argv);

    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }
}

main();
