#!/usr/bin/env python
from optparse import OptionParser
import subprocess, sys, traceback, os, re, json, codecs
from collections import OrderedDict, namedtuple
from tempfile import NamedTemporaryFile
import xml.dom.minidom as xml
import imp, shutil

LibInfo = namedtuple('LibInfo', ['name', 'cfg'])
SCRIPTDIR = os.path.abspath(os.path.split(os.path.realpath(__file__))[0]).decode(sys.getfilesystemencoding())
VALID_BUILD_TYPES = ['debug', 'release']
ANT_HOME = os.getenv('ANT_HOME')
if ANT_HOME is None:
    raise RuntimeError(u'please set ANT_HOME first')
if os.name == 'nt':
    ANT_CMD = os.path.join(ANT_HOME, 'bin', 'ant.bat')
else:
    ANT_CMD = os.path.join(ANT_HOME, 'bin', 'ant')

def getInstalledChannels(prjpath):
    channelDir = os.path.join(prjpath, 'chameleon', 'channels')
    if not os.path.exists(channelDir):
        return []
    return os.listdir(channelDir)

def runProcess(cmd):
    olddir = os.getcwd()
    os.chdir(SCRIPTDIR)
    try:
        p = subprocess.Popen(cmd+['-f', os.path.join('ant', 'build.xml')])
        return p.wait()
    finally:
        os.chdir(olddir)

class TempFile(object):
    def __init__(self, filename):
        self.filename = filename

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        os.unlink(self.filename)
        return None

class BuildInfo(object):
    def __init__(self, prjpath, channel, buildtype):
        self.buildtype = buildtype
        self.prjpath = prjpath
        self.channel = channel
        self._loadChannelCfg(prjpath, channel) 
        self._loadAssets(prjpath)
        self._loadProject(prjpath)
        self.buildpath = os.path.join('chameleon_build', 'intermediate', channel)
        self._getSignCfg()

    @property
    def apkname(self):
        res = self.pkgname.replace('.', '-') + '_' + self.channel
        if self.version:
            res += '_' + self.version
        return res

    def _loadProject(self, prjpath):
        try:
            amfile = os.path.join(prjpath, 'AndroidManifest.xml')
            amxml = xml.parse(amfile)
            self.pkgname = amxml.documentElement.getAttribute('package')
            self.version = amxml.documentElement.getAttribute('android:versionName')
        except e:
            print >> sys.stderr, "Fail to load project info "
            print >> sys.stderr, e
            raise RuntimeError()

    def _loadAssets(self, prjpath):
        assets = [os.path.join(prjpath, 'chameleon', 'libs', x.name) for x in self.libDependency]
        self.assets = [x for x in assets if os.path.exists(os.path.join(x, 'assets'))]
        p = os.path.join(prjpath, 'chameleon', 'channels', self.channel)
        if os.path.exists(os.path.join(p, 'assets')):
            self.assets.append(p)

    def _loadChannelCfg(self, prjpath, channel):
        channelFolder = os.path.join(prjpath, 'chameleon', 'channels', channel)
        self.libDependency = []
        with codecs.open(os.path.join(channelFolder, 'project.json'), 'r', 'utf-8') as f:
            self.cfg = json.load(f)
        for dependLibs in self.cfg['dependLibs']:
            p = os.path.join(self.prjpath, 'chameleon', 'sdkcfg', dependLibs['cfg'])
            with codecs.open(p, 'r', 'utf8') as ff:
                cfg = json.load(ff)
            self.libDependency.append(LibInfo(dependLibs['name'], cfg.get('cfg')))

    def _getSignCfg(self):
        self.signcfg = None
        localSignCfg = self.cfg.get('signcfg')
        if localSignCfg:
            self.signcfg = localSignCfg
        else:
            signcfgPath = os.path.join(self.prjpath, 'chameleon', 'sign.json')
            if os.path.exists(signcfgPath):
                with codecs.open(signcfgPath, 'r', 'utf-8') as f: 
                    self.signcfg = json.load(f)
        

class BuildCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog build project-path buildtype[debug or release] [channel]")
        self.opt.add_option("-a", '--all', dest='buildall', action="store_true",
                help='build all channnels', default=False)

    def briefDesc(self):
        return "build the app using ant, if channel is provided, it will build the package for this channel"

    def openTempProperty(self, binfo, libraries):
        props = self.composeProperties(binfo, libraries)
        print props
        with NamedTemporaryFile(delete=False) as f:
            p = f.name
            f.write('\n'.join(props))
        return TempFile(p)

    def makeChannel(self, prjpath, channel, buildtype, nextLibIndex):
        binfo = BuildInfo(prjpath, channel, buildtype)
        if not os.path.exists(os.path.join(prjpath, 'chameleon_build', buildtype)):
            os.makedirs(os.path.join(prjpath, 'chameleon_build', buildtype))
        libraries = self.composeDependLib(binfo, nextLibIndex)
        self.preBuild(binfo)
        with self.openTempProperty(binfo, libraries) as tf:
            ret = runProcess([ANT_CMD, buildtype, '-Dchameleon_prop_file='+tf.filename, '-Dbasedir='+prjpath])
        return ret

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 3:
            self.opt.print_help()
            return -1
        prjpath = os.path.abspath(myargs[1])
        buildtype = myargs[2]
        supportChannels = getInstalledChannels(prjpath)
        if buildtype not in VALID_BUILD_TYPES:
            raise RuntimeError(u"unknown build type %s, use 'debug' or 'release' ")
        nextLibIndex = self.readProperty(prjpath)
        if options.buildall:
            for channel in supportChannels:
                print 'building for %s' %channel
                self.makeChannel(prjpath, channel, buildtype, nextLibIndex)
                if ret == 0:
                    print 'build %s successfully' %channel
                else:
                    print 'build %s failed' %channel
            return 0
        else:
            if len(myargs) == 3:
                channel = None
                return runProcess([ANT_CMD, buildtype])
            else:
                channel = myargs[3]
                if channel not in supportChannels:
                    raise RuntimeError(u"channel %s is not installed" %channel)
                return self.makeChannel(prjpath, channel, buildtype, nextLibIndex)

    def composeProperties(self, binfo, libraries):
        p = {
                'chameleon_script': SCRIPTDIR,
                'basedir': binfo.prjpath,
                'chameleon.out.dir': binfo.buildpath,
                'chameleon.apk.out.dir': 'chameleon_build',
                'chameleon.assets': ';'.join([x for x in binfo.assets]),
                'chameleon.apk.out.name': binfo.apkname
                }
        try:
            signcfg = binfo.signcfg
            if signcfg:
                p['key.store'] = signcfg['keystroke']
                p['key.store.password'] = signcfg['storepass']
                p['key.alias'] = signcfg['alias']
                p['key.alias.password'] = signcfg['keypass']
        except Exception, e:
            print >> sys.stderr, e
            raise RuntimeError("Fail to get sign config: " + e)
        if binfo.channel:
            p['chameleon.library'] = binfo.channel #os.path.join(prjpath, 'chameleon', 'channels', channel)
        if libraries and len(libraries) > 0:
            p.update(dict([('android.library.reference.%d' %x, y) for x, y in libraries]))
        return ['%s=%s'%(x,y.replace('\\', '\\\\')) for (x,y) in p.items()]

    def readProperty(self, prjpath):
        pat = re.compile('android\.library\.reference\.(\d+)=(.+)')
        res = []
        with open(os.path.join(prjpath, 'project.properties'), 'r') as f :
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

    def composeDependLib(self, binfo, nextLibIndex):
        t = [(nextLibIndex, 'chameleon/channels/'+ binfo.channel)]
        for l in binfo.libDependency:
            nextLibIndex += 1
            t.append((nextLibIndex, 'chameleon/libs/'+l.name))
        return t
    
    def preBuild(self, binfo):
        p = os.path.join(SCRIPTDIR, '..', '..', 'channelinfo', binfo.channel, 'script')
        if not os.path.exists(os.path.join(p, 'build.py')):
            pass
        else:
            fp, pathname, description = imp.find_module('build', [p])
            try:
                m = imp.load_module('build', fp, pathname, description)
                f = m.__dict__.get('preBuild')
                if f:
                    f(binfo)
            finally:
                # Since we may exit via an exception, close fp explicitly.
                if fp:
                    fp.close()
        self._runSDKPreBuild(binfo)

    def _runSDKPreBuild(self, binfo):
        for l in binfo.libDependency:
            p = os.path.join(SCRIPTDIR, 'buildscript', l.name)
            if not os.path.exists(os.path.join(p, 'build.py')):
                pass
            else:
                fp, pathname, description = imp.find_module('build', [p])
                try:
                    m = imp.load_module('build', fp, pathname, description)
                    f = m.__dict__.get('preBuild')
                    if f:
                        f(binfo, l.cfg)
                finally:
                    # Since we may exit via an exception, close fp explicitly.
                    if fp:
                        fp.close()
            

class CleanCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog clean prjpath channel")
        self.opt.add_option("-a", '--all', dest='cleanall', action="store_true",
                help='clean all channnels', default=False)

    def briefDesc(self):
        return "clean the app with channel"

    def cleanChannel(self, prjpath, channel):
        p = os.path.join(prjpath, 'chameleon_build', 'intermediate', channel)
        if os.path.exists(p):
            shutil.rmtree(p)

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 2:
            self.opt.print_help()
            return -1
        prjpath = os.path.abspath(myargs[1])
        supportChannels = getInstalledChannels(prjpath)
        if options.cleanall: 
            for channel in supportChannels:
                print 'cleaning for %s' %channel
                self.cleanChannel(prjpath, channel)
        else:
            if len(myargs) < 3:
                self.opt.print_help()
                return -1
            channel = myargs[2]
            if channel not in supportChannels:
                raise RuntimeError(u"channel %s is not installed" %channel)
            self.cleanChannel(prjpath, channel)
        return 0

class ListChannelCmd(object):
    def __init__(self):
        self.opt = OptionParser(usage="usage: %prog list prjpath")

    def briefDesc(self):
        return "list installed channels"

    def execute(self, args):
        (options, myargs) = self.opt.parse_args(args)
        if len(myargs) < 2:
            self.opt.print_help()
            return -1
        prjpath = os.path.abspath(myargs[1])
        supportChannels = getInstalledChannels(prjpath)
        print 'Installed channels:'
        print '\t\n'.join(supportChannels)
        return 0

CMDS = OrderedDict((
        ('list', ListChannelCmd()),
        ('build', BuildCmd()),
        ('clean', CleanCmd())))

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

