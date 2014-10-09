
/**
 *  user event log, formatting the log and store the logs 
 *  using the provided storage engine
 * @name module.exports.listen
 * @function
 * @param {object} eventCenter the one emits user actions
 * @param {object} storageEngine storage engine
 */
module.exports.listen = function (eventCenter, storageEngine) {
    eventCenter.on('login', function (channel, uid, newOthers) {
        var obj = {
            action: 'login',
            time: Date.now(),
            channel: channel,
            uid: uid,
            others: newOthers
        };
        storageEngine.record(obj);
    });

    eventCenter.on('login-fail', function (channel, err) {
        var obj = {
            action: 'login-fail',
            time: Date.now(),
            channel: channel,
            err: err
        };
        storageEngine.record(obj);
    });

    eventCenter.on('pre-pay', function (orderInfo) {
        var obj = {
            action: 'pre-pay',
            time: Date.now()
        };
        for (var i in orderInfo) {
            obj[i] = orderInfo[i];
        }
        storageEngine.record(obj);
    });

    eventCenter.on('pay', function (orderInfo) {
        var obj = {
            action: 'pay',
            time: Date.now()
        };
        for (var i in orderInfo) {
            obj[i] = orderInfo[i];
        }
        storageEngine.record(obj);
    });

    eventCenter.on('pay-fail', function (orderInfo, code) {
        var obj = {
            action: 'pay-fail',
            time: Date.now(),
            code: code
        };
        for (var i in orderInfo) {
            obj[i] = orderInfo[i];
        }
        storageEngine.record(obj);
    });

    eventCenter.on('disgard-order', function (orderInfo) {
        var obj = {
            action: 'disgard-order',
            time: Date.now()
        };
        for (var i in orderInfo) {
            obj[i] = orderInfo[i];
        }
        storageEngine.record(obj);
    });
};




