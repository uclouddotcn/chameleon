#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil
import category as categoryM

class AddChannel(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog setch YOUR_APP_SHORTNAME channel-name path")
        self.opt.add_option("-f", '--force', dest='force', action="store_true",
                help=u'强制创建新的渠道，如果有旧的渠道安装，那么旧的将会被删除', default=False)
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"添加渠道到工程中"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.CHANNEL_CAT, 1

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 4:
            self.opt.print_help()
            return -1
        appshortname = myargs[1]
        channelName = myargs[2]
        p = myargs[3]
        project = self.chamInfo.prjmgr.getProject(appshortname)
        if not project:
            raise RuntimeError(u'Fail to find project %s' %appshortname)
        jsonobj = loadJsonObj(p)
        chinfo = project.setChannel(channelName, jsonobj['cfg'])
        cf = jsonobj.get('copyfile')
        if cf is not None:
            for o in cf:
                target = os.path.join(chinfo.path, o['to'])
                p = os.path.split(target)[0]
                if p != target and not os.path.exists(p):
                    os.makedirs(p)
                shutil.copyfile(o['from'], target)
        return 0

def makecmd(chamInfo):
    return 'setch', AddChannel(chamInfo)

