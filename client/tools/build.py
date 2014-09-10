#!/usr/bin/env python
import os, shutil, codecs, json, subprocess, sys, zipfile
from collections import namedtuple

BASEDIR = os.path.split(os.path.realpath(__file__))[0]
BASEDIR = os.path.join(BASEDIR, '..')
CHANNEL_DIR = os.path.join(BASEDIR, 'channels')
CHANNELINFO_DIR = os.path.join(BASEDIR, 'channelinfo')
CPP_SRC_ROOT = os.path.join(BASEDIR, 'chameleon', 'src', 'main', 'chameleoncb')
BUILD_SCRIPT_DIR = os.path.join(BASEDIR, 'tools', 'buildscript')

def copyFileInList(srcroot, targetroot, filelist):
    for f in filelist:
        fullpath = os.path.join(targetroot, f)
        path, fname = os.path.split(fullpath)
        if not os.path.exists(path):
            os.makedirs(path)
        shutil.copy2(os.path.join(srcroot, f), fullpath)

ChannelInfo = namedtuple('ChannelInfo', 'name path cfg script')

def loadJsonFile(channelPath):
    cfgJsonFile = os.path.join(channelPath, 'chameleon_build', 'cfg.json')
    with codecs.open(cfgJsonFile, 'r', 'utf8') as f:
        obj = json.load(f)
        if not (obj.has_key('name') and 
                obj.has_key('chamversion') and
                obj.has_key('version') and
                obj.has_key('cfgitem')):
            raise RuntimeError('illegal cfg in %s %s' %(cfgJsonFile, obj))
        return obj

def getChannelScript(channelPath):
    scriptPath = os.path.join(channelPath, 'chameleon_build', 'script.py')
    if os.path.exists(scriptPath):
        return scriptPath
    else:
        return None

def getChannelInfo(channel, channelPath):
    scriptFile = getChannelScript(channelPath)
    cfg = loadJsonFile(channelPath)
    if scriptFile:
        cfg['script'] = 'ChannelScript.%s_script' %channel
    return ChannelInfo(channel, channelPath, cfg, scriptFile)

def collectChannelInfo(channelParentFolder):
    folders = os.listdir(channelParentFolder)
    result = []
    for folder in folders:
        try:
            folderPath = os.path.join(channelParentFolder, folder)
            if os.path.isdir(folderPath) and \
                os.path.exists(os.path.join(folderPath, 'chameleon_build', 'cfg.json')):
                result.append(getChannelInfo(folder, 
                    os.path.join(channelParentFolder, folder)))
            else:
                print >> sys.stdout, 'ignore %s' %folder
        except Exception, e:
            print >> sys.stderr, 'Fail to collect channel info for %s' %folder
            raise e
    return result

def packChannels(channelParentFolder, targetParentFolder):
    channelInfos = collectChannelInfo(channelParentFolder)
    #compileAllChannels([x.name for x in channelInfos])
    for ci in channelInfos:
        copyChannel(ci.name, ci.path, os.path.join(targetParentFolder, ci.name))
    return channelInfos

def copyChannel(channel, channelPath, targetPath):
    ignore = shutil.ignore_patterns('.*',  #ignore the hidden files and directories
        '*.template', #ignore the template files
        'chameleon_build', # ignore the tool directory
        'build',
        '*.iml')
    copyfilelist = []
    for root, dirs, files in os.walk(channelPath):
        ignoreFiles = ignore(root, files)
        ignoreDirs = ignore(root, dirs)
        for d in ignoreDirs:
            dirs.remove(d)
        copyfilelist += [os.path.join(root, x) 
                for x in filter(lambda f : f not in ignoreFiles, files)]
    relfilelist = [os.path.relpath(x, channelPath) for x in copyfilelist]
    copyFileInList(channelPath, targetPath, relfilelist)
    shutil.copy2(os.path.join(channelPath, 'AndroidManifest.xml'), 
            os.path.join(targetPath, 'AndroidManifest.xml.template'))
    relfilelist.append('AndroidManifest.xml.template')
    shutil.copyfile(os.path.join(BUILD_SCRIPT_DIR, 'Resource', 'default', 
        'AndroidManifest.xml'), os.path.join(targetPath, 'AndroidManifest.xml'))
    with codecs.open(os.path.join(targetPath, 'filelist.txt'), 'w', 'utf8') as f:
        f.write('\n'.join(relfilelist))

def initTargetScriptFolder(targetScriptFolder):
    if not os.path.exists(targetScriptFolder):
        os.makedirs(targetScriptFolder)
    with open(os.path.join(targetScriptFolder, '__init__.py'), 'w') as f:
        pass

def copyChameleonCpp(targetFolder):
    cppTargetFolder = os.path.join(targetFolder, 'Resource', 'chameleon', 'chameleoncb')
    shutil.copytree(CPP_SRC_ROOT, cppTargetFolder)


# copy channel folders and channel resources, generate build info json
def initProjectFolder(targetFolder, version):
    targetChannelPath = os.path.join(targetFolder, 'channels')
    targetScriptPath = os.path.join(targetFolder, 'ChannelScript')
    chameleonCbPath = os.path.join(targetFolder, 'chameleoncb')
    infoJsonFile = os.path.join(targetFolder, 'info.json')
    channelListFile = os.path.join(CHANNELINFO_DIR, 'channellist.json')
    shutil.copytree(BUILD_SCRIPT_DIR, targetFolder)
    copyChameleonCpp(targetFolder)
    initTargetScriptFolder(targetScriptPath)
    channelInfos = packChannels(CHANNEL_DIR, targetChannelPath)
    with codecs.open(channelListFile, 'r', 'utf8') as channelListFObj:
        channellistobj = json.load(channelListFObj)
    cfg = {'version': version, 'channels': [x.cfg for x in channelInfos], 
            'channellist': channellistobj}
    with codecs.open(infoJsonFile, 'w', 'utf8') as f:
        json.dump(cfg, f, indent=4)
    for ci in channelInfos:
        if ci.script:
            shutil.copy2(ci.script, os.path.join(targetScriptPath, ci.name+'_script.py'))
    shutil.copytree(CHANNELINFO_DIR, os.path.join(targetFolder, 'channelinfo'))

def compileChannel(gradleCmd, channel):
    taskTarget = ':channels:%s' %channel
    def task(task):
        return taskTarget+':%s'%task
    #ret = subprocess.check_call([gradleCmd, task('clean')])
    #if ret != 0:
    #    raise RuntimeError('Fail to clean the chameleon sdk')
    ret = subprocess.check_call([gradleCmd, task('assembleRelease')])
    if ret != 0:
        raise RuntimeError('Fail to assemble the chameleon sdk')

def compileAllChannels(channels):
    olddir = os.getcwd()
    os.chdir(BASEDIR)
    try:
        gradleCmd = os.path.join(BASEDIR, 'gradlew')
        for channel in channels:
            compileChannel(gradleCmd, channel)
    finally:
        os.chdir(olddir)
    

def buildChameleonLib(targetFolder):
    targetLibFoldr = os.path.realpath(os.path.join(targetFolder, 'Resource', 
        'chameleon', 'libs'))
    olddir = os.getcwd()
    os.chdir(BASEDIR)
    try:
        gradleCmd = os.path.join(BASEDIR, 'gradlew')
        ret = subprocess.check_call([gradleCmd, 'chameleon:clean'])
        if ret != 0:
            raise RuntimeError('Fail to clean the chameleon sdk')
        ret = subprocess.check_call([gradleCmd, 'chameleon_unity:clean'])
        if ret != 0:
            raise RuntimeError('Fail to clean the chameleon unity sdk')
        ret = subprocess.check_call([gradleCmd, 'chameleon:assembleRelease'])
        if ret != 0:
            raise RuntimeError('Fail to assemble the chameleon sdk')
        ret = subprocess.check_call([gradleCmd, 'chameleon_unity:assembleRelease'])
        if ret != 0:
            raise RuntimeError('Fail to assemble the chameleon unity sdk')
        shutil.copy2(os.path.join("chameleon", "build", "bundles", "release", "classes.jar"),
            os.path.join(targetLibFoldr, 'chameleon.jar'))
        shutil.copy2(os.path.join("chameleon_unity", "build", "bundles", "release", "classes.jar"),
            os.path.join(targetLibFoldr, 'chameleon_unity.jar'))
    finally:
        os.chdir(olddir)

def cleanOldBuild(targetFolder):
    if os.path.exists(targetFolder):
        print 'cleaning existing build folder %s ...' %(targetFolder)
        shutil.rmtree(targetFolder)

def getversion():
    versionFolder = os.path.join(BASEDIR, 'version')
    versionFile = os.path.join(versionFolder, 'version.txt')
    with open(versionFile, 'r') as f:
        l = f.readline()
        return l.strip('\n')


def unzipFiles(zf, targetDir):
    with zipfile.ZipFile(zf) as zipf:
        zipf.extractall(targetDir)

def exportChamleonClient(clientZipTarget):
    oldpath = os.getcwd()
    try:
        os.chdir('chameleon_client')
        ret = subprocess.call(['git', 'archive', '--format', 
            'zip', '-o', clientZipTarget, 'HEAD'])
    finally:
        os.chdir(oldpath)
    if ret != 0:
        raise RuntimeError('fail to export chameleon_client')

def buildChameleonClient(zf, chameleonFolder, targetFolder, place):
    os.mkdir(targetFolder)
    unzipFiles(zf, targetFolder)
    shutil.copytree(chameleonFolder, os.path.join(targetFolder, 'chameleon'))
    place(targetFolder)
    downloadDependency(targetFolder)


def placeNodeWebkitWin(targetFolder):
    src = os.path.join('nodewebkit-bin', 'nodewebkit-win.zip')
    unzipFiles(src, targetFolder)
    
def placeNodeWebkitOsx(targetFolder):
    src = os.path.join('nodewebkit-bin', 'node-webkit.app')
    shutil.copytree(src, os.path.join(targetFolder, 'node-webkit.app'))

def downloadDependency(targetFolder):
    olddir = os.getcwd()
    try:
        os.chdir(targetFolder)
        ret = subprocess.check_call(['npm', 'install'])
        if ret != 0:
            raise RuntimeError('Fail to download dependency for %s' %targetFolder)
        ret = subprocess.check_call(['bower', 'install'])
        if ret != 0:
            raise RuntimeError('Fail to download dependency for %s' %targetFolder)
    finally:
        os.chdir(olddir)


def mergeToNodewebkit(targetFolder):
    clientZipTarget = os.path.join(targetFolder, 'chameleon_client.zip')
    chameleonFolder = os.path.join(targetFolder, 'chameleon')
    exportChamleonClient(clientZipTarget)
    buildChameleonClient(clientZipTarget, chameleonFolder, 
            os.path.join(targetFolder, 'chameleon_client_win'),placeNodeWebkitWin)
    buildChameleonClient(clientZipTarget, chameleonFolder,
            os.path.join(targetFolder, 'chameleon_client_osx'),placeNodeWebkitOsx)


def build():
    targetFolder = os.path.join(BASEDIR, 'build')
    cleanOldBuild(targetFolder)
    version = getversion()
    chameleonTarget = os.path.join(targetFolder, 'chameleon')
    print 'get version is %s' %version
    print 'start initing build folder...'
    initProjectFolder(chameleonTarget, version)
    print 'build chameleon libs...'
    buildChameleonLib(chameleonTarget)
    print 'build chameleon client...'
    mergeToNodewebkit(targetFolder)
    print 'done'

build()
