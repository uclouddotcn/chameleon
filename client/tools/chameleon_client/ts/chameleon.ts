/// <reference path="declare/node.d.ts"/>
/// <reference path="declare/async.d.ts"/>
/// <reference path="declare/ncp.d.ts"/>
/// <reference path="declare/fs-extra.d.ts"/>
/// <reference path="declare/xml2js.d.ts"/>
/// <reference path="declare/adm-zip.d.ts"/>

import fs = require('fs-extra');
import childprocess = require("child_process");
import pathLib = require("path");
import os = require('os');
import async = require('async');
import xml2js = require('xml2js');
import util = require('util');
import AdmZip = require('adm-zip');
import urlLib = require('url');

var DESITY_MAP = {
    medium: 'drawable-mdpi',
    high: 'drawable-hdpi',
    xhigh: 'drawable-xhdpi',
    xxhigh: 'drawable-xxhdpi',
    xxxhigh: 'drawable-xxxhdpi'
};

export interface DBCallback {
    (err: Error, result?: Object) : void;
}

export class ChameleonError implements Error {
    name:string;
    message:string;
    errCode:ErrorCode;

    constructor(code: ErrorCode, message = "", name = "") {
        this.name = name;
        this.message = message;
        this.errCode = code;
    }

    static newFromError (err: Error, code = ErrorCode.UNKNOWN): ChameleonError {
        var e = new ChameleonError(code);
        e.name = err.name;
        e.message = err.message;
        return e;
    }
}

export interface CallbackFunc<T> {
    (err: ChameleonError, result?: T) : void;
}

export interface DB {
    set(table: string, key: string, value: Object, cb?: DBCallback): void;
    get(table: string, key: string, cb: DBCallback): void;
    del(table: string, key: string, cb?: DBCallback): void;
}


class Logger {
    static log(message: string, err: Error = null) {
        var logmsg = message;
        if (err) {
            logmsg =  logmsg + '\n' + err.message + '\n' + err['stacktrace'];
        }
        console.log(logmsg)
    }
}

export enum ErrorCode {
    UNKNOWN = 1,
    SDK_PATH_ILLEGAL,
    OP_FAIL,
    CFG_ERROR
}


class Utils {
    static dumpJsonFile(obj: any, dest: string, callback?: CallbackFunc<any>) {
        fs.writeJson(dest, obj, {encodiing: 'utf-8'}, callback);
    }
}


export class AndroidEnv {
    _sdkPath: string;
    androidBin: string;
    private db: DB;

    constructor(db: DB) {
        this.db = db;
    }

    initFromDB (cb : CallbackFunc<any>) {
        this.db.get('env', 'sdkpath', (err: Error, value?: Object) => {
            if (err || !value) {
                cb(null);
                return;
            }
            var obj = value;
            var p = obj['value'];
            this.verifySDKPath(p, (err) => {
                if (err) {
                    cb(null);
                    return;
                }
                this.sdkPath = obj['value'];
                cb(null);
            });
        });
    }


    updateProject(projectPath: string, target: string, cb: CallbackFunc<any>) {
        childprocess.execFile(this.androidBin, ['update', 'project', '-p', projectPath, '-t',
            target, '-s'], {timeout: 30000}, function (err, stdout, stderr) {
            if (err) {
                console.log('exec update project error: \n' + err.message + '\n signal: ' + err['signal'] +
                    ', code:' + err['code']);
                console.log('stdout is \n' + stdout.toString('utf8'));
                console.log('stderr is \n' + stderr.toString('utf8'));
                cb(ChameleonError.newFromError(err));
                return;
            }
            cb(null);
        });
    }

    isEnvSet(): boolean {
        return this._sdkPath != null;
    }


    get sdkPath(): string {
        return this._sdkPath;
    }

    set sdkPath(p: string) {
        this._sdkPath = p;
        this.androidBin = AndroidEnv.getAndroidBin(p);
        this.db.set('env', 'sdkpath', {value: p});
    }

    private static getAndroidBin(p: string) : string{
        var s = '';
        if (os.platform() === 'win32') {
            s = pathLib.join(p, 'tools', 'android.bat');
        } else {
            s = pathLib.join(p, 'tools', 'android');
        }
        return s;
    }

    verifySDKPath(p: string, cb: CallbackFunc<any>) {
        var androidBin = AndroidEnv.getAndroidBin(p);
        childprocess.execFile(androidBin, ['list', 'target'], {timeout: 30000}, function (err, stdout, stderr) {
            if (err) {
                cb(new ChameleonError(ErrorCode.SDK_PATH_ILLEGAL, '非法的Android SDK路径，请确保路径在sdk路径下'));
                return;
            }
            return cb(null);
        })
    }
}


class ConfigItem<T> {
    name: string;
    value: T;
    constructor (name: string, v?: T) {
        this.name = name;
        this.value = v;
    }

}


class ConfigItemType {
    type: string;
    initvalue: any;
    wrapName: (name: string) => string;
    constructor (type: string, wrapFunc: (string) => string, initv: any) {
        this.type = type;
        this.wrapName = wrapFunc;
        this.initvalue = initv;
    }

}

enum IT {
    String = 0,
    Int,
    Float,
    Boolean,
    Url
}

class ConfigDesc {
    static gItemMaps: Dictionary<ConfigItemType> = {
        'String' : new ConfigItemType("string", (name)=> 's'+name, ''),
        'Int': new ConfigItemType('integer', (name)=>'l'+name, 0),
        'Float': new ConfigItemType('float', (name)=>'f'+name, 0.0),
        'Boolean': new ConfigItemType('bool', (name)=>'b'+name, true),
        'Url' : new ConfigItemType("string", (name)=> 's'+name, 'http://localhost')
    };

    private items: {name:string; item:ConfigItemType; defaultValue: any; ignore: boolean}[] = [];

    registerItem(name: string, type: number, defaultValue: any = null, ignore = false) {
        var item = ConfigDesc.gItemMaps[IT[type]];
        if (!item) {
            console.log('expect type '+ type);
            throw new ChameleonError(ErrorCode.CFG_ERROR, '无法找到类型'+type+'的配置');
        }
        this.items.push({name: name, item: item, defaultValue: defaultValue, ignore: ignore});
    }

    registerItem1(name: string, type: string, defaultValue: any = null, ignore = false) {
        var item = ConfigDesc.gItemMaps[type];
        if (!item) {
            console.log('expect type '+ type);
            throw new ChameleonError(ErrorCode.CFG_ERROR, '无法找到类型'+type+'的配置');
        }
        this.items.push({name: name, item: item, defaultValue: defaultValue, ignore: ignore});
    }

    wrapName(cfgItem: ConfigItemType, ignore: boolean, name: string ) {
        if (ignore) {
            return 'h'+name;
        } else {
            return cfgItem.wrapName(name);
        }
    }

    dumpJsonObj(obj: any) : any {
        var res = {};
        for (var i in this.items) {
            var item = this.items[i];
            var cfgitem = this.items[i].item;
            var name = this.items[i].name;
            res[this.wrapName(cfgitem, item.ignore, name)] = obj[name];
        }
        return res;
    }

    rewriteCfg(cfg: any): any {
        for (var i in this.items) {
            var itemObj = this.items[i];
            if (!cfg.hasOwnProperty(itemObj.name)) {
                if (itemObj.hasOwnProperty('defaultValue')) {
                    cfg = itemObj.defaultValue;
                } else {
                    throw new ChameleonError(ErrorCode.CFG_ERROR, itemObj.name + "是必须的配置项");
                }
            } else {

            }
        }
        return cfg;
    }

    setFromJsonObj(jsonobj: any, target: any) {
        for (var i in this.items) {
            var item = this.items[i];
            var name = this.items[i].name;
            var cfgitem = this.items[i].item;
            var wrapname = this.wrapName(cfgitem, item.ignore, name);
            target[name] = jsonobj[wrapname];
        }
    }

    initObj(target: any) {
        for (var i in this.items) {
            var item = this.items[i].item;
            var name = this.items[i].name;
            if (this.items[i].defaultValue) {
                target[name] = this.items[i].defaultValue;
            } else {
                target[name] = item.initvalue;
            }
        }
    }
}

class GlobalCfg {
    appname: string;
    landscape: boolean;

    constructor() {
        GlobalCfg.gCfgDesc.initObj(this);
    }

    loadFromJson(a: any) {
        GlobalCfg.gCfgDesc.setFromJsonObj(a, this);
    }

    dumpJsonObj(): any {
        return GlobalCfg.gCfgDesc.dumpJsonObj(this);
    }

    cloneCfg(): any {
        return {
            appname: this.appname,
            landscape: this.landscape
        };
    }

    updateCfg(cfg: any) {
        var realCfg = GlobalCfg.gCfgDesc.rewriteCfg(cfg);
        this.appname = realCfg['appname'];
        this.landscape = realCfg['landscape'];
    }

    static gCfgDesc: ConfigDesc = GlobalCfg._createCfgDesc();
    static _createCfgDesc(): ConfigDesc {
        var desc = new ConfigDesc();
        desc.registerItem('appname', IT.String);
        desc.registerItem('landscape', IT.Boolean);
        return desc;
    }
}

interface Dictionary<T> {
    [index: string]: T;
}

interface SDKCfgDesc {
    [index: string]: ConfigDesc;
}



export class SDKCfg {
    cfg: any;
    _desc: string;
    ver: string;
    chamver: Version;
    metaInfo: SDKMetaInfo;
    name: string;

    constructor(name: string, cfg: any, desc: string, ver: string, chamver: string, metaInfo: SDKMetaInfo) {
        this.name = name;
        this.cfg = cfg;
        this._desc = desc;
        this.ver = ver;
        this.chamver = new Version(chamver);
        this.metaInfo = metaInfo;
    }

    get sdkid(): string {
        return this.metaInfo.name;
    }

    get channeldesc(): string {
        return this.metaInfo.desc;
    }

    cloneCfg() : any {
        var a = {};
        for (var i in this.cfg) {
            a[i] = this.cfg[i];
        }
        return a;
    }

    serverCfg(): any {
        return this.cfg;
    }

    updateCfg(cfg: any) {
        var realcfg = this.metaInfo.rewritePendingCfg(cfg);
        this.cfg = realcfg;
    }

    dumpJson(filename: string, cb: CallbackFunc<any>) {
        var cfg = this.metaInfo.dumpJsonObj(this.cfg);
        cfg = this.metaInfo.scriptRewriteCfg(cfg);
        fs.writeJson(filename, {
            cfg: cfg,
            desc: this._desc,
            id: this.metaInfo.name,
            ver: this.ver,
            chamver: this.chamver.toString()
        }, {encoding : 'utf-8'}, cb);
    }

    get desc(): string {
        if (!this._desc) {
            return this.name;
        } else {
            return this._desc;
        }
    }

    static loadFromJson(infoJson: InfoJson, name: string , jsonobj: any): SDKCfg {
        var metaInfo = infoJson.getSDKMeta(jsonobj['id']);
        if (!metaInfo) {
            throw new ChameleonError(ErrorCode.UNKNOWN, "未知的sdk: " + jsonobj['id']);
        }
        var realCfg = metaInfo.loadFromJson(jsonobj['cfg']);
        return new SDKCfg(name, realCfg, jsonobj['desc'], jsonobj['ver'], jsonobj['chamver'], metaInfo);
    }

}

export class Version {
    major: number;
    minor: number;
    constructor(ver: string) {
        var t = ver.split('.');
        this.major = parseInt(t[0]);
        this.minor = parseInt(t[1]);
    }

    cmp (that: Version): number {
        if (this.major > that.major) {
            return 1;
        } else if (this.major < that.major) {
            return -1;
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

    toString(): string {
        return this.major+'.'+this.minor;
    }
}

class SDKMetaScript {
    private _path: string;
    private mod: any;

    constructor(path: string) {
        this._path = path;
        this.mod = require(path);
    }

    rewriteCfg(cfg: any) {
        if (this.mod['rewriteCfg']) {
            return this.mod['rewriteCfg'](cfg);
        } else {
            return cfg;
        }
    }
}

export class SDKMetaInfo {
    desc : string;
    ver: string;
    name: string;
    chamver: Version;
    private cfgdesc: ConfigDesc;
    private script: SDKMetaScript;

    static loadFromJson(jsonobj: any, chameloenPath: string): SDKMetaInfo {
        var res = new SDKMetaInfo();
        res.desc = jsonobj['desc'];
        res.name = jsonobj['name'];
        res.ver = jsonobj['version'];
        res.chamver = new Version(jsonobj['chamversion']);
        var itemcfg = jsonobj['cfgitem'];
        res.cfgdesc = new ConfigDesc();
        for (var itemname in itemcfg) {
            var type: string = itemcfg[itemname]['type'];
            type = type[0].toUpperCase() + type.substr(1);
            res.cfgdesc.registerItem1(itemname, type, itemcfg[itemname]['default'],
                itemcfg[itemname]['ignoreInA']);
        }
        if (jsonobj['script']) {
            var p = pathLib.join(chameloenPath, 'ChannelScript', jsonobj['script']);
            res.script = new SDKMetaScript(p);
        }
        return res;
    }

    loadFromJson(a: any) : any{
        var obj = {};
        this.cfgdesc.setFromJsonObj(a, obj);
        return obj;
    }

    dumpJsonObj(obj: any): any {
        return this.cfgdesc.dumpJsonObj(obj);
    }

    initValue(): any {
        var res = {};
        this.cfgdesc.initObj(res);
        return res;
    }

    rewritePendingCfg(cfg: any): any {
        var res = cfg;
        return this.cfgdesc.rewriteCfg(res);
    }

    scriptRewriteCfg(cfg: any): any {
        if (this.script) {
            return this.script.rewriteCfg(cfg);
        } else {
            return cfg;
        }
    }
}

export class ChannelMetaInfo {
    pkgsuffix : string;
    hasIcon: boolean;
    hasSplashScreen: boolean;
    availableIconPos: number;
    name: string;
    desc: string;
    sdk: string;
    icons: any;
    sc: any;

    static loadFromJson(name: string, jsonobj: any) {
        var res = new ChannelMetaInfo();
        res.pkgsuffix = jsonobj['pkgsuffix'];
        res.desc = jsonobj['name'];
        res.sdk = jsonobj['sdk'];
        res.hasIcon = jsonobj['icon'];
        res.hasSplashScreen = jsonobj['splashscreen'];
        res.name = name;
        return res;
    }

    loadFromRes(res: string) {
        this.icons = this._loadIconInfo(res);
        this.sc = this._loadSplashInfo(res);
    }

    private _loadIconInfo(resPath: string) {
        var drawablePath = pathLib.join(resPath, 'drawable');
        var icon = {}
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
                flag &= ~(0x1<<1);
            }
            if (fs.existsSync(rightup)) {
                iconOfDesity.push(rightup);
            } else {
                iconOfDesity.push(null);
                flag &= ~(0x1<<2);
            }
            if (fs.existsSync(rightdown)) {
                iconOfDesity.push(rightdown);
            } else {
                iconOfDesity.push(null);
                flag &= ~(0x1<<3);
            }
            if (flag ==0) {
                continue;
            }
            icon[d] = iconOfDesity;
            availableIconPos.push(flag);
        }
        this.availableIconPos = availableIconPos.reduce(function (x: number, y: number) {
            return x&y;
        }, 0xF);
        return icon;
    }

    private _loadSplashInfo(resPath: string) : any {
        var scPath = pathLib.join(resPath, 'drawable', 'splashscreen');
        var res = {portrait: [], landscape: []};
        var files = fs.readdirSync(scPath);
        var TYPE_MAP = {
            m: 'medium',
            h: 'high',
            xh: 'xhigh'
        };
        var re = /(\w+)_(\w+)_(\d+)_(\d+)_(.+).png/
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
                desc: aa[3] + '*' + aa[4] + ' ' + aa[5],
                path: pathLib.join(scPath, files[f])
            };
            res[o.orient].push(o);
        }
        return res;
    }

    getIconOverlay(appIconList): any{
        var res = {};
        for (var i in appIconList) {
            if (!this.icons[i]) {
                continue;
            }
            res[i] = {
                base: appIconList[i],
                overlay: this.icons[i]
            }
        }
        return res;
    }

    getSplashScreen(orient) : string{
        return this.sc[orient];
    }
}

export class InfoJson {
    private sdkmetas : Dictionary<SDKMetaInfo>;
    private channels: Dictionary<ChannelMetaInfo>;
    version: Version;

    static loadFromJson(jsonobj: any, chameleonPath: string): InfoJson {
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
    }

    getSDKMeta(name: string): SDKMetaInfo {
        return this.sdkmetas[name];
    }

    getChannelMeta(name: string): ChannelMetaInfo {
        return this.channels[name];
    }

    versionString(): string {
        return this.version.toString();
    }

    getChannelMetaInfos(): ChannelMetaInfo[] {
        var res = []
        for (var i in this.channels) {
            res.push(this.channels[i]);
        }
        return res;
    }

    getSDKMetaInfos(): SDKMetaInfo[] {
        var res = []
        for (var i in this.sdkmetas) {
            res.push(this.sdkmetas[i]);
        }
        return res;
    }
}

class ProjectCfg {
    globalCfg: GlobalCfg = new GlobalCfg();
    version: Version;

    dumpJsonObj() : any {
        var res = {};
        res['globalcfg'] = this.globalCfg.dumpJsonObj();
        res['version'] = this.version.toString();
        return res;
    }

    updateGlobalCfg(cfg: any): any {
        this.globalCfg.updateCfg(cfg);
        return this.dumpJsonObj();
    }
}

enum DependLibType {
    user = 0,
    pay
}

class DependLib {

    cfg: string;
    sdkid: string;

    constructor() {
    }

    loadFromJson(jsonObj: any) {
        this.cfg = jsonObj['cfg'];
        this.sdkid = jsonObj['name'];
    }

    dumpJsonObj(): any {
        var res = {};
        res['name'] = this.sdkid;
        res['cfg']  = this.cfg;
        return res;
    }
}

export enum IconCornerPos {
    UPPER_LEFT = 0,
    UPPER_RIGHT,
    DOWN_LEFT,
    DOWN_RIGHT
}

export class ChannelCfg {
    static loadFromJson(jsonobj: any, channelMeta: ChannelMetaInfo, channelPath: string): ChannelCfg {
        var res = new ChannelCfg(channelMeta, channelPath);
        if (jsonobj.splashscreen) {
            res._splashscreen = jsonobj.splashscreen;
        }
        if (jsonobj.icons) {
            res._icons = jsonobj.icons;
        }
        for (var i in jsonobj.dependLibs) {
            var d = jsonobj.dependLibs[i];
            var types = d.type.split(',');
            var dependlib = new DependLib();
            dependlib.loadFromJson(d);
            types.map (function (v: string) {
                if (v === 'user') {
                    res.userLib = dependlib;
                } else if (v === 'pay') {
                    res.payLib = dependlib;
                }
            })
        }
        return res;
    }

    constructor(metaInfo: ChannelMetaInfo, channelPath: string) {
        this.metaInfo = metaInfo;
        this.channelPath = channelPath;
    }

    private userLib: DependLib;
    private payLib: DependLib;
    _splashscreen: string;
    private _icons: {position: IconCornerPos};
    metaInfo: ChannelMetaInfo;
    channelPath: string;
    _shownIcon: string;


    get splashscreen(): string {
        if (!this.hasSplashScreen || !this._splashscreen) {
            return null;
        } else {
            return pathLib.join(this.channelPath, this._splashscreen);
        }
    }

    set splashscreen(p :string) {
        this._splashscreen = p;
    }

    get name(): string {
        return this.metaInfo.name;
    }

    get userSDK(): string {
        if (this.userLib) {
            return this.userLib.cfg;
        } else {
            return null;
        }
    }

    get paySDK(): string {
        if (this.payLib) {
            return this.payLib.cfg;
        } else {
            return null;
        }
    }

    get requiredSDK(): string {
        return this.metaInfo.sdk;
    }

    get packageName(): string {
        return this.metaInfo.pkgsuffix;
    }

    get hasIcon(): boolean {
        return this.metaInfo.hasIcon;
    }

    get hasSplashScreen(): boolean {
        return this.metaInfo.hasSplashScreen;
    }

    get desc(): string {
        return this.metaInfo.desc;
    }

    get icons(): any {
        return this._icons;
    }

    get shownIcon(): string {
        if (!this._shownIcon) {
            this.loadShownIcon();
        }
        return this._shownIcon;
    }

    get orphan(): boolean {
        return this.channelPath == null;
    }

    dumpJsonObj(): any {
        var res = {};
        res['splashscreen'] = this._splashscreen;
        res['icons'] = this._icons;
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
    }

    setUserLib(sdk: SDKCfg) {
        this.userLib = new DependLib();
        this.userLib.cfg = sdk.name;
        this.userLib.sdkid = sdk.metaInfo.name;
    }

    setPayLib(sdk: SDKCfg) {
        this.payLib = new DependLib();
        this.payLib.cfg = sdk.name;
        this.payLib.sdkid = sdk.metaInfo.name;
    }

    setIconPos(icon: IconCornerPos) {
        this._icons = {position: icon};
    }

    serverCfg(): any {
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
    }

    private loadShownIcon() {
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
    }
}

function guessWorkDir() : string {
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

export class ChameleonTool {
    androidEnv: AndroidEnv;
    infoObj: InfoJson;
    chameleonPath: string;
    db: DB
    homePath: string;
    private upgradeMgr: UpgradeMgr;

    static initTool(db: DB, cb: CallbackFunc<ChameleonTool>) {
        var res = new ChameleonTool();
        res.db = db;
        var workdir = guessWorkDir();
        if (workdir == null) {
            setImmediate(cb, new ChameleonError(ErrorCode.OP_FAIL, "无法找到合法的工具路径"));
            return;
        }
        var content = fs.readFileSync(pathLib.join(workdir, 'env.json'), 'utf-8');
        var envObj = JSON.parse(content);
        var chameleonPath = pathLib.join(workdir, envObj['pythonPath']);
        res.chameleonPath = chameleonPath;

        function loadInfoJsonObj(callback: CallbackFunc<any>) {
            var infojsonPath = pathLib.join(chameleonPath, 'info.json');
            fs.readFile(infojsonPath, 'utf-8', function (err, s) {
                if (err) {
                    Logger.log('fail to parse json', err);
                    return callback(new ChameleonError(ErrorCode.UNKNOWN, '无法读取info.json'));
                }
                try {
                    var jsonobj = JSON.parse(s);
                    res.infoObj = InfoJson.loadFromJson(jsonobj, chameleonPath);

                    res.upgradeMgr = new UpgradeMgr(workdir, res.infoObj.version);
                    return callback(null);
                } catch (e) {
                    Logger.log('fail to parse json', e);
                    return callback(new ChameleonError(ErrorCode.UNKNOWN, '无法读取info.json'));
                }
            });
        }

        function loadAndroidEnv(callback: CallbackFunc<any>) {
            res.androidEnv = new AndroidEnv(db);
            res.androidEnv.initFromDB(callback);
        }

        async.parallel([loadInfoJsonObj, loadAndroidEnv], function (err) {
            if (err)  {
                cb(err);
                return;
            }
            cb(null, res);
        })
    }

    static checkSingleLock(callback) {
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

    }

    static getChameleonHomePath() : string {
        return pathLib.join(ChameleonTool.getUserPath(), '.prj_chameleon');
    }

    getChannelList(): ChannelMetaInfo[] {
        return this.infoObj.getChannelMetaInfos();
    }

    getChannelSetting(channelName: string): ChannelMetaInfo {
        return this.infoObj.getChannelMeta(channelName);
    }

    getSDK(sdkid: string) : SDKMetaInfo {
        return this.infoObj.getSDKMeta(sdkid);
    }

    getAllSDKs() : SDKMetaInfo[] {
        return this.infoObj.getSDKMetaInfos();
    }

    readUpgradeFileInfo(zipFile: string) : any {
        return this.upgradeMgr.readManifest(zipFile);
    }

    get(): ChannelMetaInfo[] {
        return this.infoObj.getChannelMetaInfos();
    }

    setAndroidPath(path: string, cb: CallbackFunc<any>) {
        this.androidEnv.verifySDKPath(path, (err) => {
            if (err) {
                cb(new ChameleonError(ErrorCode.SDK_PATH_ILLEGAL, path+"路径之下无法找到Android SDK"));
                return;
            }
            this.androidEnv.sdkPath = path;
            cb(null);
        })
    }

    loadProject(prjPath: string, cb: CallbackFunc<Project>) {
        Project.loadProject(this.infoObj, prjPath, cb);
    }

    createProject(name: string, landscape: boolean, prjPath: string, unity: boolean, cb: CallbackFunc<Project>) {
        try {
            var chameleonPath = pathLib.join(prjPath, 'chameleon');
            var projectPPath = pathLib.join(prjPath, 'project.properties');
            var _id = Math.round(new Date().getTime()/1000).toString();
            var newPrj = Project.createNewProject(name, landscape, this.infoObj.version, prjPath);
            var chameleonRes = pathLib.join(this.chameleonPath, 'Resource', 'chameleon');
            async.series([function(callback) {
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
                    fs.copy.bind(fs, pathLib.join(chamLibPath , 'chameleon.jar'),
                        pathLib.join(prjLibPath, 'chameleon.jar'), null),
                    fs.copy.bind(fs, pathLib.join(chameleonPath , 'chameleon_build.py'),
                        pathLib.join(prjPath, 'chameleon_build.py'), null),
                ];
                if (unity) {
                    otherCopy.push(fs.copy.bind(fs, pathLib.join(chamLibPath , 'chameleon_unity.jar'),
                        pathLib.join(prjLibPath, 'chameleon_unity.jar'), null))
                }
                async.parallel(otherCopy, (err) => {
                    callback(err);
                });
            }, function (callback) {
                newPrj.loadAndroidProjectInfo(callback);
            }], (err) => {
                if (err) {
                    if (err instanceof ChameleonError) {
                        cb(err);
                    } else {
                        Logger.log('Fail to create project', err);
                        cb(new ChameleonError(ErrorCode.OP_FAIL, err));
                    }
                }
                cb(null, newPrj);
            });
        } catch (e) {
            if (e instanceof ChameleonError)  {
                cb(e);
            } else {
                Logger.log('fail to create project', e);
                cb(new ChameleonError(ErrorCode.OP_FAIL, '未知错误'))
            }
        }
    }

    createSDKCfg(prj: Project, sdkName: string, desc: string, cb: CallbackFunc<SDKCfg>) {
        var sdkInstance = this.infoObj.getSDKMeta(sdkName);
        if (!sdkInstance) {
            throw new ChameleonError(ErrorCode.OP_FAIL, '无法找到SDK'+sdkName);
        }
        var res = null;
        async.series([this.initSDKLib.bind(this, prj, sdkName), function (callback: CallbackFunc<any>) {
            var name = sdkName+'-'+((new Date()).valueOf().toString());
            res = new SDKCfg(name, sdkInstance.initValue(), desc, sdkInstance.ver, sdkInstance.chamver.toString(), sdkInstance);
            prj.addSDKCfg(name, res);
            prj.saveSDKCfg(name, callback);
        }], (err) => {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    Logger.log('Fail to create sdkcfg', err);
                    cb(new ChameleonError(ErrorCode.OP_FAIL, '无法创建新的SDK配置： 未知错误'));
                }
            }
            cb(null, res);
        });
    }

    createOrphanChannel(prj: Project, channelName: string) {
        var channelMeta = this.infoObj.getChannelMeta(channelName);
        if (!channelMeta) {
            throw new ChameleonError(ErrorCode.OP_FAIL, '无法找到对应的渠道信息：' + channelName);
        }
        if (prj.getChannelCfg(channelName)) {
            throw new ChameleonError(ErrorCode.OP_FAIL, '该渠道已经安装了：' + channelMeta.desc);
        }
        return new ChannelCfg(channelMeta, null);
    }

    createChannel(prj: Project, chcfg: ChannelCfg, cfg: any, cb: CallbackFunc<ChannelCfg>) {
        var channelName = chcfg.name;
        var channelMeta = this.infoObj.getChannelMeta(channelName);
        if (!channelMeta) {
            setImmediate(cb, new ChameleonError(ErrorCode.OP_FAIL, '无法找到对应的渠道信息：' + channelName));
            return;
        };
        if (prj.getChannelCfg(channelName)) {
            setImmediate(cb, new ChameleonError(ErrorCode.OP_FAIL, '该渠道已经安装了：' + channelMeta.desc));
            return;
        }
        var dest = pathLib.join(prj.prjPath, 'chameleon', 'channels', channelName);
        chcfg.channelPath = dest;
        async.series([
            (callback) => {
                var src = pathLib.join(this.chameleonPath, 'Resource', 'channellib');
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
            (callback) => {
                this.androidEnv.updateProject(dest, prj.androidTarget, callback);
            },
            (callback) => {
                prj.addChannelCfg(channelName, chcfg);
                prj.saveChannelCfg(channelName, cfg, callback);
            }
        ], (err) => {
            if (err)  {
                if (err instanceof ChameleonError)  {
                    cb(err);
                } else {
                    Logger.log('Fail to create channel', err);
                    cb(err);
                }
                return;
            }
            cb(null, chcfg);
        })
    }

    get version(): Version {
        return this.infoObj.version;
    }

    isEnvSet(): boolean {
        return this.androidEnv.isEnvSet();
    }

    initSDKLib(prj: Project, sdkname: string, cb: CallbackFunc<any>) {
        var targetPath = pathLib.join(prj.prjPath, 'chameleon', 'libs', sdkname);
        var src = pathLib.join(this.chameleonPath, 'channels', sdkname);
        if (!fs.existsSync(src)) {
            throw new ChameleonError(ErrorCode.OP_FAIL, '未知的SDK: ' + sdkname);
        }
        fs.copy(src, targetPath, null, (err) => {
            if (err) {
                Logger.log('Fail to copy lib tree', err);
                cb(new ChameleonError(ErrorCode.UNKNOWN, '未知的错误'));
                return;
            }
            this.androidEnv.updateProject(targetPath, prj.androidTarget, (err) => {
                if (err) {
                    Logger.log('Fail to update project', err);
                    cb(new ChameleonError(ErrorCode.UNKNOWN, '未知的错误'));
                    return;
                }
                cb(null);
            })
        });
    }

    static getUserPath() : string {
        return process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
    }

    upgradeFromFile(filePath) {
        var newver = this.upgradeMgr.upgradeFromZip(filePath);
        this.version = newver;
    }
}

export class SignCfg {
    keystroke: string;
    storepass: string;
    keypass: string;
    alias: string;

    dumpJsonObj(): any {
        var res = {};
        res['keystroke'] = this.keystroke;
        res['storepass'] = this.storepass;
        res['keypass'] = this.keypass;
        res['alias'] = this.alias;
        return res;
    }

    loadFromJson(obj: any) {
        this.keystroke = obj['keystroke'];
        this.storepass = obj['storepass'];
        this.keypass = obj['keypass'];
        this.alias = obj['alias'];
    }

}

export class Project {
    private projectCfg: ProjectCfg = new ProjectCfg();
    private channelCfg: Dictionary<ChannelCfg> = {};
    private sdkCfg: Dictionary<SDKCfg> = {};
    private am: AndroidManifest;
    androidTarget: string;
    prjPath: string;
    private signCfg: SignCfg;

    addChannelCfg(name: string, chcfg: ChannelCfg) {
        this.channelCfg[name] = chcfg;
    }

    setSignCfg(signCfg: any) {
        if (!this.signCfg) {
            this.signCfg = new SignCfg();
        }
        this.signCfg.loadFromJson(signCfg);
    }

    getSignCfg(): any {
        if (this.signCfg) {
            return this.signCfg.dumpJsonObj();
        } else {
            return null;
        }
    }

    addSDKCfg(name: string, sdkcfg: SDKCfg) {
        this.sdkCfg[name] = sdkcfg;
    }

    genServerCfg(paySvrCbUrl: string): any {
        var res = {};
        var obj = urlLib.parse(paySvrCbUrl);
        var host = obj.protocol+'//'+obj.host;
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
            cfgs['sdks'].forEach((libcfg) => {
                var replaceCfg = this.sdkCfg[libcfg.cfg];
                if (!replaceCfg) {
                    throw new ChameleonError(ErrorCode.OP_FAIL,
                            "Fail to find sdk cfg for " + libcfg.cfg + ", channel = " + channelName);
                }
                libcfg.cfg = replaceCfg.serverCfg();
            });
            res[channelName+'.json'] = cfgs;
        }
        return res;
    }


    cloneGlobalCfg() : any {
        return this.projectCfg.globalCfg.cloneCfg();
    }

    saveSDKCfg(name: string, callback: CallbackFunc<any>) {
        var sdkcfg = this.sdkCfg[name];
        if (!sdkcfg) {
            Logger.log("Fail to find sdkcfg for " + name);
            callback(null);
            return;
        }
        var filename = pathLib.join(this.prjPath, 'chameleon', 'sdkcfg', name);
        sdkcfg.dumpJson(filename, callback);
    }

    saveChannelCfg(name: string, cfg: any, cb: CallbackFunc<any>) {
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
        var updateCfg = {
            cfg: {
                splashscreen: null,
                icons: null
            },
            copyfile: []
        };

        if (!paySDK) {
            setImmediate(cb, new ChameleonError(ErrorCode.OP_FAIL, '渠道依赖的SDK未配置'));
            return;
        }

        if (!userSDK) {
            setImmediate(cb, new ChameleonError(ErrorCode.OP_FAIL, '渠道依赖的SDK未配置'));
            return;
        }

        if (chcfg.hasIcon && !icons) {
            setImmediate(cb, new ChameleonError(ErrorCode.OP_FAIL, '这个渠道需要定制化icon，请设置'));
            return;
        }
        if (chcfg.hasSplashScreen && !splashscreen) {
            setImmediate(cb,  new ChameleonError(ErrorCode.OP_FAIL, '这个渠道需要定制化闪屏，请设置'));
            return;
        }
        if (splashscreen && cfg['splashscreenToCp']) {
            var sc = cfg['splashscreenToCp'];
            var newsc = ['assets', 'chameleon', 'chameleon_splashscreen_0.png'].join('/')
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

        async.series([(callback) => {
            this.copyResInChannel(chcfg.name, updateCfg.copyfile, callback);
        }, (callback) => {
            chcfg.setPayLib(paySDK);
            chcfg.setUserLib(userSDK);
            chcfg.splashscreen = updateCfg.cfg.splashscreen;
            if (updateCfg.cfg.icons) {
                chcfg.setIconPos(updateCfg.cfg.icons.position);
            }
            var filename = pathLib.join(this.prjPath, 'chameleon', 'channels', name, 'project.json');
            var jsonobj = chcfg.dumpJsonObj();
            fs.writeJson(filename, jsonobj, {encoding: 'utf-8'}, callback);
        }], function (err) {
            if (err) {
                if (err instanceof ChameleonError) {
                    cb(err);
                } else {
                    Logger.log('Fail to save channel ', err);
                    cb(new ChameleonError(ErrorCode.OP_FAIL, '无法保存渠道: ' + err.message));
                }
                return;
            }
            cb(null);
        });
    }

    saveSignCfg(callback: CallbackFunc<any>) {
        var signpath = pathLib.join(this.prjPath, 'chameleon', 'sign.json');
        fs.writeJson(signpath, this.signCfg.dumpJsonObj(), {encoding: 'utf-8'}, (err) => {
            if (err)  {
                Logger.log('Fail to dump sign config', err);
                callback(new ChameleonError(ErrorCode.OP_FAIL, '无法保存签名信息： ' + err.message));
                return;
            }
            callback(null);
        });
    }

    copyResInChannel(name: string, files: {from: string; to: string}[], cb: CallbackFunc<any>) {
        var cfg = this.channelCfg[name];
        if (!cfg) {
            Logger.log("Fail to find channelcfg for " + name);
            throw new ChameleonError(ErrorCode.OP_FAIL, '渠道还未安装：' + name);
        }
        var ops: Function[] = [];
        var prjPath = this.prjPath;
        for (var i in files) {
            ops.push((function () {
                var dest = pathLib.join(prjPath, 'chameleon', 'channels', name,
                    files[i].to);
                var src = files[i].from;
                return function(callback) {
                    fs.ensureFile(dest, (err) => {
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
                cb(new ChameleonError(ErrorCode.OP_FAIL, '拷贝文件出错'));
                return;
            }
            cb(null);
        })
    }

    get appname(): string {
        return this.projectCfg.globalCfg.appname;
    }

    get orient(): string {
        if (this.projectCfg.globalCfg.landscape) {
            return 'landscape';
        } else {
            return 'portrait';
        }
    }

    get icon(): string {
        return '';
    }

    updateGlobalCfg(cfg: any, cb: CallbackFunc<any>) {
        var p = pathLib.join(this.prjPath, 'chameleon', 'champroject.json');
        var jsonobj = this.projectCfg.updateGlobalCfg(cfg);
        fs.writeJson(p, jsonobj, {encoding:'utf-8'}, cb);
    }

    getSDKCfg(name: string) : SDKCfg{
        return this.sdkCfg[name];
    }

    getChannelCfg(channelName: string) : ChannelCfg {
        return this.channelCfg[channelName];
    }

    getAllChannels(): ChannelCfg[] {
        var res = [];
        for (var i in this.channelCfg) {
            res.push(this.channelCfg[i])
        }
        return res;
    }

    getAllSDKs(): SDKCfg[] {
        var res = [];
        for (var i in this.sdkCfg) {
            res.push(this.sdkCfg[i])
        }
        return res;
    }

    dumpProjectJson(callback: CallbackFunc<any>) {
        var obj = this.projectCfg.dumpJsonObj();
        Utils.dumpJsonFile(obj, pathLib.join(this.prjPath, 'chameleon', 'champroject.json'),
            callback);
    }

    loadIconInfo() : any{
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
    }


    loadAndroidProjectInfo(cb: CallbackFunc<any>) {
        var info = Project.extractProjectProperty(this.prjPath);
        this.androidTarget = info['target'];
        Project.loadAndroidManifest(this.prjPath, (err, am) => {
            if (err) {
                cb(err);
                return;
            }
            this.am = am;
            cb(null);
        });
    }

    static loadProject(infoJson: InfoJson, path: string, cb: CallbackFunc<Project>) {
        var chameleonPath = pathLib.join(path, 'chameleon');
        var prj =  new Project();
        prj.prjPath = path;
        async.parallel([
            // load global info
            function (callback) {
                var prjpath = pathLib.join(chameleonPath, 'champroject.json');
                fs.readFile(prjpath, function (err, buf) {
                    if (err) {
                        callback(new ChameleonError(ErrorCode.OP_FAIL, "读取全局配置错误"));
                        return;
                    }
                    var obj = JSON.parse(buf.toString('utf-8'));
                    prj.projectCfg.globalCfg.loadFromJson(obj['globalcfg']);
                    prj.projectCfg.version = obj.version;
                    callback(null);
                });
            },
            // load channel cfg
            function (callback) {
                var channeldir = pathLib.join(chameleonPath, 'channels');
                fs.readdir(channeldir, function (err, subfolders) {
                    if (err) {
                        console.log('Fail to read channels dir ' + err);
                        return callback(new ChameleonError(ErrorCode.OP_FAIL, "无法找到渠道配置"));
                    }
                    try {
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
                            var chcfg = ChannelCfg.loadFromJson(JSON.parse(content), meta, pathLib.join(prj.prjPath, 'chameleon', 'channels', subfolders[i]));
                            prj.addChannelCfg(subfolders[i], chcfg);
                        }
                    } catch (e) {
                        console.log('Fail to load channel cfg: ' + e.message + '\n' + e.stack);
                        callback(new ChameleonError(ErrorCode.OP_FAIL, "读取渠道配置错误"));
                        return;
                    }
                    callback(null);
                })
            },
            // load sdk cfg
            function (callback) {
                var sdkcfgdir = pathLib.join(chameleonPath, 'sdkcfg');
                fs.readdir(sdkcfgdir, function (err, subfiles) {
                    if (err) {
                        console.log('Fail to read sdkcfg dir ' + err);
                        return callback(new ChameleonError(ErrorCode.OP_FAIL, "无法找到SDK配置"));
                    }
                    var channelFolders = [];
                    var re = /(.+)/;
                    for (var i in subfiles) {
                        try {
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
                fs.readJson(signcfg, {encoding: 'utf-8'}, (err, jsonobj) => {
                    if (err) {
                        Logger.log('Fail to load sign cfg');
                    } else {
                        prj.setSignCfg(jsonobj);
                    }
                    callback(null);
                });
            },
            function (callback) {
                prj.loadAndroidProjectInfo(callback);
            }
        ], function (err) {
            if (err) {
                cb(err);
                return;
            }
            cb(null, prj);
        });
    }

    static loadAndroidManifest(prjPath: string, cb: CallbackFunc<any>) {
        var p = pathLib.join(prjPath, 'AndroidManifest.xml');
        fs.readFile(p, 'utf-8', (err, data) => {
            if (err) {
                Logger.log('Fail to load AndroidManifest.xml', err);
                cb(new ChameleonError(ErrorCode.OP_FAIL, '无法读取工程的AndroidManifest.xml: ' + err.message));
                return;
            }
            xml2js.parseString(data, function (err, result) {
                if (err) {
                    Logger.log('Fail to parse AndroidManifest.xml', err);
                    cb(new ChameleonError(ErrorCode.OP_FAIL, '无法读取工程的AndroidManifest.xml: ' + err.message));
                    return;
                }
                var am = new AndroidManifest(result);
                cb(null, am);
            });
        });
    }

    static createNewProject(appname: string, isLandscape: boolean, chamver: Version, path: string) : Project {
        var res = new Project();
        res.projectCfg.globalCfg.appname = appname;
        res.projectCfg.globalCfg.landscape = isLandscape;
        res.projectCfg.version = chamver;
        res.prjPath = path;
        var info = Project.extractProjectProperty(path);
        res.androidTarget = info.target;
        return res;
    }


    static extractProjectProperty (prjpath: string) : any {
        var propertyFile = pathLib.join(prjpath, 'project.properties');
        try {
            var p = fs.readFileSync(propertyFile, 'utf-8');
            var re = /target\s*=\s*(.+)/m;
            var result = re.exec(p);
            if (result === null) {
                throw new Error();
            }
            return {
                target: result[1]
            };
        } catch (e) {
            Logger.log('fail to parse project property file', e);
            throw new ChameleonError(ErrorCode.OP_FAIL, "非法的android工程路径，解析project.properties失败");
        }
    }

}

class AndroidManifest {
    xmlobj : any;
    appxml : any;

    constructor(xmlobj: any) {
        this.xmlobj = xmlobj['manifest'];
        this.appxml = this.xmlobj['application'][0];
    }

    getIcon(): string {
        var res = /@drawable\/(.+)/.exec(this.appxml['$']['android:icon']);
        if (res == null) {
            throw new ChameleonError(ErrorCode.CFG_ERROR, '非法的AndroidManifest.xml, 缺少Icon信息');
        }
        return res[1] + '.png';
    }

    getPkgName(): string {
        return this.xmlobj['$']['package'];
    }
}

class UpgradeMgr {
    workdir: string;
    curver: Version;

    constructor(workdir: string, curver: Version) {
        this.workdir = workdir;
        this.curver = curver;
    }

    readManifest(fpath: string): any {
        try {
            var zip = new AdmZip(fpath);
            var content = zip.readAsText("UpgradeManifest.json");
            if (content == null || content.length == 0) {
                throw new ChameleonError(ErrorCode.OP_FAIL, '不正确的升级包格式: 无法读取升级信息');
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
                throw new ChameleonError(ErrorCode.OP_FAIL, '不正确的升级包格式: ' + e.message);
            }
        }
    }

    upgradeFromZip(fpath: string) : Version{
        try {
            var zip = new AdmZip(fpath);
            var content = zip.readAsText("UpgradeManifest.json");
            var obj = JSON.parse(content);
            var baseVer = new Version(obj.prevVer);
            var tover = new Version(obj.toVer);
            if (this.curver.cmp(baseVer) != 0) {
                Logger.log("Fail to upgrade");
                throw new ChameleonError(ErrorCode.OP_FAIL, "升级包并不是针对当前版本："+ fpath + '\n' +
                    'base: ' + baseVer.toString() + ', current: ' + this.curver.toString());
            }
            zip.extractAllTo(this.workdir, true);
            this.curver = tover;
            return tover;
        } catch (e) {
            if (e instanceof ChameleonError) {
                throw e;
            } else {
                throw ChameleonError.newFromError(e, ErrorCode.OP_FAIL);
            }
        }
    }
}


