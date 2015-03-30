#!/usr/bin/env node

var program = require('commander');
var pm2 = require('pm2');
var path = require('path');
var fs = require('fs');
var http = require('http');
var child_process = require('child_process');
var util = require('util');
var constants = require('./lib/constants');
var Encryption = require('./lib/encryption');

var PROC_NAME = 'chameleon_admin';
var BASE_DIR = path.join(__dirname, '..');
var BUNYAN_SCRIPT=  path.join(__dirname, 'node_modules', 'bunyan', 'bin', 'bunyan');

function error(message) {
    console.error(('[ERROR]: '+message));
}

function warn(message) {
    console.error(('[WARN]: '+message));
}

function info(message) {
    console.log(('[INFO]: '+message));
}

function runUnderPm2(action) {
    return function () {
        var input = Array.prototype.splice.call(arguments, 0);
        pm2.connect(function (err) {
            if (err) {
                error('Fail to execute command: Fail to connect to PM2.')
                return;
            }
            action.apply(null, input);
        });
    }
}

var adminSvr = {
    host: 'localhost',
    port: 8083
};

function initAdmin(host, port) {
    adminSvr.host = host || adminSvr.host;
    adminSvr.port = port || adminSvr.port;
}

function startWorker(version, callback) {
    var postObj = {
       version: version
    };
    postRequest(adminSvr.host, adminSvr.port, '/worker/start', postObj, function (err, obj) {
        if (err) {
            return callback(err);
        }
        return callback(null, obj);
    })
}

function installWorker(p, callback) {
    var postObj = {
        workerzipFile: p
    };
    postRequest(adminSvr.host, adminSvr.port, '/worker/install', postObj, function (err, obj) {
        if (err) {
            return callback(err);
        }
        return callback(null, obj);
    });
}

function installProduct(p, callback) {
    var postObj = {
        zipfile: p
    };

    postRequest(adminSvr.host, adminSvr.port, '/product', postObj, function (err, obj) {
        if (err) {
            return callback(err);
        }
        return callback(null, obj);
    });
}

function postRequest (host, port, url, data, method, callback) {
    var s = JSON.stringify(data);
    if (typeof method === 'function') {
        callback = method;
        method = 'POST';
    }
    var req = http.request({
        port: port,
        hostname: host,
        path: url,
        method: method,
        headers: {
            'Content-type': 'application/json',
            'Content-Length': s.length
        }
    }, function (res) {
        res.setEncoding('utf-8');
        res.setTimeout(1000);
        var s = '';
        res.on('data', function (chunk) {
            s += chunk;
        });
        res.on('end', function (chunk) {
            if (s.length === 0) {
                return callback(null, null);
            }
            try {
                var obj = JSON.parse(s);
                if (res.statusCode != 200) {
                    callback(new Error(s));
                } else {
                    callback(null, obj);
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

function pushProduct (productName, host, port, callback){
    try{
        var product = fs.readFileSync(path.join(constants.productDir, productName));
        var encryption = new Encryption(path.join(constants.baseDir, 'config', 'key'));
        product = encryption.encrypt(product.toString());
    }catch (e){
        return callback(e);
    }

    postRequest(host, port, '/product', {product: encodeURIComponent(product)}, function(err, result){
        if(err){
            return callback(err);
        }
        callback(null, result);
    });
}

function main() {
    program
        .usage('[options] ')
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
                        error: path.join(__dirname, '..', 'log', 'chameleon.error'),
                        output:path.join(__dirname, '..', 'log', 'chameleon.out')
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
                    try {
                        pm2.start(path.join(__dirname, 'app.js'), opts, function (err, proc) {
                            if (err) {
                                error('Fail to start chameleon from PM2: ' + err);
                                return pm2.disconnect();
                            }
                            pm2.disconnect();
                            var postData = {
                                action: 'info'
                            };
                            setTimeout(function () {
                                fetchInfo();
                            }, 1100);
                            var retrytimes = 3;
                            function fetchInfo () {
                                postRequest(program.host, program.port, '/admin', postData, function (err, obj) {
                                    if (err) {
                                        retrytimes--;
                                        if (retrytimes < 0) {
                                            error('Fail to start admin server');
                                        } else {
                                            setTimeout(fetchInfo(), 1100);
                                        }
                                    } else {
                                        if (obj.worker.forkScripts && obj.status !== 'running') {
                                            retrytimes--;
                                            if (retrytimes < 0) {
                                                error('successfully start admin server, however worker fails to start');
                                            } else {
                                                setTimeout(fetchInfo(), 1100);
                                            }
                                        } else {
                                            info('Admin started');
                                        }
                                    }
                                });
                            }
                        });
                    } catch (e) {
                        error('Fail to start server ' + e.message);
                    }
                }
            });
        }));

    program
        .command('start-worker <version>')
        .description('start the worker')
        .action( function (version) {
            startWorker(version, function (err, obj) {
                if (err) {
                    return error('Fail to start worker: ' + err.message);
                }
                info("Successful start worker: " + JSON.stringify(obj, null, '\t'));
            });
        });

    program
        .command('restart-worker')
        .action(function () {
            var postData = {
                action: 'restart'
            };
            postRequest(program.host, program.port, '/admin', postData, function (err) {
                if (err) {
                    error('Fail to connect to admin server, the server maybe not in right state' + err.message);
                    return;
                }
                info('Done');
            });
        });

    program
        .command('install-worker <workerZipFile>')
        .option('-s, --start', 'start worker after install')
        .description('start the worker')
        .action( function (workerZipFile, options) {
            installWorker(workerZipFile, function (err, obj) {
                if (err) {
                    return error('Fail to install worker: ' + err.message + '\n' + err.stack);
                }
                info("Successful install worker: " + JSON.stringify(obj, null, '\t'));
                if (options.start) {
                    info("trying start worker");
                    startWorker(info.version, function (err, obj) {
                        if (err) {
                            return error('Fail to start worker: ' + err.message);
                        }
                        info("Successful start worker: " + JSON.stringify(info, null, '\t'));
                    });
                }
            });
        });

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
                        info(JSON.stringify(obj));
                    }
                    return pm2.disconnect();
                });
            });
        }));

    program
        .command('log [type]')
        .description('show log of type [admin|worker]')
        .action(function (_type) {
            _type = _type || 'admin';
            var logfile = null;
            switch (_type) {
                case 'admin':
                    logfile = path.join(BASE_DIR, 'log', 'adminsvr.log');
                    break;
                case 'worker':
                    logfile = path.join(BASE_DIR, 'log', 'server.log');
                    break;
                default:
                    error('log type must be admin or worker');
                    return;
            }
            if (!fs.existsSync(logfile)) {
                info('log file is empty');
                return;
            }
            child_process.exec('tail -n50 ' + logfile + ' | ' + BUNYAN_SCRIPT, function (err, stdout, stderr) {
                console.log(stdout);
            });
        });

    program
        .command('add-product <zipfile>')
        .description('add product')
        .action(function (filepath) {
            try {
                filepath = path.resolve(process.cwd(), filepath);
                installProduct(filepath, function (err) {
                    if (err) {
                        error('Fail to install products: ' + err.message + '\n' + err.stack);
                        return;
                    }
                    info('Done');
                })
            } catch (e) {
                error("invalid zip file: " + e.message);
                error(e.stack);
            }
        });

    program
        .command('add-sdk <fileurl>')
        .description('add sdk')
        .action(function (fileurl) {
            var fileurl = path.resolve(process.cwd(), fileurl);
            try {
                postRequest(program.host, program.port, '/sdk', {fileurl: fileurl}, function (err, obj) {
                    if (err) {
                        error('Fail to add sdk: ' + err.message);
                        process.exit(-1);
                    }
                    info('successful add sdk: ' + JSON.stringify(obj));
                });
            } catch (e) {
                error("invalid zip file: " + e.message);
            }
        });

    program
        .command('use-sdk <name> <version>')
        .description('add sdk')
        .action(function (name, version) {
            postRequest(program.host, program.port, '/sdk/'+name, {version: version}, 'PUT', function (err) {
                if (err) {
                    error('Fail to use sdk: ' + err.message);
                    process.exit(-1);
                }
                info('successful add sdk: ' + JSON.stringify(obj));
            });
        });

    program
        .command('*')
        .description('show help')
        .action(function () {
            error('unknown command');
            program.help();
        });

    program
        .command('push <productName> <host> <port>')
        .description('push product')
        .action(function(productName, host, port){
            pushProduct(productName, host, port, function(err, result){
                if(err){
                    error('Fail to push product: ' + err.message);
                    process.exit(-1);
                }
                info(result);
            });
        });

    if (process.argv.length === 2) {
        program.help();
    } else {
        program.parse(process.argv);
        initAdmin(program.host, program.port);
    }
}


main();

