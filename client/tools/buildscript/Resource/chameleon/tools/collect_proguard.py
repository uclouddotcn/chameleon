import os, sys
from chameleon_build_comm import *

def collectProguard(libPath):
    fpath = os.path.join(libPath, 'proguard.txt')
    if not os.path.exists(fpath):
        return ''
    with open(fpath, 'r') as f:
        return f.read()

def collectAllProguards(channel):
     libs = getDependLibs(channel, getCommCfg())
     c = '\n'.join([collectProguard(l.path) for l in libs])
     return c

def main():
    if len(sys.argv) < 3:
        return -1
    channel = sys.argv[1]
    target = sys.argv[2]
    c = collectAllProguards(channel)
    with open(target, 'w') as f:
        f.write(c)
    return 0


if __name__ == '__main__':
    sys.exit(main())

