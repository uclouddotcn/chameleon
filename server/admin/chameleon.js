#!/usr/bin/env node

var program = require('commander');
var pm2 = require('pm2');
var path = require('path');
var fs = require('fs');
var http = require('http');
var child_process = require('child_process');
var Zip = require('adm-zip');

var pidFilePath = path.join(__dirname, '..', 'chameleon.pid');

var PROC_NAME = 'chameleon_admin';

function error(message) {
    console.error(('[ERROR]: '+message).red);
}

function warn(message) {
    console.error(('[WARN]: '+message).yellow);
}

function info(message) {
    console.error(('[INFO]: '+message).green);
}

function runUnderPm2(action) {
    return function () {
        var input = Array.prototype.splice.call(arguments, 0);
        pm2.connect(function (err) {
            if (err) {
                console.error('Fail to execute command: Fail to connect to PM2.')
                return;
            }
            action.apply(null, input);
        });
    }
}


function postRequest (host, port, url, data, callback) {
    var s = JSON.stringify(data);
    var req = http.request({
        port: port,
        hostname: host,
        path: url,
        method: 'POST',
        headers: {
            'Content-type': 'application/json',
            'Content-Length': s.length
        }
    }, function (res) {
        res.setEncoding('utf-8');
        var s = '';
        res.on('data', function (chunk) {
            s += chunk;
        });
        res.on('end', function (chunk) {
            try {
                var obj = JSON.parse(s);
                if (obj.code === 0) {
                    callback();
                } else {
                    callback(new Error("server responds " + JSON.stringify(obj)));
                }
            } catch (e) {
                callback(e);
            }
        });
    });
    req.on('error', function (e) {
        callback(e);
    });
    req.write(s);
    req.end();
}

function main() {
    program
        .usage('[options] [start|stop|active]')
        .option('-f, --force', 'script to execute when the forever process gone')
        .option('-p, --port <port>', 'admin port, default to 8083', Number, 8083)
        .option('-h, --host <host>', 'admin host, default to localhost', String, 'localhost');
    var onDeadFunc = function () {
        if (program.exec) {
            child_process.exec(program.exec);
        }
    };
    var monitors = {
        status: {
            p: '/status'
        },
        event: {
            p: '/event'
        }
    };

    program
        .command('start')
        .description('start the server')
        .option('-d, --debug', 'debug mode')
        .option('-p, --sdkPluginPath <sdkPluginPath>', 'path of sdk plugin')
        .action( runUnderPm2(function (options) {
            pm2.describe('chameleon_admin' , function (err, list) {
                console.log(list)
                if (list && list.length > 0) {
                    var p = list[0];
                    error('process existed as ' + p.pid);
                    return pm2.disconnect();
                }
                var opts = {
                    name: PROC_NAME,
                    rawArgs: ['--'],
                    error: path.join(__dirname, '..', 'chameleon.error'),
                    output:path.join(__dirname, '..', 'chameleon.out')
                };
                if (options.debug) {
                    opts.rawArgs.push('-d');
                }
                if (options.sdkPluginPath) {
                    opts.rawArgs.push('--sdkplugin');
                    opts.rawArgs.push(options.sdkPluginPath);
                }
                console.log(opts);
                pm2.start(path.join(__dirname, 'app.js'), opts, function (err, proc) {
                    if (err) {
                        console.error('Fail to start chameleon from PM2: ' + err);
                        return pm2.disconnect();
                    }
                    return pm2.disconnect();
                    // should check the liveness of the
                    //setTimeout();
                })
            });
        }));

    program
        .command('stop')
        .option('-e, --exec <exec>', 'script to execute when the forever process gone')
        .description('stop the server')
        .action( runUnderPm2(function () {
            pm2.describe(PROC_NAME, function (err, proc) {
                if (err) {
                    warn("Chameleon process is gone. It has already been stopped");
                    return pm2.disconnect();
                }
                var postData = {
                    action: 'stop'
                };
                postRequest(program.host, program.port, '/admin', postData, function (err) {
                    if (err) {
                        error('Fail to close admin server, the server maybe not in right state' + err.message);
                        return pm2.disconnect();
                    }
                    pm2.stop(PROC_NAME, function (err) {
                        if (err) {
                            error('Fail to close admin server, the server maybe not in right state' + err.message);
                        } else {
                            info('Chameleon server is closed');
                        }
                        return pm2.disconnect();

                    });
                });
            });
        }));

    program
        .command('alive')
        .description('check whether the server is alive')
        .action( runUnderPm2(function () {
            pm2.describe(PROC_NAME, function (err, proc) {
                if (err) {
                    warn("Chameleon process is gone. It has already been stopped");
                    return pm2.disconnect();
                }
                var postData = {
                    action: 'stop'
                };
                postRequest(program.host, program.port, '/admin', postData, function (err) {
                    if (err) {
                        error('Fail to close admin server, the server maybe not in right state' + err.message);
                        return pm2.disconnect();
                    }
                    pm2.stop(PROC_NAME, function (err) {
                        if (err) {
                            error('Fail to close admin server, the server maybe not in right state' + err.message);
                        } else {
                            info('Chameleon server is closed');
                        }
                        return pm2.disconnect();

                    });
                });
            });
        }));

    program
        .command('monitor <type>')
        .description('monitor the server status')
        .action( function (type) {
            var t = monitors[type];
            if (!t) {
                console.error("Illegal arguments. moitor event or monitor status");
                process.exit(-1);
                return;
            }
            var req = http.request({
                port: program.port,
                hostname: program.host,
                path: '/monitor'+ t.p
            }, function (res) {
                res.setEncoding('utf-8');
                var s = '';
                res.on('data', function (chunk) {
                    s += chunk;
                });
                res.on('end', function (chunk) {
                    console.log(s);
                });
            });
            req.on('error', function (e) {
                process.exit(-1);
            });
            req.end();
        });

    program
        .command('up-product <zipfile>')
        .description('monitor the server status')
        .action(function (filepath) {
            try {
                var zipfile = new Zip(filepath);
                var manifest = JSON.parse(zipfile.readAsText("manifest.json"));
                var product = manifest.product;
                var productCfg = JSON.parse(zipfile.readAsText(product+'/_product.json', 'utf8'));
                postRequest(program.host, program.port, '/product/'+product, productCfg, function (err) {
                    if (err) {
                        console.error('Fail to upgrade project: ' + err.message);
                        process.exit(-1);
                    }
                    var entries = zipfile.getEntries();
                    for (var i = 0; i < entries.length; ++i) {
                        var e = entries[i];
                        if (e.isDirectory || e.entryName.substr(0, product.length+1) !==  product+'/' || e.name === '_product.json') {
                            continue;
                        }
                        var c = zipfile.readAsText(e.entryName, 'utf8');
                        console.log(e.entryName)
                        var channelName = path.basename(e.name, '.json');
                        postRequest(program.host, program.port, '/product/'+product+'/'+channelName, JSON.parse(c), function (err) {
                            if (err) {
                                console.error("Fail to upgrade channel " + channelName + ': ' + err.message);
                                return;
                            }
                            console.log("Successfully upgrade channel " + channelName);
                        });
                    }
                });
            } catch (e) {
                console.error("invalid zip file: " + e.message);
                console.error(e.stack);
            }
        });

    program
        .command('add-plugin <fileurl>')
        .description('monitor the server status')
        .action(function (fileurl) {
            try {
                postRequest(program.host, program.port, '/plugin', {fileurl: fileurl}, function (err) {
                    if (err) {
                        console.error('Fail to add plugin: ' + err.message);
                        process.exit(-1);
                    }
                    console.log('successful add plugin');
                });
            } catch (e) {
                console.error("invalid zip file: " + e.message);
            }
        });

    program
        .command('*')
        .description('show help')
        .action(function () {
            console.log('unknown command');
            program.help();
        });

    if (process.argv.length === 2) {
        program.help();
    } else {
        program.parse(process.argv);
    }
}


main();

