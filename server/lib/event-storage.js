var EventEmitter = require('events').EventEmitter;
var util = require('util');
var WError = require('verror').WError;
var path = require('path');
var loadModule = require('./libloader').loadModule;

// API
module.exports.createStorageDriver = 
function (options, logger) {
    return new EventStorage(options, logger);
};

var EventStorage = function (options, logger) {
    var self = this;
    self.storages = []
    self.logger = logger;
    if (!options) {
        return;
    }
    if (util.isArray(options)) {
        options.foreach(function (option) {
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
        var obj = new m(option.cfg)
        this.storages.push(obj);
        this.logger.info('load event storage ' + option.name);
    } catch (e) {
        this.logger.error(util.format('Fail to load plugin %s: %s', option.name, 
            e));
    }
}

EventStorage.prototype.record = function (obj) {
    for (var i in this.storages) {
        try {
            this.storages[i].record(obj);
        } catch (e) {
        }
    }
}

