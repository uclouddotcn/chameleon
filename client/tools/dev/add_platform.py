import os, sys, codecs
from string import Template

SCRIPTDIR = os.path.join(os.path.split(os.path.realpath(__file__))[0])
BASEDIR = os.path.join(os.path.split(os.path.realpath(__file__))[0], '../src')

def makeDefaultName(package, platform):
   ret = {} 
   ret[u"package"] = package
   ret[u"impclass"] = str.upper(platform[0]) + platform[1:] + 'PlatformAPI'
   ret[u'platform'] = platform
   return ret

def genFromTemplateFile(fpath, dictObj):
    c = codecs.open(fpath, 'r', 'utf8').read()
    return Template(c).substitute(dictObj)

def genDefaultFlavor(fpath, obj):
    c = genFromTemplateFile('flavor.json.template', obj)
    f = codecs.open(fpath, 'w', 'utf8')
    f.write(c)

def genDefaultManifest(fpath, obj):
    c = genFromTemplateFile('AndroidManifest.xml.template', obj)
    f = codecs.open(fpath, 'w', 'utf8')
    f.write(c)

def genDefaultJava(folder, obj):
    c = genFromTemplateFile('API.java.template', obj)
    f = codecs.open(os.path.join(folder, obj['impclass']+'.java'), 'w', 'utf8')
    f.write(c)
    f.close()
    c = genFromTemplateFile('R.java.template', obj)
    f = codecs.open(os.path.join(folder, 'R.java.template'), 'w', 'utf8')
    f.write(c)

def genDefaultModulePy(fpath, obj):
    c = genFromTemplateFile('module.py.template', obj)
    f = codecs.open(fpath, 'w', 'utf8')
    f.write(c)



platform = sys.argv[1]
package = sys.argv[2]
platformBaseDir = os.path.join(BASEDIR, platform)
cfg = makeDefaultName(package, platform)

os.chdir(SCRIPTDIR)
s = package.split('.')
if not os.path.exists(platformBaseDir):
    JAVA_PATH = os.path.join(platformBaseDir, 'java', *s)
    LIB_PATH = os.path.join(platformBaseDir, 'libs')
    TOOL_PATH = os.path.join(platformBaseDir, 'tool')
    BUILD_PATH = os.path.join(platformBaseDir, 'build')
    os.makedirs(JAVA_PATH)
    os.makedirs(LIB_PATH)
    os.makedirs(TOOL_PATH)
    os.makedirs(BUILD_PATH)
    genDefaultFlavor(os.path.join(BUILD_PATH, 'flavor.json'), cfg)
    genDefaultManifest(os.path.join(platformBaseDir, 'AndroidManifest.xml'), cfg)
    genDefaultJava(JAVA_PATH, cfg)
    genDefaultModulePy(os.path.join(TOOL_PATH, 'module.py'), cfg)
else:
    raise RuntimeError('platform %s existed' %(platform))


