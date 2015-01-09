/**
 * Created by Administrator on 2014/12/18.
 */
var bunyan = require('bunyan');
var path = require('path');

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
                path: path.join(__dirname, '../../log/configMngSvr.log'),
                level: infoLv,
                period: '1d',
                count: 4
            },
            {
                type: 'rotating-file',
                path: path.join(__dirname, '../../log/configMngSvr.err'),
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

    var svrCfg = options.server ||
        defaultServerLoggerCfg(options.level);

    if (debug) {
        svrCfg.src = true;
    }

    this.svrLogger = bunyan.createLogger(svrCfg);

}

Logger.prototype.serverLog = function() {
    return this.svrLogger;
};;

module.exports = Logger;