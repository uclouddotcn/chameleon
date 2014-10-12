from optparse import OptionParser
from subprocess import check_output
import os, shutil, traceback, sys, json, codecs
from itertools import groupby
from chameleon_build_comm import *

def buildlog(s):
    print >> sys.stderr, '[chamele_build] %s' %s

def runcmd(args):
    return check_output(args)

def getTargetChannelAssetFolder(targetChannel):
    channelFolder = os.path.join('chameleon', 'channels', targetChannel)
    return channelFolder

def getTargetChannelAssets(targetFolder, ignorePatterns):
    result = []
    for root, dirs, files in os.walk(os.path.join(targetFolder, 'assets')):
        ignoreDirs = ignorePatterns(root, dirs)
        ignoreFiles = ignorePatterns(root, files)
        for d in dirs:
            if d in ignoreDirs:
                dirs.remove(d)
        validFiles = filter(lambda x : x not in ignoreFiles, files)
        result += [os.path.relpath(os.path.join(root, x), targetFolder) for x in validFiles ]    
    return result

def removeExclam(x):
    if x.startswith('!'):
        return x[1:]
    else:
        return x

"""!.svn:!.git:.*:<dir>_*:!CVS:!thumbs.db:!picasa.ini:!*.scc:*~"""
def getIgnorePatterns(s):
    t = map(removeExclam, s.split(':'))
    return shutil.ignore_patterns(*t)

def checkConflictedAssets(aapt, targetPackage, filelist):
    contents = runcmd([aapt, 'list', targetPackage])
    inAssetFileList = [x.strip().strip('\r') for x in contents.split('\n')]
    conflictedList = [x for x in filelist if x in inAssetFileList]
    if len(conflictedList) != 0:
        buildlog("conflicted files %s" %', '.join(conflictedList))
        return True
    else:
        return False

def mergeAsset(aapt, targetPackage, parentFolder, filelist):
    nowDir = os.path.abspath(os.getcwd())
    try:
        filelist = [x.replace('\\', '/') for x in filelist]
        p = os.path.relpath(targetPackage, repr(parentFolder))
        os.chdir(parentFolder)
        runcmd([aapt, 'add', p] + filelist)
        buildlog("merged %s" %(', '.join(filelist)))
    finally:
        os.chdir(nowDir)

def mergeDependLibAssets(libs, channelfolder, ig):
    assets = []
    ps = [channelfolder] + [lib.path for lib in libs]
    for p in ps:
        if not os.path.isdir(p):
            continue
        existed = [x[0] for x in assets]
        pp = os.path.join(p, 'assets')
        for x in getTargetChannelAssets(p, ig):
            if x in existed:
                buildlog('%s in %s conflicted, ignored' %(x, p))
            else:
                assets.append((x, p))
    return assets

def groupAssets(assets):
    t = []
    for k, g in groupby(assets, lambda x: x[1]):
        t.append((k, [x[0] for x in list(g)]))
    return t
        

def mergeAssetsToApk(args):
    parser = OptionParser()
    (options, args) = parser.parse_args(args)
    targetChannel = args[0]
    aapt = args[1]
    ignorePat = "!.svn:!.git:.*:<dir>_*:!CVS:!thumbs.db:!picasa.ini:!*.scc:*~"
    targetpkg = args[2]
    ig = getIgnorePatterns(ignorePat)
    channelFolder = getTargetChannelAssetFolder(targetChannel)
    dependLibs = getDependLibs(targetChannel)
    assets = mergeDependLibAssets(dependLibs, channelFolder, ig)
    totalFileList = [x[0] for x in assets]
    assets = groupAssets(assets)
    if len(totalFileList) == 0:
        return 0
    if checkConflictedAssets(aapt, targetpkg, totalFileList):
        return -1
    else:
        for a in assets:
            mergeAsset(aapt, targetpkg, a[0], a[1])
        return 0

def main():
    try:
        return mergeAssetsToApk(sys.argv[1:])
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        traceback.print_exception(exc_type, exc_value, exc_traceback, 
                limit=10, file=sys.stdout)
        return -1



if __name__ == '__main__':
    sys.exit(main())

