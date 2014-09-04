#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM

class UpgradeChannelCmd(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog upgradech YOUR_APP_PATH channel")
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"升级渠道"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.CHANNEL_CAT, 2

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 3:
            self.opt.print_help()
            return -1
        appshortname = myargs[1]
        channel = myargs[2]

        project = self.chamInfo.prjmgr.getProject(appshortname)
        if not project:
            raise RuntimeError(u'Fail to find project %s' %appshortname)
        self.chamInfo.prjmgr.upgradeChannel(project, channel)
        return 0

def makecmd(chamInfo):
    return 'upgradech', UpgradeChannelCmd(chamInfo)

