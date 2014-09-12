#!/usr/bin/env python
from optparse import OptionParser
import subprocess, sys, traceback, os, re, json, codecs
from collections import OrderedDict
SCRIPTDIR = os.path.split(os.path.realpath(__file__))[0].decode(sys.getfilesystemencoding())
VALID_BUILD_TYPES = ['debug', 'release']
ANT_HOME = os.getenv('ANT_HOME')
if ANT_HOME is None:
    raise RuntimeError(u'please set ANT_HOME first')
if os.name == 'nt':
    ANT_CMD = os.path.join(ANT_HOME, 'bin', 'ant.bat')
else:
    ANT_CMD = os.path.join(ANT_HOME, 'bin', 'ant')

def getInstalledChannels():
    channelDir = os.path.join('chameleon', 'channels')
    if not os.path.exists(channelDir):
        return []
    return os.listdir(channelDir)

def runProcess(cmd, channel):
    if channel is not None:
        p = subprocess.Popen(cmd+['-Dchameleon.library=%s' %channel]) #, env={'CHAMELEON_TARGET_CHANNEL': channel})
    else:
        p = subprocess.Popen(cmd)
    return p.wait()

class TempFile(object):
    def __init__(self, filename):
        self.filename = filename

    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc_value, traceback):
        os.unlink(self.filename)
        return None


class BuildCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog build buildtype[debug or release] [channel]")
        self.opt.add_option("-a", '--all', dest='buildall', action="store_true",
                help='build all channnels', default=False)

    def briefDesc(self):
        return "build the app using ant, if channel is provided, it will build the package for this channel"

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 2:
            self.opt.print_help()
            return -1
        supportChannels = getInstalledChannels()
        buildtype = myargs[1]
        if buildtype not in VALID_BUILD_TYPES:
            raise RuntimeError(u"unknown build type %s, use 'debug' or 'release' ")
        nextLibIndex = self.readProperty()
        if options.buildall:
            for channel in supportChannels:
                with self.openTempProperty(channel, nextLibIndex) as _:
                    print 'building for %s' %channel
                    ret = runProcess([ANT_CMD, buildtype, '-q'], channel)
                    if ret == 0:
                        print 'build %s successfully' %channel
                    else:
                        print 'build %s failed' %channel
        else:
            if len(myargs) == 2:
                channel = None
                return runProcess([ANT_CMD, buildtype], channel)
            else:
                channel = myargs[2]
                if channel not in supportChannels:
                    raise RuntimeError(u"channel %s is not installed" %channel)
                with self.openTempProperty(channel, nextLibIndex) as _:
                    return runProcess([ANT_CMD, buildtype], channel)

    def readProperty(self):
        pat = re.compile('android\.library\.reference\.(\d+)=(.+)')
        res = []
        with open('project.properties', 'r') as f :
            for l in f.readlines():
                c = pat.match(l)
                if c is not None:
                    res.append((int(c.group(1)), c.group(2)))
        res = sorted(res, key=lambda x: x[0])
        c = 1
        for (index, lib) in res:
            if index != c:
                break
            c = c + 1
        return c

    def openTempProperty(self, channel, nextLibIndex):
        libDependency = []
        with codecs.open(os.path.join('chameleon', 'channels', channel, 'project.json'), 'r', 'utf-8') as f:
            cfg = json.load(f)
            for dependLibs in cfg['dependLibs']:
                libDependency.append(dependLibs['name'])
        t = ['android.library.reference.%d=chameleon/channels/%s\n' %(nextLibIndex, channel)]
        for l in libDependency:
            nextLibIndex += 1
            t.append('android.library.reference.%d=chameleon/libs/%s\n' %(nextLibIndex, l))
        tmpfile = ".chameleon-project-%s.properties" %channel
        with open(tmpfile, 'w') as f:
            print t
            f.write('\n'.join(t))
        return TempFile(tmpfile)
        

class CleanCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog clean [channel]")
        self.opt.add_option("-a", '--all', dest='cleanall', action="store_true",
                help='clean all channnels', default=False)

    def briefDesc(self):
        return "clean the app with channel"

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 1:
            self.opt.print_help()
            return -1
        supportChannels = getInstalledChannels()
        if options.cleanall: 
            for channel in supportChannels:
                print 'cleaning for %s' %channel
                ret = runProcess([ANT_CMD, 'clean', '-q'], channel)
        else:
            if len(myargs) > 1:
                channel = myargs[1]
                if channel not in supportChannels:
                    raise RuntimeError(u"channel %s is not installed" %channel)
            else:
                channel = None
            return runProcess([ANT_CMD, 'clean'], channel)

class InstallCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog install buildtype[debug or release] [channel]")

    def briefDesc(self):
        return "install the app with channel"

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 2:
            self.opt.print_help()
            return -1
        supportChannels = getInstalledChannels()
        buildtype = myargs[1]
        if buildtype not in VALID_BUILD_TYPES:
            raise RuntimeError(u"unknown build type %s, use 'debug' or 'release' ")
        if len(myargs) == 2:
            channel = None
        else:
            channel = myargs[2]
            if channel not in supportChannels:
                raise RuntimeError(u"channel %s is not installed" %channel)
        installTarget = 'installd'
        if buildtype == 'release':
            installTarget = 'installr'
        return runProcess([ANT_CMD, installTarget], channel)

class ListChannelCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog list")

    def briefDesc(self):
        return "list installed channels"

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        supportChannels = getInstalledChannels()
        print 'Installed channels:'
        print '\t\n'.join(supportChannels)
        return 0

CMDS = OrderedDict((
        ('list', ListChannelCmd()),
        ('build', BuildCmd()),
        ('clean', CleanCmd()),
        ('install', InstallCmd())))

def printHelp():
    print 'use this to build, clean and install the target with channel. Support commands are:\n'
    print '\t\n'.join(['%s:\t%s' %(t[0], t[1].briefDesc()) for t in CMDS.items()])
    print 'help:\tshow this help'
    return 0

def main():
    if len(sys.argv) < 2:
        printHelp()
        return -1
    try:
        os.chdir(SCRIPTDIR)
        cmd = sys.argv[1]
        if cmd == 'help':
            return printHelp()
        else:
            return CMDS[cmd].execute(sys.argv[1:])
    except KeyError, e:
        print 'unknown commands %s' %e.key
    except Exception:
        traceback.print_exc()
    return -1 

sys.exit(main())

