var async = require('async');
var bunyan = require('bunyan');
var path = require('path');
var restify = require('restify');

var accountmgr = require('./account');
var chamclient = require('./chameleon_client');
var ChamError = require('./chamerror');
var db = require('./db');
var ErrorCode = require('./error-code');

var Server = function(cfg) {
    var self = this;
    if (!cfg.gamesvr || !cfg.adminsvr || !cfg.chameleonsvr) {
        throw new Error("invalid cfg");
    }
    self.logger = startLogger();
    self.chamclient = chamclient.create(cfg.chameleonsvr, this.logger);
    async.series([
        // start db instance
        function (callback) {
            self.db = db.create(callback);
        },
        // start account mgr
        function (callback) {
            self.accountMgr = accountmgr.create(self.logger, 
                self.db, self.chamclient, callback);
        }, 
        // start rest server
        function (callback) {
            console.log('start rest server');
            self.server = self.createRestServer(cfg.gamesvr.host, cfg.gamesvr.port,
                callback);
        },
        // start rest server
        function (callback) {
            console.log('start callback server');
            self.adminsvr = self.createallbackServer(cfg.adminsvr.host, cfg.adminsvr.port,
                callback);
        }
    ], function (err, result) {
        if (err) {
            throw err;
        }
        console.log('server started');
    });
};

Server.prototype.createRestServer = 
function (host, port, callback) {
    var self = this;
    var server = restify.createServer({
        log: self.logger
    });
    server.use(restify.queryParser({mapParam : true}));
    server.use(restify.bodyParser({mapParam : true}));

    var makeRes = function (code, body) {
        return {
            code: code,
            body: body
        };
    };

    server.post('/v1/login', function (req, res, next) {
        req.log.debug('recv login');
        var channel = req.params.channel;
        var token = req.params.token;
        var others = req.params.others;
        if (!channel || !token) {
            return next(new restify.InvalidArgumentError(
            "request param must have 'channel' and 'token'"));
        }
        self.accountMgr.login(channel, token, others, 
            function (err, result) {
                if (err) {
                    return res.send(makeRes(err.errcode, null));
                }
                var playerInst = result.playerInfo;
                var rsp = result.rsp;
                res.send(makeRes(0, {
                    appUid: playerInst.appUid.toString(10),
                    session: playerInst.session,
                    uid: playerInst.uid,
                    channel: playerInst.channel,
                    rsp: rsp
                }));
        });
        next();
    });

    server.post('/v1/heartbeat', function (req, res, next) {
        var appUid = parseInt(req.params.appUid, 10);
        var session = req.params.session;
        if (!appUid || !session) {
            return next(new restify.InvalidArgumentError(
                "request param must have 'appuid' and 'session'"));
        }
        try {
            self.accountMgr.onHeartBeat(appUid, session, 
                function (err, rsp) {
                    if (err) {
                        return res.send(makeRes(err.errcode, null));
                    }
                    res.send(makeRes(0, rsp));
            });
        } catch (e ) {
            if (e instanceof ChamError) {
                req.log.warn('cham error code=%d', e.errcode);
                next(new restify.InvalidArgumentError(e.message));
            } else {
                req.log.warn('error %s, stack %s', e, e.stack);
                next(e);
            }
        }  
        next();
    });

    server.post('/v1/charging', function (req, res, next) {
        req.log.info('charging');
        var appUid = parseInt(req.params.appuid, 10);
        var session = req.params.session;
        var amount = req.params.amount;
        var payToken = req.params.payToken;
        if (!appUid || !session || !amount) {
            return next(new restify.InvalidArgumentError(
                "request param must have 'appuid' 'amount', and 'session'"));
        }
        try {
            self.accountMgr.charging(appUid, session, payToken, amount, 
                function (err, rsp) {
                    if (err) {
                        return res.send(makeRes(err.errcode, null));
                    }
                    res.send(makeRes(0, rsp));
            });
        } catch (e ) {
            if (e instanceof ChamError) {
                req.log.warn('cham error code=%d', e.errcode);
                next(new restify.InvalidArgumentError(e.message));
            } else {
                req.log.warn('error %s, stack %s', e, e.stack);
                next(e);
            }
        }         
        next();
    });

    server.post('/v1/buying', function (req, res, next) {
        req.log.info('buying');
        var appUid = parseInt(req.params.appuid, 10);
        var session = req.params.session;
        var amount = req.params.amount;
        var productId = req.params.productId;
        var payToken = req.params.payToken;
        if (!appUid || !session || !amount || !productId) {
            return next(new restify.InvalidArgumentError(
                "request param must have 'appuid' 'amount', 'productId', and 'session'"));
        }
        try {
            self.accountMgr.buying(appUid, session, payToken, productId, amount, 
                function (err, rsp) {
                    if (err) {
                        return res.send(makeRes(err.errcode, null));
                    }
                    res.send(makeRes(0, rsp));
            });
        } catch (e ) {
            if (e instanceof ChamError) {
                req.log.warn('cham error code=%d', e.errcode);
                next(new restify.InvalidArgumentError(e.message));
            } else {
                req.log.warn('error %s, stack %s', e, e.stack);
                next(e);
            }
        }         
        next();
    });

    server.listen(port, function (err) {
        callback(err);
    });

    server.on('uncaughtException', function (req, res, route, err) {
        console.log('on exception ' + err.message);
        console.log('on exception ' + err.stack);
    });
};

Server.prototype.createallbackServer = 
function (host, port, callback) {
    var self = this;
    var server = restify.createServer({
        log: self.logger
    });
    server.use(restify.queryParser({mapParam : true}));
    server.use(restify.bodyParser({mapParam : true}));

    var makeRes = function (code, body) {
        return {
            code: code,
            body: body
        };
    };

    server.post('/callback/charge', function (req, res, next) {
        req.log.debug({params: req.params}, 'recv charge callback');
        if (req.params.ext === 'c') {
            var channel = req.params.channel;
            var uid = req.params.uid;
            var appUid = parseInt(req.params.appUid);
            var orderId = req.params.cpOrderId;
            var status = req.params.payStatus;
            var amount = req.params.currencyCount;
            self.accountMgr.charged(status, appUid, amount, orderId, function (err) {
                var retCode = 0;
                if (err) {
                    return retCode = err.errcode || -1;
                }
                res.send({
                    code: retCode
                });
            });
        } else {
            var channel = req.params.channel;
            var uid = req.params.uid;
            var appUid = parseInt(req.params.appUid);
            var orderId = req.params.cpOrderId;
            var status = req.params.payStatus;
            var amount = req.params.productCount;
            var productId = req.params.productId;
            self.accountMgr.bought(status, appUid, productId, amount, orderId, function (err) {
                var retCode = 0;
                if (err) {
                    return retCode = err.errcode || -1;
                }
                res.send({
                    code: retCode
                });
            });
        }
        next();
    });

    server.post('/callback/buy', function (req, res, next) {
        req.log.debug({params: req.params}, 'recv buy callback');
        next();
    });


    server.listen(port, function (err) {
        callback(err);
    });
    server.on('uncaughtException', function (req, res, route, err) {
        console.log('on exception ' + err.message);
        console.log('on exception ' + err.stack);
    });
};

function startLogger(level) {
    var infoLv = 'debug';
    if (level) {
        infoLv = level; 
    }
    var loggercfg = {
        name: 'chameleon_cc2d',
        streams: [
            {
                type: 'rotating-file',
                path: path.join(__dirname, '../log/chameleoncc2d.log'),
                level: 'debug',
                period: '1d',
                count: 4
            }
        ],
        serializers: bunyan.stdSerializers
    };
    return bunyan.createLogger(loggercfg);
}

module.exports.startServer = 
function (cfg) {
    return new Server(cfg);
};



