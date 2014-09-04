#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM

class ShowCfgCmd(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog showcfg channel")
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"显示渠道SDK的配置文件描述"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.TOOL_INFO_CAT, 1

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 1:
            self.opt.print_help()
            return -1
        channel = myargs[1]
        print self.chamInfo.mgr.getChannelCfgDesc(channel)
        return 0

def makecmd(chamInfo):
    return 'showcfg', ShowCfgCmd(chamInfo)

