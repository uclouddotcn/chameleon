#!/usr/bin/env python
import subprocess, sys, os, re, json, codecs
import shutil
from chameleon_gen import *
from optparse import OptionParser
import zipfile
import modifyWx

CHANNEL_ROOT = ''

ANDROID_HOME = os.getenv('ANDROID_HOME')
JAVA_HOME = os.getenv('JAVA_HOME')

DEST_DIR = ''

EXEC_ROOT = os.path.dirname(__file__)
APK_TOOL_PATH = os.path.join(EXEC_ROOT, 'apktool.bat')
AAPT_PATH = os.path.join(EXEC_ROOT, 'aapt.exe')
BAKSMALI_PATH = os.path.join(EXEC_ROOT, 'baksmali.jar')
SMALI_PATH = os.path.join(EXEC_ROOT, 'smali.jar')

DST_DIR_NAME = 'target'
CHANNEL_DIR_NAME = 'channel'
MANIFEST_FILE_NAME = 'AndroidManifest.xml'
BUILD_DIR_NAME = 'build'
OUTPUT_DIR = 'output'

JAR_SIGNER_CMD = 'jarsigner'#os.path.join(EXEC_ROOT, 'jarsigner')
ZIPALIGN = os.path.join(EXEC_ROOT, 'zipalign.exe')

JAVAC = "javac"
DX_FILE = os.path.join(EXEC_ROOT, 'dx.jar')
DX_PATH = "java -jar "+DX_FILE + " "

if os.path.exists('log.txt'):
    os.remove('log.txt')

LOG_FD = 0
ICON_NAME = 'chameleon_icon.png'

if JAVA_HOME is None:
    print('Can\'t find JAVA_HOME, Please install JDK first')
    sys.exit()

def genCmd(paras):
    return ' '.join([x+' '+y for (x,y) in paras])

def unpackAPK(apkPath, destPath):
    fullPath = apkPath
    if not os.path.exists(fullPath):
        print(fullPath+' does not exist.')
        return False
    if not os.path.exists(destPath):
        os.makedirs(destPath)

    paras = []
    paras.append((APK_TOOL_PATH, ''))
    paras.append(('d', fullPath))
    paras.append(('-o', destPath))
    paras.append(('-f', ''))
    cmd = genCmd(paras)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(cmd)
    u = subprocess.call(cmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    if u != 0:
        return u

    manifestInst = loadManifest(os.path.join(destPath, MANIFEST_FILE_NAME))
    pkgName = str(manifestInst.getPkgName())
    packageSmali = os.path.join(destPath, 'smali')
    for s in pkgName.split('.'):
        packageSmali = os.path.join(packageSmali, s)
    allRsmaliFiles = __getAllObjFiles(packageSmali, '^(R[\$\.]).*')
    [os.remove(os.path.join(x, y)) for (x, y) in allRsmaliFiles]

    manifestInst.addAdditionalInfo(os.path.join(destPath, 'apktool.yml'))
    os.remove(os.path.join(destPath, MANIFEST_FILE_NAME))
    manifestInst.safeDump(os.path.join(destPath, MANIFEST_FILE_NAME))
    return 0


def __getAllObjFiles(rootpath, regex, isReverseCondition=False):
    objs = []

    if not os.path.exists(rootpath):
        return objs

    if isReverseCondition:
        [objs.append((rootpath, x)) for x in os.listdir(rootpath) if os.path.isfile(os.path.join(rootpath, x)) and re.match(regex, x) == None ]
    else:
        [objs.append((rootpath, x)) for x in os.listdir(rootpath) if os.path.isfile(os.path.join(rootpath, x)) and re.match(regex, x) != None ]

    [objs.extend(__getAllObjFiles(os.path.join(rootpath, x), regex, isReverseCondition)) for x in os.listdir(rootpath) if os.path.isdir(os.path.join(rootpath, x))]
    return objs


def buildClassesDex(channelName, projRoot, oriUnpackPath):
    channelPath = os.path.join(projRoot, channelName)
    channelSmaliPath = os.path.join(channelPath, 'smali')

    paras = []
    paras.append(('java', '-jar'))
    paras.append((SMALI_PATH, os.path.join(oriUnpackPath, 'smali')))
    paras.append(('', channelSmaliPath))
    paras.append(('-o', os.path.join(channelPath, 'classes.dex')))
    smaliCmd = genCmd(paras)

    print(smaliCmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(smaliCmd)
    u = subprocess.call(smaliCmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    if u != 0:
        print(smaliCmd + " failed.")

    return u


def buildDex(smalidirs, destDir):
    paras = []
    paras.append(('java', '-jar'))
    paras.append((SMALI_PATH, ''))
    [paras.append(('', x)) for x in smalidirs]
    paras.append(('-o', os.path.join(destDir, 'classes.dex')))
    smaliCmd = genCmd(paras)

    print(smaliCmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(smaliCmd)
    u = subprocess.call(smaliCmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    if u != 0:
        print(smaliCmd + " failed.")

    return u


def baksmali(dexfile, destdir):
    paras = []
    paras.append(('java', '-jar'))
    paras.append((BAKSMALI_PATH, ''))
    paras.append(('-o', destdir))
    paras.append(('', dexfile))
    cmd = genCmd(paras)
    print(cmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(cmd)
    u = subprocess.call(cmd, stdout=LOG_FD, stdin=LOG_FD, shell=False)
    LOG_FD.close()
    if u != 0:
        print(cmd + " failed.")
    return u


def relateCopy(src, dest, rejectRegex):
    if os.path.exists(src):
        allTarLibFilePath = __getAllObjFiles(src, rejectRegex, True)
        for (x, y) in allTarLibFilePath:
            pt = os.path.join(dest, os.path.relpath(x, src))
            # print(x)
            # print(os.path.join(pt, y))
            if not os.path.exists(pt):
                os.makedirs(pt)
            if not os.path.exists(os.path.join(pt, y)):
                shutil.copy(os.path.join(x, y), os.path.join(pt, y))


def aaptPack(channelName, sdkPaths, genPkgName, targetPath, desDir = ''):
    manifestPath = os.path.join(desDir, 'AndroidManifest.xml')
    # channelRes = os.path.join(desDir, 'res')
    channelReses = [os.path.join(sdkPath, 'res') for sdkPath in sdkPaths]
    targetRes = os.path.join(targetPath, 'res')
    assetsPath = os.path.join(desDir, 'assets')
    tarAssetsPath = os.path.join(targetPath, 'assets')
    androidJarPath = os.path.join(EXEC_ROOT, 'android.jar')
    dstPackagePath = os.path.join(desDir, genPkgName)
    channelPath = desDir

    sdkPaths.append(targetPath)

    for sdkPath in sdkPaths:
        if (os.path.split(sdkPath))[-1] != channelName:
            allAssetsFilePath = __getAllObjFiles(os.path.join(sdkPath, 'assets'), '.*(\.jar)$', True)
            for (x, y) in allAssetsFilePath:
                subDir = os.path.relpath(x, os.path.join(sdkPath, 'assets'))
                tarDir = os.path.join(assetsPath, subDir)
                if not os.path.exists(tarDir):
                    os.makedirs(tarDir)
                if not os.path.exists(os.path.join(tarDir, y)):
                    shutil.copy(os.path.join(x, y), os.path.join(tarDir, y))

    tempRPath = os.path.join(desDir, '__temp__R_JAVA___')
    if os.path.exists(tempRPath):
        shutil.rmtree(tempRPath)
    os.makedirs(tempRPath, exist_ok=True)


    paras = []
    paras.append((AAPT_PATH, 'package'))
    paras.append(('-f', ''))

    if os.path.exists(androidJarPath):
        paras.append(('-I', androidJarPath))

    if os.path.exists(manifestPath):
        paras.append(('-M', manifestPath))

    for channelRes in channelReses:
        if os.path.exists(channelRes):
            paras.append(('-S', channelRes))

    if os.path.exists(targetRes):
        paras.append(('-S', targetRes))

    if os.path.exists(assetsPath):
        paras.append(('-A', assetsPath))


    paras.append(('-J', tempRPath))

    paras.append(('-F', dstPackagePath))
    paras.append(('--auto-add-overlay', ''))

    aaptExecCmd = genCmd(paras)
    print(aaptExecCmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(aaptExecCmd)
    r = subprocess.call(aaptExecCmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    if r != 0:
        return r

    if not os.path.exists(os.path.join(tempRPath, 'bin')):
        os.makedirs(os.path.join(tempRPath, 'bin'))
    paras = []
    paras.append((JAVAC, ''))
    paras.append(('-classpath', androidJarPath))
    paras.append(('-encoding', 'utf-8'))
    paras.append(('-d', os.path.join(tempRPath, 'bin')))
    paras.append(('', os.path.join(tempRPath, 'R.java')))
    cmd = genCmd(paras)
    print(cmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(cmd)
    r = subprocess.call(cmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    if r != 0:
        return r

    #R*.class ==> r.dex
    paras = []
    paras.append((DX_PATH, ''))
    paras.append(('--dex', ''))
    paras.append(('--output', os.path.join(tempRPath, 'r.dex')))
    paras.append(('', os.path.join(tempRPath, 'bin')))
    cmd = genCmd(paras)
    print(cmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(cmd)
    r = subprocess.call(cmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    if r != 0:
        print(cmd + " failed")
        return r


    baksmali(os.path.join(tempRPath, 'r.dex'), os.path.join(tempRPath, 'smali'))
    baksmali(os.path.join(channelPath, 'classes.dex'), os.path.join(os.path.join(tempRPath, 'classes')))

    buildDex([os.path.join(tempRPath, 'classes'), os.path.join(tempRPath, 'smali')], channelPath)

    shutil.rmtree(tempRPath)


    # create a temp lib dir for aapt add
    tempLibDir = os.path.join(channelPath, 'lib')
    if os.path.exists(tempLibDir):
        shutil.rmtree(tempLibDir)
    os.makedirs(tempLibDir)

    # copy lib files of the target apk file to the temp lib dir
    p = os.path.join(targetPath, 'lib')
    relateCopy(p, tempLibDir, '.*(\.jar)$')

    # copy lib files of the channel to the temp lib dir
    for sdkPath in sdkPaths:
        p = os.path.join(sdkPath, 'libs')
        relateCopy(p, tempLibDir, '.*(\.jar)$')

    pwd = os.getcwd()

    os.chdir(channelPath)
    allLibFiles = __getAllObjFiles('lib', '.*(\.jar)$', True)

    with zipfile.ZipFile(dstPackagePath, 'a', zipfile.ZIP_DEFLATED) as pkgfile:
        for x, y in allLibFiles:
            pkgfile.write(os.path.join(x, y))

        os.chdir(pwd)
        shutil.rmtree(tempLibDir)

        os.chdir(desDir)
        pkgfile.write('classes.dex')
        os.chdir(pwd)
        pkgfile.close()

    return 0

SDK_TYPES = dict(user=1, pay=2, push=4, share=8, data_analysis=16, ad=32)

def transformCfg(channelPath, globalcfg):
    p = dict(cfg=dict())
    p['cfg']['appName'] = globalcfg['projectName']
    p['cfg']['channel'] = globalcfg['channel']['channelName']
    p['cfg']['isLandscape'] = globalcfg['landscape']
    p['cfg']['isDebug'] = False
    sdks = list()
    for item in globalcfg['channel']['sdks']:
        sdk = dict()
        sdk['apiName'] = item['name'].capitalize()+'ChannelAPI'
        sdk['type'] = sum([SDK_TYPES[k] for k in str(item['type']).lower().split(',')])
        sdk['sdkCfg'] = item['config']
        sdks.append(sdk)
    p['sdks'] = sdks
    if not os.path.exists(os.path.join(channelPath, 'assets', 'chameleon')):
        os.makedirs(os.path.join(channelPath, 'assets', 'chameleon'))
    with codecs.open(os.path.join(channelPath, 'assets', 'chameleon', 'config.json'), 'w', 'utf-8') as f:
        json.dump(p, f)
        f.close()


def sign_pkg(cfg, preName, afterName):

    paras = []
    paras.append((JAR_SIGNER_CMD, ''))
    paras.append(('-sigalg', 'SHA1withRSA'))
    paras.append(('-digestalg', 'SHA1'))
    paras.append(('-keystore', cfg['keystore']))
    paras.append(('-signedjar', afterName))
    paras.append(('-storepass',  cfg['storepass']))
    paras.append(('-keypass', cfg['keypass']))
    paras.append(('', preName))
    paras.append(('', cfg['alias']))

    cmd = genCmd(paras)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(cmd)
    u = subprocess.call(cmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    return u

def pkgAlign(pkgPath, pkgAlignedPath):
    if pkgPath == pkgAlignedPath:
        print('can\'t be the same name')
        return

    paras = []
    paras.append((ZIPALIGN, ''))
    paras.append(('-v', ''))
    paras.append(('-f', ''))
    paras.append(('4', ''))
    paras.append(('', pkgPath))
    paras.append(('', pkgAlignedPath))

    cmd = genCmd(paras)
    print(cmd)
    LOG_FD = open("log.txt", "a")
    LOG_FD.write(cmd)
    u = subprocess.call(cmd, stdout=LOG_FD, stderr=LOG_FD, shell=False)
    LOG_FD.close()
    return u


def procSplashIcons(channelPath, globalcfg):
    icon = globalcfg['channel'].get('iconPath')
    splashPath = globalcfg['channel'].get('splashPath')

    if splashPath is not None:
        splashes = __getAllObjFiles(splashPath, '.*\.(png|jpg)')
        i = 0
        for (x, y) in splashes:
            shutil.copy(os.path.join(x, y), os.path.join(channelPath, 'assets', 'chameleon', 'chameleon_splashscreen_'+str(i)+'.png'))
            # print("copy " + os.path.join(x, y))
            i += 1

    if icon is not None:
        if not os.path.exists(os.path.join(channelPath, 'res')):
            os.mkdir(os.path.join(channelPath, 'res'))

        icons = __getAllObjFiles(icon, '.*\.(png|jpg)')
        for (x, y) in icons:
            name = str(y).replace('-', '_')
            dest = os.path.join(channelPath, 'res', os.path.split(x)[-1], ICON_NAME)
            if not re.match('.*drawable.*', str(os.path.split(x)[-1])):
                continue
            if not os.path.exists(os.path.join(channelPath, 'res', os.path.split(x)[-1])):
                os.mkdir(os.path.join(channelPath, 'res', os.path.split(x)[-1]))
            # print("copy "+dest)
            shutil.copy(os.path.join(x, y), dest)


ERR_MSG = {
    1:'decompress package failed.',
    2:'get sdk failed.',
    3:'build dex files failed.',
    4:'modify androidmanifest file failed.',
    5:'pack files failed.',
    6:'sign package failed.',
    7:'align package failed.'
}

def main():
    u = 0
    parser = OptionParser()
    parser.add_option('-c', '--channel', dest='channel', help='channel name, e.g. xiaomi')
    parser.add_option('-r', '--channelRoot', dest='channelRoot', help='Root directory of the channels')
    parser.add_option('-p', '--package', dest='package', help='APK Package to process')
    parser.add_option('-V', '--version', dest='version', help='APK version name')
    # parser.add_option('-R', '--packageRoot', dest='packageRoot', help='Root directory where the package in')
    # parser.add_option('-g', '--generatePkgName', dest='generatePkgName', help='Name of the package to generate.')
    parser.add_option('-P', '--ProjectRoot', dest='projectRoot', help='path of the projects directory')
    parser.add_option('-d', '--decompressOnly', dest='decompressOnly', help="whether need to decompress the package. True/False")
    parser.add_option('-a', '--align', dest='align', help="whether need to align the package. True/False")

    (options, values) = parser.parse_args()

    if len(sys.argv) < 2:
        parser.print_help()
        return 1

    channel = options.channel
    channelRoot = options.channelRoot

    proj = os.path.join(options.projectRoot, BUILD_DIR_NAME)
    unpackDest = os.path.join(proj, DST_DIR_NAME)

    if not os.path.exists(proj):
        os.makedirs(proj)

    if options.decompressOnly.casefold() in ['true', 't']:
        tempUnpackDest = os.path.join(unpackDest, '__TempUnpack__')
        u = unpackAPK(options.package, tempUnpackDest)
        manifest = loadManifest(os.path.join(tempUnpackDest, MANIFEST_FILE_NAME))
        versionName = manifest.getPkgVersionName()
        unpackDest = os.path.join(unpackDest, versionName)
        if os.path.exists(unpackDest):
            shutil.rmtree(unpackDest)
        shutil.move(tempUnpackDest, unpackDest)

        print(versionName)

        if u != 0:
            u = 1
            print(ERR_MSG[u])
        return u

    if options.version is not None:
        unpackDest = os.path.join(unpackDest, options.version)

    channelPath = os.path.join(proj, channel)

    manifestFilePathOrig = os.path.join(unpackDest, MANIFEST_FILE_NAME)
    manifestFilePath = os.path.join(channelPath, MANIFEST_FILE_NAME)

    globalcfg = getCommCfg(os.path.join(options.projectRoot, 'cfg', channel))
    libs = getDependLibs(proj, globalcfg)

    for sdkinfo in libs:
        sdk = sdkinfo.name
        if os.path.exists(sdkinfo.path):
            shutil.rmtree(sdkinfo.path)

        if not os.path.exists(os.path.join(channelRoot, sdk+'.zip')):
            print(channel+'.zip does not exist.')
            u = 2
            print(ERR_MSG[u])
            return u

        with zipfile.ZipFile(os.path.join(channelRoot, sdk+'.zip'), 'r') as sdkFile:
            sdkFile.extractall(sdkinfo.path)
            sdkFile.close()

    u = modifyManifest(channel, libs, manifestFilePathOrig, manifestFilePath, globalcfg)
    if u != 0 and u is not None:
        print(u)
        u = 4
        print(ERR_MSG[u])
        return u

    manifest = loadManifest(manifestFilePathOrig)
#    add an additional class for some special sdk.
    modifyWx.makeWXEntryActivity(os.path.join(channelPath, 'smali'), channel, manifest.getPkgName())


    dexPaths = [os.path.join(x.path, 'smali') for x in libs]

    targetSmaliPath = os.path.join(unpackDest, 'smali')
    tarspaths = [os.path.join(os.path.relpath(x, targetSmaliPath), y) for (x, y) in __getAllObjFiles(targetSmaliPath, '.*\.smali$')]
    # tarspaths = [x for (x, y) in groupby(sorted(tarspaths))]

    for dp in dexPaths:
        files = __getAllObjFiles(dp, '.*\.smali$')
        p = [os.path.join(os.path.relpath(x, dp), y) for (x, y) in files]
        for x in p:
            if x in tarspaths:
                os.remove(os.path.join(dp, x))

    dexPaths.append(os.path.join(unpackDest, 'smali'))

    u = buildDex(dexPaths, os.path.join(proj, globalcfg['channel']['channelName']))
    if u != 0:
        u = 3
        print(ERR_MSG[u])
        return u

    generatePkgName = manifest.getPkgName()+'-'+manifest.getPkgVersionName()+'-'+channel+'-release.apk'

    transformCfg(channelPath, globalcfg)
    procSplashIcons(channelPath, globalcfg)
    tempPkgName = generatePkgName+'.tempzipfile'

    sdkPaths = [x.path for x in libs]
    u = aaptPack(channel, sdkPaths, tempPkgName, unpackDest, channelPath)
    if u != 0:
        u = 5
        print(ERR_MSG[u])
        return u

    pwd = os.getcwd()
    os.chdir(channelPath)

    tempForAlighPkgName = generatePkgName+'.tempsignfile'

    globalcfg['signConfig']['keystore'] = os.path.join(proj, globalcfg['signConfig']['keystore'])

    u = sign_pkg(globalcfg['signConfig'], tempPkgName, tempForAlighPkgName)
    if u != 0:
        u = 6
        print(ERR_MSG[u])
        return u

    if str(options.align).casefold() in ['true']:
        u = pkgAlign(tempForAlighPkgName, generatePkgName)
        if u != 0:
            u = 7
            print(ERR_MSG[u])
            return u
        os.remove(tempForAlighPkgName)
    else:
        shutil.move(tempForAlighPkgName, generatePkgName)
    outputdir = os.path.join(options.projectRoot, OUTPUT_DIR)
    if not os.path.exists(outputdir):
        os.makedirs(outputdir)

    shutil.copy(generatePkgName, os.path.join(outputdir, generatePkgName))

    os.remove(tempPkgName)
    os.chdir(pwd)

sys.exit(main())
