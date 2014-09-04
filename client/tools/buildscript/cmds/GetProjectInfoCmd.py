#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil, sys, json
import category as categoryM

class GetProjectInfo(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog getprj YOUR_APP_PATH")
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"打印工程的信息"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.PROJECT_CAT, 2

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 1:
            self.opt.print_help()
            return -1
        appshortname = myargs[1]
        project = self.chamInfo.prjmgr.getProject(appshortname)
        if not project:
            raise RuntimeError(u'Fail to find project %s' %appshortname)
        dumpJsonObjToFile(project.detailInfo(), sys.stdout)
        return 0

def makecmd(chamInfo):
    return 'getprj', GetProjectInfo(chamInfo)

