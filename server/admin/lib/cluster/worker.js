var util = require('util');
var StubBase = require('./cluster_helper').StubBase;

function MasterStub (logger) {
    // 0 -- init
    // 1 -- started
    // -1 -- dead
    StubBase.call(this, logger);
}

util.inherits(MasterStub, StubBase);

MasterStub.prototype.__send = function (r) {
    process.send(r);
};

function startPlugin(p, arg, stub) {
    console.log(p);
    console.log(arg);
    var m = require(p);
    var rsp = m.start(arg, stub);
    process.send({
        header: {
            msg: '__start'
        },
        body: rsp
    });
    return m;
}


function main() {
    var stub = new MasterStub(null);
    process.on('message', function (msg) {
        console.log(msg)
        try {
            switch (msg.header.msg) {
                case '__start':
                    startPlugin(msg.p, msg.arg, stub);
                    break;
                default:
                    stub.__onMsg(msg);
            }
        } catch (e) {
            console.log(e.stack)
            if (e instanceof Error) {
                process.send({
                    header: {
                        msg: '__uncaughtException'
                    },
                    err: e
                });
                process.exit(-1);
            } else {
                process.exit(e.code);
            }
        }
    });
}

main();

