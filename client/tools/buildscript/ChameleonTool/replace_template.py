from string import Template
import codecs, json, shutil, hashlib
import os, urlparse

ignore = shutil.ignore_patterns('.*',  #ignore the hidden files and directories
                                '*.template', #ignore the template files
                                'chameleon_build', # ignore the tool directory
                                'AndroidManifest.xml',
                                'A.java',
                                'build',
                                '*.iml'
                               )

def getFileList(srcDir):
    result = []
    for root, dirs, files in os.walk(srcDir):
        ignoreFiles = ignore(root, files)
        ignoreDirs = ignore(root, dirs)
        for d in ignoreDirs:
            dirs.remove(d)
        result += [os.path.join(root, x) 
                for x in filter(lambda f : f not in ignoreFiles, files)]
    return [os.path.relpath(x, srcDir) for x in result]

def copyFileInList(srcroot, targetroot, filelist):
    for f in filelist:
        fullpath = os.path.join(targetroot, f)
        path, fname = os.path.split(fullpath)
        if not os.path.exists(path):
            os.makedirs(path)
        shutil.copy2(os.path.join(srcroot, f), path)

def removeFileInList(targetroot, filelist):
    for f in filelist:
        fullpath = os.path.join(targetroot, f)
        os.remove(fullpath)
        path, fname = os.path.split(fullpath)
        if len(os.listdir(path)) == 0:
            try:
                os.removedirs(path)
            except:
                pass

def readFileList(filelistFile):
    with codecs.open(filelistFile, 'r', 'utf8') as f:
        return [x.strip('\n').strip() for x in f.readlines()]

## replace the template file, and copy the final file to target directory
def replaceTemplate(srcDir, targetDir, cfgObj):
    for root, dirs, files in os.walk(srcDir):
        for f in files:
            if f.endswith('.template'):
                targetRoot = os.path.join(targetDir, os.path.relpath(root, srcDir))
                copyTemplateFile(os.path.join(root, f),
                                 os.path.join(targetRoot, f[:-9]),
                                 cfgObj)


def copyTemplateFile(src, target, cfgObj):
    srcFile = codecs.open(src, 'r', 'utf8')
    targetFile = codecs.open(target, 'w', 'utf8')
    t = Template(srcFile.read())
    content = t.substitute(cfgObj)
    targetFile.write(content)
    return getSignature(content)

def copySrcTree(srcDir, srcRoot, targetDir):
    for root, dirs, files in os.walk(srcDir):
        targetRoot = os.path.join(targetDir, os.path.relpath(root, srcRoot))
        if not os.path.isdir(targetRoot): 
            os.mkdir(targetRoot)
        ignoreFiles = ignore(root, files)
        ignoreDirs = ignore(root, dirs)
        for d in ignoreDirs:
            dirs.remove(d)
        files = filter(lambda f : f not in ignoreFiles, files)
        for f in files:
            shutil.copy(os.path.join(root, f), 
                        os.path.join(targetRoot, f))

def copySrcTreeToAnt(srcDir, targetDir):
    srcmainDir = os.path.join(srcDir, 'src', 'main')
    for root, dirs, files in os.walk(srcmainDir):
        targetRoot = os.path.join(targetDir, os.path.relpath(root, srcmainDir))
        if not os.path.isdir(targetRoot): 
            os.mkdir(targetRoot)
        ignoreFiles = ignore(root, files)
        ignoreDirs = ignore(root, dirs)
        for d in ignoreDirs:
            dirs.remove(d)
        files = filter(lambda f : f not in ignoreFiles, files)
        for f in files:
            shutil.copy(os.path.join(root, f), 
                        os.path.join(targetRoot, f))
    os.rename(os.path.join(targetDir, 'java'), 
            os.path.join(targetDir, 'src'))


def loadJsonCfg(cfgPath):
    f = codecs.open(cfgPath, 'r', 'utf8')
    return json.load(f, 'utf8')   

def callCustomScript(srcDir, targetDir, cfgPath):
    customScriptPath = os.path.join(srcDir, 'tool', 'custom.py')
    if (not os.path.exists(customScriptPath)):
        return
    ret = os.system(u'python %s %s %s %s' %(customScriptPath, srcDir, targetDir, cfgPath))
    if (ret):
        raise RuntimeError(u"fail to execute the custom script %s" %(customScriptPath))

def copyTree(srcDir, targetDir, cfgObj):
    srcDir = os.path.abspath(srcDir)
    srcRoot, path = os.path.split(srcDir)
    targetRoot, _path = os.path.split(targetDir)
    try:
        copySrcTree(srcDir, srcRoot, targetRoot)
        replaceTemplate(srcDir, targetDir, cfgObj)
    except KeyError, e:
        raise RuntimeError(u"fail to find config items for %s" %', '.join(e.args))

def collectFlavorJson(platformBaseDir):
    cfgJsonPath = os.path.join(platformBaseDir, 'chameleon_build', 'flavor.json')
    if not os.path.exists(cfgJsonPath):
        return {}
    cfgJson = loadJsonCfg(cfgJsonPath)
    if not (cfgJson.has_key("productFlavor") and cfgJson.has_key("cfg")):
        raise RuntimeError(u"invalid flavor config %s" %(os.path.abspath(cfgJsonPath)))
    return cfgJson

def format2Ant(srcDir, targetDir, cfgObj):
    srcDir = os.path.abspath(srcDir)
    srcRoot, path = os.path.split(srcDir)
    targetRoot, _path = os.path.split(targetDir)
    try:
        copySrcTree(srcDir, srcRoot, targetRoot)
        replaceTemplate(srcDir, targetDir, cfgObj)
    except KeyError, e:
        raise RuntimeError(u"fail to find config items for %s" %', '.join(e.args))

    
def genProductFlavors(srcFolder, targetPlatforms):
    cfgs = [collectFlavorJson(os.path.join(srcFolder, platform)) for platform in targetPlatforms]
    return json.dumps(cfgs, indent = 4)

def appendProductFlavors(oldJsonFile, srcFolder, targetPlatforms):
    if os.path.exists(oldJsonFile):
        cfgs = loadJsonCfg(oldJsonFile)
    else:
        cfgs = []
    newcfgs = [collectFlavorJson(os.path.join(srcFolder, platform)) for platform in targetPlatforms]
    for newcfg in newcfgs:
        for oldcfg in cfgs:
            if newcfg["productFlavor"] == oldcfg["productFlavor"]:
                cfgs.remove(oldcfg)
                break
        cfgs.append(newcfg)
    return json.dumps(cfgs, indent = 4)

def getSignature(content):
    m = hashlib.md5(content.encode('utf8'))
    return m.hexdigest()

def getFileSignature(fname):
    a = codecs.open(fname, 'r', 'utf8')
    return getSignature(a.read())

def parseSignCfg(cfg):
    t = urlparse.parse_qs(cfg)
    return dict([(x, y[0]) for (x,y) in t.items()])

def parseUrlArg(arg):
    t = urlparse.parse_qs(arg)
    return dict([(x, y[0]) for (x,y) in t.items()])


