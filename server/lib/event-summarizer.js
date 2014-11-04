
function ProductSummarizer (checktimePeriod)  {
    this._period = checktimePeriod;
    this._lastChecktime = 0;
}

/**
 * add login event to this product
 * @param success is login succeed
 */
ProductSummarizer.prototype.addLogin = function (success) {
    this.ifAcrossChecktime();
    if (success) {
        this.loginStatus.success += 1;
    } else {
        this.loginStatus.failure += 1;
    }
    this.loginStatus.total += 1;
};

ProductSummarizer.prototype.addPay = function (success) {
    this.ifAcrossChecktime();
    if (success) {
        this.payStatus.success += 1;
    } else {
        this.payStatus.failure += 1;
    }
};

ProductSummarizer.prototype.addDisgard = function () {
    this.ifAcrossChecktime();
    this.payStatus.disgard += 1;
};

ProductSummarizer.prototype.addPrePay = function () {
    this.ifAcrossChecktime();
    this.payStatus.start += 1;
};

ProductSummarizer.prototype.ifAcrossChecktime = function () {
    var now = Date.now();
    if (Date.now() - this._lastChecktime > this._period) {
        this.clear();
        this._lastChecktime = now;
    }
};

ProductSummarizer.prototype.clear = function () {
    this.loginStatus = {
        total: 0,
        success: 0,
        failure: 0
    };
    this.payStatus = {
        start: 0,
        success: 0,
        failure: 0,
        disgard:0
    }
};

function EventSummarizer(eventCenter) {
    this._productSum = {};
    var self = this;
    eventCenter.on('login', function (product, channel, uid, newOthers) {
        self.getSum(product).addLogin(true);
    });

    eventCenter.on('login-fail', function (product, channel, err) {
        self.getSum(product).addLogin(false);
    });

    eventCenter.on('pre-pay', function (orderInfo) {
        self.getSum(orderInfo.product).addPrePay();
    });

    eventCenter.on('pay', function (orderInfo) {
        self.getSum(orderInfo.product).addPay(true);
    });

    eventCenter.on('pay-fail', function (orderInfo, code) {
        self.getSum(orderInfo.product).addPay(false);
    });

    eventCenter.on('disgard-order', function (orderInfo) {
        self.getSum(orderInfo.product).addDisgard();
    });
}

EventSummarizer.prototype.getSum = function (productName) {
    var product = this._productSum[productName];
    if (!product) {
        product = this._productSum[productName] = new ProductSummarizer(600*1000);
    }
    return product;
};

EventSummarizer.prototype.getProductSummary = function (productName) {
    var product = this._productSum[productName];
    if (!product) {
        return new Error("unknown products " + productName);
    }
    return {
        login: product.loginStatus,
        pay: product.payStatus
    };
};

EventSummarizer.prototype.getSummary = function () {
    var res = {
        login: {
            total: 0,
            success: 0,
            failure: 0
        },
        pay: {
            start: 0,
            success: 0,
            failure: 0,
            disgard:0
        }
    };
    for (var i in this._productSum) {
        var product = this._productSum[i];
        res.login.total += product.loginStatus.total;
        res.login.success += product.loginStatus.success;
        res.login.failure += product.loginStatus.failure;

        res.pay.start += product.payStatus.start;
        res.pay.success += product.payStatus.success;
        res.pay.failure += product.payStatus.failure;
        res.pay.disgard += product.payStatus.disgard;
    }
    return res;
};


module.exports.createEventSum = function (eventCenter) {
    return new EventSummarizer(eventCenter);
};
