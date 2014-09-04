#encoding=utf8
from optparse import OptionParser
from ChameleonTool.dumbjsondb import loadJsonObj, dumpJsonObjToFile
from ChameleonTool.tmpfile import TempFile
import os, shutil, sys
import category as categoryM

class MakePrj(object):
    def __init__(self, chamInfo):
        self.opt = OptionParser(usage="usage: %prog makeprj YOUR_APP_DIR YOUR_APP_NAME YOUR_APP_SHORTNAME")
        self.opt.add_option("-p", '--portait', dest='uselandscape', action="store_false",
                help=u'是否使用portrait模式，默认情况下使用landscape', default=True)
        self.opt.add_option("-f", '--force', dest='force', action="store_true",
                help=u'强制创建一个新的工程，如果原来有旧的，那么旧的所有信息都会被删除', default=False)
        self.opt.add_option('-t', '--target', dest='target', 
                help=u'设定安卓SDK的target version，默认会使用第一个target', default=None)
        self.opt.add_option('-s', '--sign', dest='signconfig', 
                help=u'设置签名的配置, keystore:keypass:storepass:alias', default=None)
        self.opt.add_option('-u', '--unity', dest='unity', action="store_true",
                help=u'是否支持unity', default=False)
        self.chamInfo = chamInfo

    def briefDesc(self):
        return u"创建Chameleon工程到现有的android项目中"

    def showHelp(self):
        self.opt.print_help() 

    def category(self):
        return categoryM.PROJECT_CAT, 1

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 4:
            self.opt.print_help()
            return -1
        appdir = myargs[1]
        appname = myargs[2]
        appshortname = myargs[3]
        if options.uselandscape:
            landscape = 'true'
        else:
            landscape = 'false'
        if options.target:
            target = options.target
        else:
            target = self.chamInfo.env.getDefaultTarget()[1]

        globalcfg = {
                "landscape": landscape,
                "appname": appname
                }
        projectSetting = {
                "version": self.chamInfo.mgr.version,
                "target": target,
                "globalcfg": {}
                }
        chameleonPath = os.path.join(appdir, 'chameleon')
        if not os.path.isdir(appdir):
            raise RuntimeError(u'fail to find app directory %s' %appdir)
        if os.path.isdir(chameleonPath):
            if options.force:
                shutil.rmtree(chameleonPath)
            else:
                raise RuntimeError(u'chameleon folder exists, use update command instead')
        with TempFile(os.path.join(chameleonPath, 'champroject.json')) as f:
            dumpJsonObjToFile(projectSetting, f)
            shutil.copytree(os.path.join(self.chamInfo.localdir, 'Resource', 'chameleon'), 
                    chameleonPath)
        prj = self.chamInfo.prjmgr.addProject(appshortname, appdir, globalcfg)
        if options.signconfig:
            try:
                prj.setSignConfig(None, options.signconfig)
            except:
                print >> sys.stderr, 'fail to set sign config, use setsigncfg later'
        libraryPath = os.path.join(appdir, 'libs')
        chameleonPath = os.path.join(appdir, 'chameleon')
        shutil.copy2(os.path.join(chameleonPath, 'libs', 'chameleon.jar'), 
                libraryPath)
        shutil.copy2(os.path.join(chameleonPath, 'chameleon_build.py'), 
                appdir)
        if options.unity:
            shutil.copy2(os.path.join(chameleonPath, 'libs', 'chameleon_unity.jar'), 
                libraryPath)

        return 0

def makecmd(chamInfo):
    return 'makeprj', MakePrj(chamInfo)

