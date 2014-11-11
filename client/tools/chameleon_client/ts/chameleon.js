/// <reference path="declare/node.d.ts"/>
/// <reference path="declare/async.d.ts"/>
/// <reference path="declare/ncp.d.ts"/>
/// <reference path="declare/fs-extra.d.ts"/>
/// <reference path="declare/xml2js.d.ts"/>
/// <reference path="declare/adm-zip.d.ts"/>
var fs = require('fs-extra');
var childprocess = require("child_process");
var pathLib = require("path");
var os = require('os');
var async = require('async');
var xml2js = require('xml2js');
var util = require('util');
var AdmZip = require('adm-zip');
var urlLib = require('url');

var DESITY_MAP = {
    medium: 'drawable-mdpi',
    high: 'drawable-hdpi',
    xhigh: 'drawable-xhdpi',
    xxhigh: 'drawable-xxhdpi',
    xxxhigh: 'drawable-xxxhdpi'
};

var ChameleonError = (function () {
    function ChameleonError(code, message, name) {
        if (typeof message === "undefined") { message = ""; }
        if (typeof name === "undefined") { name = ""; }
        this.name = name;
        this.message = message;
        this.errCode = code;
    }
    ChameleonError.newFromError = function (err, code) {
        if (typeof code === "undefined") { code = 1 /* UNKNOWN */; }
        var e = new ChameleonError(code);
        e.name = err.name;
        e.message = err.message;
        return e;
    };
    return ChameleonError;
})();
exports.ChameleonError = ChameleonError;

var Logger = (function () {
    function Logger() {
    }
    Logger.log = function (message, err) {
        if (typeof err === "undefined") { err = null; }
        var logmsg = message;
        if (err) {
            logmsg = logmsg + '\n' + err.message + '\n' + err['stacktrace'];
        }
        console.log(logmsg);
    };
    return Logger;
})();

(function (ErrorCode) {
    ErrorCode[ErrorCode["UNKNOWN"] = 1] = "UNKNOWN";
    ErrorCode[ErrorCode["SDK_PATH_ILLEGAL"] = 2] = "SDK_PATH_ILLEGAL";
    ErrorCode[ErrorCode["OP_FAIL"] = 3] = "OP_FAIL";
    ErrorCode[ErrorCode["CFG_ERROR"] = 4] = "CFG_ERROR";
})(exports.ErrorCode || (exports.ErrorCode = {}));
var ErrorCode = exports.ErrorCode;

var Utils = (function () {
    function Utils() {
    }
    Utils.dumpJsonFile = function (obj, dest, callback) {
        fs.writeJson(dest, obj, { encodiing: 'utf-8' }, callback);
    };
    return Utils;
})();

var AndroidEnv = (function () {
    function AndroidEnv(db) {
        this.db = db;
    }
    AndroidEnv.prototype.initFromDB = function (cb) {
        var _this = this;
        this.db.get('env', 'sdkpath', function (err, value) {
            if (err || !value) {
                cb(null);
                return;
            }
            var obj = value;
            var p = obj['value'];
            _this.verifySDKPath(p, function (err) {
                if (err) {
                    cb(null);
                    return;
                }
                _this.sdkPath = obj['value'];
                cb(null);
            });
        });
    };

    AndroidEnv.prototype.updateProject = function (projectPath, target, cb) {
        childprocess.execFile(this.androidBin, [
            'update', 'project', '-p', projectPath, '-t',
            target, '-s'], { timeout: 30000 }, function (err, stdout, stderr) {
            if (err) {
                console.log('exec update project error: \n' + err.message + '\n signal: ' + err['signal'] + ', code:' + err['code']);
                console.log('stdout is \n' + stdout.toString('utf8'));
                console.log('stderr is \n' + stderr.toString('utf8'));
                cb(ChameleonError.newFromError(err));
                return;
            }
            cb(null);
        });
    };

    AndroidEnv.prototype.isEnvSet = function () {
        return this._sdkPath != null;
    };

    Object.defineProperty(AndroidEnv.prototype, "sdkPath", {
        get: function () {
            return this._sdkPath;
        },
        set: function (p) {
            this._sdkPath = p;
            this.androidBin = AndroidEnv.getAndroidBin(p);
            this.db.set('env', 'sdkpath', { value: p });
        },
        enumerable: true,
        configurable: true
    });


    AndroidEnv.getAndroidBin = function (p) {
        var s = '';
        if (os.platform() === 'win32') {
            s = pathLib.join(p, 'tools', 'android.bat');
        } else {
            s = pathLib.join(p, 'tools', 'android');
        }
        return s;
    };

    AndroidEnv.prototype.verifySDKPath = function (p, cb) {
        var androidBin = AndroidEnv.getAndroidBin(p);
        childprocess.execFile(androidBin, ['list', 'target'], { timeout: 30000 }, function (err, stdout, stderr) {
            if (err) {
                cb(new ChameleonError(2 /* SDK_PATH_ILLEGAL */, '非法的Android SDK路径，请确保路径在sdk路径下'));
                return;
            }
            return cb(null);
        });
    };
    return AndroidEnv;
})();
exports.AndroidEnv = AndroidEnv;

var ConfigItem = (function () {
    function ConfigItem(name, v) {
        this.name = name;
        this.value = v;
    }
    return ConfigItem;
})();

var ConfigItemType = (function () {
    function ConfigItemType(type, wrapFunc, initv) {
        this.type = type;
        this.wrapName = wrapFunc;
        this.initvalue = initv;
    }
    return ConfigItemType;
})();

var IT;
(function (IT) {
    IT[IT["String"] = 0] = "String";
    IT[IT["Int"] = 1] = "Int";
    IT[IT["Float"] = 2] = "Float";
    IT[IT["Boolean"] = 3] = "Boolean";
    IT[IT["Url"] = 4] = "Url";
})(IT || (IT = {}));

var ConfigDesc = (function () {
    function ConfigDesc() {
        this.items = [];
    }
    ConfigDesc.prototype.registerItem = function (name, type, defaultValue, ignore) {
        if (typeof defaultValue === "undefined") { defaultValue = null; }
        if (typeof ignore === "undefined") { ignore = false; }
        var item = ConfigDesc.gItemMaps[IT[type]];
        if (!item) {
            console.log('expect type ' + type);
            throw new ChameleonError(4 /* CFG_ERROR */, '无法找到类型' + type + '的配置');
        }
        this.items.push({ name: name, item: item, defaultValue: defaultValue, ignore: ignore });
    };

    ConfigDesc.prototype.registerItem1 = function (name, type, defaultValue, ignore) {
        if (typeof defaultValue === "undefined") { defaultValue = null; }
        if (typeof ignore === "undefined") { ignore = false; }
        var item = ConfigDesc.gItemMaps[type];
        if (!item) {
            console.log('expect type ' + type);
            throw new ChameleonError(4 /* CFG_ERROR */, '无法找到类型' + type + '的配置');
        }
        this.items.push({ name: name, item: item, defaultValue: defaultValue, ignore: ignore });
    };

    ConfigDesc.wrapName = function (cfgItem, ignore, name) {
        if (ignore) {
            return 'h' + name;
        } else {
            return cfgItem.wrapName(name);
        }
    };

    ConfigDesc.prototype.dumpJsonObj = function (obj) {
        var res = {};
        for (var i in this.items) {
            var item = this.items[i];
            var cfgitem = this.items[i].item;
            var name = this.items[i].name;
            res[ConfigDesc.wrapName(cfgitem, item.ignore, name)] = obj[name];
        }
        return res;
    };

    ConfigDesc.prototype.rewriteCfg = function (cfg) {
        for (var i in this.items) {
            var itemObj = this.items[i];
            if (!cfg.hasOwnProperty(itemObj.name)) {
                if (itemObj.hasOwnProperty('defaultValue')) {
                    cfg = itemObj.defaultValue;
                } else {
                    throw new ChameleonError(4 /* CFG_ERROR */, itemObj.name + "是必须的配置项");
                }
            } else {
            }
        }
        return cfg;
    };

    ConfigDesc.prototype.setFromJsonObj = function (jsonobj, target) {
        for (var i in this.items) {
            var item = this.items[i];
            var name = this.items[i].name;
            var cfgitem = this.items[i].item;
            var wrapname = ConfigDesc.wrapName(cfgitem, item.ignore, name);
            if (jsonobj[wrapname]) {
                target[name] = jsonobj[wrapname];
            } else {
                if (this.items[i].defaultValue) {
                    target[name] = item.defaultValue;
                } else {
                    target[name] = cfgitem.initvalue;
                }
            }
        }
    };

    ConfigDesc.prototype.initObj = function (target) {
        for (var i in this.items) {
            var item = this.items[i].item;
            var name = this.items[i].name;
            if (this.items[i].defaultValue) {
                target[name] = this.items[i].defaultValue;
            } else {
                target[name] = item.initvalue;
            }
        }
    };
    ConfigDesc.gItemMaps = {
        'String': new ConfigItemType("string", function (name) {
            return 's' + name;
        }, ''),
        'Int': new ConfigItemType('integer', function (name) {
            return 'l' + name;
        }, 0),
        'Float': new ConfigItemType('float', function (name) {
            return 'f' + name;
        }, 0.0),
        'Boolean': new ConfigItemType('bool', function (name) {
            return 'b' + name;
        }, true),
        'Url': new ConfigItemType("string", function (name) {
            return 's' + name;
        }, 'http://localhost')
    };
    return ConfigDesc;
})();

var GlobalCfg = (function () {
    function GlobalCfg() {
        GlobalCfg.gCfgDesc.initObj(this);
    }
    GlobalCfg.prototype.loadFromJson = function (a) {
        GlobalCfg.gCfgDesc.setFromJsonObj(a, this);
    };

    GlobalCfg.prototype.dumpJsonObj = function () {
        return GlobalCfg.gCfgDesc.dumpJsonObj(this);
    };

    GlobalCfg.prototype.cloneCfg = function () {
        return {
            appname: this.appname,
            landscape: this.landscape
        };
    };

    GlobalCfg.prototype.updateCfg = function (cfg) {
        var realCfg = GlobalCfg.gCfgDesc.rewriteCfg(cfg);
        this.appname = realCfg['appname'];
        this.landscape = realCfg['landscape'];
    };

    GlobalCfg._createCfgDesc = function () {
        var desc = new ConfigDesc();
        desc.registerItem('appname', 0 /* String */);
        desc.registerItem('landscape', 3 /* Boolean */);
        return desc;
    };
    GlobalCfg.gCfgDesc = GlobalCfg._createCfgDesc();
    return GlobalCfg;
})();

var SDKCfg = (function () {
    function SDKCfg(name, cfg, desc, ver, chamver, metaInfo) {
        this.name = name;
        this.cfg = cfg;
        this._desc = desc;
        this.ver = ver;
        this.chamver = new Version(chamver);
        this.metaInfo = metaInfo;
    }
    Object.defineProperty(SDKCfg.prototype, "sdkid", {
        get: function () {
            return this.metaInfo.name;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(SDKCfg.prototype, "channeldesc", {
        get: function () {
            return this.metaInfo.desc;
        },
        enumerable: true,
        configurable: true
    });

    SDKCfg.prototype.cloneCfg = function () {
        var a = {};
        for (var i in this.cfg) {
            a[i] = this.cfg[i];
        }
        return a;
    };

    SDKCfg.prototype.serverCfg = function () {
        return this.cfg;
    };

    SDKCfg.prototype.isUsingSDK = function (sdkid) {
        return this.sdkid === sdkid;
    };

    SDKCfg.prototype.updateCfg = function (cfg) {
        this.cfg = this.metaInfo.rewritePendingCfg(cfg);
    };

    SDKCfg.prototype.dumpJson = function (filename, cb) {
        var cfg = this.metaInfo.dumpJsonObj(this.cfg);
        cfg = this.metaInfo.scriptRewriteCfg(cfg);
        fs.writeJson(filename, {
            cfg: cfg,
            desc: this._desc,
            id: this.metaInfo.name,
            ver: this.ver,
            chamver: this.chamver.toString()
        }, { encoding: 'utf-8' }, cb);
        this.metaInfo.afterCfgSet(cfg);
    };

    Object.defineProperty(SDKCfg.prototype, "desc", {
        get: function () {
            if (!this._desc) {
                return this.name;
            } else {
                return this._desc;
            }
        },
        enumerable: true,
        configurable: true
    });

    SDKCfg.loadFromJson = function (infoJson, name, jsonobj) {
        var metaInfo = infoJson.getSDKMeta(jsonobj['id']);
        if (!metaInfo) {
            throw new ChameleonError(1 /* UNKNOWN */, "未知的sdk: " + jsonobj['id']);
        }
        var realCfg = metaInfo.loadFromJson(jsonobj['cfg']);
        return new SDKCfg(name, realCfg, jsonobj['desc'], jsonobj['ver'], jsonobj['chamver'], metaInfo);
    };
    return SDKCfg;
})();
exports.SDKCfg = SDKCfg;

var SDKLibInfo = (function () {
    function SDKLibInfo(name, version) {
        this.name = name;
        if (!version) {
            this.version = new Version('1.0.0');
            this.realVer = "0.0.0";
        } else {
            this.version = new Version(version.version);
            this.realVer = version.realVer;
        }
    }
    return SDKLibInfo;
})();
exports.SDKLibInfo = SDKLibInfo;

var Version = (function () {
    function Version(ver) {
        var t = ver.split('.');
        this.major = parseInt(t[0]);
        this.medium = parseInt(t[1]);
        if (t.length == 3) {
            this.minor = parseInt(t[2]);
        } else {
            this.minor = 0;
        }
    }
    Version.prototype.cmp = function (that) {
        if (this.major > that.major) {
            return 1;
        } else if (this.major < that.major) {
            return -1;
        } else {
            if (this.medium < that.medium) {
                return -1;
            } else if (this.medium > that.medium) {
                return 1;
            } else {
                if (this.minor < that.minor) {
                    return -1;
                } else if (this.minor > that.minor) {
                    return 1;
                } else {
                    return 0;
                }
            }
        }
    };

    Version.prototype.isMajorUpgrade = function (that) {
        return (this.major > that.major) || (this.major === that.major && this.medium > that.medium);
    };

    Version.prototype.toString = function () {
        return this.major + '.' + this.medium + '.' + this.minor;
    };
    return Version;
})();
exports.Version = Version;

var SDKMetaScript = (function () {
    function SDKMetaScript(path) {
        this._path = path;
        this.mod = require(path);
    }
    SDKMetaScript.prototype.rewriteCfg = function (cfg) {
        if (this.mod['rewriteCfg']) {
            return this.mod['rewriteCfg'](cfg);
        } else {
            return cfg;
        }
    };

    SDKMetaScript.prototype.afterCfgSet = function (cfg) {
        if (this.mod['afterCfgSet']) {
            this.mod['afterCfgSet'](cfg);
        }
    };
    return SDKMetaScript;
})();

var SDKMetaInfo = (function () {
    function SDKMetaInfo() {
    }
    SDKMetaInfo.loadFromJson = function (jsonobj, chameloenPath) {
        var res = new SDKMetaInfo();
        res.desc = jsonobj['desc'];
        res.name = jsonobj['name'];
        res.ver = jsonobj['version'];
        res.chamver = new Version(jsonobj['chamversion']);
        var itemcfg = jsonobj['cfgitem'];
        res.cfgdesc = new ConfigDesc();
        for (var itemname in itemcfg) {
            var type = itemcfg[itemname]['type'];
            type = type[0].toUpperCase() + type.substr(1);
            res.cfgdesc.registerItem1(itemname, type, itemcfg[itemname]['default'], itemcfg[itemname]['ignoreInA']);
        }
        if (jsonobj['script']) {
            var p = pathLib.join(chameloenPath, 'ChannelScript', jsonobj['script']);
            res.script = new SDKMetaScript(p);
        }
        return res;
    };

    SDKMetaInfo.prototype.loadFromJson = function (a) {
        var obj = {};
        this.cfgdesc.setFromJsonObj(a, obj);
        return obj;
    };

    SDKMetaInfo.prototype.dumpJsonObj = function (obj) {
        return this.cfgdesc.dumpJsonObj(obj);
    };

    SDKMetaInfo.prototype.initValue = function () {
        var res = {};
        this.cfgdesc.initObj(res);
        return res;
    };

    SDKMetaInfo.prototype.rewritePendingCfg = function (cfg) {
        return this.cfgdesc.rewriteCfg(cfg);
    };

    SDKMetaInfo.prototype.scriptRewriteCfg = function (cfg) {
        if (this.script) {
            return this.script.rewriteCfg(cfg);
        } else {
            return cfg;
        }
    };

    SDKMetaInfo.prototype.afterCfgSet = function (cfg) {
        if (this.script) {
            return this.script.afterCfgSet(cfg);
        }
    };
    return SDKMetaInfo;
})();
exports.SDKMetaInfo = SDKMetaInfo;

var ChannelMetaInfo = (function () {
    function ChannelMetaInfo() {
    }
    ChannelMetaInfo.loadFromJson = function (name, jsonobj) {
        var res = new ChannelMetaInfo();
        res.pkgsuffix = jsonobj['pkgsuffix'];
        res.desc = jsonobj['name'];
        res.sdk = jsonobj['sdk'];
        res.hasIcon = jsonobj['icon'];
        res.hasSplashScreen = jsonobj['splashscreen'] === 1;
        res.useDefaultSplash = jsonobj['splashscreen'] === 2;
        res.name = name;
        return res;
    };

    ChannelMetaInfo.prototype.loadFromRes = function (res) {
        this.icons = this._loadIconInfo(res);
        this.sc = this._loadSplashInfo(res);
    };

    ChannelMetaInfo.prototype._loadIconInfo = function (resPath) {
        var drawablePath = pathLib.join(resPath, 'drawable');
        var icon = {};
        var availableIconPos = [];
        for (var d in DESITY_MAP) {
            var leftup = pathLib.join(drawablePath, DESITY_MAP[d], 'icon-decor-leftup.png');
            var leftdown = pathLib.join(drawablePath, DESITY_MAP[d], 'icon-decor-leftdown.png');
            var rightup = pathLib.join(drawablePath, DESITY_MAP[d], 'icon-decor-rightup.png');
            var rightdown = pathLib.join(drawablePath, DESITY_MAP[d], 'icon-decor-rightdown.png');
            var flag = 0xF;
            var iconOfDesity = [];
            if (fs.existsSync(leftup)) {
                iconOfDesity.push(leftup);
            } else {
                iconOfDesity.push(null);
                flag &= ~(0x1);
            }
            if (fs.existsSync(leftdown)) {
                iconOfDesity.push(leftdown);
            } else {
                iconOfDesity.push(null);
                flag &= ~(0x1 << 1);
            }
            if (fs.existsSync(rightup)) {
                iconOfDesity.push(rightup);
            } else {
                iconOfDesity.push(null);
                flag &= ~(0x1 << 2);
            }
            if (fs.existsSync(rightdown)) {
                iconOfDesity.push(rightdown);
            } else {
                iconOfDesity.push(null);
                flag &= ~(0x1 << 3);
            }
            if (flag == 0) {
                continue;
            }
            icon[d] = iconOfDesity;
            availableIconPos.push(flag);
        }
        this.availableIconPos = availableIconPos.reduce(function (x, y) {
            return x & y;
        }, 0xF);
        return icon;
    };

    ChannelMetaInfo.prototype._loadSplashInfo = function (resPath) {
        var scPath = pathLib.join(resPath, 'drawable', 'splashscreen');
        if (!fs.existsSync(scPath)) {
            return null;
        }
        var res = { portrait: [], landscape: [] };
        var files = fs.readdirSync(scPath);
        var TYPE_MAP = {
            m: 'medium',
            h: 'high',
            xh: 'xhigh'
        };
        var re = /(\w+)_(\w+)_(\d+)_(\d+)(_(.+))?\.(png|jpg)/;
        for (var f in files) {
            var aa = re.exec(files[f]);
            if (!aa) {
                continue;
            }
            var o = {
                orient: aa[1],
                density: TYPE_MAP[aa[2]],
                width: parseInt(aa[3]),
                height: parseInt(aa[4]),
                desc: aa[3] + '*' + aa[4] + ' ' + aa[6],
                path: pathLib.join(scPath, files[f])
            };
            res[o.orient].push(o);
        }
        return res;
    };

    ChannelMetaInfo.prototype.getIconOverlay = function (appIconList) {
        var res = {};
        for (var i in appIconList) {
            if (!this.icons[i]) {
                continue;
            }
            res[i] = {
                base: appIconList[i],
                overlay: this.icons[i]
            };
        }
        return res;
    };

    ChannelMetaInfo.prototype.getSplashScreen = function (orient) {
        return this.sc[orient];
    };

    ChannelMetaInfo.prototype.validatePkgName = function (pkgName) {
        if (this.pkgsuffix) {
            var r = new RegExp(this.pkgsuffix.replace(/\./g, '\\.'));
            if (!r.test(pkgName)) {
                if (this.pkgsuffix[0] === '^') {
                    throw new Error('包名配置错误，该渠道要求包名必须为 "' + this.pkgsuffix.slice(1) + '" 开头');
                } else {
                    throw new Error('包名配置错误，该渠道要求包名必须为 "' + this.pkgsuffix.slice(0, this.pkgsuffix.length - 1) + '" 结尾');
                }
            }
        }
    };
    return ChannelMetaInfo;
})();
exports.ChannelMetaInfo = ChannelMetaInfo;

var InfoJson = (function () {
    function InfoJson() {
    }
    InfoJson.loadFromJson = function (jsonobj, chameleonPath) {
        var res = new InfoJson();
        var sdkcfg = jsonobj['channels'];
        res.sdkmetas = {};
        res.channels = {};
        for (var i in sdkcfg) {
            var sdkmeta = SDKMetaInfo.loadFromJson(sdkcfg[i], chameleonPath);
            res.sdkmetas[sdkmeta.name] = sdkmeta;
        }
        var channellist = jsonobj['channellist'];
        for (var name in channellist) {
            var chmeta = ChannelMetaInfo.loadFromJson(name, channellist[name]);
            var resFolder = pathLib.join(chameleonPath, 'channelinfo', name);
            if (fs.existsSync(resFolder)) {
                chmeta.loadFromRes(resFolder);
            }
            res.channels[name] = chmeta;
        }
        res.version = new Version(jsonobj['version']);
        return res;
    };

    InfoJson.prototype.getSDKMeta = function (name) {
        return this.sdkmetas[name];
    };

    InfoJson.prototype.getChannelMeta = function (name) {
        return this.channels[name];
    };

    InfoJson.prototype.versionString = function () {
        return this.version.toString();
    };

    InfoJson.prototype.getChannelMetaInfos = function () {
        var res = [];
        for (var i in this.channels) {
            res.push(this.channels[i]);
        }
        return res;
    };

    InfoJson.prototype.getSDKMetaInfos = function () {
        var res = [];
        for (var i in this.sdkmetas) {
            res.push(this.sdkmetas[i]);
        }
        return res;
    };
    return InfoJson;
})();
exports.InfoJson = InfoJson;

var ProjectCfg = (function () {
    function ProjectCfg() {
        this.globalCfg = new GlobalCfg();
    }
    ProjectCfg.prototype.dumpJsonObj = function () {
        var res = {};
        res['globalcfg'] = this.globalCfg.dumpJsonObj();
        res['version'] = this.version.toString();
        return res;
    };

    ProjectCfg.prototype.updateGlobalCfg = function (cfg) {
        this.globalCfg.updateCfg(cfg);
        return this.dumpJsonObj();
    };
    return ProjectCfg;
})();

var DependLibType;
(function (DependLibType) {
    DependLibType[DependLibType["user"] = 0] = "user";
    DependLibType[DependLibType["pay"] = 1] = "pay";
})(DependLibType || (DependLibType = {}));

var DependLib = (function () {
    function DependLib() {
    }
    DependLib.prototype.loadFromJson = function (jsonObj) {
        this.cfg = jsonObj['cfg'];
        this.sdkid = jsonObj['name'];
    };

    DependLib.prototype.dumpJsonObj = function () {
        var res = {};
        res['name'] = this.sdkid;
        res['cfg'] = this.cfg;
        return res;
    };
    return DependLib;
})();

(function (IconCornerPos) {
    IconCornerPos[IconCornerPos["UPPER_LEFT"] = 0] = "UPPER_LEFT";
    IconCornerPos[IconCornerPos["UPPER_RIGHT"] = 1] = "UPPER_RIGHT";
    IconCornerPos[IconCornerPos["DOWN_LEFT"] = 2] = "DOWN_LEFT";
    IconCornerPos[IconCornerPos["DOWN_RIGHT"] = 3] = "DOWN_RIGHT";
})(exports.IconCornerPos || (exports.IconCornerPos = {}));
var IconCornerPos = exports.IconCornerPos;

var ChannelCfg = (function () {
    function ChannelCfg(prj, metaInfo, channelPath) {
        this.metaInfo = metaInfo;
        this.channelPath = channelPath;
        this._prj = prj;
        this._packageName = '.' + metaInfo.name;
    }
    ChannelCfg.loadFromJson = function (prj, jsonobj, channelMeta, channelPath) {
        var res = new ChannelCfg(prj, channelMeta, channelPath);
        if (jsonobj.splashscreen) {
            res._splashscreen = jsonobj.splashscreen;
        }
        if (jsonobj.icons) {
            res._icons = jsonobj.icons;
        }
        if (jsonobj.signcfg) {
            res.signCfg = jsonobj.signcfg;
        }
        for (var i in jsonobj.dependLibs) {
            var d = jsonobj.dependLibs[i];
            var types = d.type.split(',');
            var dependlib = new DependLib();
            dependlib.loadFromJson(d);
            types.map(function (v) {
                if (v === 'user') {
                    res.userLib = dependlib;
                } else if (v === 'pay') {
                    res.payLib = dependlib;
                }
            });
        }
        res._packageName = jsonobj.package;
        return res;
    };

    Object.defineProperty(ChannelCfg.prototype, "splashscreen", {
        get: function () {
            if (!this.hasSplashScreen || !this._splashscreen) {
                return null;
            } else {
                return pathLib.join(this.channelPath, this._splashscreen);
            }
        },
        set: function (p) {
            this._splashscreen = p;
        },
        enumerable: true,
        configurable: true
    });


    Object.defineProperty(ChannelCfg.prototype, "name", {
        get: function () {
            return this.metaInfo.name;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "userSDK", {
        get: function () {
            if (this.userLib) {
                return this.userLib.cfg;
            } else {
                return null;
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "paySDK", {
        get: function () {
            if (this.payLib) {
                return this.payLib.cfg;
            } else {
                return null;
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "requiredSDK", {
        get: function () {
            return this.metaInfo.sdk;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "packageName", {
        get: function () {
            if (this._packageName) {
                if (this._packageName[0] === '.') {
                    return this._prj.packageName + this._packageName;
                } else {
                    return this._packageName;
                }
            } else {
                return this._prj.packageName;
            }
            return this.metaInfo.pkgsuffix;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "hasIcon", {
        get: function () {
            return this.metaInfo.hasIcon;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "hasSplashScreen", {
        get: function () {
            return this.metaInfo.hasSplashScreen;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "desc", {
        get: function () {
            return this.metaInfo.desc;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "icons", {
        get: function () {
            return this._icons;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "shownIcon", {
        get: function () {
            if (!this._shownIcon) {
                this.loadShownIcon();
            }
            return this._shownIcon;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(ChannelCfg.prototype, "orphan", {
        get: function () {
            return this.channelPath == null;
        },
        enumerable: true,
        configurable: true
    });

    ChannelCfg.prototype.setSignCfg = function (cfg) {
        this.signCfg = cfg;
    };

    ChannelCfg.prototype.dumpJsonObj = function () {
        var res = {};
        res['package'] = this._packageName;
        res['splashscreen'] = this._splashscreen || (this.metaInfo.useDefaultSplash ? "default" : null);
        res['icons'] = this._icons;
        res['signcfg'] = this.signCfg;
        if (this.userLib.cfg == this.payLib.cfg) {
            var dl = this.userLib.dumpJsonObj();
            dl.type = 'user,pay';
            res['dependLibs'] = [dl];
        } else {
            var dlUser = this.userLib.dumpJsonObj();
            dlUser.type = 'user';
            var dlPay = this.payLib.dumpJsonObj();
            dlPay.type = 'pay';
            res['dependLibs'] = [dlUser, dlPay];
        }
        return res;
    };

    ChannelCfg.prototype.setUserLib = function (sdk) {
        this.userLib = new DependLib();
        this.userLib.cfg = sdk.name;
        this.userLib.sdkid = sdk.metaInfo.name;
    };

    ChannelCfg.prototype.validatePkgName = function (pkgName) {
        this.metaInfo.validatePkgName(pkgName);
    };

    ChannelCfg.prototype.setPackageName = function (pkg) {
        var prefix = pkg.substr(0, this._prj.packageName.length + 1);
        if (prefix === this._prj.packageName + '.') {
            this._packageName = pkg.substr(this._prj.packageName.length);
        } else {
            this._packageName = pkg;
        }
    };

    ChannelCfg.prototype.setPayLib = function (sdk) {
        this.payLib = new DependLib();
        this.payLib.cfg = sdk.name;
        this.payLib.sdkid = sdk.metaInfo.name;
    };

    ChannelCfg.prototype.setIconPos = function (icon) {
        this._icons = { position: icon };
    };

    ChannelCfg.prototype.isUsingCfg = function (cfgName) {
        return this.userLib.cfg === cfgName || this.payLib.cfg === cfgName;
    };

    ChannelCfg.prototype.serverCfg = function () {
        var res = {};
        if (this.payLib == this.userLib) {
            var dl = this.userLib.dumpJsonObj();
            dl.type = 'user,pay';
            res['sdks'] = [dl];
        } else {
            var dlUser = this.userLib.dumpJsonObj();
            dlUser.type = 'user';
            var dlPay = this.payLib.dumpJsonObj();
            dlPay.type = 'pay';
            res['sdks'] = [dlUser, dlPay];
        }
        return res;
    };

    ChannelCfg.prototype.loadShownIcon = function () {
        if (this.hasIcon && this.channelPath) {
            var density = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi'];
            for (var i in density) {
                var p = pathLib.join(this.channelPath, 'res', density[i], 'chameleon_icon.png');
                if (fs.existsSync(p)) {
                    this._shownIcon = p;
                    break;
                }
            }
        }
    };
    return ChannelCfg;
})();
exports.ChannelCfg = ChannelCfg;

function guessWorkDir() {
    var p = pathLib.join(pathLib.dirname(process.execPath), 'env.json');
    if (fs.existsSync(p)) {
        return pathLib.dirname(process.execPath);
    }
    p = pathLib.join(process.cwd(), 'env.json');
    if (fs.existsSync(p)) {
        return process.cwd();
    }
    return null;
}

var ChameleonTool = (function () {
    function ChameleonTool() {
    }
    ChameleonTool.initTool = function (db, cb) {
        var res = new ChameleonTool();
        res.db = db;
        var workdir = guessWorkDir();
        if (workdir == null) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, "无法找到合法的工具路径"));
            return;
        }
        var content = fs.readFileSync(pathLib.join(workdir, 'env.json'), 'utf-8');
        var envObj = JSON.parse(content);
        res.chameleonPath = pathLib.join(workdir, envObj['pythonPath']);

        function loadInfoJsonObj(callback) {
            var infojsonPath = pathLib.join(res.chameleonPath, 'info.json');
            fs.readFile(infojsonPath, 'utf-8', function (err, s) {
                if (err) {
                    Logger.log('fail to parse json', err);
                    return callback(new ChameleonError(1 /* UNKNOWN */, '无法读取' + infojsonPath));
                }
                try  {
                    var jsonobj = JSON.parse(s);
                    res.infoObj = InfoJson.loadFromJson(jsonobj, res.chameleonPath);
                    res.upgradeMgr = new UpgradeMgr(workdir, res.infoObj.version);
                    return callback(null);
                } catch (e) {
                    Logger.log('fail to parse json', e);
                    return callback(new ChameleonError(1 /* UNKNOWN */, '无法读取' + infojsonPath));
                }
            });
        }

        function loadAndroidEnv(callback) {
            res.androidEnv = new AndroidEnv(db);
            res.androidEnv.initFromDB(callback);
        }

        async.parallel([loadInfoJsonObj, loadAndroidEnv], function (err) {
            if (err) {
                cb(err);
                return;
            }
            cb(null, res);
        });
    };

    ChameleonTool.checkSingleLock = function (callback) {
        setImmediate(callback, null);
        /*
        var homePath = ChameleonTool.getChameleonHomePath();
        fs.ensureDir(homePath, function (err) {
        var name = pathLib.join(homePath, '.lock');
        try {
        var fd = fs.openSync(name, 'wx');
        process.on('exit', function () {
        fs.unlinkSync(name);
        });
        try { fs.closeSync(fd) } catch (err) {}
        callback(null);
        } catch (err) {
        Logger.log("Fail to lock", err);
        callback(new ChameleonError(ErrorCode.OP_FAIL, "Chameleon重复开启，请先关闭另外一个Chameleon的程序"));
        }
        });
        */
    };

    ChameleonTool.getChameleonHomePath = function () {
        return pathLib.join(ChameleonTool.getUserPath(), '.prj_chameleon');
    };

    ChameleonTool.prototype.getChannelList = function () {
        return this.infoObj.getChannelMetaInfos();
    };

    ChameleonTool.prototype.getChannelSetting = function (channelName) {
        return this.infoObj.getChannelMeta(channelName);
    };

    ChameleonTool.prototype.getSDK = function (sdkid) {
        return this.infoObj.getSDKMeta(sdkid);
    };

    ChameleonTool.prototype.getAllSDKs = function () {
        return this.infoObj.getSDKMetaInfos();
    };

    ChameleonTool.prototype.readUpgradeFileInfo = function (zipFile) {
        return this.upgradeMgr.readManifest(zipFile);
    };

    ChameleonTool.prototype.get = function () {
        return this.infoObj.getChannelMetaInfos();
    };

    ChameleonTool.prototype.setAndroidPath = function (path, cb) {
        var _this = this;
        this.androidEnv.verifySDKPath(path, function (err) {
            if (err) {
                cb(new ChameleonError(2 /* SDK_PATH_ILLEGAL */, path + "路径之下无法找到Android SDK"));
                return;
            }
            _this.androidEnv.sdkPath = path;
            cb(null);
        });
    };

    ChameleonTool.prototype.loadProject = function (prjPath, cb) {
        Project.loadProject(this.infoObj, prjPath, function (err, project) {
            if (err) {
                cb(err, null);
                return;
            }
            cb(null, project);
        });
    };

    ChameleonTool.prototype.checkProjectUpgrade = function (prj, cb) {
        if (this.version.cmp(prj.version) > 0) {
            this.upgradeProject(prj, cb);
        } else {
            setImmediate(cb, null, null);
        }
    };

    ChameleonTool.prototype.upgradePrjLibs = function (prj, cb) {
        var _this = this;
        var installedLibs = prj.collectInstalledLib();
        var needUpgradeLibs = this.getNeedUpgradeLibs(installedLibs);
        var upgradeFunc = function (lib, cb) {
            var prjLibPath = pathLib.join(prj.prjPath, 'chameleon', 'libs', lib);
            var libPath = pathLib.join(_this.chameleonPath, 'channels', lib);
            fs.remove(prjLibPath, function () {
                fs.copy(libPath, prjLibPath, null, cb);
            });
        };
        var funcs = needUpgradeLibs.map(function (lib) {
            return upgradeFunc.bind(null, lib.name);
        });
        async.parallel(funcs, function (err) {
            if (err) {
                Logger.log('Fail to upgrade lib', err);
                cb(new ChameleonError(3 /* OP_FAIL */, '升级SDK失败'));
                return;
            }
            cb(null, needUpgradeLibs.map(function (lib) {
                return {
                    name: lib.name,
                    from: lib.realVer,
                    to: _this.getSDK(lib.name).ver
                };
            }));
        });
    };

    ChameleonTool.prototype.getNeedUpgradeLibs = function (libInfo) {
        var res = [];
        for (var i in libInfo) {
            var lib = libInfo[i];
            var meta = this.getSDK(lib.name);
            if (meta.chamver.cmp(lib.version) > 0) {
                lib.desc = meta.desc;
                res.push(lib);
            }
        }
        return res;
    };

    ChameleonTool.prototype.upgradePrjChameleon = function (prj, cb) {
        var chameleonPath = pathLib.join(prj.prjPath, 'chameleon');
        var chameleonRes = pathLib.join(this.chameleonPath, 'Resource', 'chameleon');
        async.series([
            function (callback) {
                fs.copy(chameleonRes, chameleonPath, null, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    callback(null);
                });
            }, function (callback) {
                var prjLibPath = pathLib.join(prj.prjPath, 'libs');
                var chamLibPath = pathLib.join(prj.prjPath, 'chameleon', 'libs');
                var otherCopy = [
                    fs.copy.bind(fs, pathLib.join(chamLibPath, 'chameleon.jar'), pathLib.join(prjLibPath, 'chameleon.jar'), null),
                    fs.copy.bind(fs, pathLib.join(chameleonPath, 'chameleon_build.py'), pathLib.join(prj.prjPath, 'chameleon_build.py'), null)
                ];
                if (fs.existsSync(pathLib.join(prjLibPath, 'chameleon_unity.jar'))) {
                    otherCopy.push(fs.copy.bind(fs, pathLib.join(chamLibPath, 'chameleon_unity.jar'), pathLib.join(prjLibPath, 'chameleon_unity.jar'), null));
                }
                async.parallel(otherCopy, function (err) {
                    callback(err);
                });
            }], function (err) {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    Logger.log('Fail to create project', err);
                    cb(new ChameleonError(3 /* OP_FAIL */, err));
                }
            }
            cb(null);
        });
    };

    ChameleonTool.prototype.createProject = function (name, landscape, prjPath, unity, cb) {
        this.doCreateProject(name, landscape, prjPath, unity, cb);
    };

    ChameleonTool.prototype.doCreateProject = function (name, landscape, prjPath, unity, cb) {
        try  {
            var chameleonPath = pathLib.join(prjPath, 'chameleon');
            var projectPPath = pathLib.join(prjPath, 'project.properties');
            var _id = Math.round(new Date().getTime() / 1000).toString();
            var newPrj = Project.createNewProject(name, landscape, this.infoObj.version, prjPath);
            var chameleonRes = pathLib.join(this.chameleonPath, 'Resource', 'chameleon');
            async.series([
                function (callback) {
                    newPrj.loadAndroidProjectInfo(callback);
                }, function (callback) {
                    fs.copy(chameleonRes, chameleonPath, null, function (err) {
                        if (err) {
                            callback(err);
                            return;
                        }
                        fs.ensureDir(pathLib.join(chameleonPath, 'sdkcfg'));
                        fs.ensureDir(pathLib.join(chameleonPath, 'channels'));
                        callback(null);
                    });
                }, function (callback) {
                    newPrj.dumpProjectJson(callback);
                }, function (callback) {
                    var prjLibPath = pathLib.join(prjPath, 'libs');
                    var chamLibPath = pathLib.join(prjPath, 'chameleon', 'libs');
                    var otherCopy = [
                        fs.copy.bind(fs, pathLib.join(chamLibPath, 'chameleon.jar'), pathLib.join(prjLibPath, 'chameleon.jar'), null),
                        fs.copy.bind(fs, pathLib.join(chameleonPath, 'chameleon_build.py'), pathLib.join(prjPath, 'chameleon_build.py'), null)
                    ];
                    if (unity) {
                        otherCopy.push(fs.copy.bind(fs, pathLib.join(chamLibPath, 'chameleon_unity.jar'), pathLib.join(prjLibPath, 'chameleon_unity.jar'), null));
                    }
                    async.parallel(otherCopy, function (err) {
                        callback(err);
                    });
                }], function (err) {
                if (err) {
                    if (err instanceof ChameleonError) {
                        cb(err);
                    } else {
                        Logger.log('Fail to create project', err);
                        cb(new ChameleonError(3 /* OP_FAIL */, err));
                    }
                }
                cb(null, newPrj);
            });
        } catch (e) {
            if (e instanceof ChameleonError) {
                cb(e);
            } else {
                Logger.log('fail to create project', e);
                cb(new ChameleonError(3 /* OP_FAIL */, '未知错误'));
            }
        }
    };

    ChameleonTool.prototype.upgradeProject = function (prj, cb) {
        var _this = this;
        var updgradeProcess = [];
        if (this.version.isMajorUpgrade(prj.version)) {
            updgradeProcess.push(this.upgradePrjChameleon.bind(this, prj));
        }
        updgradeProcess.push(this.upgradePrjLibs.bind(this, prj));
        updgradeProcess.push(function (upgradeLibs, cb) {
            var res = prj.afterLibUpgraded(upgradeLibs, _this.version);
            cb(null, res);
        });
        async.waterfall(updgradeProcess, function (err, desc) {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    cb(ChameleonError.newFromError(err, 3 /* OP_FAIL */));
                }
                return;
            }
            desc.newVersion = _this.version;
            cb(null, desc);
        });
    };

    ChameleonTool.prototype.createSDKCfg = function (prj, sdkName, desc, cb) {
        var sdkInstance = this.infoObj.getSDKMeta(sdkName);
        if (!sdkInstance) {
            throw new ChameleonError(3 /* OP_FAIL */, '无法找到SDK' + sdkName);
        }
        var res = null;
        async.series([
            this.initSDKLib.bind(this, prj, sdkName), function (callback) {
                var name = sdkName + '-' + ((new Date()).valueOf().toString());
                res = new SDKCfg(name, sdkInstance.initValue(), desc, sdkInstance.ver, sdkInstance.chamver.toString(), sdkInstance);
                prj.addSDKCfg(name, res);
                prj.saveSDKCfg(name, callback);
            }], function (err) {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    Logger.log('Fail to create sdkcfg', err);
                    cb(new ChameleonError(3 /* OP_FAIL */, '无法创建新的SDK配置： 未知错误'));
                }
            }
            cb(null, res);
        });
    };

    ChameleonTool.prototype.createOrphanChannel = function (prj, channelName) {
        var channelMeta = this.infoObj.getChannelMeta(channelName);
        if (!channelMeta) {
            throw new ChameleonError(3 /* OP_FAIL */, '无法找到对应的渠道信息：' + channelName);
        }
        if (prj.getChannelCfg(channelName)) {
            throw new ChameleonError(3 /* OP_FAIL */, '该渠道已经安装了：' + channelMeta.desc);
        }
        return new ChannelCfg(prj, channelMeta, null);
    };

    ChameleonTool.prototype.createChannel = function (prj, chcfg, cfg, cb) {
        var _this = this;
        var channelName = chcfg.name;
        var channelMeta = this.infoObj.getChannelMeta(channelName);
        if (!channelMeta) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, '无法找到对应的渠道信息：' + channelName));
            return;
        }
        ;
        if (prj.getChannelCfg(channelName)) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, '该渠道已经安装了：' + channelMeta.desc));
            return;
        }
        var dest = pathLib.join(prj.prjPath, 'chameleon', 'channels', channelName);
        chcfg.channelPath = dest;
        async.series([
            function (callback) {
                var src = pathLib.join(_this.chameleonPath, 'Resource', 'channellib');
                fs.copy(src, dest, null, function (err) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    fs.writeFile(pathLib.join(dest, 'info.xml'), util.format('<channel pkgsuffix="%s"></channel>', channelMeta.pkgsuffix));
                    fs.ensureDir(pathLib.join(dest, 'libs'));
                    fs.ensureDir(pathLib.join(dest, 'src'));
                    callback(null);
                });
            },
            function (callback) {
                _this.androidEnv.updateProject(dest, prj.androidTarget, callback);
            },
            function (callback) {
                prj.addChannelCfg(channelName, chcfg);
                prj.saveChannelCfg(channelName, cfg, callback);
            }
        ], function (err) {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    Logger.log('Fail to create channel', err);
                    cb(err);
                }
                return;
            }
            cb(null, chcfg);
        });
    };

    Object.defineProperty(ChameleonTool.prototype, "version", {
        get: function () {
            return this.infoObj.version;
        },
        enumerable: true,
        configurable: true
    });

    ChameleonTool.prototype.isEnvSet = function () {
        return this.androidEnv.isEnvSet();
    };

    ChameleonTool.prototype.initSDKLib = function (prj, sdkname, cb) {
        var _this = this;
        var targetPath = pathLib.join(prj.prjPath, 'chameleon', 'libs', sdkname);
        var src = pathLib.join(this.chameleonPath, 'channels', sdkname);
        if (!fs.existsSync(src)) {
            throw new ChameleonError(3 /* OP_FAIL */, '未知的SDK: ' + sdkname);
        }
        fs.copy(src, targetPath, null, function (err) {
            if (err) {
                Logger.log('Fail to copy lib tree', err);
                cb(new ChameleonError(1 /* UNKNOWN */, '未知的错误'));
                return;
            }
            _this.androidEnv.updateProject(targetPath, prj.androidTarget, function (err) {
                if (err) {
                    Logger.log('Fail to update project', err);
                    cb(new ChameleonError(1 /* UNKNOWN */, '未知的错误'));
                    return;
                }
                cb(null);
            });
        });
    };

    ChameleonTool.getUserPath = function () {
        return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    };

    ChameleonTool.prototype.upgradeFromFile = function (filePath) {
        var newver = this.upgradeMgr.upgradeFromZip(filePath);
        this.version = newver;
    };
    return ChameleonTool;
})();
exports.ChameleonTool = ChameleonTool;

var SignCfg = (function () {
    function SignCfg() {
    }
    SignCfg.prototype.dumpJsonObj = function () {
        var res = {};
        res['keystroke'] = this.keystroke;
        res['storepass'] = this.storepass;
        res['keypass'] = this.keypass;
        res['alias'] = this.alias;
        return res;
    };

    SignCfg.prototype.loadFromJson = function (obj) {
        this.keystroke = obj['keystroke'];
        this.storepass = obj['storepass'];
        this.keypass = obj['keypass'];
        this.alias = obj['alias'];
    };
    return SignCfg;
})();
exports.SignCfg = SignCfg;

var Project = (function () {
    function Project() {
        this.projectCfg = new ProjectCfg();
        this.channelCfg = {};
        this.sdkCfg = {};
        this._upgradeHistory = [];
    }
    Project.prototype.addChannelCfg = function (name, chcfg) {
        this.channelCfg[name] = chcfg;
    };

    Project.prototype.setSignCfg = function (signCfg) {
        if (!this.signCfg) {
            this.signCfg = new SignCfg();
        }
        this.signCfg.loadFromJson(signCfg);
    };

    Project.prototype.getSignCfg = function () {
        if (this.signCfg) {
            return this.signCfg.dumpJsonObj();
        } else {
            return null;
        }
    };

    Object.defineProperty(Project.prototype, "upgradeHistory", {
        get: function () {
            return this._upgradeHistory;
        },
        enumerable: true,
        configurable: true
    });

    Project.prototype.addSDKCfg = function (name, sdkcfg) {
        this.sdkCfg[name] = sdkcfg;
    };

    Project.prototype.genServerCfg = function (paySvrCbUrl) {
        var _this = this;
        var res = {};
        var obj = urlLib.parse(paySvrCbUrl);
        var host = obj.protocol + '//' + obj.host;
        var pathname = obj.pathname;
        res['_product.json'] = {
            appcb: {
                host: host,
                payCbUrl: pathname
            }
        };
        for (var channelName in this.channelCfg) {
            var chcfg = this.channelCfg[channelName];
            var cfgs = chcfg.serverCfg();
            cfgs['sdks'].forEach(function (libcfg) {
                var replaceCfg = _this.sdkCfg[libcfg.cfg];
                if (!replaceCfg) {
                    throw new ChameleonError(3 /* OP_FAIL */, "Fail to find sdk cfg for " + libcfg.cfg + ", channel = " + channelName);
                }
                libcfg.cfg = replaceCfg.serverCfg();
            });
            res[channelName + '.json'] = cfgs;
        }
        return res;
    };

    Project.prototype.cloneGlobalCfg = function () {
        return this.projectCfg.globalCfg.cloneCfg();
    };

    Project.prototype.saveSDKCfg = function (name, callback) {
        var sdkcfg = this.sdkCfg[name];
        if (!sdkcfg) {
            Logger.log("Fail to find sdkcfg for " + name);
            callback(null);
            return;
        }
        var filename = pathLib.join(this.prjPath, 'chameleon', 'sdkcfg', name);
        sdkcfg.dumpJson(filename, callback);
    };

    Project.prototype.afterLibUpgraded = function (upgradeLibs, newVersion) {
        var _this = this;
        var affectedSDKCfgs = Object.keys(this.sdkCfg).filter(function (name) {
            for (var i in upgradeLibs) {
                if (_this.sdkCfg[name].isUsingSDK(upgradeLibs[i].name)) {
                    return true;
                }
            }
            return false;
        });

        var affectedChannels = Object.keys(this.channelCfg).filter(function (name) {
            for (var i in affectedSDKCfgs) {
                if (_this.channelCfg[name].isUsingCfg(affectedSDKCfgs[i])) {
                    return true;
                }
            }
            return false;
        }).map(function (name) {
            return {
                desc: _this.channelCfg[name].desc,
                name: name
            };
        });

        this.projectCfg.version = newVersion;
        this.dumpProjectJson(null);
        var res = {
            version: newVersion.toString(),
            upgradeLibs: upgradeLibs,
            upgradeChannels: affectedChannels
        };
        var p = pathLib.join(this.prjPath, 'chameleon', 'upgradeinfo.json');
        this._upgradeHistory.push(res);
        fs.writeJson(p, this._upgradeHistory);
        return res;
    };

    Project.prototype.collectInstalledLib = function () {
        var libPath = pathLib.join(this.prjPath, 'chameleon', 'libs');
        var res = [];
        fs.readdirSync(libPath).forEach(function (name) {
            var p = pathLib.join(libPath, name);
            if (fs.statSync(p).isDirectory()) {
                var filep = pathLib.join(p, 'version.json');
                if (fs.existsSync(filep)) {
                    try  {
                        var obj = JSON.parse(fs.readFileSync(filep, 'utf-8'));
                        res.push(new SDKLibInfo(name, obj));
                    } catch (e) {
                        Logger.log("Fail to parse json", e);
                        res.push(new SDKLibInfo(name, null));
                    }
                } else {
                    res.push(new SDKLibInfo(name, null));
                }
            }
        });
        return res;
    };

    Project.prototype.saveChannelCfg = function (name, cfg, cb) {
        var _this = this;
        var chcfg = this.channelCfg[name];
        if (!chcfg) {
            Logger.log("Fail to find channelcfg for " + name);
            cb(null);
            return;
        }

        var splashscreen = cfg['splashscreen'];
        var icons = cfg['icons'];
        var paySDK = cfg['payLib'];
        var userSDK = cfg['userLib'];
        var pkg = cfg['packageName'];
        var signcfg = cfg['signcfg'];
        var updateCfg = {
            cfg: {
                splashscreen: null,
                icons: null
            },
            copyfile: []
        };

        if (!paySDK) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, '渠道依赖的SDK未配置'));
            return;
        }

        if (!userSDK) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, '渠道依赖的SDK未配置'));
            return;
        }

        if (chcfg.hasIcon && !icons) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, '这个渠道需要定制化icon，请设置'));
            return;
        }
        if (chcfg.hasSplashScreen && !splashscreen) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, '这个渠道需要定制化闪屏，请设置'));
            return;
        }

        try  {
            chcfg.validatePkgName(pkg);
        } catch (e) {
            setImmediate(cb, new ChameleonError(3 /* OP_FAIL */, e.message));
            return;
        }

        if (splashscreen && cfg['splashscreenToCp']) {
            var sc = cfg['splashscreenToCp'];
            var newsc = ['assets', 'chameleon', 'chameleon_splashscreen_0.png'].join('/');
            updateCfg.cfg.splashscreen = newsc;
            updateCfg.copyfile.push({
                from: sc.path,
                to: newsc
            });
        }

        if (icons) {
            updateCfg.cfg.icons = {
                position: icons['position']
            };
            if (icons['tempicons']) {
                for (var d in icons['tempicons']) {
                    updateCfg.copyfile.push({
                        from: icons['tempicons'][d],
                        to: pathLib.join('res', DESITY_MAP[d], 'chameleon_icon.png')
                    });
                }
            }
        }
        chcfg.setSignCfg(signcfg);

        async.series([
            function (callback) {
                _this.copyResInChannel(chcfg.name, updateCfg.copyfile, callback);
            }, function (callback) {
                chcfg.setPayLib(paySDK);
                chcfg.setUserLib(userSDK);
                chcfg.setPackageName(pkg);
                chcfg.splashscreen = updateCfg.cfg.splashscreen;
                if (updateCfg.cfg.icons) {
                    chcfg.setIconPos(updateCfg.cfg.icons.position);
                }
                var filename = pathLib.join(_this.prjPath, 'chameleon', 'channels', name, 'project.json');
                var jsonobj = chcfg.dumpJsonObj();
                fs.writeJson(filename, jsonobj, { encoding: 'utf-8' }, callback);
            }], function (err) {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    Logger.log('Fail to save channel ', err);
                    cb(new ChameleonError(3 /* OP_FAIL */, '无法保存渠道: ' + err.message));
                }
                return;
            }
            cb(null);
        });
    };

    Project.prototype.saveSignCfg = function (callback) {
        var signpath = pathLib.join(this.prjPath, 'chameleon', 'sign.json');
        fs.writeJson(signpath, this.signCfg.dumpJsonObj(), { encoding: 'utf-8' }, function (err) {
            if (err) {
                Logger.log('Fail to dump sign config', err);
                callback(new ChameleonError(3 /* OP_FAIL */, '无法保存签名信息： ' + err.message));
                return;
            }
            callback(null);
        });
    };

    Project.prototype.copyResInChannel = function (name, files, cb) {
        var cfg = this.channelCfg[name];
        if (!cfg) {
            Logger.log("Fail to find channelcfg for " + name);
            throw new ChameleonError(3 /* OP_FAIL */, '渠道还未安装：' + name);
        }
        var ops = [];
        var prjPath = this.prjPath;
        for (var i in files) {
            ops.push((function () {
                var dest = pathLib.join(prjPath, 'chameleon', 'channels', name, files[i].to);
                var src = files[i].from;
                return function (callback) {
                    fs.ensureFile(dest, function (err) {
                        if (err) {
                            cb(err);
                            return;
                        }
                        fs.copy(src, dest, null, callback);
                    });
                };
            })());
        }
        async.series(ops, function (err) {
            if (err) {
                Logger.log('Fail to copy files ', err);
                cb(new ChameleonError(3 /* OP_FAIL */, '拷贝文件出错'));
                return;
            }
            cb(null);
        });
    };

    Object.defineProperty(Project.prototype, "version", {
        get: function () {
            return this.projectCfg.version;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Project.prototype, "appname", {
        get: function () {
            return this.projectCfg.globalCfg.appname;
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Project.prototype, "orient", {
        get: function () {
            if (this.projectCfg.globalCfg.landscape) {
                return 'landscape';
            } else {
                return 'portrait';
            }
        },
        enumerable: true,
        configurable: true
    });

    Object.defineProperty(Project.prototype, "icon", {
        get: function () {
            return '';
        },
        enumerable: true,
        configurable: true
    });

    Project.prototype.updateGlobalCfg = function (cfg, cb) {
        var p = pathLib.join(this.prjPath, 'chameleon', 'champroject.json');
        var jsonobj = this.projectCfg.updateGlobalCfg(cfg);
        fs.writeJson(p, jsonobj, { encoding: 'utf-8' }, cb);
    };

    Project.prototype.getSDKCfg = function (name) {
        return this.sdkCfg[name];
    };

    Project.prototype.getChannelCfg = function (channelName) {
        return this.channelCfg[channelName];
    };

    Project.prototype.getAllChannels = function () {
        var res = [];
        for (var i in this.channelCfg) {
            res.push(this.channelCfg[i]);
        }
        return res;
    };

    Project.prototype.getAllSDKs = function () {
        var res = [];
        for (var i in this.sdkCfg) {
            res.push(this.sdkCfg[i]);
        }
        return res;
    };

    Project.prototype.dumpProjectJson = function (callback) {
        var obj = this.projectCfg.dumpJsonObj();
        Utils.dumpJsonFile(obj, pathLib.join(this.prjPath, 'chameleon', 'champroject.json'), callback);
    };

    Project.prototype.loadIconInfo = function () {
        var resFolder = pathLib.join(this.prjPath, 'res');
        var icon = this.am.getIcon();
        var res = {};
        for (var desity in DESITY_MAP) {
            var p = pathLib.join(resFolder, DESITY_MAP[desity], icon);
            if (fs.existsSync(p)) {
                res[desity] = p;
            }
        }
        return res;
    };

    Project.prototype.loadAndroidProjectInfo = function (cb) {
        var _this = this;
        var info = Project.extractProjectProperty(this.prjPath);
        this.androidTarget = info['target'];
        Project.loadAndroidManifest(this.prjPath, function (err, am) {
            if (err) {
                cb(err);
                return;
            }
            _this.am = am;
            cb(null);
        });
    };

    Object.defineProperty(Project.prototype, "packageName", {
        get: function () {
            return this.am.getPkgName();
        },
        enumerable: true,
        configurable: true
    });

    Project.loadProject = function (infoJson, path, cb) {
        var chameleonPath = pathLib.join(path, 'chameleon');
        var prj = new Project();
        prj.prjPath = path;
        async.parallel([
            function (callback) {
                prj.loadAndroidProjectInfo(callback);
            },
            function (callback) {
                var prjpath = pathLib.join(chameleonPath, 'champroject.json');
                fs.readFile(prjpath, function (err, buf) {
                    if (err) {
                        callback(new ChameleonError(3 /* OP_FAIL */, "读取全局配置错误"));
                        return;
                    }
                    var obj = JSON.parse(buf.toString('utf-8'));
                    prj.projectCfg.globalCfg.loadFromJson(obj['globalcfg']);
                    prj.projectCfg.version = new Version(obj.version);
                    callback(null);
                });
            },
            function (callback) {
                var prjpath = pathLib.join(chameleonPath, 'upgradeinfo.json');
                fs.readFile(prjpath, function (err, buf) {
                    if (err) {
                        callback(null);
                        return;
                    }
                    try  {
                        var obj = JSON.parse(buf.toString('utf-8'));
                        prj._upgradeHistory = obj;
                        callback(null);
                    } catch (e) {
                        callback(null);
                    }
                });
            },
            function (callback) {
                var channeldir = pathLib.join(chameleonPath, 'channels');
                fs.readdir(channeldir, function (err, subfolders) {
                    if (err) {
                        console.log('Fail to read channels dir ' + err);
                        return callback(new ChameleonError(3 /* OP_FAIL */, "无法找到渠道配置"));
                    }
                    try  {
                        for (var i in subfolders) {
                            var folderP = pathLib.join(channeldir, subfolders[i]);
                            var p = pathLib.join(folderP, 'project.json');
                            if (!fs.statSync(folderP).isDirectory() || !fs.existsSync(p)) {
                                continue;
                            }
                            var content = fs.readFileSync(p, 'utf-8');
                            var meta = infoJson.getChannelMeta(subfolders[i]);
                            if (!meta) {
                                Logger.log('unknown channel ' + subfolders[i]);
                                continue;
                            }
                            var chcfg = ChannelCfg.loadFromJson(prj, JSON.parse(content), meta, pathLib.join(prj.prjPath, 'chameleon', 'channels', subfolders[i]));
                            prj.addChannelCfg(subfolders[i], chcfg);
                        }
                    } catch (e) {
                        console.log('Fail to load channel cfg: ' + e.message + '\n' + e.stack);
                        callback(new ChameleonError(3 /* OP_FAIL */, "读取渠道配置错误"));
                        return;
                    }
                    callback(null);
                });
            },
            function (callback) {
                var sdkcfgdir = pathLib.join(chameleonPath, 'sdkcfg');
                fs.readdir(sdkcfgdir, function (err, subfiles) {
                    if (err) {
                        console.log('Fail to read sdkcfg dir ' + err);
                        return callback(new ChameleonError(3 /* OP_FAIL */, "无法找到SDK配置"));
                    }
                    var channelFolders = [];
                    var re = /(.+)/;
                    for (var i in subfiles) {
                        try  {
                            var patResult = re.exec(subfiles[i]);
                            if (!patResult) {
                                continue;
                            }
                            var p = pathLib.join(sdkcfgdir, subfiles[i]);
                            var content = fs.readFileSync(p, 'utf-8');
                            prj.addSDKCfg(patResult[1], SDKCfg.loadFromJson(infoJson, patResult[1], JSON.parse(content)));
                        } catch (e) {
                            console.log('Fail to load ' + p);
                            Logger.log('fail to load sdkcfg', e);
                        }
                    }
                    return callback(null);
                });
            },
            function (callback) {
                var signcfg = pathLib.join(chameleonPath, 'sign.json');
                if (!fs.existsSync(signcfg)) {
                    callback(null);
                    return;
                }
                fs.readJson(signcfg, { encoding: 'utf-8' }, function (err, jsonobj) {
                    if (err) {
                        Logger.log('Fail to load sign cfg');
                    } else {
                        prj.setSignCfg(jsonobj);
                    }
                    callback(null);
                });
            }
        ], function (err) {
            if (err) {
                cb(err);
                return;
            }
            cb(null, prj);
        });
    };

    Project.loadAndroidManifest = function (prjPath, cb) {
        var p = pathLib.join(prjPath, 'AndroidManifest.xml');
        fs.readFile(p, 'utf-8', function (err, data) {
            if (err) {
                Logger.log('Fail to load AndroidManifest.xml', err);
                cb(new ChameleonError(3 /* OP_FAIL */, '无法读取工程的AndroidManifest.xml: ' + err.message));
                return;
            }
            xml2js.parseString(data, function (err, result) {
                if (err) {
                    Logger.log('Fail to parse AndroidManifest.xml', err);
                    cb(new ChameleonError(3 /* OP_FAIL */, '无法读取工程的AndroidManifest.xml: ' + err.message));
                    return;
                }
                var am = new AndroidManifest(result);
                cb(null, am);
            });
        });
    };

    Project.createNewProject = function (appname, isLandscape, chamver, path) {
        var res = new Project();
        res.projectCfg.globalCfg.appname = appname;
        res.projectCfg.globalCfg.landscape = isLandscape;
        res.projectCfg.version = chamver;
        res.prjPath = path;
        var info = Project.extractProjectProperty(path);
        res.androidTarget = info.target;
        return res;
    };

    Project.extractProjectProperty = function (prjpath) {
        var propertyFile = pathLib.join(prjpath, 'project.properties');
        try  {
            var p = fs.readFileSync(propertyFile, 'utf-8');
            var re = /target\s*=\s*(.+)/m;
            var result = re.exec(p);
            if (result === null) {
                throw new Error("cant get project property");
            }
            return {
                target: result[1]
            };
        } catch (e) {
            Logger.log('fail to parse project property file', e);
            throw new ChameleonError(3 /* OP_FAIL */, "非法的android工程路径，解析project.properties失败");
        }
    };
    return Project;
})();
exports.Project = Project;

var AndroidManifest = (function () {
    function AndroidManifest(xmlobj) {
        this.xmlobj = xmlobj['manifest'];
        this.appxml = this.xmlobj['application'][0];
    }
    AndroidManifest.prototype.getIcon = function () {
        var res = /@drawable\/(.+)/.exec(this.appxml['$']['android:icon']);
        if (res == null) {
            throw new ChameleonError(4 /* CFG_ERROR */, '非法的AndroidManifest.xml, 缺少Icon信息');
        }
        return res[1] + '.png';
    };

    AndroidManifest.prototype.getPkgName = function () {
        return this.xmlobj['$']['package'];
    };
    return AndroidManifest;
})();

var UpgradeMgr = (function () {
    function UpgradeMgr(workdir, curver) {
        this.workdir = workdir;
        this.curver = curver;
    }
    UpgradeMgr.prototype.readManifest = function (fpath) {
        try  {
            var zip = new AdmZip(fpath);
            var content = zip.readAsText("UpgradeManifest.json");
            if (content == null || content.length == 0) {
                throw new ChameleonError(3 /* OP_FAIL */, '不正确的升级包格式: 无法读取升级信息');
            }
            var obj = JSON.parse(content);
            return {
                from: obj.prevVer,
                to: obj.toVer
            };
        } catch (e) {
            if (e instanceof ChameleonError) {
                throw e;
            } else {
                Logger.log('Fail to read upgrade package', e);
                throw new ChameleonError(3 /* OP_FAIL */, '不正确的升级包格式: ' + e.message);
            }
        }
    };

    UpgradeMgr.prototype.upgradeFromZip = function (fpath) {
        try  {
            var zip = new AdmZip(fpath);
            var content = zip.readAsText("UpgradeManifest.json");
            var obj = JSON.parse(content);
            var baseVer = new Version(obj.prevVer);
            var tover = new Version(obj.toVer);
            if (this.curver.cmp(baseVer) != 0) {
                Logger.log("Fail to upgrade");
                throw new ChameleonError(3 /* OP_FAIL */, "升级包并不是针对当前版本：" + fpath + '\n' + 'base: ' + baseVer.toString() + ', current: ' + this.curver.toString());
            }
            zip.extractAllTo(this.workdir, true);
            this.curver = tover;
            return tover;
        } catch (e) {
            if (e instanceof ChameleonError) {
                throw e;
            } else {
                throw ChameleonError.newFromError(e, 3 /* OP_FAIL */);
            }
        }
    };
    return UpgradeMgr;
})();
//# sourceMappingURL=chameleon.js.map
