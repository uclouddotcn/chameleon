#!/usr/bin/env node

var program = require('commander');
var pm2 = require('pm2');
var path = require('path');
var fs = require('fs');
var http = require('http');
var child_process = require('child_process');
var util = require('util');
var Zip = require('adm-zip');

var PROC_NAME = 'chameleon_admin';

function error(message) {
    console.error(('[ERROR]: '+message).red);
}

function warn(message) {
    console.error(('[WARN]: '+message).yellow);
}

function info(message) {
    if (message instanceof Object) {
        message = JSON.stringify(message, null, '\t');
    }
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
                    callback(null, obj.msg);
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
    var monitors = {
        status: {
            p: '/status'
        },
        event: {
            p: '/event'
        }
    };

    program
        .command('init <adminport>')
        .description('init admin server')
        .option('-d, --debug', 'debug mode')
        .option('-h, --host <adminhost>', 'admin host to bind, [default to 0.0.0.0]')
        .option('-o, --override', 'force override old config')
        .action(function (adminport, options) {
            var cfgpath = path.join(__dirname, '..', 'config', 'admin.json');
            if (!options.override && fs.existsSync(cfgpath)) {
                error('Old config exists. If you want to override, please use -f to override');
                process.exit(-1);
            }
            var admincfg = {
                debug: options.debug,
                admin: {
                    "port" : adminport,
                    "host": options.adminhost || '0.0.0.0'
                }
            };
            fs.writeFileSync(cfgpath, JSON.stringify(admincfg, null, '\t'));
            info('Init adminsvr done')
        });

    program
        .command('start')
        .description('start the server')
        .option('-d, --debug', 'debug mode')
        .option('-p, --sdkPluginPath <sdkPluginPath>', 'path of sdk plugin')
        .action( runUnderPm2(function (cmd) {
            var options = cmd;
            pm2.describe('chameleon_admin' , function (err, list) {
                if (list && list.length > 0) {
                    var p = list[0];
                    if (p.pm2_env.status === 'online') {
                        error('process existed as ' + p.pid + ', status ' + p.pm2_env.status);
                        return pm2.disconnect();
                    } else if (p.pm2_env.status === 'stopped') {
                        startServer();
                    } else {
                        pm2.stop(PROC_NAME, function (err) {
                            if (err) {
                                error('Chameleon process is in ill state and can\'t be stopped ' + p.pid);
                                return;
                            }
                            startServer();
                        });
                    }
                } else {
                    startServer();
                }
                function startServer() {
                    var opts = {
                        name: PROC_NAME,
                        rawArgs: ['--'],
                        error: path.join(__dirname, '..', 'chameleon.error'),
                        output:path.join(__dirname, '..', 'chameleon.out')
                    };
                    if (options.debug) {
                        info('using debug mode') ;
                        opts.rawArgs.push('-d');
                    }
                    if (options.sdkPluginPath) {
                        info('set sdk plugin path ' + options.sdkPluginPath) ;
                        opts.rawArgs.push('--sdkplugin');
                        opts.rawArgs.push(options.sdkPluginPath);
                    }
                    info('starting with opts ' + opts.rawArgs);
                    try {
                        pm2.start(path.join(__dirname, 'app.js'), opts, function (err, proc) {
                            info('starting with opts ' + opts.rawArgs);
                            if (err) {
                                error('Fail to start chameleon from PM2: ' + err);
                                return pm2.disconnect();
                            }
                            return pm2.disconnect();
                            // should check the liveness of the
                            //setTimeout();
                        });
                    } catch (e) {
                        error('Fail to start server ' + e.message);
                    }
                }
            });
        }));

    program
        .command('stop')
        .description('stop the server')
        .action( runUnderPm2(function () {
            pm2.describe(PROC_NAME, function (err, proc) {
                if (err) {
                    warn("Chameleon process is gone. It has already been stopped");
                    return pm2.disconnect();
                }
                if (!proc || proc.length == 0) {
                    warn("Chameleon process is gone. It has already been stopped");
                    return pm2.disconnect();
                }
                var status = proc[0].pm2_env.status;
                if (status === 'stopped') {
                    info('Chameleon process is already stopped');
                    return pm2.disconnect();
                }
                if (status !== 'online') {
                    info('Chameleon process is ill state: ' + status);
                    info('force closing');
                    pm2.stop(PROC_NAME, function (err) {
                        if (err) {
                            error('Fail to close admin server, the server maybe not in right state' + err.message);
                        } else {
                            info('Chameleon server is closed');
                        }
                        return pm2.disconnect();

                    });
                    return;
                }
                var postData = {
                    action: 'stop'
                };
                postRequest(program.host, program.port, '/admin', postData, function (err) {
                    if (err) {
                        error('Fail to close admin server, the server maybe not in right state' + err.message);
                        error('forcing close');
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
        .option('-e, --exec <exec>', 'script to execute when the forever process gone')
        .action( runUnderPm2(function (options) {
            var stopExec = options.exec;
            function onStop() {
                if (stopExec) {
                    child_process.exec(stopExec, function (err) {
                    });
                }
            }
            pm2.describe(PROC_NAME, function (err, proc) {
                if (err ) {
                    warn("Chameleon process is gone. It has already been stopped");
                    onStop();
                    return pm2.disconnect();
                }
                var postData = {
                    action: 'info'
                };
                postRequest(program.host, program.port, '/admin', postData, function (err, obj) {
                    if (err) {
                        error('Fail to get info from chameleon server, maybe dead: ' + err.message);
                        onStop();
                    } else {
                        info(obj);
                    }
                    return pm2.disconnect();
                });
            });
        }));

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

