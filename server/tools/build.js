#!/usr/bin/env node
var child_process = require('child_process');
var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var colors = require('colors');
var program = require('commander');


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
    var manifest = {
        version: version
    };
    fs.writeFile(dest, JSON.stringify(manifest, 4), callback);
}

function zipAll(version, dirToZip, callback) {
    var sversion = version.replace(/\./g, '_');
    var dest = path.join(__dirname, 'chameleon_'+sversion+'.zip');
    child_process.exec('zip -j -r '+dest+ ' ' + dirToZip, callback);
}

function buildAll(version) {
    var outputPath = path.join(__dirname, '_output_'+version);
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    } else {
    }
    var adminFileName = 'admin'+'.zip';
    var workerFileName = 'worker_'+version+'.zip';
    var sdkOutputPath = path.join(outputPath, 'sdkplugins');
    async.series([
        exportAdmin.bind(null, path.join(outputPath, adminFileName)),
        exportWorker.bind(null, path.join(outputPath, workerFileName)),
        outputManifest.bind(null, version, path.join(outputPath, 'manifest.json')),
        exportAllPlugins.bind(null, sdkOutputPath),
        zipAll.bind(null, version, outputPath),
        function (cb) {
            fs.copy(path.join(__dirname, 'install'), outputPath, cb);
        }
    ], function (err) {
        if (err) {
            error('on error: ' + err.message + ': \n'  + err.stack);
        } else {
            info("on finished");
        }
    });
}

function buildWorker(version, outputf) {
    var workerFileName = outputf || path.join(process.cwd(), 'worker_'+version+'.zip');
    exportWorker(workerFileName, function (err) {
        if (err) {
            error('on error: ' + err.message);
        } else {
            info("output worker to " + workerFileName);
        }
    });
}

function exportSDK(sdkname, folder, callback) {
    var srcPath = path.join(__dirname, '..', 'sdkplugins');
    var packageName = path.join(srcPath, sdkname, 'package.json');
    try {
        var d = require(packageName);
    } catch (e) {
        throw new Error('Fail to find sdk ' + sdkname);
    }
    var v = d.version;
    var targetName = path.join(folder, sdkname+'_'+ v.replace(/\./g, '_')+'.zip');
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', targetName, 'HEAD', sdkname], {
        cwd: srcPath
    }, function (err, stdout, stderr){
        callback(err, targetName);
    });
}

function exportSDKCommon(folder) {
    var srcPath = path.join(__dirname, '..', 'sdkplugins');
    var targetName = path.join(folder, '_common.zip');
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', targetName, 'HEAD', '_common'], {
        cwd: srcPath
    }, function (err, stdout, stderr){
        callback(err, targetName);
    });
}

function exportAllPlugins (folder, callback) {
    fs.ensureDirSync(folder);
    var srcPath = path.join(__dirname, '..', 'sdkplugins');
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
        exportSDKCommon(folder);
        callback(err);
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
    program
        .usage('[option] build the server');

    program
        .command('buildall <version>')
        .description('build all, admin, worker, sdkplugins')
        .action(buildAll);

    program
        .command('build-sdk <sdkname>')
        .description('build sdkplugin')
        .option('-o,--output <folder>', 'output folder')
        .action(function (sdkname, option) {
            buildSDKPlugin(sdkname, option.folder);
        });

    program
        .command('build-worker <version>')
        .description('build worker')
        .option('-o,--output <filepath>', 'output file name')
        .action(function (version, option) {
            buildWorker(version, option.filepath);
        });

    program.parse(process.argv);

    if (!process.argv.slice(2).length) {
        program.outputHelp();
    }
}

main();
