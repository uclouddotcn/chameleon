#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM

class UpdateChannelCfg(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage=u"usage: %prog upchcfg YOUR_APP_PATH cfgfile")
        self.opt.add_option("-c", '--sdk', dest='sdkid', help=u"SDK的ID")
        self.opt.add_option("-n", '--cfgname', dest='cfgname', help=u"SDK的配置名称")
        self.opt.add_option("-d", '--desc', dest='desc', help=u"SDK的配置名称")
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"更新已经安装的渠道配置"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.CHANNEL_CAT, 1

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 3:
            self.opt.print_help()
            return -1
        sdkname = options.sdkid
        cfgname = options.cfgname
        desc = options.desc
        appshortname = myargs[1]
        cfgfile = myargs[2]
        project = self.chamInfo.prjmgr.getProject(appshortname)
        if not project:
            raise RuntimeError(u'Fail to find project %s' %appshortname)
        cfg = loadJsonObj(cfgfile)
        if sdkname:
            project.setSDKSetting(sdkname, cfgname, cfg, desc)
        else:
            project.setGlobalCfg(cfg)
        return 0

def makecmd(chamInfo):
    return 'upchcfg', UpdateChannelCfg(chamInfo)

