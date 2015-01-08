var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

var workerMain = require('./index.js');

function reply(msg, err, body) {
    msg.header.rsp = true;
    if (err) {
        msg.err = {
            message: err.message || 'unknown error'
        };
    } else {
        msg.body = body;
    }
    process.send(msg);
}

function CmdEmmiter() {
    this.cmdHandler = {};
}

CmdEmmiter.prototype.register = function (cmdid, handler) {
    this.cmdHandler[cmdid] = handler;
};

CmdEmmiter.prototype.runCmd = function (msg) {
    var _id = msg.header._id;
    var func = this.cmdHandler[_id];
    if (func) {
        func(msg.body, function (err, body) {
            reply(msg, err, body);
        });
    } else {
        console.error('func not found');
        reply(msg, new Error('method not found: ' + _id));
    }
};


function _main(baseDir, argv) {
    var cfgFile = path.resolve(baseDir, argv[0]);
    var cmdEmitter = new CmdEmmiter();
    process.on('message', function (msg) {
        switch (msg.header._id) {
            case '__start':
                workerMain.init(cfgFile, baseDir, msg.body, cmdEmitter, function (err) {
                    reply(msg, err);
                });
                break;
            case '__close':
                workerMain.close(function (err) {
                    reply(msg, err);
                });
                break;
            case '__hb':
                reply(msg, null, msg.body);
                break;
            default:
                cmdEmitter.runCmd(msg);
        }
    });
}

module.exports.main = function (baseDir, argv) {
    var d = require('domain').create();
    d.on('error', function(err) {
        console.error('uncaught exception: ' + err.message);
        console.error('uncaught exception: ' + err.stack);
        throw err;
    });
    d.run(_main.bind(null, baseDir, argv));
};

