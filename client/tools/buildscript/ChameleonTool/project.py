#encoding=utf8
import os, traceback, sys, shutil
from dumbjsondb import loadJsonObj, dumpJsonObj
from replace_template import parseSignCfg
from JsonValidator import CfgItem, CfgItemSet

class ChannelInfo(object):
    _CFG_JSON_FILE = 'project.json'
    _SIGN_JSON_FILE = 'sign.json'
    def __init__(self, name, channelPath):
        self.cp = channelPath
        self.name = name
        self.cfgpath = os.path.join(channelPath, self._CFG_JSON_FILE)
        self._signcfg = None

    @property
    def path(self):
        return self.cp
    @property
    def cfg(self):
        _cfg = self._myCfg()
        _signcfg = self._mySignCfg()
        newCfg = {}
        newCfg.update([(key, value) for key, value in _cfg.items() if key != 'dependLibs'])
        if _signcfg is not None:
            newCfg['sign'] = _signcfg
        newCfg['dependLibs'] = _cfg['dependLibs']
        return newCfg

    @property
    def dependLibNames(self):
        return self._cfg.dependLibs.keys()

    def _mySignCfg(self):
        p = os.path.join(self.cp, self._SIGN_JSON_FILE)
        if os.path.exists(p):
            return loadJsonObj(p)
        else:
            return None

    def _getDependLibCfg(self, dependLib):
        res = {}
        res.update([(key, value) for key, value in dependLib.items() if key != 'cfg'])
        cfg = dependLib['cfg']
        newCfg = dict([(key[1:], value) for key, value in cfg.items()])
        res['cfg'] = newCfg
        return res

    def _myCfg(self):
        cfg = self.__dict__.get('_cfg')
        if cfg is not None:
            return cfg
        else:
            try:
                self._cfg = loadJsonObj(self.cfgpath)
                return self._cfg
            except:
                raise RuntimeError(u'channel cfg not found under %s' %channelPath)

class DefaultCfgItems:
    items = {
            'landscape': CfgItem('boolean', 'if the app is landscape'),
            'appname': CfgItem('string', 'the name of the app')
            }


gGlobalItemSet = CfgItemSet(DefaultCfgItems.items)

class Project(object):
    def __init__(self, projectPath, chamSrc, env):
        self.projectPath = os.path.join(projectPath, 'chameleon')
        self.sdkcfgpath = os.path.join(self.projectPath, 'sdkcfg')
        self._loadGlobalInfo()
        self._loadChannelInfo()
        self.chamSrc = chamSrc
        self.env = env

    @property
    def name(self):
        self.globalCfg.appname

    @property
    def target(self):
        return self.globalCfg['target']

    def setGlobalCfg(self, cfg):
        cfg1 = gGlobalItemSet.validate(cfg)
        self.globalCfg['globalcfg'].update(cfg1)
        dumpJsonObj(self.globalCfg, self.globalCfgP)

    def getShownGlobalCfg(self):
        gcfg = self.globalCfg['globalcfg']
        return dict([(name[1:], value) for name, value in gcfg.items()])

    def setSignConfig(self, channel, cfg):
        signCfg = parseSignCfg(cfg)        
        if channel:
            chInfo = self._loadSingleChannel(channel)
            self.chamSrc.setSignCfg(chInfo.name, chInfo.cp, signCfg)
        else:
            self.globalCfg['sign'] = signCfg
            dumpJsonObj(self.globalCfg, self.globalCfgP)
        
    def detailInfo(self):
        t = {
                "globalcfg": self.getShownGlobalCfg(), 
                "version": self.globalCfg['version'],
                "channelCfg": [{"name": x.name, "cfg": x.cfg} for x in self.channelInfos.values()],
                "sdkcfg": self._loadSDKCfg()
                }
        signcfg = self.globalCfg.get('sign')
        if signcfg is not None:
            t['signcfg'] = signcfg
        return t
    
    def setChannel(self, channel, updateCfg):
        targetPath = os.path.join(self.projectPath, 'channels', channel)
        targetLibPath = os.path.join(self.projectPath, 'libs')
        targetSettingPath = os.path.join(targetPath, 'project.json')
        if os.path.exists(targetSettingPath):
            self.chamSrc.updateChannelCfg(self, channel, updateCfg, targetPath, targetLibPath)
        else:
            self.chamSrc.initChannel(self, channel, updateCfg, targetPath, targetLibPath)
        channelInfo = self._loadSingleChannel(channel)
        return channelInfo

    def loadSDKCfg(self, cfgname):
        p = os.path.join(self.sdkcfgpath, cfgname)
        return loadJsonObj(p)

    def setSDKSetting(self, sdkid, name, cfg, desc):
        dumpcfg = self.chamSrc.rewriteSDKSetting(sdkid, cfg)
        p = os.path.join(self.sdkcfgpath, name)
        if desc is not None:
            dumpcfg['desc'] = desc
        dumpJsonObj(dumpcfg, p)

    def updateProject(self, targetPath):
        self.env.updateProject(targetPath, self.target)

    def _loadGlobalInfo(self):
        self.globalCfgP = os.path.join(self.projectPath, 'champroject.json')
        try:
            self.globalCfg = loadJsonObj(self.globalCfgP)
        except:
            raise RuntimeError(u'global cfg missing or invalid')

    def _loadSDKCfg(self):
        res = {}
        ms = os.listdir(self.sdkcfgpath)
        for m in ms:
            cfg = loadJsonObj(os.path.join(self.sdkcfgpath, m))
            cfg['cfg'] = dict([(name[1:], value) 
                for name, value in cfg['cfg'].items()])
            res[m] = cfg
        return res

    def _loadChannelInfo(self):
        channelPath = os.path.join(self.projectPath, 'channels')
        channelFolders = [(x, os.path.join(channelPath, x)) for x in os.listdir(channelPath) 
                if os.path.isdir(os.path.join(channelPath, x))]
        self.channelInfos = dict(map(lambda c: (c[0], ChannelInfo(c[0], c[1])), channelFolders))

    def _loadSingleChannel(self, channel):
        channelPath = os.path.join(self.projectPath, 'channels', channel)
        if not os.path.exists(channelPath):
            raise RuntimeError(u'Channel have not been added %s' %channel)
        return ChannelInfo(channel, channelPath) 

class ProjectMgr(object):
    def __init__(self, channelMgr, env):
        self.chmgr = channelMgr
        self.env = env

    def addProject(self, name, prjpath, globalcfg):
        p = self._loadProject(prjpath)
        p.setGlobalCfg(globalcfg)
        return p

    def getProject(self, prjPath):
        return self._loadProject(prjPath)

    def _loadProject(self, projPath):
        if os.path.exists(projPath):
            return Project(projPath, self.chmgr, self.env)
        else: 
            return None

    def hasProjectNick(self, name):
        for pc in self.prjcfg:
            if pc.name == name:
                return True
        return False


