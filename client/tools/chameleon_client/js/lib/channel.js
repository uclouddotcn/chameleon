var _ = require('underscore');
var pathLib = require('path');
var fs = require('fs-extra');

function getOverlayPath(position){
    var path = 'icon-decor-';
    if(position === 1) path += 'leftup';
    if(position === 2) path += 'leftdown';
    if(position === 3) path += 'rightup';
    if(position === 4) path += 'rightdown';
    return path + '.png';
}

function ChannelMeta(name, metaInfo, configRoot) {
    this._pkgsuffix = metaInfo.pkgsuffix || null;
    if(metaInfo.splashscreen == 1)
        this.splash = '1';
    if(metaInfo.splashscreen == 2)
        this.splash = true;
    this.iconFlag = metaInfo.icon;
    this.sdkName = metaInfo.sdk;
    this.channelName = name;
    this.desc = metaInfo.name;
    this.configRoot = configRoot;
}

ChannelMeta.prototype.getSplashScreenPath = function (landscape) {
    if (this.splash === '1') {
        var target = pathLib.join(this.configRoot, 'channelinfo', this.channelName, 'drawable', 'splashscreen',
            landscape ? 'landscape' : 'portrait');
        if (fs.existsSync(target+'.png')) {
            return target+'.png';
        } else if (fs.existsSync(target+'.jpg')) {
            return target+'.jpg';
        } else {
            return null;
        }

    } else if (this.splash) {
        return true; // channel have default splash screen
    } else {
        return null;
    }
};

ChannelMeta.prototype.getOverlayPath = function (position) {
    var overlay = pathLib.join(this.configRoot, 'channelinfo',
            this.channelName,
            'drawable',
            'drawable-xhdpi',
            getOverlayPath(position));
    if(!fs.existsSync(overlay))
        return null;
    else
        return overlay;
};

ChannelMeta.prototype.checkPackageName = function (pkgName) {
    if (this._pkgsuffix === null || this._pkgsuffix.length === 0) {
        return null;
    }
    var p = new RegExp(this._pkgsuffix);
    var m = p.exec(pkgName);
    var l = this._pkgsuffix.length;
    if (!m) {
        if (this._pkgsuffix.substr(l-1, 1) === '$') {
            return "包名必须需要以'" + this._pkgsuffix.substr(0, l-1)+ "'结尾";
        } else if (this._pkgsuffix.substr(0, 1) === '^') {
            return "包名必须需要以'" + this._pkgsuffix.substr(1, l-1)+ "'开头";
        } else {
            return "包名必须包含'" + this._pkgsuffix + "'";
        }
    } else {
        return null
    }

};

ChannelMeta.prototype.newChannel = function () {
    var channel = new Channel();
    channel._meta = this;
    channel.config.icon = this.icon == 1 ? {} : undefined;
    channel.config.SDKName = this.sdkName;
    channel.config.isGlobalConfig = true;
    return channel;
}

function SDKMeta(rawMeta) {
    _.extend(this, rawMeta);
}

SDKMeta.prototype.newSDK = function () {
    var sdk = new SDK();
    sdk.initFromMeta(this);
    return sdk;
};

SDKMeta.prototype.newFromDB = function (obj) {
    var sdk = new SDK();
    sdk.initFromDB(this, obj);
    return sdk;
};

SDKMeta.prototype.genClientCfg = function (sdk) {
    var sdkConfig = {
        name: this.name,
        type: 'pay,user',
        ignoreFields: [],
        config: _.extend({}, sdk.config)
    };
    var cfgitem = this.cfgitem;
    for(var j=0; j<cfgitem.length; j++){
        var name = cfgitem[j].name;
        if (sdkConfig.config.hasOwnProperty(name)) {
            sdkConfig.config[name] = sdkConfig.config[name].toString();
        }
        if(cfgitem[j].ignoreInA){
            sdkConfig.ignoreFields.push(name);
        }
    }
    return sdkConfig;
};

function SDK() {
}

SDK.prototype.genClientCfg = function () {
    return this._meta.genClientCfg(this);
};

SDK.prototype.genServerCfg = function () {

}

Object.defineProperty(SDK.prototype, "desc", {
    get: function () {
        return this._meta.desc;
    }
});

Object.defineProperty(SDK.prototype, "name", {
    get: function () {
        return this._meta.name;
    }
});

SDK.prototype.initFromDB = function (meta, obj) {
    this._meta = meta;
    _.assign(this, obj);
};

SDK.prototype.initFromMeta = function (meta) {
    this._meta = meta;
    this.version = this._meta.version;
    this.svrver = meta.svrver;
    this.config = {};
};

SDK.prototype.toJson = function() {
    return {
        name: this._meta.name,
        version: this.version,
        svrver: this.svrver,
        config: this.config
    }
};

function Channel(meta) {
    this._meta = meta;
    this.checked = false;
    this.id = 0;
    this._desc = null;
    this.config ={};
    this.icon = null;
    this.signConfig = {};
    this.sdks = [];
    Object.defineProperty(this, 'channelName', {
        get: function () {
            return this._meta.channelName;
        }
    });
    Object.defineProperty(this, 'desc', {
        get: function () {
            return this._desc || this._meta.desc;
        },
        set: function (desc) {
            this._desc = desc;
        }
    });
    Object.defineProperty(this, 'splashMode', {
        get: function () {
            return this._meta.splash
        }
    });
    Object.defineProperty(this, 'hasIcon', {
        get: function () {
            return !!this._meta.iconFlag;
        }
    });
    Object.defineProperty(this, 'meta', {
        get: function () {
            return this._meta;
        }
    });
}

Channel.prototype.setIcon = function (base, position) {
    if (!this.config.icon) {
        this.config.icon = {};
    }
    this.config.icon.path = base;
    this.config.icon.position = position || this.config.icon.position;
};

Channel.prototype.setIconPosition = function (position) {
    if (!this.config.icon) {
        this.config.icon = {};
    }
    this.config.icon.position = position;
};



module.exports = {
    Channel: Channel,
    ChannelMeta: ChannelMeta,
    SDKMeta: SDKMeta
};
