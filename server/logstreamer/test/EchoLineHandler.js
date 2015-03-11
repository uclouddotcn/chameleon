var util = require('util');


function transTime (time) {
    return Math.round(time/1000);
}

function naiveCopy(src, target) {
    for (var i in src) {
        if (src.hasOwnProperty(i)) {
            target[i] = src[i];
        }
    }
}

function tryGetChOrderId (src) {
    var other = src.other;
    if (!other) {
        return null;
    }
    try {
        var otherobj = JSON.parse(other);
        return otherobj.chOrderId;
    } catch (e) {
        return null;
    }
}

var TRANS_MAP = {
    'pay': function (src, target) {
        target.code = 0;
        target.chOrderId = tryGetChOrderId(src);
        naiveCopy(src, target);
    },
    'pre-pay': function (src, target) {
        target.serverId = src.serverId;
        delete src.serverId;
        target.productid = src.pId;
        delete src.pId;
        target.productCount = src.count;
        delete src.count;
        target.realPayMoney = src.rmb;
        delete src.rmb;
        naiveCopy(src, target);
    },
    'disgard-order': function (src, target) {
        target.serverId = src.serverId;
        delete src.serverId;
        target.productid = src.pId;
        delete src.pId;
        target.productCount = src.count;
        delete src.count;
        target.realPayMoney = src.rmb;
        delete src.rmb;
        target.chOrderId = tryGetChOrderId(src);
        naiveCopy(src, target);
    },
    'pay-cancel': function (src, target) {
        target.chOrderId = src.billno;
        delete src.billno;
        target.realPayMoney = src.rmb;
        delete src.rmb;
        target.code = 0;
        naiveCopy(src, target);
    },
    'pay-cancel-fail': function (src, target) {
        target.chOrderId = src.billno;
        delete src.billno;
        target.realPayMoney = src.rmb;
        delete src.rmb;
        naiveCopy(src, target);
    },
    'pay-maybe' : function (src, target) {
        target.code = -1;
        target.chOrderId = tryGetChOrderId(src);
        naiveCopy(src, target);
    }
};

function Line2SqlHandler (logger, options, callback) {
    this.fileReader = null;
    var host = options.hasOwnProperty('host') ? options.host : 'localhost';
    var port = options.hasOwnProperty('port') ? options.port : undefined;
    var user = options.hasOwnProperty('user') ? options.user : 'root';
    var passwd = options.hasOwnProperty('passwd') ? options.passwd : undefined;
    this.logger = logger;
    setImmediate(callback);
}

Line2SqlHandler.prototype.close = function (cb) {
    setImmediate(cb);
};

Line2SqlHandler.prototype.attached = function (fileReader) {
    this.fileReader = fileReader;
};

Line2SqlHandler.prototype.onNewLine = function (cbhandle, recordId, data, callback) {
    var self = this;
    try {
        var obj = JSON.parse(data.toString());
    } catch (e) {
        this.logger.error({err: e, data: data}, 'Fail to parse data string');
    }
    var targetInfo = this.getTableName(obj);
    if (targetInfo === null) {
        return setImmediate(callback, null, cbhandle);;
    }
    targetInfo.dataobj.recordId = recordId;
    console.log('REPLACE INTO ' + targetInfo.tablename + ' SET ?; \n'
        + JSON.stringify(targetInfo.dataobj, null, '\t'));
    setImmediate(callback, null, cbhandle);
};

Line2SqlHandler.prototype.getTableName = function (obj) {
    var action = null;
    var tablename = null;
    var dataobj = {};
    dataobj.product = obj.product;
    delete obj.product;
    dataobj.channel = obj.channel;
    delete obj.channel;
    dataobj.time = transTime(obj.time);
    delete obj.time;
    action = obj.action;
    delete obj.action;
    switch (action) {
        case 'login':
            tablename = 'login';
            break;
        case 'pre-pay':
            tablename = 'pre_pay';
            break;
        case 'pay':
            tablename = 'pay';
            break;
    }
    if (!tablename) {
        return null;
    }
    tablename = 'chameleon_log.'+tablename;
    var transFunc = TRANS_MAP[action] || naiveCopy;
    transFunc(obj, dataobj);
    return {
        tablename: tablename,
        dataobj: dataobj
    };
};

module.exports = {
    createHandler: function (logger, options, callback) {
        return new Line2SqlHandler(logger, options, callback);
    }
};
