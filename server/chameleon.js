#!/usr/bin/env node

var program = require('commander');
var forever = require('forever');
var path = require('path');
var fs = require('fs');
var http = require('http');
var child_process = require('child_process');
var Zip = require('adm-zip');

var pidFilePath = path.join(__dirname, '..', 'chameleon.pid');


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
        .action( function () {
            forever.list(null, function (err, data) {
                var started = false;
                if (data != null) {
                    started = data.filter(function (obj) {
                        return obj.pidFile === pidFilePath;
                    }).length > 0;
                }
                if (!started) {
                    var child = forever.startDaemon('app.js', {
                        pidFile: pidFilePath,
                        minUptime: 2000,
                        spinSleepTime: 1000,
                        killSignal: 'SIGTERM',
                        logFile: path.join(__dirname, '..', 'forever.log'),
                        outFile: path.join(__dirname, '..', 'forever.out'),
                        errFile: path.join(__dirname, '..', 'forever.err')
                    });
                    forever.startServer(child);
                } else {
                    console.error("the pid file " + pidFilePath + ' exists! The server might be already up');
                    return;
                }
            })
        });


    program
        .command('stop')
        .option('-e, --exec <exec>', 'script to execute when the forever process gone')
        .description('stop the server')
        .action( function () {
            if (!fs.existsSync(pidFilePath)) {
                console.log('server already dead');
                return;
            }
            var t = parseInt(fs.readFileSync(pidFilePath, 'utf-8'));
            forever.list (null, function (err, data) {
                if (err) {
                    console.log('done');
                    return;
                }
                if (!data || data.length === 0) {
                    onDeadFunc();
                    console.log('done');
                    return;
                }
                for (var i in data) {
                    if (data[i].pidFile === pidFilePath) {
                        var e = forever.stop(i);
                        e.on('stop', function () {
                            console.log('done');
                        })
                    }
                }
            });
        });

    program
        .command('alive')
        .description('check whether the server is alive')
        .action( function () {
            try {
                var t = parseInt(fs.readFileSync(pidFilePath, 'utf-8'));
                var l = forever.list (null, function (err, data) {
                    if (err) {
                        onDeadFunc();
                        console.log('dead (' + err.message + ')');
                        return;
                    }
                    if (!data || data.length === 0) {
                        onDeadFunc();
                        console.log('dead');
                        return;
                    }
                    for (var i in data) {
                        if (data[i].pidFile === pidFilePath) {
                            if (data[i].running) {
                                console.log('running');
                            } else {
                                console.log('restarting');
                            }
                            return;
                        }
                    }
                    console.log('dead');
                });
            } catch (e) {
                onDeadFunc();
                console.log('dead');
            }
        });

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

