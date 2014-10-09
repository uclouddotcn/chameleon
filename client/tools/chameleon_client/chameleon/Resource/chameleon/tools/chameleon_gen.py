import sys, os, string, shutil, json, codecs
import xml.dom.minidom as xml
from chameleon_build_comm import *
from AndroidManifest import AndroidManifestInst

def error(s):
    print >> sys.stderr, s

def modifyManifest(channel, libs, manifestFilePath):
    projectJsonPath = os.path.join('chameleon', 'channels', channel, 
            'project.json')
    with codecs.open(projectJsonPath, 'r') as f:
        obj = json.load(f)
    sc = obj.get("splashscreen")
    icons = obj.get("icons")
    cppath = manifestFilePath+'.orig'
    if os.path.exists(cppath) and not isNewerThan(manifestFilePath, cppath):
        return
    manifestInst = loadManifest(manifestFilePath)
    mergeLibManifests(libs, manifestInst)
    if sc is not None:
        manifestInst.replaceEntryActivity()
    if icons is not None:
        manifestInst.setIcon('chameleon_icon')
    manifestInst.safeDump(manifestFilePath)
    shutil.copyfile(manifestFilePath, cppath)

def loadManifest(path):
    return AndroidManifestInst(path)

def mergeLibManifests(libs,  manifestInst):
    for l in libs:
        mergeSingleLibManifest(l,  manifestInst)

def mergeSingleLibManifest(lib, manifestInst):
    libManifestInst = loadLibManifest(lib)
    mergeLibManifestInst(lib.cfg, libManifestInst, manifestInst)

def loadLibManifest(lib):
    p = os.path.join(lib.path, 'AndroidManifest.xml.template')
    return AndroidManifestInst(p)

def mergeLibManifestInst(cfg, libManifestInst, manifestInst):
    libManifestInst.replace(dict([(name[1:], value) for name, value in cfg.items()]))
    manifestInst.merge(libManifestInst)

def makeBooleanValue(name, val):
    if val: 
        return 'bundle.putBoolean("%s", true);' %name 
    else:
        return 'bundle.putBoolean("%s", false);' %name

TYPE_BUNDLE_CFG = {
        's' : lambda name, val: 'bundle.putString("%s", "%s");' %(name, val),
        'l' : lambda name, val: 'bundle.putLong("%s", %s);' %(name, val),
        'b' : makeBooleanValue, 
        'f' : lambda name, val: 'bundle.putFloat("%s", %s);' %(name, val),
        'h' : lambda name, val: ''
    }

SINGLE_LIB_TEMPLATE = string.Template("""
package prj.chameleon.entry;

import android.os.Bundle;
import prj.chameleon.channelapi.ChannelAPI;
import prj.chameleon.channelapi.SingleSDKChannelAPI;
import prj.chameleon.$lib.$libAPIImp;

class Instantializer {
    public static class ChannelAPIImp extends SingleSDKChannelAPI.SingleSDKInstantializer<$libAPIImp> {
        public ChannelAPIImp($libAPIImp imp) {
            super(imp);
        }

        @Override
        protected Bundle getConfigBundle() {
$bundleCfg
            return bundle;
        }

        @Override
        public String getChannelName() {
            return "$channel";
        }
    }

    public static ChannelAPI instantialize() {
        return new ChannelAPIImp(new $libAPIImp());
    }
}
""")

def genBundleCfg(cfg):
    x = ['Bundle bundle = new Bundle();']
    for name, val in cfg.items():
        typeChar = name[0]
        realName = name[1:]
        x.append(TYPE_BUNDLE_CFG[typeChar](realName, val))
    return '\n\t\t\t'.join(x)

def checkDependency(genFilePath, depends):
    if not os.path.exists(genFilePath):
        return True
    for d in depends:
        if isNewerThan(d, genFilePath):
            return True
    return False


def genInstantializer(channel, genPath, libs):
    if len(libs) != 1:
        raise RuntimeError('now not support multiple libs')
    l = libs[0] 
    bundleCfgStr = genBundleCfg(l.cfg)
    genPkgPath = os.path.join(genPath, 'prj', 'chameleon', 'entry')
    genFilePath = os.path.join(genPkgPath, 'Instantializer.java')
    projectJsonPath = os.path.join('chameleon', 'channels', channel, 
            'project.json')
    depends = [projectJsonPath] + [x.cfgpath for x in libs]
    if not checkDependency(genFilePath, depends):
        error('ignore gen, no modification found')
        return
    content = SINGLE_LIB_TEMPLATE.substitute(lib=l.name, 
            libAPIImp=l.name[0].upper()+l.name[1:]+'ChannelAPI', 
            bundleCfg=bundleCfgStr, channel=channel)
    if not os.path.exists(genPkgPath):
        os.makedirs(genPkgPath)
    with codecs.open(genFilePath, 'w', 'utf-8') as f:
        f.write(content)

def isNewerThan(a, b):
    return os.path.getmtime(a) > os.path.getmtime(b)

def genRFileForPkgName(channel, genPath, pkgName):
    s = pkgName.split('.')
    d = os.path.join(*([genPath] + s))
    src = os.path.join(d, 'R.java')
    suffix = getPkgSuffix(channel)
    if len(suffix) == 0:
        return
    newPkgName = pkgName + '.' + suffix
    targetD = os.path.join(d, suffix)
    target = os.path.join(targetD, 'R.java')
    if not os.path.exists(src):
        error('Fail to locate old source %s' %src)
    if not os.path.exists(targetD):
        os.makedirs(targetD)
    if not os.path.exists(target) or isNewerThan(src, target):
        with codecs.open(src, 'r', 'utf8') as srcF, codecs.open(target, 'w', 'utf8') as targetF:
            for l in srcF.readlines():
                if l.startswith('package %s;' %pkgName):
                    targetF.write('package %s;\n' %newPkgName)
                else:
                    targetF.write(l)

def getPkgSuffix(channel):
    doc = xml.parse(os.path.join('chameleon', 'channels', channel, 'info.xml'))
    t = doc.documentElement.getAttribute('pkgsuffix')
    if len(t) > 1:
        return t[1:]
    else:
        return '' 

def main():
    if len(sys.argv) < 4:
        return -1
    channel = sys.argv[1]
    manifestFilePath = sys.argv[2]
    genPath = sys.argv[3]
    pkgName = sys.argv[4]
    error(pkgName)
    libs = getDependLibs(channel)   
    modifyManifest(channel, libs, manifestFilePath) 
    genInstantializer(channel, genPath, libs)

sys.exit(main())

