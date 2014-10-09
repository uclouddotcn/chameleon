#encoding=utf-8
import os, zipfile, sys

BASEDIR = os.path.split(os.path.abspath(__file__))[0]

class UpgradeEnv(object):
    def __init__(self, basedir):
        self.basedir = basedir

    def upgradeFromZip(self, filename):
        with zipfile.ZipFile(filename) as fs:
            try:
                with fs.open('filelist.txt', 'r') as filelistFs:
                    content = filelistFs.read()
                    addedFiles, deletedFiles, modFiles = parseDiffFile(content)
                    for f in addedFiles:
                        self.addFiles(f, fs)
                    for f in deletedFiles:
                        self.deleteFiles(f)
                    for f in modFiles:
                        self.modFile(f, fs)
            except Exception, e:
                print >> sys.stderr, u'升级失败。。。。'
                raise e

    def addFiles(self, fpath, zipfs):
        zipfs.extract(fpath, self.basedir)
        print '%s is extracted' %fpath

    def deleteFiles(self, fpath):
        pp = os.path.join(self.basedir, fpath)
        print pp
        if os.path.isdir(pp):
            shutil.rmtree(pp)
        elif os.path.isfile(pp):
            os.remove(pp)

    def modFile(self, fpath, zipfs):
        pp = os.path.join(self.basedir, fpath)
        if os.path.isfile(pp):
            os.remove(pp)
            self.addFiles(fpath, zipfs)



def parseDiffFile(content):
    if len(content) == 0:
        return [[], [], []]
    ls = content.split('\n')
    ss = [(l[0],l[2:]) for l in ls if len(l) > 2]
    r = {'A':[], 'D':[], 'M':[]}
    for s in ss:
        if r.has_key(s[0]):
            r[s[0]].append(s[1])
        else:
            r[s[0]] = [s[1]]
    return [r['A'], r['D'], r['M']]

