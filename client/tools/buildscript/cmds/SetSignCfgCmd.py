#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM
class SetSignCfg(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog setsigncfg appshortname signcfg")
        self.opt.add_option("-c", '--channel', dest='channel', 
                help=u'为某个渠道单独设置签名配置')
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"为项目设置签名配置"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.PROJECT_CAT, 2

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 3:
            self.opt.print_help()
            return -1
        appshortname = myargs[1]
        signcfg = myargs[2]
        prj = self.chamInfo.prjmgr.getProject(appshortname)
        if prj is None:
            print >> sys.stderr, 'fail to find project %s' %appshortname
        prj.setSignConfig(options.channel, signcfg) 
        return 0

def makecmd(chamInfo):
    return 'setsigncfg', SetSignCfg(chamInfo)

