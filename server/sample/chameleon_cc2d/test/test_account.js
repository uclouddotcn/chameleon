var accountmgr = require('../lib/account');
var assert = require('assert');
var async = require('async');
function MockDB(timerVal) {
    this.items = {};
    this.timerVal = timerVal || 1;
}

MockDB.prototype.setGetError = 
function(err) {
    this.getErr = err;
}

MockDB.prototype.setSetError = 
function(err) {
    this.setErr = err;
}

MockDB.prototype.get =
function(table, key, callback) {
    //console.log('get %s %s\n', table, key);
    if (this.getErr) {
        setTimeout(callback, this.timerVal, this.getErr);
        return;
    }
    var queryKey = table + '-' + key;
    var err = null;
    if (!this.items[queryKey]) {
        err = new Error();
        err.notFound = true;
    }
    setTimeout(callback, this.timerVal, err, this.items[queryKey]);
};

MockDB.prototype.set =
function(table, key, value, callback) {
    //console.log('set %s %s %s\n', table, key, value);
    if (!callback) {
        throw new Error();
    }
    if (this.setErr) {
        setTimeout(callback, this.timerVal, this.setErr);
        return;
    }
    var queryKey = table + '-' + key;
    this.items[key] = 
    setTimeout(callback, this.timerVal, null);
};

MockDB.prototype.del = 
function(table, key, callback) {
    var queryKey = table + '-' + key;
    self.db.del(queryKey, callback);
}

function MockLogger() {
}

MockLogger.prototype.info = 
function () {
}

MockLogger.prototype.error = 
function () {
}

MockLogger.prototype.warn = 
function () {
}

MockLogger.prototype.debug = 
function () {
}

MockLogger.prototype.trace = 
function () {
}

function MockChamClient(rsp, timeout) {
    this.rsp = rsp;
    this.timeout = timeout || 1;
}

MockChamClient.prototype.setRsp =
function(rsp) {
    this.rsp = rsp;
};

MockChamClient.prototype.verifyLogin = 
function (platform, token, others, callback) {
    var rsp = {
        platform: platform,
        token: token,
        uid: others,
        name: 'testxxxx'
    };
    setTimeout(callback, this.timeout, null, rsp)
};

MockChamClient.prototype.pendingCharge = 
function (platform, uid, appUid, amount, callback) {
    setTimeout(callback, this.timeout, null, this.rsp)
};

MockChamClient.prototype.pendingBuy = 
function (platform, uid, appUid, productId, amount, singlePrice, callback) {
    setTimeout(callback, this.timeout, null, this.rsp)
};


describe('AccountMgr', function () {
    describe('#login()', function() {
        it('should create a new account', function (done) {
            var db = new MockDB();
            var platform = "test";
            var uid = "123456";
            var token = "654321";
            var chamclient = new MockChamClient({
                    uid: uid,
                    token: token,
                    platform: platform,
                    name: 'testxxxx'
            });
            var am = accountmgr.create(new MockLogger(), db, chamclient, 
                function() {
                    am.login(platform, token, uid, function (err, result) {
                        if (err) {
                            done(err);
                        }
                        assert.equal(result.playerInfo.appUid, 10000);
                        done(null);
                        });
                });
        });

        it('create multiple accounts', function (done) {
            var db = new MockDB(40);
            var platform = "test";
            var uid = [["123456", 10000], 
                       ["234567", 10001], 
                       ["345678", 10002], 
                       ['456790', 10003]];
            var token = "654321";
            var appUids = [];
            var chamclient = new MockChamClient();
            var am = accountmgr.create(new MockLogger(), db, chamclient, 
                function(err) {
                    assert.equal(err, null);
                    async.each(uid, function (u, callback) {
                        am.login(platform, token, u[0], function (err, result) {
                            if (err) {
                                return callback(err);
                            }
                            assert.equal(result.playerInfo.uid, u[0]);
                            appUids.push(result.playerInfo.appUid)
                            return callback();
                        });
                    }, function (err)  {
                        if (err) {
                            return done(err);
                        }
                        appUids.sort();

                        for (var i in appUids) {
                            assert.equal(parseInt(appUids[i]), 
                                10000+parseInt(i));
                        }
                        done(null);
                    });
                });
        });

        it('login existing account', function (done) {
            var db = new MockDB(40);
            db.items['player'+'-'+'10000'] = JSON.stringify({
                uid: '123456',
                platform: 'test',
                nick: 'mynick',
                money: 1000
            });
            db.items['global'+'-'+'nextId'] = 10001;
            db.items['id'+'-'+'test:123456'] = 10000;

            var chamclient = new MockChamClient();
            var am = accountmgr.create(new MockLogger(), db, chamclient, 
                function(err) {
                    assert.equal(err, null);
                    am.login('test', '222222', '123456', function (err, playerInfo) {
                        if (err) {
                            return done(err);
                        }
                        assert.equal(playerInfo.playerInfo.uid, '123456');
                        assert.equal(playerInfo.playerInfo.money, 1000);
                        assert.equal(playerInfo.playerInfo.nick, 'mynick');
                        return done();
                    });
            });
        });

    });

    describe('#charging()', function() {
        it('charging should succeed', function (done) {
            var db = new MockDB();
            var platform = "testcharge";
            var uid = "123456";
            var token = "654321";
            var chamclient = new MockChamClient({
                    code: 0,
                    orderId: 'charging-order-id'
            });
            var appUid = null;
            var am = accountmgr.create(new MockLogger(), db, chamclient, 
                function() {
                    async.series([
                        function (callback) {
                            am.login(platform, token, uid, 
                                function (err, result) {
                                    appUid = result.playerInfo.appUid;
                                    callback(err);
                            });
                        }, 
                        function (callback) {
                            am.charging(appUid, token, 1000, function (err, result) {
                                assert.equal(err, null);
                                assert.equal(result.code, 0);
                                assert.equal(result.orderId, 'charging-order-id');
                                callback(err);
                            });
                        }
                    ], function (err) {
                        assert.equal(err, null);
                        done(null);
                    });
                });
        });
    });

    describe('#buying()', function() {
        it('buying should succeed', function (done) {
            var db = new MockDB();
            var platform = "testcharge";
            var uid = "123456";
            var token = "654321";
            var chamclient = new MockChamClient({
                    code: 0,
                    orderId: 'buying-order-id'
            });
            var appUid = null;
            var am = accountmgr.create(new MockLogger(), db, chamclient, 
                function() {
                    async.series([
                        function (callback) {
                            am.login(platform, token, uid, 
                                function (err, result) {
                                    appUid = result.playerInfo.appUid;
                                    callback(err);
                            });
                        }, 
                        function (callback) {
                            am.buying(appUid, token, 'product1', 10, function (err, result) {
                                assert.equal(err, null);
                                assert.equal(result.code, 0);
                                assert.equal(result.orderId, 'buying-order-id');
                                callback(err);
                            });
                        }
                    ], function (err) {
                        assert.equal(err, null);
                        done(null);
                    });
                });
        });
    });

    describe('#bought()', function() {
        it('bought should succeed', function (done) {
            var db = new MockDB();
            var platform = "testcharge";
            var uid = "123456";
            var token = "654321";
            var orderId = 'charging-order-id';
            var chamclient = new MockChamClient({
                    code: 0,
                    orderId: orderId
            });
            var appUid = null;
            var am = accountmgr.create(new MockLogger(), db, chamclient, 
                function() {
                    async.series([
                        function (callback) {
                            am.login(platform, token, uid, 
                                function (err, result) {
                                    appUid = result.playerInfo.appUid;
                                    callback(err);
                            });
                        }, 
                        function (callback) {
                            am.bought(0, appUid, 'product1', 100, orderId,
                                function (err) {
                                    am.getPlayerInfo(appUid, function (err, result) {
                                        assert.equal(err, null);
                                        assert.equal(result.getProductCount('product1'), 100);
                                        assert.equal(result.notifyEvents.length, 1);
                                        assert.equal(result.notifyEvents[0].event, 'buy');
                                        assert.equal(result.notifyEvents[0].info.amount, 100);
                                        callback(null);
                                    });
                                });
                        }
                    ], function (err) {
                        assert.equal(err, null);
                        done(null);
                    });
                });
        });
    });
})


