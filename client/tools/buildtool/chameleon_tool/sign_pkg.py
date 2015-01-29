from optparse import OptionParser
import os, shutil, traceback, sys, json, codecs, subprocess

EXEC_ROOT = os.path.dirname(__file__)
ZIPALIGN = os.path.join(EXEC_ROOT, 'zipalign.exe')


if sys.platform == 'win32':
    p = os.getenv('JAVA_HOME')
    if p is None:
        raise RuntimeError('Fail to find env JAVA_HOME')
    else:
        JAR_SIGNER_CMD = os.path.join(p, 'bin', 'jarsigner')
else:
    JAR_SIGNER_CMD = 'jarsigner'


def loadGlobalKeyCfg(projectDir):
    signcfgPath = os.path.join(projectDir, 'sign.json')
    if not os.path.exists(signcfgPath):
        print('can\'t find signcfg'+signcfgPath)
        return None
    with codecs.open(signcfgPath, 'r', 'utf-8') as f: 
        cfg = json.load(f)
        return cfg


def loadChannelKeyCfg(projectDir, channel):
   if channel is None:
       return None
   cfgpath = os.path.join(projectDir, 'channels', channel, 'project.json')
   if not os.path.exists(cfgpath):
       return None
   f = codecs.open(cfgpath, 'r', 'utf-8')
   cfg = json.load(f)
   return cfg.get('signcfg')


def mergeKeyCfg(globalKeyCfg, channelKeyCfg):
    if channelKeyCfg is None:
        return globalKeyCfg
    else:
        return channelKeyCfg


def runKeyCfg(cfg, input, output):
    with open(os.devnull, 'w') as devnull:
        subprocess.check_call([JAR_SIGNER_CMD, '-sigalg', 'SHA1withRSA', '-digestalg', 'SHA1',
            '-keystore', cfg['keystroke'], '-signedjar', output, 
            '-storepass',  cfg['storepass'], '-keypass', cfg['keypass'], input, cfg['alias']], 
            stdout=devnull)


def genCmd(paras):
    return ' '.join([x+' '+y for (x,y) in paras])


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
    os.system(cmd)


def main():
    parser = OptionParser()
    parser.add_option('-c', '--channel', dest='channel', help='the channel to sign')
    parser.add_option('-p', '--packagePath', dest='packagePath', help='path of the package to sign')
    parser.add_option('-o', '--outPackagePath', dest='outPackagePath', help='path of the package to gennerate')
    parser.add_option('-P', '--projectPath', dest='projectRootPath', help='root path of the project')

    if len(sys.argv) < 6:
        parser.print_help()
        return 1

    (options, args) = parser.parse_args()
    projectDir = os.path.join(options.projectRootPath, 'chameleon')

    globalCfg = loadGlobalKeyCfg(projectDir)
    channelCfg = loadChannelKeyCfg(projectDir, options.channel)
    input = options.packagePath
    output = options.outPackagePath
    keycfg = mergeKeyCfg(globalCfg, channelCfg)
    if keycfg:
        print >> sys.stderr, 'use signing file ' + keycfg['keystroke']
        runKeyCfg(keycfg, os.path.relpath(input, os.getcwd()), os.path.relpath(output, os.getcwd()))
    else:
        print >> sys.stderr, 'non config found, escape signing'
        shutil.copy2(input, output)

    pkgAlign(output, output+'___temp____')
    os.remove(output)
    shutil.move(output+'___temp____', output)


    return 0

try:
    ret = main()
except Exception:
    traceback.print_exc()
    ret = 1

sys.exit(ret)


