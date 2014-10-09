var restify = require('restify');
var SdkError = require('./sdk-error').SdkError;
var validator = require('validator');
var util = require('util');


module.exports.createSDKSvr = function(productMgr, options, logger) {
    return new SdkSvr(productMgr, options, logger);
};

/**
 * sdk server module, responds to the request from app server
 * it provides following interfaces:
 *  '/verify_login'
 *  '/pending_pay'
 * @class SdkSvr
 * @constructor
 * @param {Array<Product>} productMgr - 
 * @param {?object} options
 * @param {?string} options.version - which version of current sdk server
 * @param {object} logger - logger object
 */
var SdkSvr = function (productMgr, options, logger) {

    var self = this;
    if (!options) {
        options = {};
    }
    var version = options.version || '0.0.1';
    self.server = restify.createServer({
        name: 'SDK_SVR',
        version: version,
        log: logger
    });
    self.logger = logger;

    self.server.use(restify.bodyParser({mapParams:true}));

    self.server.on('uncaughtException', function (req, res, route, error) {
        req.log.error({err: error}, 'uncaught exception');
    });

    // verify login handler
    this._pendingLoginValidator = new ReqValidator(
        [
            {field: 'channel', type: 'string'},
            {field: 'token', type: 'string'},
            {field: 'others', type: 'string', optional: 1}
        ]
    );

    // pending pay handler
    this._pendingPayValidator = new ReqValidator(
        [
            {field: 'uid', type: 'string'},
            {field: 'token', type: 'string'},
            {field: 'appUid', type: 'string'},
            {field: 'orderId', type: 'string', optional: 1},
            {field: 'serverId', type: 'string'},
            {field: 'productId', type: 'string', optional: 1},
            {field: 'productName', type: 'string', optional: 1},
            {field: 'productUrl', type: 'string', optional: 1},
            {field: 'productDesc', type: 'string', optional: 1},
            {field: 'productCount', type: 'int'},
            {field: 'realPayMoney', type: 'int'},
            {field: 'ext', type: 'string', optional: 1},
            {field: 'singlePrice', type: 'int'}
        ]
    );
    productMgr.on('start-product', this._onProductInstalled.bind(self));
};

SdkSvr.prototype.listen = function(port, host, next) {
    var self = this;
    self.server.listen(port, host, function() {
        next(); 
    });
    self.server.once('error', function(err) {
        next(err);
    });
};

SdkSvr.prototype._onProductInstalled = function (productInfo) {
    var self = this;
    var productName = productInfo.name;
    var product = productInfo.product;
    self.server.post(util.format('/%s/verify_login',productName), 
        makeCommonHandler(self._pendingLoginValidator, 
            product.verifyLogin.bind(product)));
    self.server.post(util.format('/%s/pending_pay',productName), 
        makeCommonHandler(self._pendingPayValidator, 
            product.pendingPay.bind(product)));
    self.logger.info({product: productName}, 
        'install product')
};

var ReqValidator = function (paramRuleDefine) {
    this.checkFuncs = [];
    for (var i in paramRuleDefine) {
        var rule = paramRuleDefine[i];
        if (!rule.optional) {
            this.checkFuncs.push(
                requiredParamCheckFunc(rule.field, 
                                       getValidateFunc(rule.type))); 
        } else {
            this.checkFuncs.push(
                optionalParamCheckFunc(rule.field, 
                                       getValidateFunc(rule.type))); 
        }
    }
};

ReqValidator.prototype.check = function(obj) {
    for (var i in this.checkFuncs) {
        this.checkFuncs[i](obj);
    }
};

function getValidateFunc(type) {
    switch (type) {
    case 'string':
        return function (value) { return typeof value == 'string';};
    case 'int':
        return validator.isInt;
    default:
        return doNothing;
    }
}

function optionalParamCheckFunc(field, validateFunc) {
    return function (objToCheck) {
        if (!objToCheck[field]) {
            return;
        }
        if (!validateFunc(objToCheck[field])) {
            throw new restify.InvalidArgumentError(
                'param ' + field + ' is not valid');
        }
    };
}

function requiredParamCheckFunc(field, validateFunc) {
    return function (objToCheck) {
        if (!objToCheck.hasOwnProperty(field)) {
            throw new restify.MissingParameterError(
                'missing required field ' + field);
        }
        if (!validateFunc(objToCheck[field])) {
            throw new restify.InvalidArgumentError(
                'type of field ' + field + ' is not valid');
        }
    };
}

function makeCommonHandler(reqValidator, func) {
    return function (req, res, next) {
        try {
            reqValidator.check(req.params);
            func(req, res, next);
        } catch (err) {
            req.log.debug({err: err}, "fail to load error");
            if (err instanceof SdkError) {
                res.send({code: err.code});
            } else {
                req.log.debug({req : req, err: err, params: req.params}, 
                    'param error');
                next(err);
            }
        }
    };
}


