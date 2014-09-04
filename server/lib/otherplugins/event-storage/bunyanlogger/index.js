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

module.exports = BunyanLogger;


