var EventEmitter = require('events').EventEmitter;
var util = require('util');
var cluster = require('cluster');
var assert = require('assert');

    assert(!cluster.isMaster);
    process.on('message', function (msg) {
        console.log(msg)
        var msgid = msg.header._id;
        switch (msgid) {
            case '__start':
                masterStub.init();
                break;
            case '__close':
                break;
            default:

        }
    });
    function MasterStub() {
        EventEmitter.call(this);
    }

    util.inherits(MasterStub, EventEmitter);

    MasterStub.prototype.init = function () {
        console.log('init');
    };

    MasterStub.prototype.close = function () {
        console.log('close');
    };

    var masterStub = new MasterStub();
    console.error(123)
