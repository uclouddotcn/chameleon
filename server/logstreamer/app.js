var bunyan = require('bunyan');
var program = require('commander');
var fs = require('fs');
var path = require('path');
var BillFilePat = require('./bill_file_pat');
var FileReader = require('./filereader');
var Line2sqlHandler = require('./Line2SqlHandler');

var debug = process.env.NODE_ENV === 'developement';

function initLogger() {
    var dirpath = path.join(__dirname, 'log');
    if (!fs.existsSync(dirpath)) {
        fs.mkdirSync(dirpath);
    }
    var infoLv = 'info';
    if (debug) {
        infoLv = 'debug';
    }
    var logcfg = {
        name: 'logstreamer',
        streams: [
            {
                type: 'rotating-file',
                path: path.join(dirpath, 'logstreamer.log'),
                level: infoLv,
                period: '1d',
                count: 4
            }
        ],
        serializers: bunyan.stdSerializers
    };
    return bunyan.createLogger(logcfg);
}

var logger = initLogger();

function main() {
    program
        .option('-b, --billpath <billpath>', '账单的地址')
        .option('-h, --host <host>', 'Mysql的host')
        .option('-p, --port <port>', 'Mysql的port')
        .option('-u, --user <user>', 'Mysql的user')
        .option('-P, --password <passwd>', 'Mysql的密码')
        .option('-L, --lineHandler <lineHandler>', '另外的数据处理模块(直接用来require)')
        .parse(process.argv);
    var basePath = program.billpath || path.join(__dirname, '..', 'bill');
    var filepat = new BillFilePat(basePath);
    var filereader = null;
    var LineHandler = Line2sqlHandler;
    if (program.lineHandler) {
        LineHandler = require(program.lineHandler);
    }
    var lineHandler = LineHandler.createHandler(logger, {
        host: program.host,
        port: program.port,
        user: program.user,
        passwd: program.passwd
    }, function (err) {
        if (err) {
            logger.error({err: err}, 'Fail to init: LineHandler');
            process.exit(-1);
        }
        filereader = new FileReader(filepat, logger, lineHandler, function (err) {
            if (err) {
                logger.error({err: err}, 'Fail to init: FileReader');
                return;
            }
            logger.info('server is up');
        });

    });

    function onExitFunc() {
        if (filereader) {
            filereader.close(function() {
                logger.info('close done!');
            });
        }
    }

    process.on('SIGTERM', onExitFunc);
}

var d = require('domain').create();
d.on('error', function(err) {
    logger.error({err: err}, 'uncaught exception');
    throw err;
});
d.run(main);


