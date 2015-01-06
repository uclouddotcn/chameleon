var EventEmitter = require('events').EventEmitter;
var fs = require('fs');

var workerMain = require('./lib');

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
        console.log('func not found');
        reply(msg, new Error('method not found: ' + _id));
    }
};


function _main() {
    var cfgFile = process.argv[2];
    var cmdEmitter = new CmdEmmiter();
    process.on('message', function (msg) {
        switch (msg.header._id) {
            case '__start':
                workerMain.init(cfgFile, msg.body, cmdEmitter, function (err) {
                    reply(msg, err);
                });
                break;
            case '__close':
                workerMain.close(function (err) {
                    reply(msg, err);
                });
                break;
            default:
                cmdEmitter.runCmd(msg);
        }
    });
}

module.exports.main = function () {
    var d = require('domain').create();
    d.on('error', function(err) {
        console.error('uncaught exception: ' + err.message);
        console.error('uncaught exception: ' + err.stack);
        throw err;
    });
    d.run(_main);
};

