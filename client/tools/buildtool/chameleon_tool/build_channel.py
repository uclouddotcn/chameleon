__author__ = 'Peter Zhu'

#!/usr/bin/env python
import subprocess, sys, os, re, json, codecs
import shutil
import xml.dom.minidom as dom
from chameleon_gen import *
from optparse import OptionParser
import zipfile

CHANNEL_ROOT = ''

ANDROID_HOME = os.getenv('ANDROID_HOME')
JAVA_HOME = os.getenv('JAVA_HOME')

DEST_DIR = ''

EXEC_ROOT = os.path.dirname(__file__)
APK_TOOL_PATH = os.path.join(EXEC_ROOT, 'apktool')
AAPT_PATH = os.path.join(EXEC_ROOT, 'aapt')
BAKSMALI_PATH = os.path.join(EXEC_ROOT, 'baksmali.jar')
SMALI_PATH = os.path.join(EXEC_ROOT, 'smali.jar')

if ANDROID_HOME is None:
    print('can\'t find ANDROID SDK')
    sys.exit()

if JAVA_HOME is None:
    print('Can\'t find JAVA_HOME, Please install JDK first')
    sys.exit()


def genCmd(paras):
    return ' '.join([x+' '+y for (x,y) in paras])


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


def compileChannel(channelName, channelRootPath):
    channelPath = os.path.join(channelRootPath, channelName)
    if not os.path.exists(channelPath):
        print(channelName + 'does not exist')

    print(channelPath)

    if os.path.exists(os.path.join(channelPath, 'project.properties')):
        nf = open(os.path.join(channelPath, 'project.properties2'), 'w')
        with open(os.path.join(channelPath, 'project.properties'), 'r') as f:
            for l in f.readlines():
                if not l.startswith('#'):
                    seps = l.split('=')
                    if seps[0].endswith('android.library') and seps[-1].startswith('true'):
                        l = '#'+l
                nf.write(l)
        nf.close()
        f.close()

        os.remove(os.path.join(channelPath, 'project.properties'))
        os.rename(os.path.join(channelPath, 'project.properties2'), os.path.join(channelPath, 'project.properties'))

    pwd = os.getcwd()

    os.chdir(channelPath)
    os.system('ant release')
    os.chdir(pwd)

    dexPath = os.path.join(channelPath, 'bin', 'classes.dex')
    channelSmaliPath = os.path.join(channelPath, 'bin', 'smali')

    paras = []
    paras.append(('java', '-jar'))
    paras.append((BAKSMALI_PATH, dexPath))
    paras.append(('-o', channelSmaliPath))

    baksmaliCmd = genCmd(paras)
    print(baksmaliCmd)
    os.system(baksmaliCmd)
    # allRsmaliFiles = __getAllObjFiles(channelSmaliPath, '^(R[\$\.]).*')
    # [os.remove(os.path.join(x, y)) for (x, y) in allRsmaliFiles]


def main():
    parser = OptionParser()
    parser.add_option('-c', '--channel', dest='channel', help='channel name, e.g. xiaomi')
    parser.add_option('-r', '--channelRoot', dest='channelRoot', help='Root directory of the channels')
    parser.add_option('-g', '--generatePath', dest='generatePath', help='the path where the packed\
                            files of the channel is stored.')

    (options, values) = parser.parse_args()

    if len(sys.argv) < 4:
        parser.print_help()
        return

    channel = options.channel
    channelRoot = options.channelRoot
    genRoot = options.generatePath

    compileChannel(channel, channelRoot)
    pwd = os.getcwd()

    os.chdir(os.path.join(channelRoot, channel))

    with zipfile.ZipFile(os.path.join(genRoot, channel+'.zip'), 'w', zipfile.ZIP_DEFLATED) as pkgFile:

        smalif = __getAllObjFiles('smali', '_____', True)

        [pkgFile.write(os.path.join(x, y)) for (x, y) in smalif]

        resf = __getAllObjFiles('res', '-----', True)
        [pkgFile.write(os.path.join(x, y)) for (x, y) in resf]

        libsf = __getAllObjFiles('libs', '.*\.jar$', True)
        [pkgFile.write(os.path.join(x, y)) for (x, y) in libsf]

        assetsf = __getAllObjFiles('assets', '-----', True)
        [pkgFile.write(os.path.join(x, y)) for (x, y) in assetsf]

        pkgFile.write('AndroidManifest.xml')

    pkgFile.close()
    os.chdir(pwd)
    return 0

if __name__ == '__main__':
    sys.exit(main())

