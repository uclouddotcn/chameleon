#!/usr/bin/env python
#encoding utf-8
import os, subprocess, sys

NPM_CMD = 'cnpm'
UNZIP_CMD = 'unzip'
SCRIPT_DIR = os.path.split(os.path.abspath(__file__))[0]
ZIP_FILE = os.path.join(SCRIPT_DIR, 'chameleon.zip')


def npmPluginUnder(path):
    libs = [os.path.join(path, x) for x in os.listdir(path)]
    libs = [x for x in libs if os.path.isdir(x)]
    olddir = os.getcwd()
    for l in libs:
        try:
            os.chdir(l)
            ret = subprocess.call([NPM_CMD, 'install'])
            if ret != 0:
                print >> sys.stderr , 'fail to npm in %s' %l
        finally:
            os.chdir(olddir)

def npmAllPlugins(path):
    storagePluginPath = os.path.join(path, 'lib', 'otherplugins', 'event-storage') 
    kvStorePath = os.path.join(path, 'lib', 'otherplugins', 'kvstore')
    npmPluginUnder(storagePluginPath) 
    npmPluginUnder(kvStorePath) 

def extractPlugin(path):
    ret = subprocess.call([UNZIP_CMD, '-d', path, ZIP_FILE])
    if ret != 0:
        raise RuntimeError('Fail t extract zip file')

def npmApp(path):
    olddir = os.getcwd()
    try:
        os.chdir(path)
        ret = subprocess.call([NPM_CMD, 'install'])
        if ret != 0:
            print >> sys.stderr , 'fail to npm in %s' %l
    finally:
        os.chdir(olddir)

def main():
    if len(sys.argv) < 2:
        raise RuntimeError('use ./install.py installpath, for example "./install.py ~/chameleon"')
    p = sys.argv[1]
    if not os.path.exists(p):
        os.makedirs(p)
    extractPlugin(p)
    npmApp(p)
    npmAllPlugins(p)
    os.makedirs(os.path.join(p, 'log'))
    
if __name__ == '__main__':
    sys.exit(main())

