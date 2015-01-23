#!/usr/bin/env node
var child_process = require('child_process');
var async = require('async');
var path = require('path');
var fs = require('fs-extra');
var colors = require('colors');


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
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', destPath, 'HEAD', 'worker'], function (err, stdout, stderr) {
        if (err) {
            error('Fail to export worker: ' + err.message);
            return callback(err);
        }
        callback();
    });
}

function exportAdmin(destPath, callback) {
    child_process.execFile('git', ['archive', '--f', 'zip', '-o', destPath, 'HEAD', 'admin'], function (err, stdout, stderr) {
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


function main() {
    process.chdir(path.join(__dirname, '..'));
    var argv = process.argv;
    var version = argv[2];
    if (!version) {
        throw new Error('Must provide version tag');
    }
    var outputPath = path.join(__dirname, '_output_'+version);
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath);
    } else {
    }
    var adminFileName = 'admin'+'.zip';
    var workerFileName = 'worker_'+version+'.zip';
    async.series([
        exportAdmin.bind(null, path.join(outputPath, adminFileName)),
        exportWorker.bind(null, path.join(outputPath, workerFileName)),
        outputManifest.bind(null, version, path.join(outputPath, 'manifest.json')),
        zipAll.bind(null, version, outputPath),
        function (cb) {
            fs.copy(path.join(__dirname, 'install'), outputPath, cb);
        }
    ], function (err) {
        if (err) {
            error('on error: ' + err.message);
        } else {
            info("on finished");
        }
    });
}

main();
