import sys, subprocess, shutil, os

SCRIPT_DIR = os.path.split(os.path.abspath(__file__))[0]
_TEMP_FOLDER = 'chameleon_svr_build'

def version():
    with open('../../version/version.txt', 'r') as f:
        c = f.read().strip('\n')
        return c

def main():
    if os.path.exists(_TEMP_FOLDER):
        shutil.rmtree(_TEMP_FOLDER)
    os.makedirs(_TEMP_FOLDER)
    try:
        os.chdir(os.path.join(SCRIPT_DIR, '..'))
        ret = subprocess.call(['git', 'archive', '--format', 
            'zip', '-o', os.path.join('tools', _TEMP_FOLDER, 'chameleon.zip'), 'HEAD'])
    finally:
        os.chdir(SCRIPT_DIR)
    if ret != 0:
        raise RuntimeError('fail to pack the source tree')
    shutil.copy2('install.py', _TEMP_FOLDER)
    shutil.copy2('../../version/version.txt', _TEMP_FOLDER)
    v = version()
    v = v.replace('.', '_')
    ret = subprocess.call(['zip', '-r', 'chameleon_%s.zip' %v, _TEMP_FOLDER])
    if ret != 0:
        raise RuntimeError('fail to pack the whole tree')
olddir = os.getcwd()
try:
    os.chdir(SCRIPT_DIR)
    main()
finally:
    os.chdir(olddir)

