__author__ = 'Jerry'

#!/usr/bin/env python
import zipfile, sys, os, shutil
from optparse import OptionParser

BASEDIR = os.path.split(os.path.realpath(__file__))[0]
APK_TOOL_PATH = os.path.join(BASEDIR, 'apktool')
DIFF_TOOL_PATH = os.path.join(BASEDIR, 'diff_file.py')

unzipPath = 'unzipPath'
apktoolPath = 'apktoolPath'

def unzipFiles(zf, dir):
    with zipfile.ZipFile(zf) as zipf:
        zipf.extractall(dir)

def getAPK(path):
    list = os.listdir(path)
    for f in list:
        if f.endswith('.apk'):
            return os.path.join(path, f)

def genCmd(paras):
    cmd = ' '.join([x+' '+y for (x,y) in paras])
    print(cmd)
    return os.system(cmd)

def buildChannel(channel, channelPath, output):
    print('*****************  ant build  *****************')
    os.chdir(channelPath)
    print(os.getcwd())
    os.system('ant clean')
    os.system('ant release')

    os.chdir(os.path.join(channelPath, 'bin'))
    print(os.getcwd())
    apkfile = getAPK(os.getcwd())
    print(apkfile)

    print('*****************  apktool build  *****************')
    apktoolParas = []
    apktoolParas.append((APK_TOOL_PATH, ''))
    apktoolParas.append(('d', apkfile))
    apktoolParas.append(('-o', apktoolPath))
    apktoolParas.append(('-f', ''))
    genCmd(apktoolParas)

    print('*****************  diff  *****************')
    difftoolParas = []
    difftoolParas.append(('python', DIFF_TOOL_PATH))
    difftoolParas.append(('-p', apkfile))
    difftoolParas.append(('-c', apktoolPath))
    genCmd(difftoolParas)

    print('*****************  zip channel  *****************')
    os.chdir(os.path.join(os.getcwd(), apktoolPath))
    print(os.getcwd())
    list = os.listdir(os.getcwd())
    print('filelist: ', list)
    zipf = zipfile.ZipFile(channel + '.zip', 'w', zipfile.ZIP_DEFLATED)
    for f in list:
        if f == channel + '.zip' or f == 'original' or f.endswith('.yml'):
            print('------', f)
            continue
        if os.path.isdir(os.path.join(os.getcwd(), f)):
            for dirpath, dirnames, filenames in os.walk(f):
                for filename in filenames:
                    if filename == 'public.xml':
                        print('------', os.path.join(dirpath, filename))
                    else:
                        print('++++++', os.path.join(dirpath, filename))
                        zipf.write(os.path.join(dirpath, filename))
        else:
            print('++++++', f)
            zipf.write(f)
    zipf.close()

    print('copy')
    infile = os.path.join(channelPath, 'bin', apktoolPath, channel + '.zip')
    shutil.copy(infile, output)
    os.remove(infile)

def main():
    parser = OptionParser()
    parser.add_option('-c', '--channel', dest='channel', help='channel name, e.g. xiaomi')
    parser.add_option('-r', '--channelRoot', dest='channelRoot', help='Root directory of the channels')
    parser.add_option('-g', '--generatePath', dest='generatePath', help='the path where the packed\
                            files of the channel is stored.')

    (options, values) = parser.parse_args()

    if options.channel is None or options.channelRoot is None or options.generatePath is None:
        parser.print_help()
        return

    channel = options.channel
    channelRoot = options.channelRoot
    output = options.generatePath

    channelPath = os.path.join(channelRoot, channel)
    print(channelPath, output)

    pwd = os.getcwd()

    os.chdir(channelPath)
    os.chdir(output)

    buildChannel(channel, channelPath, output)

    os.chdir(pwd)

    return 0

if __name__ == '__main__':
    sys.exit(main())

