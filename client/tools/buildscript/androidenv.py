#encoding=utf-8
import os, subprocess, sys, re
from ChameleonTool.dumbjsondb import DumbJsonDB
from ChameleonTool.dumbjsondb import dumpJsonObj

if sys.platform.startswith('win'):
    androidExe = 'android.bat'
else:
    androidExe = 'android'

#_TARGET_REGEX = re.compile('^id:\s(\d+)\s"([\w-]+)"')
_TARGET_REGEX = re.compile('^id:\s?(\d+)\s?or\s?"([\w-]+)"')

class AndroidEnv(object):
    def __init__(self, f):
        self.db = DumbJsonDB(f)
        self.sdk_root = self.db.get('sdk_root')

    def _initFile(self, f):
        dumpJsonObj({}, f)

    def checkSettingDone(self):
        if not self.sdk_root:
            raise RuntimeError(u'请设置android sdk的root先, "chameleon.py setprop sdk_root YOUR_ANDROID_ROOT')
        self.updateAndroidSDK(self.sdk_root)

    def updateProp(self, key, value):
        if key == 'sdk_root':
            self.updateAndroidSDK(value)
            self.db.set('sdk_root', value)
        else:
            raise RuntimeError(u'unknonwn prop %s' %key)
        
    def updateAndroidSDK(self, androidPath):
        if not os.path.exists(androidPath):
            raise RuntimeError(u'cannot find android sdk path %s' %androidPath)
        androidToolPath = os.path.join(androidPath, 'tools')
        if not os.path.exists(androidToolPath):
            raise RuntimeError(u'cannot find android sdk path %s' %androidPath)
        self.androidPath = androidPath
        self.androidToolPath = androidToolPath

    def updateProject(self, path, target):
        return subprocess.call([os.path.join(self.androidToolPath, androidExe), 
            'update', 'project', '-p', path, '-t', target, '-s'])

    def getDefaultTarget(self):
        self._loadAvailableTarget()
        return self.availTargets[0]

    def _loadAvailableTarget(self):
        ret = subprocess.check_output([os.path.join(self.androidToolPath, androidExe), 'list', 
            'target'])
        lines = ret.split('\n')
        self.availTargets = []
        for l in lines:
            t = _TARGET_REGEX.match(l)
            if t:
                self.availTargets.append(t.groups(1))
        if len(self.availTargets) == 0:
            raise RuntimeError(u'fail to find any available targets under android %s' 
                    %self.sdk_root)
        



