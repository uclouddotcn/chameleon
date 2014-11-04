#!/usr/bin/env node

var program = require('commander');
var forever = require('forever');
var path = require('path');
var fs = require('fs');
var http = require('http');
var child_process = require('child_process');

var pidFilePath = path.join(__dirname, '..', 'chameleon.pid');

function main() {
    program
        .usage('[options] [start|stop|active]')
        .option('-e, --exec <exec>', 'script to execute when the forever process gone')
        .option('-f, --force', 'script to execute when the forever process gone')
        .option('-p, --port <port>', 'admin port, default to 8083')
        .parse(process.argv);
    if (program.args.length < 1) {
        console.error('must provide command');
        program.help();
        return;
    }
    program.on('--help', function () {
        console.log('Commands: ');
        console.log('   start:  start the process');
        console.log('   stop [-f]:   stop the process ');
        console.log('   active [-e YOUR_COMMANDS]: test if the process is active');
    });
    var onDeadFunc = function () {
        if (program.exec) {
            child_process.exec(program.exec);
        }
    };
    var a = {t: 123};
    var port = program.port || 8083;
    var monitors = {
        status: {
            p: '/status'
        },
        event: {
            p: '/event'
        }
    };

    var supportFuncs = {};
    supportFuncs.start = function () {
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
    };

    supportFuncs.stop = function () {
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
    };

    supportFuncs.active = function () {
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
    };

    supportFuncs.monitor = function (args) {
        if (args.length <= 0) {
            console.error("Illegal arguments. moitor event or monitor status");
            process.exit(-1);
            return;
        }
        var t = monitors[args[0]];
        if (!t) {
            console.error("Illegal arguments. moitor event or monitor status");
            process.exit(-1);
            return;
        }

        var req = http.request({
            port: port,
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
    };

    var cmd = program.args[0];
    if (!supportFuncs[cmd]) {
        console.error('unknown cmd ' + cmd);
        program.help();
        return;
    }
    supportFuncs[cmd](program.args.splice(1, 1));
}


main();

