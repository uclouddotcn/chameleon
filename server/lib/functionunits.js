
function FunctionUnit() {
    this.funcunits = {};
}

FunctionUnit.prototype.register = function (name, inst) {
    this.funcunits[name] = inst;
};

FunctionUnit.prototype.getStatus = function () {
    var res = {};
    var self = this;
    Object.keys(this.funcunits).forEach(function (name) {
        res[name] = self.funcunits[name].status;
    });
    return res;
}


var funcUnits = new FunctionUnit();

module.exports.register = function (name, inst) {
    return funcUnits.register(name, inst);
};

module.exports.getStatus = function () {
    return funcUnits.getStatus();
};
