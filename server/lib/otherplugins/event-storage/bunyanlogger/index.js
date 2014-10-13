var bunyan = require('bunyan');

function BunyanLogger (cfg) {
    if (!cfg.path) {
        throw new Error('must specify the log path');
    }
    this.logger = bunyan.createLogger({
        name: 'bill-logger',
        streams: [
            {
                path: cfg.path,
                level: 'info',
            }
        ]
    });
    
}

BunyanLogger.prototype.record = function(r) {
    this.logger.info(r);
};

BunyanLogger.prototype.close = function (callback) {
    this.logger.info("bunyan logger exit");
    setImmediate(callback);
}

module.exports = BunyanLogger;


