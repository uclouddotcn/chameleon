from optparse import OptionParser
import os, shutil, traceback, sys, json, codecs, subprocess

_PROJECT_DIR = os.path.join(os.path.split(__file__)[0], '../').decode(sys.getfilesystemencoding())
_ANDROID_PROJECT_DIR = os.path.join(os.path.split(__file__)[0], '../../').decode(sys.getfilesystemencoding())

if sys.platform == 'win32':
    p = os.getenv('JAVA_HOME')
    if p is None:
        raise RuntimeError('Fail to find env JAVA_HOME')
    else:
        JAR_SIGNER_CMD = os.path.join(p, 'bin', 'jarsigner')
else:
    JAR_SIGNER_CMD = 'jarsigner'
def loadGlobalKeyCfg():
    signcfgPath = os.path.join(_PROJECT_DIR, 'sign.json')
    if not os.path.exists(signcfgPath):
        return None
    with codecs.open(signcfgPath, 'r', 'utf-8') as f: 
        cfg = json.load(f)
        return cfg

def loadChannelKeyCfg(channel):
   if channel is None:
       return None
   cfgpath = os.path.join(_PROJECT_DIR, 'channels', channel, 'project.json')
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
     

def main():
    parser = OptionParser()
    parser.add_option('-c', '--channel', dest='channel', help='the channel to sign')
    (options, args) = parser.parse_args()
    if len(args) < 2:
        parser.print_help()
        return -1
    globalCfg = loadGlobalKeyCfg()
    channelCfg = loadChannelKeyCfg(options.channel)
    input = args[0]
    output = args[1]
    keycfg =  mergeKeyCfg(globalCfg, channelCfg) 
    if keycfg:
        print >> sys.stderr, 'use signing file ' + keycfg['keystroke']
        runKeyCfg(keycfg, os.path.relpath(input, os.getcwd()), 
			os.path.relpath(output, os.getcwd()))
    else:
        print >> sys.stderr, 'non config found, escape signing'
        shutil.copy2(input, output)
    return 0    

try:
    ret = main()
except Exception:
    traceback.print_exc()
    ret = 1

sys.exit(ret)


