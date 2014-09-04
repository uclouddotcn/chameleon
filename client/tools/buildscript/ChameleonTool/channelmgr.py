#encoding=utf8
import os, importlib, shutil, codecs
from dumbjsondb import DumbJsonDB, loadJsonObj, dumpJsonObj
from replace_template import copyTemplateFile, getFileSignature, copyFileInList, readFileList, removeFileInList
from JsonValidator import CfgItem, CfgItemSet
from template_string import SINGLE_API_TEMPLATE, LIB_PROJECT_PROPERTY
from AndroidManifest import AndroidManifestInst

import sys
sys.path.append(u'./')

AM_OW_TAG = '<!-- CHAMELEON OVERWRITE -->'

def prepareScript(func):
    def _(self, *args):
        self._loadscript()
        return func(self, *args)
    return _

def _splitManifest(amfile):
    with codecs.open(amfile, 'r', 'utf8') as of:
        ts = of.readlines()
        index = []
        for i, t in zip(xrange(len(ts)), ts):
            if t.strip().startswith(AM_OW_TAG):
                index.append(i)
        for i in xrange(1, len(index), 2):
            index[i] += 1
        startindex = [0] + index
        endindex = index + [len(ts)]
        result = map(lambda x, y: ts[x:y], startindex, endindex)
        return result

def _flatten(l):
    return [item for sublist in l for item in sublist]

def _getTmpFileName(path):
    d, f = os.path.split(path)
    return os.path.join(d, '.'+f+'.tmp')

def _mergeManifest(srcfile, targetfile, outputfile):
    targetLines = _splitManifest(targetfile)
    srcLines = _splitManifest(srcfile)
    if len(srcLines) != len(targetLines):
        shutil.copy2(os.path.join(self.cdir, 'AndroidManifest.xml'), targetfile+'.new')
        raise RuntimeError(u'I donnt know how to merge %s please merge manually' %targetfile)
    result = zip(targetLines[0::2], srcLines[1::2]+[[]])
    with codecs.open(outputfile, 'w', 'utf8') as of:
       of.write(''.join(_flatten(_flatten(result)))) 

def _genAJava(targetFilePath, channel, channelName, setBundle):
    channelImp = channel[:1].upper() + channel[1:] + 'ChannelAPI'
    s = SINGLE_API_TEMPLATE.substitute({}, setBundle=setBundle, channel=channel, 
            channelImp = channelImp, channelName=channelName)
    with codecs.open(targetFilePath, 'w', 'utf8') as targetFile:
        targetFile.write(s)

        
class ChannelLib(object):
    def __init__(self, cdir, cinfo):
        self.cinfo = cinfo
        self.cdir = cdir
        self.cfgitem = CfgItemSet()
        self.cfgitem.loadFromJson(self.cinfo.cfgitem)
        self.m = None

    def initLib(self, libPath):
        os.makedirs(libPath)
        self._copyInFilelist(libPath)

    def verifyCfg(self, cfg):
        return self.cfgitem.validate(cfg)

    def showCfg(self):
        return self.cfgitem.toString()

    def upgradeLib(self, cfg, channelPath):
        targetFileList = os.path.join(channelPath, 'filelist.txt')
        filelist = readFileList(targetFileList)
        removeFileInList(channelPath, filelist) 
        os.remove(targetFileList) 
        self._copyInFilelist(channelPath)

    def getBundleSetting(self, cfg):
        return self.cfgitem.getBundleSetting(cfg)

    def _copyInFilelist(self, channelPath):
        targetFileList = os.path.join(channelPath, 'filelist.txt')
        srcFileList = os.path.join(self.cdir, 'filelist.txt')
        filelist = readFileList(srcFileList)
        copyFileInList(self.cdir, channelPath, filelist) 
        shutil.copy2(srcFileList, targetFileList)

    @prepareScript
    def afterSetCfg(self, cfg):
        if self.m and self.m.__dict__.has_key('afterCfgLoaded'):
            return self.m.afterCfgLoaded(cfg)
        else:
            return cfg

    @prepareScript
    def afterCopyDone(self, prjSetting, cfg):
        if self.m and self.m.__dict__.has_key('afterCopy'):
            self.m.afterCopy(prjSetting, cfg)
        else:
            return

    @property
    def version(self):
        return self.cinfo.version

    @property
    def chamversion(self):
        return self.cinfo.chamversion

    @property
    def name(self):
        return self.cinfo.name

    @property
    def enableWrapPackage(self):
        return self.cinfo.get('enableWrapPackage', 1) != 0


    def _loadscript(self):
        if not self.m and self.cinfo.script:
            self.m = importlib.import_module(self.cinfo.script)


class Channel(object):
    def __init__(self, name, channelPath):
        self.channelPath = channelPath
        self.signSetting = DumbJsonDB(
                os.path.join(self.channelPath, 'sign.json'))
        self.setting = DumbJsonDB(
                os.path.join(self.channelPath, 'project.json'))
        self._name = name

    def setSignCfg(self, cfg):
        self.signSetting.batchUpdate(cfg)

    def setCfg(self, updateCfg):
        self.setting.batchUpdate(updateCfg)

    @property
    def name(self):
        return self._name


class ChannelMgr(object):
    def __init__(self, dbfile, channeldir, channelLibDir):
        self.db = DumbJsonDB(dbfile)
        self.channeldir = channeldir
        self.channels = None
        self.channelLibDir = channelLibDir
        self._loadAllChannelSDK(self.db)
        self.chanlist = self.db.get('channellist')
        
    def _loadAllChannelSDK(self, db):
        channels = self.db.get('channels')
        self.channels = dict([(c.name, 
            ChannelLib(os.path.join(self.channeldir, c.name), c)) 
            for c in channels])

    def rewriteSDKSetting(self, sdkid, cfg):
        sdk = self.channels.get(sdkid)
        if sdk is None:
            raise RuntimeError('Fail to find sdk instance for %s' %sdkid)
        newcfg = sdk.verifyCfg(cfg)
        newcfg = sdk.afterSetCfg(newcfg)
        return {"id": sdkid, "cfg": newcfg, 
                "ver": sdk.version, "chamver": sdk.chamversion}


    @property
    def version(self):
        return self.db.get('version')

    def getAllChannel(self):
        return self.chanlist.keys()

    def updateChannelCfg(self, project, channel, cfg, channelPath, targetLibPath):
        dependLibs = cfg['dependLibs']
        k = set([x['name'] for x in dependLibs])
        libNames = list(k)
        libs = self.initLibs(project, libNames, targetLibPath, False)
        self._updateCfg(channel, cfg, channelPath, libs)
        project.updateProject(channelPath)

    def initChannel(self, project, channel, cfg, channelPath, targetLibPath):
        dependLibs = cfg['dependLibs']
        k = set([x['name'] for x in dependLibs])
        libNames = list(k)
        channelcfg = self.chanlist.get(channel)
        if channelcfg is None:
            raise RuntimeError(u"chameleon not support channel %s now" %channel)
        if os.path.exists(channelPath):
            shutil.rmtree(channelPath)
        libs = self.initLibs(project, libNames, targetLibPath)
        self.doInitChannel(project, channel, channelcfg, cfg, channelPath, libs)

    def upgradeLib(self, channel, cfg, channelPath):
        ch = self.channels.get(channel, None)
        if not os.path.exists(channelPath):
            raise RuntimeError(u"channel %s in %s not exists, use upgrade or update" 
                    %(channel, channelPath))
        if ch:
            ch.upgradeLib(cfg, channelPath)
        else:
            raise RuntimeError(u'unknonw channel %s' %channel)

    def setSignCfg(self, channel, channelPath, signcfg):
        ch = Channel(channel, channelPath)
        if ch:
            ch.setSignCfg(signcfg)
        else:
            raise RuntimeError(u'unknonw channel %s' %channel)

    def initLibs(self, project, dependLibs, targetLibPath, force=False):
        libs = []
        for lib in dependLibs:
            p = os.path.join(targetLibPath, lib)
            ch = self.channels.get(lib, None)
            if ch:
                if not os.path.exists(p):
                    ch.initLib(p)
                    project.updateProject(p)
                elif force:
                    shutil.rmtree(p) 
                    ch.initLib(p)
                    project.updateProject(p)
                libs.append(ch)
            else:
                raise RuntimeError(u'unknonw channel %s' %lib)
        return libs

    def doInitChannel(self, project, channel, channelcfg, cfg, channelPath, libs):
        shutil.copytree(self.channelLibDir, channelPath)
        self._writeChannelInfoXml(channel, channelcfg, channelPath)
        self._updateCfg(channel, cfg, channelPath, libs)
        project.updateProject(channelPath)

    def _writeChannelInfoXml(self, channel, channelcfg, channelPath):
        with codecs.open(os.path.join(channelPath, 'info.xml'), 'w', 'utf8') as f:
            f.write(u'<channel pkgsuffix="%s"></channel>' %channelcfg.pkgsuffix)
    
    def getChannelCfgDesc(self, channel):
        channels = self.db.get('channels')
        for c in channels:
            if c.name == channel:
                cfgitem = CfgItemSet()
                cfgitem.loadFromJson(c.cfgitem)
                return cfgitem.toString()
        raise RuntimeError(u'Fail to get channel %s' %channel)

    def _updateCfg(self, channel, cfg, channelPath, libs):
        channel = Channel(channel, channelPath)
        channel.setCfg(cfg)
        self._setProjectProperty(channel, channelPath, libs)

    def _setProjectProperty(self, channel, channelPath, libs):
        libraryNames = [(lib.name, n+1) for (lib, n) in zip(libs, xrange(len(libs)))]
        android_library = '\n'.join([u'android.library.reference.%d=../../libs/%s' %(n, name)
            for (name, n) in libraryNames])
        s = LIB_PROJECT_PROPERTY.substitute({}, android_library=android_library)
        with codecs.open(os.path.join(channelPath, 'project.properties'), 'w', 'utf8') as f:
            f.write(s)

