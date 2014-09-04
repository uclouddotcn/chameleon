#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM

class ListChannelLib(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog listch")
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"展示Chameleon现在支持的所有渠道SDK"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.TOOL_INFO_CAT, 1

    def execute(self, args):
        print u'现在支持的渠道'
        print '\n'.join(self.chamInfo.mgr.getAllChannel())
        return 0

def makecmd(chamInfo):
    return 'listch', ListChannelLib(chamInfo)

