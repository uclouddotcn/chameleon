
function ProductSummarizer ()  {
    this.clear();
}

/**
 * add login event to this product
 * @param success is login succeed
 */
ProductSummarizer.prototype.addLogin = function (success) {
    if (success) {
        this.loginStatus.success += 1;
    } else {
        this.loginStatus.failure += 1;
    }
    this.loginStatus.total += 1;
};

ProductSummarizer.prototype.addPay = function (success) {
    if (success) {
        this.payStatus.success += 1;
    } else {
        this.payStatus.failure += 1;
    }
};

ProductSummarizer.prototype.addDisgard = function () {
    this.payStatus.disgard += 1;
};

ProductSummarizer.prototype.addPrePay = function () {
    this.payStatus.start += 1;
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

function EventSummarizer(eventCenter, statLogger) {
    this._productSum = {};
    this._cmdSummary = {};
    this._statLogger = statLogger;
    this._lastChecktime = 0;
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

    eventCenter.on('_cmd_latency', function (url, latency) {
        self.addLatency(url, latency);
    });
    this.reset();
}

EventSummarizer.prototype.getSum = function (productName) {
    var product = this._productSum[productName];
    if (!product) {
        product = this._productSum[productName] = new ProductSummarizer(60*1000);
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

EventSummarizer.prototype.addLatency = function (url, latency) {
    var cs = this._cmdSummary[url];
    if (!cs) {
        cs = this._cmdSummary[url] = {
            min: -1,
            max: -1,
            count: 0,
            latency: 0
        };
    }
    if (cs.min === -1 || latency < cs.min) {
        cs.min = latency;
    }
    if (latency > cs.max) {
        cs.max = latency;
    }
    cs.count++;
    cs.latency += latency;
};

EventSummarizer.prototype.reset = function () {
    var self = this;
    setTimeout(function () {
        self.reset();
        self.doLog();
        self.clear();
    }, 60000)
};

EventSummarizer.prototype.doLog = function () {
    var self = this;
    this._statLogger.info({product: this._productSum, cmd: Object.keys(this._cmdSummary).map(function (key) {
        var a = self._cmdSummary[key];
        return {
            min: a.min,
            max: a.max,
            latency: a.count === 0 ? -1 : Math.round(a.latency / a.count)
        };
    })
    });
};

EventSummarizer.prototype.getSummary = function () {
    var self = this;
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
        },
        cmd: Object.keys(this._cmdSummary).map(function (key) {
            var a = self._cmdSummary[key];
            return {
                min: a.min,
                max: a.max,
                latency: a.count === 0 ? -1 : Math.round(a.latency / a.count)
            };
        })
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

EventSummarizer.prototype.clear = function () {
    var self = this;
    Object.keys(this._productSum).forEach(function (key) {
        self._productSum[key].clear();
    });
    Object.keys(self._cmdSummary).forEach(function (key) {
        self._cmdSummary[key].min = -1;
        self._cmdSummary[key].max = -1;
        self._cmdSummary[key].count = 0;
        self._cmdSummary[key].latency = 0;
    });

}


module.exports.createEventSum = function (eventCenter, statLogger) {
    return new EventSummarizer(eventCenter, statLogger);
};
