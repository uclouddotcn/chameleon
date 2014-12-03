import os, shutil, sys, codecs

def isNewerThan(a, b):
    return os.path.getmtime(a) > os.path.getmtime(b)

def genRFileForPkgName(genPath, pkgName, newPkgName):
    s = pkgName.split('.')
    d = os.path.join(*([genPath] + s))
    src = os.path.join(d, 'R.java')
    targetD = os.path.join(*([genPath] + newPkgName.split('.')))
    target = os.path.join(targetD, 'R.java')
    if not os.path.exists(src):
        error('Fail to locate old source %s' %src)
    if not os.path.exists(targetD):
        os.makedirs(targetD)
    if not os.path.exists(target) or isNewerThan(src, target):
        with codecs.open(src, 'r', 'utf8') as srcF, codecs.open(target, 'w', 'utf8') as targetF:
            for l in srcF.readlines():
                if l.startswith('package %s;' %pkgName):
                    targetF.write('package %s;\n' %newPkgName)
                else:
                    targetF.write(l)

def main():
    if len(sys.argv) < 4:
        return -1
    gendir = sys.argv[1]
    origPkg = sys.argv[2]
    nowPkg = sys.argv[3]
    nowRFile = gendir + '/' + nowPkg.replace('.', '/') + '/R.java';
    if not os.path.exists(nowRFile):
        print >> sys.stderr, "can't find "+nowRFile
        return -1
    genRFileForPkgName(gendir, nowPkg, origPkg)

sys.exit(main())
