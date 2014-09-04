var validator = require('validator');
var util = require('util');

function Checker() {
    this.name = null;
    this.checker = null;
    this.optional = false;
}

Checker.prototype.init = function (name, paramDesc) {
    this.name = name;
    if (paramDesc instanceof Object) {
        this.checker = [];
        for (var paramName in paramDesc) {
            if (!paramDesc.hasOwnProperty(paramName)) {
                continue;
            }
            var checker = new Checker();
            checker.init(paramName, paramDesc[paramName]);
            this.checker.push(checker);
        }
        this.optional = this.checker.some(checkOptional);
    } else {
        var optional = false;
        if (paramDesc.charAt(0) == '?') {
            optional = true;
            paramDesc = paramDesc.slice(1);
        }
        var func = findChecker(paramDesc);
        this.checker = function (value) {
            if (!func(value)) {
                throw new Error('the type of field ' + 
                    this.name + ' not correct');
            }
        }
        this.optional = optional;
    }
};

Checker.prototype.check = function (value) {
    if (util.isArray(this.checker)) {
        this.checker.forEach(checkValueIfError.bind(undefined, value));        
    } else {
        return this.checker(value);
    }
};


function checkOptional(checker) {
    return checker.optional;
}

function checkValueIfError(value, checker) {
    if (!(value.hasOwnProperty(checker.name))) {
        if (checker.optional) {
            return;
        } else {
            throw new Error('miss requied value ' + checker.name);
        }
    }
    checker.check(value[checker.name]);
}

function doNothing(value) {
    return true;
}

function findChecker(desc) {
    switch (desc) {
    case 'string':
        return doNothing;
    case 'integer':
        return validator.isInt;
    case 'ip':
        return validator.isIP;
    case 'numetric':
        return validator.isNumeric;
    default:
        throw new Error('unknow type ' + desc);
    }
}

module.exports.createChecker = function (paramDesc) {
    var checker = new Checker();
    checker.init(null, paramDesc);
    return checker;
}


