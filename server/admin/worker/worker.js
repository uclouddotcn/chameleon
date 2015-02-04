var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');

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

var workerMain = null;

function onStart(msg, cmdEmitter) {
    try {
        var body = msg.body;
        workerMain = require(body.script);
        var argv = body.args;
        workerMain.init(process.env.CHAMELEON_WORKDIR, argv, body.data, cmdEmitter, function (err) {
            reply(msg, err);
        });
    } catch (e) {
        console.error(e.stack);
        reply(msg, new Error('Fail to load module: ' + e.message));
    }
}

function onClose(msg) {
    if (workerMain) {
        workerMain.close(function (err) {
            reply(msg, err);
        });
    } else {
        reply(msg, null, null);
        setTimeout(process.exit, 5000);
    }
}



function _main() {
    var cmdEmitter = new CmdEmmiter();
    process.on('message', function (msg) {
        switch (msg.header._id) {
            case '__start':
                onStart(msg, cmdEmitter);
                break;
            case '__close':
                onClose(msg);
                break;
            case '__hb':
                reply(msg, null, msg.body);
                break;
            default:
                cmdEmitter.runCmd(msg);
        }
    });
}

function main() {
    var d = require('domain').create();
    d.on('error', function(err) {
        console.error('uncaught exception: ' + err.message);
        console.error('uncaught exception: ' + err.stack);
        throw err;
    });
    d.run(_main);
}

main();
