#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil, sys, json
import category as categoryM

class BindProjectInfo(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog bindprj YOUR_APP_DIR YOUR_APP_SHORTNAME")
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"绑定一个名称到之前创建的工程上"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.PROJECT_CAT, 3

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 3:
            self.opt.print_help()
            return -1
        appdir = myargs[1]
        appshortname = myargs[2]
        chameleonPath = os.path.join(appdir, 'chameleon')
        if not os.path.isdir(appdir):
            raise RuntimeError(u'fail to find app directory %s' %appdir)
        if not os.path.isdir(chameleonPath):
            raise RuntimeError(u'Fail to find diretory %s' %appdir)
        prj = self.chamInfo.prjmgr.addProject(appshortname, appdir)
        return 0

def makecmd(chamInfo):
    return 'bindprj', BindProjectInfo(chamInfo)



