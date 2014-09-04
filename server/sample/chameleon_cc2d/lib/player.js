function makeGetter(key) {
    return function() { 
        return this._playerInfo[key];
    };
}

var Player = function (playerInfo) {
    this._playerInfo = playerInfo;
    this.notifyEvents = playerInfo.notifyEvent || [];
    delete playerInfo.notifyEvent;

    for (var k in playerInfo) {
        Object.defineProperty(this, k, {
            get: makeGetter(k),
            enumerable: true,
        });
    }

    Object.defineProperty(this, 'info', {
        get: function() {return playerInfo;},
        enumerable: true,
    });
};

Player.prototype.addEvent = 
function (event, info) {
    this.notifyEvents.push({
        event: event,
        info: info
    });
};

Player.prototype.clearEvents =
function() {
    this.notifyEvents = [];
};

Player.prototype.addMoney =
function (amount) {
    this._playerInfo.money += amount;
};

Player.prototype.addProduct =
function (productId, amount) {
    if (!this._playerInfo.items) {
        this._playerInfo.items = {};
    }
    if (!this._playerInfo.items[productId]) {
        this._playerInfo.items[productId] = amount;
    } else {
        this._playerInfo.items[productId] += amount;
    }
}

Player.prototype.getProductCount =
function (productId) {
    if (!this._playerInfo.items) {
        this._playerInfo.items = {};
    }
    var count = this._playerInfo.items[productId];
    return count || 0;
}

module.exports.create = function (playerInfo) {
    return new Player(playerInfo);
};



