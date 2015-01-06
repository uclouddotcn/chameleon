var EventEmitter = require('events').EventEmitter;
var util = require('util');
var path = require('path');
var fs = require('fs');
var loadModule = require('./libloader').loadModule;
var async = require('async');
var env = require('./env');

// API
module.exports.createStorageDriver = 
function (options, logger) {
    return new EventStorage(options, logger);
};

var EventStorage = function (options, logger) {
    var self = this;
    self.storages = [];
    self.logger = logger;
    if (!options) {
        var FileBillLogger = require('./file-billlogger');
        if (!fs.existsSync(env.billDir)) {
            fs.mkdirSync(env.billDir);
        }
        this.storages.push(new FileBillLogger(env.billDir));
        return;
    }
    if (util.isArray(options)) {
        options.forEach(function (option) {
            self.loadSingleModule(option)
        })
    } else {
        self.loadSingleModule(options);
    }
};

EventStorage.prototype.loadSingleModule = function (option) {
    if (!option.name) {
        throw new Error('option must have name field: ' + JSON.stringify(option));
    }
    try {
        var m = loadModule(['otherplugins', 'event-storage', option.name]);
        var obj = new m(option.cfg);
        this.storages.push(obj);
        this.logger.info('load event storage ' + option.name);
    } catch (e) {
        this.logger.error(util.format('Fail to load plugin %s: %s', option.name, 
            e));
    }
};

EventStorage.prototype.record = function (obj) {
    this.storages.forEach(function (store) {
        store.record(obj);
    });
};

EventStorage.prototype.close = function (callback) {
    var exitFunc = this.storages.map(function (x) {
        return x.close.bind(x);
    });
    async.parallel(
        exitFunc, function () {
            callback();
        }
    );
};

