var async = require('async');
var ErrorCode = require('./error-code');
var ChamError = require('./chamerror');
var player = require('./player');

var IdMgr = function(db, callback) {
    var self = this;
    self.db = db;
    self.db.get("global", "nextId", function (err, value) {
        if (err) { 
            if (err.notFound) {
                self.db.set("global", "nextId", 10000, function (err, value) {
                    if (err) {
                        callback(new Error("Fail to init global next id"));
                    } else {
                        self.nextId = 10000;
                        callback(null);
                    } 
                });
            } else {
                callback(new Error("Fail to get global next id"));
            }
            return;
        } 
        self.nextId = parseInt(value);
        callback(null);
    });
    self.inSavingNextId = null;
    self.cbs = [];
};

IdMgr.prototype.inc = function(callback) {
    var self = this;
    var providedId = self.nextId;
    self.nextId += 1;
    var dbcb = function (err) {
        if (err) {
            return callback(
                new ChamError(ErrorCode.ERR_FAIL_DB, err, 
                    "fail to store the player info"));
        }
        callback(null, providedId);
    };
    if (self.inSavingNextId) {
        self.cbs.push(dbcb);
        return;
    }
    self.startNextSaving(dbcb);
};

IdMgr.prototype.startNextSaving = 
function (dbcb) {
    var self = this;
    // not other saving in progress
    self.inSavingNextId = self.nextId;
    var waitingCbs = self.cbs;
    if (dbcb) {
        waitingCbs.push(dbcb);
    }
    self.cbs = [];
    self.db.set('global', 'nextId', self.nextId.toString(),
        function (err) {
            for (var i in waitingCbs) {
                waitingCbs[i](err);
            }
            if (self.nextId !== self.inSavingNextId) {
                self.startNextSaving();
            } else {
                self.inSavingNextId = null;
            }
    });
}

function OnlineUserCache() {
    this.usrs = {};
    this.uids = {};
}

OnlineUserCache.prototype.setOnline = 
function(playerInst) {
    var uidkey = makeUidKey(playerInst.channel, playerInst.uid);
    this.usrs[playerInst.appUid] = playerInst;
    this.uids[uidkey] = playerInst; 
}

OnlineUserCache.prototype.setOffline = 
function(appUid) {
    if (this.usrs[appUid]) {
        var playerInst = this.usrs[appUid];
        var uidkey = makeUidKey(playerInst.channel, 
            playerInst.uid);
        delete this.usrs[appUid];
        delete this.uids[uidkey];
    }
}

OnlineUserCache.prototype.get = 
function(appUid) {
    return this.usrs[appUid];
}

OnlineUserCache.prototype.getByUid = 
function(channel, uid) {
    return this.uids[makeUidKey(channel, uid)];
}

OnlineUserCache.prototype.onHeartBeat = 
function(appUid) {
    
}


var AccountMgr = function(logger, db, chamClient, callback) {
    var self = this;
    self.db = db;
    self.chamClient = chamClient;
    self.logger = logger;
    self.idmgr = new IdMgr(self.db, callback);
    self.onlineUsr = new OnlineUserCache();
};

AccountMgr.prototype.login = 
function (channel, token, others, callback) {
    var self = this;
    var loginInfo = null;
    var session = null;
    async.waterfall([
        // verify the channel login info
        self.chamClient.verifyLogin.bind(self.chamClient, channel,
            token, others),
        // get mapping id
        function (_loginInfo, cb) {
            loginInfo = _loginInfo;
            session = loginInfo.loginInfo.token;
            getIdMap(self, loginInfo.loginInfo.channel, loginInfo.loginInfo.uid, cb);
        },
        // get login info or start regist
        function (appUid, cb) {
            if (appUid) {
                self.getPlayerInfo(appUid, cb);
            } else {
                self.registPlayerInfo(
                    loginInfo.loginInfo.uid, loginInfo.loginInfo.channel, cb);
            }
            
        }
    ], function (err, playerInfo) {
        if (err) {
            return callback(err);
        }
        playerInfo.session = session;
        self.onlineUsr.setOnline(playerInfo);
        return callback(err, {
            playerInfo: playerInfo, 
            rsp: JSON.stringify(loginInfo)
        });
    });
};

AccountMgr.prototype.getPlayerInfoByUid =
function(channel, uid, callback) {
    var self = this;
    async.waterfall([
        self.db.get.bind(self.db, "id", makeUidKey(channel, uid)),
        self.getPlayerInfo.bind(self)
    ], function (err, result) {
        if (err) {
            return callback(
                new ChamError(ErrorCode.ERR_FAIL_DB, err, 
                    "fail to get player info"));
        }
        callback(err, JSON.parse(result));
    });
};

AccountMgr.prototype.getPlayerInfo =
function(appUid, callback) {
    var self = this;
    var playerInst = self.onlineUsr.get(appUid);
    if (playerInst) {
        return setImmediate(callback, null, playerInst);
    }
    self.db.get("player", appUid, function (err, value) {
        if (err) {
            return callback(
                new ChamError(ErrorCode.ERR_FAIL_DB, err, 
                    "fail to get player info"));
        }
        var playerInfo = JSON.parse(value);
        return callback(null, new player.create(playerInfo));
    });
};

AccountMgr.prototype.registPlayerInfo =
function(uid, channel, callback) {
    var self = this;
    var playerInfo = {
            uid: uid,
            channel: channel,
            nick: makeUidKey(channel, uid),
            money: 0
    };
    var undocb = null;
    async.waterfall([
        // get a new id
        self.idmgr.inc.bind(self.idmgr),
        // save player info
        function (appUid, cb) {
            playerInfo.appUid = appUid;
            self.db.set("player", appUid, JSON.stringify(playerInfo),
                function (err) {
                    if (err) {
                        return cb(err);
                    }
                    undocb = self.db.del.bind(self.db, 'player', appUid);
                    return cb(null, playerInfo);
                });
        },
        // save the id mapping, now the result is visible
        function (playerInfo, cb) {
            self.db.set('id', makeUidKey(channel, uid), playerInfo.appUid.toString(),
                function (err) {
                    if (err) {
                        cb(err);
                    }
                    cb(null, new player.create(playerInfo));
            });
        }
    ], function (err, result) {
        if (err) {
            if (undocb) {
                undocb();
            }
            return callback(
                new ChamError(ErrorCode.ERR_FAIL_DB, err, 
                    "fail to regist player"));
        }
        callback(null, result);
    });
};

AccountMgr.prototype.savePlayerInfo =
function(uid, playerInfo, callback) {
    this.db.set("player", uid, JSON.stringify(playerInfo),
        function (err) {
            if (err) {
                return callback(
                    new ChamError(ErrorCode.ERR_FAIL_DB, err, 
                        "fail to regist player"));
            }
            return callback(err);
    });
};

AccountMgr.prototype.charging = 
function(appUid, session, token, amount, callback) {
    var self = this;
    verifySession(self, appUid, session);
    var playerInst = self.onlineUsr.get(appUid);
    if (!playerInst) {
        throw new ChamError(ErrorCode.ERR_UERR_USER_OFFLINE, 
            "to pay, user must be online");
    }
    this.chamClient.pendingCharge(playerInst.channel, 
        playerInst.uid, token, playerInst.appUid, amount, callback);
};

AccountMgr.prototype.charged = 
function(status, appUid, amount, orderId, cb) {
    var self = this;
    async.waterfall([
        function(callback) {
            self.getPlayerInfo(appUid, callback);
        },
        function(playerInst, callback) {
            if (status == 0) {
                playerInst.addMoney(amount);
                self.savePlayerInfo(appUid, playerInst.info, function(err) {
                    if (err) {
                        self.logger.error("fail to save user(" + appUid + ") info");
                        return callback(null, playerInst);
                    }
                    return callback(null, playerInst);
                });
            }
            playerInst.addEvent('charge', {
                status: status,
                amount: amount,
                orderId: orderId,
                total: playerInst.money,
            });
        }
    ], function (err, playerInfo) {
        cb(err);
    });
};

AccountMgr.prototype.buying = 
function(appUid, session, payToken, productId, amount, callback) {
    var self = this;
    verifySession(self, appUid, session);
    var playerInst = self.onlineUsr.get(appUid);
    if (!playerInst) {
        throw new ChamError(ErrorCode.ERR_UERR_USER_OFFLINE, 
            "to pay, user must be online");
    }
    this.chamClient.pendingBuy(playerInst.channel, 
        playerInst.uid, payToken, playerInst.appUid.toString(10), productId, amount, 
        100, callback);
};


AccountMgr.prototype.onHeartBeat = 
function (appUid, session, callback) {
    var self = this;
    verifySession(self, appUid, session);
    var playerInst = this.onlineUsr.get(appUid);
    if (!playerInst) {
        throw new ChamError(ErrorCode.ERR_USER_OFFLINE, 
            "use must login first");
    }
    this.onlineUsr.onHeartBeat(appUid);
    setImmediate(callback, null, {
        session: session,
        events: playerInst.notifyEvents
    });
    playerInst.clearEvents();
}

AccountMgr.prototype.bought = 
function(status, appUid, productId, amount, orderId, cb) {
    var self = this;
    async.waterfall([
        function(callback) {
            self.getPlayerInfo(appUid, callback);
        },
        function(playerInst, callback) {
            if (status == 0) {
                playerInst.addProduct(productId, amount);
                self.savePlayerInfo(appUid, playerInst.info, function(err) {
                    if (err) {
                        self.logger.error("fail to save user(" + appUid + ") info");
                        return callback(null, playerInst);
                    }
                    return callback(null, playerInst);
                });
            }
            playerInst.addEvent('buy', {
                status: status,
                productId: productId,
                amount: amount,
                orderId: orderId,
                total: parseInt(playerInst.getProductCount(productId))
            });
        }
    ], function (err, playerInfo) {
        cb(err);
    });
};


function makeUidKey(channel, uid) {
    return channel + ':' + uid;
}

function getIdMap(self, channel, uin, callback) {
    self.db.get("id", makeUidKey(channel, uin), function (err, value) {
        if (err) {
            if (err.notFound) {
                return callback(null, null);
            } else {
                return callback(new ChamError(ErrorCode.ERR_FAIL_DB, err, 
                    "fail to get app uid"));
            }
        }
        var appUid = parseInt(value);
        callback(null, appUid);
    });
}

function verifySession(self, appUid, session) {
    var playerInst = self.onlineUsr.get(appUid);
    if (!playerInst) {
        throw new ChamError(ErrorCode.ERR_USER_OFFLINE, 
            "player offline");
    }
    if (playerInst.session !== session) {
        throw new ChamError(ErrorCode.ERR_USER_INVALID_SESSION, 
            "invalid session");
    }
}

module.exports = {
    create: function (logger, db, chamClient, callback) {
        return new AccountMgr(logger, db, chamClient, callback);
    }
};


