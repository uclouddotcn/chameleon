#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM

class UpgradeProjectCmd(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog upgradeprj YOUR_APP_PATH")
        self.opt.add_option("-f", '--force', dest='force', action="store_true",
                help=u'强制更新工程文件,可以用来修复工程', default=False)
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"升级工程"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.PROJECT_CAT, 2

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 2:
            self.opt.print_help()
            return -1
        appshortname = myargs[1]

        project = self.chamInfo.prjmgr.getProject(appshortname)
        if not project:
            raise RuntimeError(u'Fail to find project %s' %appshortname)
        self.chamInfo.prjmgr.upgradeProject(project, options.force)
        return 0

def makecmd(chamInfo):
    return 'upgradeprj', UpgradeProjectCmd(chamInfo)

