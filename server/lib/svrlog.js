var bunyan = require('bunyan');
var path = require('path');

function defaultAdminLoggerCfg(level) {
    var infoLv = 'info';
    if (level) {
        infoLv = level; 
    }
    return {
        name: 'admin',
        streams: [
            {
                type: 'rotating-file',
                path: path.join(__dirname, '../log/adminsvr.log'),
                level: infoLv,
                period: '1d',
                count: 4
            }
        ],
        serializers: bunyan.stdSerializers
    };
}

function defaultServerLoggerCfg(level) {
    var infoLv = 'info';
    if (level) {
        infoLv = level; 
    }
    return {
        name: 'server',
        streams: [
            {
                type: 'rotating-file',
                path: path.join(__dirname, '../log/server.log'),
                level: infoLv,
                period: '1d',
                count: 4
            },
            {
                type: 'rotating-file',
                path: path.join(__dirname, '../log/server.err'),
                level: 'error',
                period: '1d',
                count: 4
            }
        ],
        serializers: bunyan.stdSerializers
    };
}


function Logger(debug, options) {
    if (!options) {
        options = {};
    }
    
    if (debug) {
        options.level = 'debug';
    }

    var adminCfg = options.admin || 
        defaultAdminLoggerCfg(options.level);

    var svrCfg = options.server ||
        defaultServerLoggerCfg(options.level);

    if (debug) {
        adminCfg.src = true;
        svrCfg.src = true;
    }

    this.adminLogger = bunyan.createLogger(adminCfg);
    this.svrLogger = bunyan.createLogger(svrCfg);

}

Logger.prototype.adminLog = function() {
    return this.adminLogger;
};


Logger.prototype.svrLog = function() {
    return this.svrLogger;
};


module.exports = Logger;



