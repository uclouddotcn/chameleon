function ChannelMeta(name, metaInfo) {
    this._pkgsuffix = metaInfo.pkgsuffix || null;
    if(metaInfo.splashscreen == 1)
        this.splash = '1';
    if(metaInfo.splashscreen == 2)
        this.splash = true;
    this.iconFlag = metaInfo.icon;
    this.sdkName = metaInfo.sdk;
    this.channelName = name;
    this.desc = metaInfo.name;
}

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

}

function Channel(meta) {
    this._meta = meta;
    this.checked = false;
    this.id = 0;
    this._desc = null;
    this.config ={};
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

module.exports = {
    Channel: Channel,
    ChannelMeta: ChannelMeta
};