'use strict';

/* Services */

var fs = require('fs');
var pathLib = require('path');
var globalenv = require('./js/globalenv')
var DESITY_MAP = {
    medium: 'drawable-mdpi',
    high: 'drawable-hdpi',
    xhigh: 'drawable-xhdpi',
    xxhigh: 'drawable-xxhdpi',
    xxxhigh: 'drawable-xxxhdpi'
};

var ChameleonTool = (function () {
    function ChameleonTool(sdkpath, infoobj) {
        this.channelSDK = {};
        this.channels = [];
        this.typeDefaultMap = {
            'string' : '',
            'url': '',
            'boolean': 'false',
            'int': 0
        };
        this._initChannelSetting(sdkpath, infoobj);
        for (var i in infoobj.channels) {
            var c = infoobj.channels[i];
            this.channelSDK[c.name] = c;
        }

        for (var channelName in this.channelSDK) {
            this.channels.push({
                id: channelName
            });
        }
    }

    ChameleonTool.prototype._initChannelSetting = function (sdkpath, infoobj) {
        this.chlist = {};
        for (var i in infoobj.channellist) {
            this.chlist[i] = new ChannelSetting(
                infoobj.channellist[i], pathLib.join(sdkpath, 'channelinfo', i));
        }
    }

    ChameleonTool.prototype.getChannelList = function ()  {
        var res = [];
        for (var i in this.chlist) {
            res.push({desc: this.chlist[i].name, name: i});
        }
        return res;
    };

    ChameleonTool.prototype.getChannelDesc = function (name) {
        var channelcfg = this.chlist[name];
        if (channelcfg) {
            return channelcfg.name;
        } else {
            return null;
        }
    };

    ChameleonTool.prototype.getChannelSetting = function (channelId) {
        return this.chlist[channelId];
    }

    ChameleonTool.prototype.getAllChannels = function () {
        var res = [];
        for (var i in this.chlist) {
            res.push({
                name: i,
                desc: this.chlist[i].name,
                sdk: this.chlist[i].sdk
            });
        }
        return res;
    };

    ChameleonTool.prototype.getSDK = function (sdkid) {
        return this.channelSDK[sdkid];
    };

    ChameleonTool.prototype.getAllSDKs = function () {
        return this.channelSDK;
    };

    ChameleonTool.prototype.makeDefaultValue = function (sdkid) {
        var sdkCfg = this.channelSDK[sdkid];
        if (!sdkCfg) {
            throw new Error('Fail t find channel sdk for ' + sdkid);
        }
        var cfg = sdkCfg.cfgitem;
        var sdkcfg = {};
        for (var cfgname in cfg) {
            if (cfg[cfgname].default) {
                sdkcfg[cfgname] = cfg[cfgname].default;
            } else {
                sdkcfg[cfgname] = this.typeDefaultMap[cfg[cfgname].type];
            }
        }
        return {
            id: sdkCfg.name,
            channeldesc: sdkCfg.desc, 
            chamver: sdkCfg.chamversion,
            ver: sdkCfg.version,
            cfg: sdkcfg
        };
    };

    ChameleonTool.prototype.getChannelSDK = function (channelName) {
        return this.channelSDK[channelName];
    };

    return ChameleonTool;
})();


var Version = (function (ver) {
    function _Version (ver)  {
        this.res = ver.split('.').map(function (x) {
            return parseInt(x);
        });
    }

    _Version.prototype.isMajorLower = function (that) {
        return this.res[0] < that.res[1];
    };

    _Version.prototype.isLower = function (that) {
        for (var i in this.res) {
            if (this.res[i] < that.res[i]) {
                return true;
            }
        }
        return false;
    };
    return _Version;
})();


var SDKCfg = (function () {
    function SDKCfg () {
         
    }

})();

function simpleClone(src) {
    var res = {};
    for (var i in src) {
        res[i] = src[i];
    }
    return res;
}

var SDKObject = (function () {
    function SDKObject(name, channeldesc, sdkobj, isnew) {
        this._sdkobj = sdkobj;
        this._isnew = isnew;
        this._name = name;
        Object.defineProperty(this, 'isnew', {
            get: function () {return this._isnew;}
        });
        Object.defineProperty(this, 'sdkid', {
            get: function () {return this._sdkobj.id;}
        });
        Object.defineProperty(this, 'desc', {
            get: function () {return this._sdkobj.desc || name;},
            set: function (value) {this._sdkobj.desc = value;}
        });
        Object.defineProperty(this, 'channeldesc', {
            get: function () {return channeldesc;}
        });
        Object.defineProperty(this, 'name', {
            get: function () {return this._name;},
            set: function (value) {this._name = value;}
        })
    }

    SDKObject.prototype.cloneCfg = function () {
        if (this._sdkobj) {
            return simpleClone(this._sdkobj.cfg);
        } else {
            return this._tmpcfg;
        }
    };

    SDKObject.prototype.afterCommitted = function (cfg) {
        if (this._isnew) {
            delete this._isnew;
        }
        this._sdkobj.cfg = cfg;
    };
    
    return SDKObject;
})();

// project instance
var Project = (function() {

    function Project (projectPath, projectObj, chtool) {
        this.prjPath = projectPath;
        this.chtool = chtool;
        this._initSDKCfg(projectObj, chtool);
        this.onReload(projectObj);
        Object.defineProperty(this, 'appname', {
            get: function () {return this.obj.globalcfg.appname;}
        });
        Object.defineProperty(this, 'orient', {
            get: function () {
                if (this.obj.globalcfg.landscape === 'false') {
                    return 'portrait';
                } else {
                    return 'landscape';
                }
            }
        })
        Object.defineProperty(this, 'version', {
            get: function () {return this.obj.version;}
        });
        Object.defineProperty(this, 'icon', {
            get: function () {
                return this.am.getIcon();
            }
        });
    }

    Project.prototype.commitSDK = function (sdk, cfg, name) {
        if (!this.sdkcfg[name]) {
            this.sdkcfg[name] = sdk;
            sdk.name = name;
        }
        sdk.afterCommitted(cfg);
    }

    Project.prototype.onReload = function (projectObj) {
        this.obj = projectObj;
        var self = this;
        this.outdatedChannels = {};
        for (var outdatedIndex in this.obj.outdatedInfo) {
            var outdatedChannel = this.obj.outdatedInfo[outdatedIndex];
            var res = [];
            var isMajorOutdated = false;
            for (var libIndex in outdatedChannel) {
                var fromVersion = new Version(outdatedChannel[libIndex].from);
                var toVersion = new Version(outdatedChannel[libIndex].to);
                res.push({
                    name: outdatedChannel[libIndex].name,
                    from: fromVersion,
                    to: toVersion,
                    fromdesc: outdatedChannel[libIndex].fromdesc,
                    todesc: outdatedChannel[libIndex].todesc
                });
                if (!isMajorOutdated && fromVersion.isMajorLower(toVersion)) {
                    isMajorOutdated = true;
                }
            }
            this.outdatedChannels[outdatedIndex] = {
                isMajorOutdated: isMajorOutdated,
                libs: res
            };
        }
        /*
        this.channels = projectObj.channelCfg.map(function (x) {
            var outdated = null;
            for (var name in self.outdatedChannels) {
                if (name === x.name) {
                    if (self.outdatedChannels[name].isMajorLower) {
                        outdated = 'major';
                    } else {
                        outdated = 'minor';
                    }
                    break;
                }
            }
            var dl = x.cfg.dependLibs[0];
            var cfg = projectObj.sdkcfg[dl.cfg];
            if (!cfg) {
                console.log('missing cfg ' + dl.cfg);
            }
            var channelcfg = {
                name: x.name,
                dependLibs: {name: dl.name, cfgname: dl.cfg, cfg: cfg.cfg},
                sign: x.sign
            };
            return new Channel(channelcfg, self.obj.globalcfg, outdated);
        });
        */
    };

    Project.prototype.loadChannel = function (projectObj, chtool) {
        this.channels = {};
        for (var i in projectObj.channelCfg) {
            var obj = projectObj.channelCfg[i];
            this.channels[obj.name] = new ChannelCfg(obj, chtool, this);
        }
    }

    Project.prototype._initSDKCfg = function (projectObj, chtool) {
        this.sdkcfg = {};
        for (var name in projectObj.sdkcfg) {
            var sdkobj = projectObj.sdkcfg[name];
            var sdk = chtool.getSDK(sdkobj.id);
            if (!sdk) {
                console.log('Fail to find sdk for ' + sdkobj.id);
                continue;
            }
            this.sdkcfg[name] = new SDKObject(name, sdk.desc, sdkobj);
        }
    }

    Project.prototype.guessDesity = function () {
        var resFolder = pathLib.join(this.prjPath, 'res');
        var res = [];
        for (var desity in DESITY_MAP) {
            if (fs.existsSync(pathLib.join(resFolder, DESITY_MAP[desity]))) {
                res.push(desity);
            }
        }
        return res;
    };

    Project.prototype.loadAndroidManifest = function (callback) {
        var parseString = require('xml2js').parseString;
        var self = this;
        var p = pathLib.join(this.prjPath, 'AndroidManifest.xml');
        fs.readFile(p, {encoding:'utf-8'}, function (err, data) {
            if (err) {
                return callback(err);
            }
            parseString(data, function (err, result) {
                if (err) {
                    return callback(err);
                }
                console.log(result)
                self.am = new AndroidManifest(result);
                callback(null);
            });
        });
    }

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

    Project.prototype.updateSignCfg = function (channelId, signcfg) {
        if (channelId) {
            for (var i in this.channels) {
                if (channelId === this.channels[i].name) {
                    this.channels[i].obj.sign = signcfg;
                }
            }
        } else {
            this.obj.globalcfg.sign = signcfg;
        }
    };

    Project.prototype.getAllChannels = function () {
        return this.channels;
    };

    Project.prototype.getGlobalSignCfg = function () {
        return this.obj.signcfg;
    };

    Project.prototype.cloneGlobalCfg = function () {
        var res = {};
        for (var i in this.obj.globalcfg) {
            res[i] = this.obj.globalcfg[i];
        }
        return res;
    };

    Project.prototype.getAllSDKs = function () {
        return this.sdkcfg;
    }

    Project.prototype.getUpdateGlobalCfg = function (cfg) {
        var res = {};
        for (var i in this.obj.globalcfg) {
            res[i] = this.obj.globalcfg[i];
        }
        res.globalcfg = cfg;
        return res;
    };

    Project.prototype.setGlobalCfg = function (cfg) {
        this.obj.globalcfg = cfg;
    };


    Project.prototype.getSignCfg = function () {
        return this.obj.globalcfg.sign;
    };

    Project.prototype.addChannel = function (channel) {
        if (this.channels[channel]) {
            throw new Error('渠道' + channel + '已经存在');
        }
        var res = new ChannelCfg({name: channel}, this.chtool, this);
        this.channels[channel] = res;
        return res;
    };

    Project.prototype.getOutdatedProject = function () {
        return this.outdatedChannels;
    };

    return Project;
})();

var AndroidManifest = (function () {
    function AndroidManifest (xmlobj) {
        this.xmlobj = xmlobj.manifest;
        this.appxml = xmlobj.manifest.application[0];
    }

    AndroidManifest.prototype.getIcon = function () {
        var res = /@drawable\/(.+)/.exec(this.appxml.$['android:icon']);
        if (res == null) {
            return new Error('Illegal AndroidManifest.xml, missing icon info');
        }
        return res[1] + '.png';
    };

    AndroidManifest.prototype.getPkgName = function () {
        return this.xmlobj.$['package'];
    }
    return AndroidManifest;
})();

var Channel = (function () {
    function Channel (channelObj, globalCfg, outdated, isnew) {
        this.obj = channelObj;
        this.gcfg = globalCfg;
        this.cfg = {};
        this.isnew = isnew;
        this.outdated = outdated;
        var self = this;
        Object.defineProperty(this, 'name', {
            get: function () {return channelObj.name;}
        });
    }

    Channel.prototype.getSignCfg = function () {
        if (this.obj.sign) {
            return this.obj.sign;
        } else {
            return this.gcfg.sign;
        }
    };

    Channel.prototype.getCfg = function () {
        var obj = {};
        var l = this.obj.dependLibs;
        for (var cname in l.cfg) {
            obj[cname] = l.cfg[cname];
        }
        var signcfg = {};
        var nowSignCfg = this.getSignCfg();
        if (nowSignCfg) {
            for (var i in nowSignCfg) {
                signcfg[i] = nowSignCfg[i];
            }
        } else {
            signcfg = {
                keystroke: "",
                keypass: "",
                storepass: "",
                alias: ""
            };
        }
        return new ChannelCfg(l.name, l.cfgname, obj, signcfg);
    };

    Channel.prototype.removeNewFlag = function () {
        if (this.isnew)
            delete this.isnew;
    };

    Channel.prototype.onCfgSaved = function (channelCfg) {
        var updateCfg = channelCfg.getUpdateCfg();
        this.obj.dependLibs.cfg = updateCfg;
        this.removeNewFlag();
    };

    return Channel;
})();

var ChannelCfg = (function () {

    function ChannelCfg (cfgobj, chtool, project) {
        this.settingObj = chtool.getChannelSetting(cfgobj.name);
        var prjPath = project.prjPath;
        this._packageName = project.am.getPkgName() 
            + this.settingObj.suffix;
        var sdks = project.getAllSDKs();
        if (cfgobj.cfg) {
            this._sdk = sdks[cfgobj.cfg.dependLibs[0].cfg];
        } else {
            this._sdk = null;
        }
        this.channelpath = pathLib.join(prjPath, 'chameleon', 'channels', 
            cfgobj.name);
        this._name = cfgobj.name;
        this._initFromCfg(cfgobj.cfg || {});
        Object.defineProperty(this, 'name', {
            get: function () {return this._name;}
        });

        Object.defineProperty(this, 'shownIcon', {
            get: function () {return this._shownIcon;}
        });


        Object.defineProperty(this, 'sdk', {
            get: function () {return this._sdk;},
        });

        Object.defineProperty(this, 'requiredSDK', {
            get: function () {return this.settingObj.sdk;}
        });

        Object.defineProperty(this, 'splashscreen', {
            get: function() {return this._splashscreen;},
            set: function(value) {return this._splashscreen = value;}
        });

        Object.defineProperty(this, 'packageName', {
            get: function () {
                return this._packageName;
                }
        });

        Object.defineProperty(this, 'hasIcon', {
            get: function () {return this.settingObj.hasIcon;}
        });
        Object.defineProperty(this, 'hasSplashScreen', {
            get: function () {return this.settingObj.hasSplashScreen;}
        });
        Object.defineProperty(this, 'desc', {
            get: function () {return this.settingObj.name;}
        });
        Object.defineProperty(this, 'icons', {
            get: function () {return this.obj.icons;}
        });
    }

    ChannelCfg.prototype.afterCommited = function (cfgobj) {
        this._initFromCfg(cfgobj);
    }

    ChannelCfg.prototype._initFromCfg = function (cfgobj) {
        this.obj = cfgobj;
        if (cfgobj.splashscreen) {
            this.rawsc = cfgobj.splashscreen;
            this._splashscreen = pathLib.join(this.channelpath, cfgobj.splashscreen);
        } else {
            this._splashscreen = null;
        }
    
        this._shownIcon = null;
        if (this.settingObj.hasIcon) {
            var density = ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi'];
            for (var i in density) {
                var p = pathLib.join(this.channelpath, 'res', density[i], 'chameleon_icon.png');
                if (fs.existsSync(p)) {
                    this._shownIcon = p;
                    break;
                }
            }
        }

    }

    ChannelCfg.prototype.getSettingObj = function () {
        return this.settingObj;
    };

    ChannelCfg.prototype.getUpdateCfg = function () {
        return this.obj;
    };
    return ChannelCfg;
})();

var ChannelSetting = (function() {
    var TYPE_MAP = {
        m: 'medium',
        h: 'high',
        xh: 'xhigh'
    };

    var DRAWABLE_DENSITY = {
        medium: 'drawable-mdpi',
        high: 'drawable-hdpi',
        xhigh: 'drawable-xhdpi',
        xxhigh: 'drawable-xxhdpi',
        xxxhigh: 'drawable-xxxhdpi'
    };

    function ChannelSetting (settingObj, cfgfolder) {
        this.resPath = cfgfolder;
        this.sobj = settingObj;
        if (this.sobj.splashscreen) {
            this.sc = this._loadSplashInfo();
        }
        if (this.sobj.icon) {
            this.icon = this._loadIconInfo();
        }
        Object.defineProperty(this, 'name', {
            get: function () {return this.sobj.name;}
        });
        Object.defineProperty(this, 'suffix', {
            get: function () {return this.sobj.pkgsuffix;}
        });
        Object.defineProperty(this, 'sdk', {
            get: function () {return this.sobj.sdk;}
        });
        Object.defineProperty(this, 'hasIcon', {
            get: function () {return this.sobj.icon;}
        });
        Object.defineProperty(this, 'hasSplashScreen', {
            get: function () {return this.sobj.splashscreen;}
        });
    }

    ChannelSetting.prototype._loadIconInfo = function () {
        var drawablePath = pathLib.join(this.resPath, 'drawable');
        var icon = {}
        for (var d in DRAWABLE_DENSITY) {
            var leftup = pathLib.join(drawablePath, DRAWABLE_DENSITY[d], 'icon-decor-leftup.png');
            var leftdown = pathLib.join(drawablePath, DRAWABLE_DENSITY[d], 'icon-decor-leftdown.png');
            var rightup = pathLib.join(drawablePath, DRAWABLE_DENSITY[d], 'icon-decor-rightup.png');
            var rightdown = pathLib.join(drawablePath, DRAWABLE_DENSITY[d], 'icon-decor-rightdown.png');
            if (fs.existsSync(leftup) &&
                fs.existsSync(leftdown) &&
                fs.existsSync(rightup) &&
                fs.existsSync(rightdown) ) {
                icon[d] = [leftup, rightup, leftdown, rightdown];
            }
        }
        return icon;
    };

    ChannelSetting.prototype._loadSplashInfo = function() {
        var scPath = pathLib.join(this.resPath, 'drawable', 'splashscreen');
        var res = {portrait: [], landscape: []};
        var files = fs.readdirSync(scPath);
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
    };

    ChannelSetting.prototype.getIconOverlay = function (appIconList) {
        var res = {};
        for (var i in appIconList) {
            if (!this.icon[i]) {
                continue;
            }
            res[i] = {
                base: appIconList[i],
                overlay: this.icon[i]
            }
        }
        return res;
    };

    ChannelSetting.prototype.getSplashScreen = function (orient) {
        return this.sc[orient];
    };

    ChannelSetting.prototype.getUpdateCfg = function (channelcfg, cfg) {
        var updateCfg = {
            cfg: {},
            copyfile: []
        };
        if (this.hasIcon && !cfg.icons) {
            throw new Error('这个渠道需要定制化icon，请设置');
        }
        if (this.hasSplashScreen && !cfg.splashscreen) {
            throw new Error('这个渠道需要定制化闪屏，请设置');
        }
        if (cfg.splashscreenToCp) {
            var sc = cfg.splashscreenToCp;
            var newsc = pathLib.join('assets', 'chameleon', 'chameleon_splashscreen_0.png');
            updateCfg.cfg.splashscreen = newsc;
            updateCfg.copyfile.push({
                from: sc.path,
                to: newsc
            });
        } else {
            updateCfg.cfg.splashscreen = channelcfg.rawsc;
        }
        if (cfg.icons) {
            updateCfg.cfg.icons = {
                position: cfg.icons.position
            };
            if (cfg.icons.tempicons) {
                for (var d in cfg.icons.tempicons) {
                    updateCfg.copyfile.push({
                        from: cfg.icons.tempicons[d],
                        to: pathLib.join('res', DRAWABLE_DENSITY[d], 'chameleon_icon.png')
                    });
                }
            }
        }
        
        updateCfg.cfg.dependLibs = [{
            cfg: cfg.sdk.name,
            type: 'user,pay',
            name: cfg.sdk.sdkid
        }];

        console.log(updateCfg)
        
        return updateCfg;
    };

    return ChannelSetting;
})();

var chameleonTool = angular.module('chameleonTool', ['ngResource']);

chameleonTool.service('ProjectMgr', ["$q", "$log", function($q, $log) {
    var DRAWABLE_DENSITY = {
        medium: 'drawable-mdpi',
        high: 'drawable-hdpi',
        xhigh: 'drawable-xhdpi',
        xxhigh: 'drawable-xxhdpi',
        xxxhigh: 'drawable-xxxhdpi'
    };

    var ProjectMgr = function() {
        $log.log('init the env');
        this.exec = require('child_process').execFile;
        this.tmpLib = require('tmp');
        this.fs = require('fs');
        this.pathLib = require('path');
        var content = 
            fs.readFileSync(pathLib.join(globalenv.APP_FOLDER, 'env.json'), {
            encoding:'utf-8'
            });
        this.env = JSON.parse(content);
        this.setPythonMgrPath(
            pathLib.join(globalenv.APP_FOLDER, this.env.pythonPath));
        this.db = new PouchDB('projects');
        globalenv.createTempFolder();
    };

    ProjectMgr.prototype.getTempFile = function(project, name) {
        return globalenv.createProjectTmpFile(project.__doc._id, name);
    }

    ProjectMgr.prototype.setPythonMgrPath = function(path) {
        var join = this.pathLib.join;
        this.toolpath = path;
        this.path = join(path, 'chameleon.py');
        try {
            var obj = JSON.parse(this.fs.readFileSync(join(path, 'chamenv.json'), 
                'utf-8'));
            if (obj && obj.sdk_root) {
                this.isInited = true;
                this.env = obj;
            } else {
                this.isInited = false;
                this.env = {};
            }
        } catch (e) {
            this.isInited = false;
            this.env = {}
        }
        try {
            var infoobj = JSON.parse(this.fs.readFileSync(
                join(path, 'info.json'), 'utf-8'));
            this.version = infoobj.version;
            this.versionObj = this.version.split('.').map(function (x) {
                return parseInt(x);
            });
            this.sdkset = new ChameleonTool(path, infoobj);
        } catch (e) {
            $log.log('Fail to load info.json ' + e.message);
            throw new Error('无法初始化Chameleon工具');
        }
    };

    ProjectMgr.prototype.removeProject = function(project) {
        this.db.remove(project);
    };

    ProjectMgr.prototype.isVersionLower = function(projectVersion) {
        var verObj = projectVersion.split('.').map(function (x) {
            return parseInt(x);
        });
        return verObj[0] < this.versionObj[0] || 
            verObj[1] < this.versionObj[1] ||
            verObj[2] < this.versionObj[2];
    };

    ProjectMgr.prototype.loadTempProject = function (path) {
        var j = this.pathLib.join(path, 'chameleon', 'champroject.json');
        try {
            var p = JSON.parse(this.fs.readFileSync(j, 'utf-8'));
            return {
                appname: p.globalcfg.appname,
                version: p.version
            };
        } catch (e) {
            $log.log(e);
            throw new Error("无法找到或者正确读取工程文件: " + j);
        }
    };

    ProjectMgr.prototype.doRunCmd = function (cmd, params, timeout, callback) {
        if (typeof timeof === 'function') {
            callback = timeout;
            timeout = 60; //default one minute
        }
        var c = spawn(cmd, params);
    }

    ProjectMgr.prototype.compileProject = function(project, target) {
        var defered = $q.defer();
        var buildscript = this.pathLib.join(project.__doc.path, 'chameleon_build.py');
        var inputParams = [buildscript, 'build', 'debug', target];
        this.exec('python', inputParams, {
                timeout: 120000
            }, function (error, stdout, stderr) {
                $log.log("std out " + stdout);
                var compileResult = null;
                if (error) {
                    compileResult = {
                        code: error.code,
                        target: target,
                        s: stderr + '\n' + stdout
                    };
                    return defered.resolve(compileResult);
                }
                return defered.resolve({
                    code: 0,
                    target: target
                });
            });
        return defered.promise;
    };

    ProjectMgr.prototype.getAllChannels = function() {
        return this.sdkset.getAllChannels();
    };

    ProjectMgr.prototype.newSDK = function (sdkid, desc) {
        var obj = this.sdkset.makeDefaultValue(sdkid);
        obj.desc = desc;
        return new SDKObject("", obj.channeldesc, obj, true); 
    }

    ProjectMgr.prototype.getSupportedDKs = function () {
        return this.sdkset.getAllSDKs();
    }

    ProjectMgr.prototype.loadIcon = function (projectPath, icon) {
        var path = this.pathLib;
        var fs = this.fs;
        var toLoad = {};
        for (var density in DRAWABLE_DENSITY) {
            var iconPath = path.join(projectPath, 
                'res', DRAWABLE_DENSITY[density], icon);
            if (fs.existsSync(iconPath)) {
                toLoad[density] = iconPath;
            }
        }
        return toLoad;
    }

    ProjectMgr.prototype.getAllSDKs = function () {
        return this.sdkset.getAllSDKs();
    };

    ProjectMgr.prototype.updateSignCfg = function (project, channelId, cfg) {
        var defered = $q.defer(); 
        var self = this;
        var querystring = require('querystring');
        var inputParams = ['setsigncfg'];
        inputParams.push(project.__doc.path);
        inputParams.push('"'+querystring.stringify(cfg)+'"');
        if (channelId) {
            inputParams.push('-c');
            inputParams.push(channelId);
        }
        self.runCmd(inputParams, false, function (err, result) {
            if (err) {
                $log.log('Fail to update sign cfg ' + err);
                return defered.reject(new Error('更新签名配置失败'));
            }
            defered.resolve();
        });
        return defered.promise;
    };

    ProjectMgr.prototype.setChannel = function (project, channelcfg, cfg){
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        var inputParams = ['setch'];
        inputParams.push(projectPath);
        inputParams.push(channelcfg.name);
        self.tmpLib.tmpName(function (err, path) {
            if (err) {
                $log.log('Fail to create tmp file ' + err.message);
                return defered.reject(new Error('更新配置失败: 无法创建临时文件'));
            }
            inputParams.push(path);
            self.fs.writeFile(path, JSON.stringify(cfg), function (err) {
                if (err) {
                    $log.log('Fail to create tmp file ' + err.message);
                    self.fs.unlink(path);
                    return defered.reject(new Error('更新配置失败: 无法创建临时文件'));
                }
                self.runCmd(inputParams, function (err) {
                    self.fs.unlink(path);
                    if (err) {
                        return defered.reject(err);
                    }
                    try {
                        channelcfg.afterCommited(cfg.cfg);
                    } catch (e) {
                        console.log(e);
                    }
                    defered.resolve();
                });
            }); 
        });
        return defered.promise;
    }

    ProjectMgr.prototype.updateSDKCfg = function (project, cfg, sdk) {
        console.log(sdk)
        var defered = $q.defer();
        var cfgname = null;
        if (sdk.isnew) {
            cfgname = sdk.sdkid+'-'+(Date.now());
        } else {
            cfgname = sdk.name;
        }
        var promise = this.doUpdateSDKCfg(
            project, cfg, sdk.sdkid, sdk.desc, cfgname);
        promise.then(function () {
            project.commitSDK(sdk, cfg, cfgname);
            defered.resolve();
        }, function (e) {
            defered.reject(e);
        })
        return defered.promise;
    }

    ProjectMgr.prototype.doUpdateSDKCfg = 
        function (project, cfg, sdk, desc, cfgname) {
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        var inputParams = ['upchcfg'];
        console.log(cfgname)
        if (sdk) {
            inputParams.push('-c');
            inputParams.push(sdk);
        }
        if (cfgname) {
            inputParams.push('-n');
            inputParams.push(cfgname);
        }
        if (desc) {
            inputParams.push('-d');
            inputParams.push(desc);
        }
        inputParams.push(projectPath);
        self.tmpLib.tmpName(function (err, path) {
            if (err) {
                $log.log('Fail to create tmp file ' + err.message);
                return defered.reject(new Error('更新配置失败: 无法创建临时文件'));
            }
            inputParams.push(path);
            self.fs.writeFile(path, JSON.stringify(cfg), function (err) {
                if (err) {
                    $log.log('Fail to create tmp file ' + err.message);
                    self.fs.unlink(path);
                    return defered.reject(new Error('更新配置失败: 无法创建临时文件'));
                }
                self.runCmd(inputParams, function (err) {
                    self.fs.unlink(path);
                    if (err) {
                        return defered.reject(err);
                    }
                    defered.resolve();
                });

            }); 
        });
        return defered.promise;
    }

    ProjectMgr.prototype.updateGlobalCfg = function (project, cfg) {
        var defered = $q.defer();
        var self = this;
        var promise = this.doUpdateSDKCfg(project, cfg);
        promise.then(function () {
            project.setGlobalCfg(cfg);
            defered.resolve();
        }, function (e) {
            defered.reject(e);
        });
        return defered.promise;
    }

    ProjectMgr.prototype.bindProject = function (name, path) {
        var defered = $q.defer();
        var self = this;
        var chameleonPath = self.pathLib.join(path, 'chameleon');
        if (!self.fs.existsSync(chameleonPath)) {
            throw new Error('无法找到Chameleon的工程文件: '+ chameleonPath);
        }
        var chamPrjPath = self.pathLib.join(chameleonPath, 'champroject.json');
        try {
            var projectDetail = JSON.parse(self.fs.readFileSync(chamPrjPath, 'utf-8'));
            var appName = projectDetail.globalcfg.appname;
            var version = projectDetail.version;
            self.db.put({
                _id: Math.round(new Date().getTime()/1000).toString(),
                path: path,
                name: appName,
                version: version
            }, function (err, result) {
                if (err) {
                    $log.log('Fail to put in pouchDB ' + err);
                    return defered.reject(new Error('绑定工程失败: 未知错误'));
                }
                return defered.resolve(result.id);
            });
            return defered.promise;
        } catch (e) {
            $log.log('Fail to read or parse project path');
            throw new Error('解析Chameleon工程文件出错');
        }
    };

    ProjectMgr.prototype.upgradeProject = function (project, force) {
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        var inputParams = ['upgradeprj'];
        if (force) {
            inputParams.push('-f');
        }
        inputParams.push(projectPath);
        self.runCmd(inputParams, function (err, result) {
            if (err) {
                $log.log('Fail to upgrade prject ' + err);
                return defered.reject(new Error('升级工程失败'));
            }
            defered.resolve();
        });
        return defered.promise;
    };

    ProjectMgr.prototype.upgradeChannel = function (project, channel) {
        var defered = $q.defer();
        var self = this;
        var projectPath = project.__doc.path;
        var inputParams = ['upgradech'];
        inputParams.push(projectPath);
        inputParams.push(channel);
        self.runCmd(inputParams, function (err, result) {
            if (err) {
                $log.log('Fail to upgrade channel ' + err);
                return defered.reject(new Error('升级渠道失败'));
            }
            defered.resolve();
        });
        return defered.promise;
    };


    ProjectMgr.prototype.createProject = function (params) {
        var defered = $q.defer();
        var self = this;
        var chameleonPath = self.pathLib.join(params.path, 'chameleon');
        if (self.fs.existsSync(chameleonPath) && !params.force) {
            var e = new Error("chameleon工程已经存在,使用绑定工程或者强制覆盖");
            throw e;
        }
        var projectPPath = self.pathLib.join(params.path, 'project.properties');
        var info = self.extractProjectProperty(projectPPath);
        var inputParams = ['makeprj'];
        if (params.unity) {
            inputParams.push('-u');
        }
        inputParams.push('-t');
        inputParams.push(info.target);
        if (params.portrait) {
            inputParams.push('-p');
        }
        if (params.force) {
            inputParams.push('-f');
        }
        inputParams.push(params.path);
        inputParams.push(params.name);
        var _id = Math.round(new Date().getTime()/1000).toString();
        inputParams.push(_id);
        self.runCmd(inputParams, function (err) {
            if (err) {
                return defered.reject(err);
            }
            self.db.put({
                _id: _id,
                path: params.path,
                name: params.name,
                version: self.version
            }, function (err, result) {
                if (err) {
                    $log.log('Fail to put in pouchDB ' + err);
                    return defered.reject(new Error('创建工程失败: 未知错误'));
                }
                return defered.resolve(result.id);
            });
        });
        return defered.promise;
    };

    ProjectMgr.prototype.SetEnv = function (env) {
        var defered = $q.defer();
        var self = this;
        var querystring = require('querystring');
        var inputParams = ['setprops'];
        inputParams.push(querystring.stringify(env));
        self.runCmd(inputParams, function (err, result) {
            if (err) {
                $log.log('Fail to setprops ' + err);
                return defered.reject(new Error('设置环境失败'));
            }
            self.env = env;
            defered.resolve();
        });
        return defered.promise;
    };

    ProjectMgr.prototype.runCmd = function (inputParams, hasRet, callback) {
        if (typeof(hasRet) === 'function') {
            callback = hasRet;
            hasRet = false;
        }
        $log.log('runcmd ' + this.path + '///' + inputParams.join('///'));
        this.exec('python', [this.path].concat(inputParams), {
		encoding: 'utf8',
		maxBuffer: 200*1024,
                timeout: 30000
            }, function (error, stdout, stderr) {
                $log.log("std out " + stdout);
                $log.log("std err " + stderr);
                if (error) {
                    $log.log("fail to exec python script " + error.code + 
                        error.signal);
                    $log.log("fail to exec python script " + stderr);
                    var e = new Error('执行脚本失败: ' + stderr);
                    e.code= error.code;
                    return callback(e);
                }
                var obj = null;
                if (hasRet) {
                    try {
                        obj = JSON.parse(stdout);
                    } catch (e) {
                        $log.log('fail to parse stdout from cmd ' + stdout);
                        return callback(new Error("执行脚本失败: 未知错误"));
                    }
                } 
                return callback(null, obj);
            }); 
    };

    ProjectMgr.prototype.extractProjectProperty = function (propertyFile) {
        try {
            var p = this.fs.readFileSync(propertyFile, 'utf-8');
            var re = /target\s*=\s*(.+)/m;
            var result = re.exec(p);
            if (result === null) {
                throw new Error();
            }
            return {
                target: result[1],
            };
        } catch (e) {
            $log.log("exception: " + e.message + '\n' + e.stacktrace);
            throw new Error("非法的android工程路径，解析project.properties失败");
        } 
    };

    ProjectMgr.prototype.reloadProject = function (project) {
        var defered = $q.defer();
        var self = this;
        self.doLoadProject(project.__doc.path, function (err, projectcfg) {
            if (err) {
                $log.log(err);
                return defered.reject(err);
            }
            try {
                project.onReload(projectcfg);
                defered.resolve();
            } catch (e) {
                $log.log(e);
                defered.reject(e);
            }
        });
        return defered.promise;
    };

    ProjectMgr.prototype.loadProject = function (projectId) {
        var defered = $q.defer();
        var self = this;
        self.db.get(projectId, function (err, doc) {
            if (err) {
                $log.log('Fail to load project ' + err);
                return defered.reject(new Error('加载工程失败!!'));
            }
            self.doLoadProject(doc.path, function (err, project) {
                if (err) {
                    $log.log(err);
                    return defered.reject(err);
                }
                try {
                    var res = new Project(doc.path, project, self.sdkset);
                    res.__doc = doc;
                    res.loadAndroidManifest(function (err) {
                        if (err) {
                            defered.reject(err);
                            return;
                        }
                        res.loadChannel(project, self.sdkset);
                        defered.resolve(res);
                    });
                } catch (e) {
                    $log.log(e);
                    defered.reject(e);
                }
            });
        });
        return defered.promise;
    };

    ProjectMgr.prototype.doLoadProject = function (prjPath, callback) {
        var self = this;
        var inputParams = ['getprj'];
        inputParams.push(prjPath);
        self.runCmd(inputParams, true, function (err, result) {
            if (err) {
                $log.log('Fail to load project ' + err);
                return callback(new Error('加载工程失败!!'));
            }
            callback(null, result);
        });
    };

    ProjectMgr.prototype.updateProjectDoc = function (projectDoc) {
        this.db.put(projectDoc);
    };

    ProjectMgr.prototype.getProjectList = function () {
        var defered = $q.defer();
        try {
            this.db.allDocs({include_docs: true}, function(err, response) { 
                defered.resolve(response.rows.map(function (row)  {
                    return row.doc;
                }));
            });
        } catch (e) {
            $log.log('Fail to fetch project list ' + e.message);
            setImmediate(function () {
                defered.resolve([]);
            });
        }
        return defered.promise;
    };

    ProjectMgr.prototype.setToolSetting = function (settings) {
        var defered = $q.defer();
        this.exec('python', [this.path, 'setprop','sdk_root', settings.sdk_root], {
                timeout: 100000
            }, function (error, stdout, stderr) {
                if (error) {
                    $log.log("fail to exec python script " + error.code + 
                        error.signal);
                    return defered.reject(error);
                }
                var obj = JSON.parse(stdout);
                return defered.resolve(obj);
            }); 
        return defered.promise;
    };

    return new ProjectMgr();
}])
.factory('WaitingDlg', ['$q', '$modal', function ($q, $modal) {
    var WaitingDlg = function () {
        var self = this;
        this.controller = function ($scope, $modalInstance, data) {
            $scope.tips = data.tips;
            data.p.then(function (x) {
                $modalInstance.close(x);
                return x;
            }, function (x) {
                $modalInstance.dismiss(x);
                return x;
            });
        };
    };

    WaitingDlg.prototype.wait = function (promise, tips) {
        var instance = $modal.open({
            templateUrl: 'partials/waitdlg.html',
            controller: this.controller,
            resolve: {
                data: function () {
                    return {
                        p: promise,
                        tips: tips
                    };
                }
            },
            backdrop: false,
            keyboard: false,
            size: 'sm'
        });
        return instance.result;
    };

    return new WaitingDlg();
}]);



