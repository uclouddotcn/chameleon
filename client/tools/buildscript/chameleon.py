#!/usr/bin/env python
#encoding=utf8
import os, imp, codecs, json, shutil, sys, traceback
from optparse import OptionParser
from ChameleonTool.print_help import *
from ChameleonTool.replace_template import copyTree, genProductFlavors, appendProductFlavors
from ChameleonTool.JsonValidator import CfgItem, CfgItemSet
from ChameleonTool.chaminfo import ChamInfo
from ChameleonTool.dumbjsondb import DumbJsonDB
from ChameleonTool.channelmgr import ChannelMgr
from androidenv import AndroidEnv
from ChameleonTool.project import ProjectMgr
from chameleon_upgrade import UpgradeEnv
from ChameleonTool.replace_template import parseUrlArg

_BASEDIR = os.path.split(os.path.realpath(__file__))[0].decode(sys.getfilesystemencoding())
_COMMANDS = {}

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'

class Category(object):
    def __init__(self, category):
        self.category = category
        self.cmds =[]

    def addCmd(self, cmd, priority, name):
        self.cmds.append((cmd, priority, name))

    def sort(self):
        self.cmds = sorted(self.cmds, key=lambda x: x[1])

    def toString(self):
        return '\t\n'.join([self.category.desc] + ['%s:    %s' %(y, x.briefDesc()) for x,_,y in self.cmds])

class Categorys(object):
    def __init__(self):
        self.cate = []

    def addCmds(self, name, cmd):
        category, priority = cmd.category()
        t = [x for x in self.cate if x.category.name == category.name] 
        if len(t) == 0:
            self.cate.append(Category(category))
            self.cate[-1].addCmd(cmd, priority, name)
        else:
            t[0].addCmd(cmd, priority, name)

    def sort(self):
        self.cate = sorted(self.cate, key=lambda x: x.category.priority)
        for c in self.cate:
            c.sort()

    def toString(self):
        return u'\n\n'.join([x.toString() for x in self.cate])

gCategories = Categorys()

def loadCmdModule(name, path, chamInfo):
    fp, pathname, description = imp.find_module(name, [path])
    try:
        m = imp.load_module(name, fp, pathname, description)
        if m.__dict__.has_key('makecmd'):
            name, o = m.makecmd(chamInfo)
            _COMMANDS[name] = o
            gCategories.addCmds(name, o)
    finally:
        # Since we may exit via an exception, close fp explicitly.
        if fp:
            fp.close()

def loadAllCmds(chamInfo):
    cmdpath = os.path.join(_BASEDIR, 'cmds')
    files = [x[:-3] for x in os.listdir(cmdpath) if x.endswith('.py')]
    for f in files:
        loadCmdModule(f, cmdpath, chamInfo)
    gCategories.sort()

def win32_utf8_argv():                                                                                               
    """Uses shell32.GetCommandLineArgvW to get sys.argv as a list of UTF-8                                           
    strings.                                                                                                         
                                                                                                                     
    Versions 2.5 and older of Python don't support Unicode in sys.argv on                                            
    Windows, with the underlying Windows API instead replacing multi-byte                                            
    characters with '?'.                                                                                             
                                                                                                                     
    Returns None on failure.                                                                                         
                                                                                                                     
    Example usage:                                                                                                   
                                                                                                                     
    >>> def main(argv=None):                                                                                         
    ...    if argv is None:                                                                                          
    ...        argv = win32_utf8_argv() or sys.argv                                                                  
    ...                                                                                                              
    """                                                                                                              
                                                                                                                     
    try:                                                                                                             
        from ctypes import POINTER, byref, cdll, c_int, windll                                                       
        from ctypes.wintypes import LPCWSTR, LPWSTR                                                                  
                                                                                                                     
        GetCommandLineW = cdll.kernel32.GetCommandLineW                                                              
        GetCommandLineW.argtypes = []                                                                                
        GetCommandLineW.restype = LPCWSTR                                                                            
                                                                                                                     
        CommandLineToArgvW = windll.shell32.CommandLineToArgvW                                                       
        CommandLineToArgvW.argtypes = [LPCWSTR, POINTER(c_int)]                                                      
        CommandLineToArgvW.restype = POINTER(LPWSTR)                                                                 
                                                                                                                     
        cmd = GetCommandLineW()                                                                                      
        argc = c_int(0)                                                                                              
        argv = CommandLineToArgvW(cmd, byref(argc))                                                                  
        if argc.value > 0:                                                                                           
            # Remove Python executable if present                                                                    
            if argc.value - len(sys.argv) == 1:                                                                      
                start = 1                                                                                            
            else:                                                                                                    
                start = 0                                                                                            
            return [argv[i] for i in                                                                 
                    xrange(start, argc.value)]                                                                       
    except Exception:                                                                                                
        pass


def parseArgs(chamInfo):
    encoding = 'utf8'
    argv = win32_utf8_argv()
    if argv is None:
        if sys.stdin.encoding:
            encoding = sys.stdin.encoding
        for i, val in enumerate(sys.argv):
            print >> sys.stderr, 'get param ', val.decode('utf8')
            argv.append(val.decode(encoding))

    if len(argv) < 2:
        printCommands()
    else:
        try:
            cmd = argv[1]
            if cmd == 'setprop':
                return setprop(argv[1:], chamInfo.env)
            elif cmd == 'help':
                printHelp()
                return 0
            elif cmd == 'setprops':
                return setprops(argv[1:], chamInfo.env)
            elif cmd == 'upgrade':
                upgrade(argv[1:])
            else:
                chamInfo.env.checkSettingDone()
                if _COMMANDS.has_key(cmd):
                    return _COMMANDS[cmd].execute(argv[1:])
                else:
                    printError(u'unknown command %s' %cmd, printCommands)
                    return -1
        except RuntimeError, e:
                printError(repr(e))
                traceback.print_exc()
                return -1

def upgrade(argv):
    if len(argv) < 2:
        raise RuntimeError(u'upgrade 升级的zip文件')
    zipfile = argv[1]
    ue = UpgradeEnv(_BASEDIR)
    ue.upgradeFromZip(zipfile)
    print u'升级成功 %s' %(zipfile)


def setprops(args, env):
    if len(args) < 2:
        raise RuntimeError(u'setprops val')
    cfgpairs = parseUrlArg(args[1])
    for name, val in cfgpairs.items():
        env.updateProp(name, val) 


def setprop(args, env):
    if len(args) < 3:
        raise RuntimeError(u'setprop key value')
    env.updateProp(args[1], args[2]) 
    

def printCommands():
    printStdout('usage: chameleon.py command args')
    printStdout('commands are:\n')
    printStdout(gCategories.toString())

    printStdout(u'\n\n其它')
    printStdout(u'setprop: 设置工具需要的属性')
    printStdout(u'help: show this content')

def printError(s, func=None):
    printStderr('error: %s' %s)
    if func:
        func()
    return -1

def printHelp():
    printCommands()
    return 0

def initProjectMgr(channelMgr, env):
    return ProjectMgr(channelMgr, env)

def loadChamInfo():
    localInfos = DumbJsonDB(os.path.join(_BASEDIR, 'info.json'))
    env = AndroidEnv(os.path.join(_BASEDIR,'chamenv.json'))
    mgr = ChannelMgr(os.path.join(_BASEDIR, 'info.json'), 
            os.path.join(_BASEDIR, 'channels'), 
            os.path.join(_BASEDIR, 'Resource', 'channellib'))
    prjMgr = initProjectMgr(mgr, env)
    chamInfo = ChamInfo(prjMgr, mgr, env, _BASEDIR)
    return chamInfo

def main():
    chamInfo = loadChamInfo()
    loadAllCmds(chamInfo)
    return parseArgs(chamInfo)

import traceback
try:
    ret = main()
except:
    traceback.print_exc()
    ret = -1

sys.exit(ret)
       


