import filecmp, shutil, os, zipfile

def pkgDiff(prevFolder, newFolder, pkgfilename):
    t = filecmp.dircmp(prevFolder, newFolder)
    addedFiles = extractAddFile(t)
    addedFiles = flattenTheFolders(newFolder, addedFiles)
    deletedFiles = extractDeleteFile(t)
    print deletedFiles
    modFiles = extractDiffFile(t)
    filelistTxt = outputDiff(addedFiles, deletedFiles, modFiles)
    zfs = zipfile.ZipFile(pkgfilename, 'w');
    zfs.writestr('filelist.txt', filelistTxt)
    for f in addedFiles:
        pp = os.path.join(newFolder, f)
        zfs.write(pp, f)
    for f in modFiles:
        pp = os.path.join(newFolder, f)
        if os.path.isdir(pp):
            raise RuntimeError('the modification not expected to be a folder')
        zfs.write(pp, f)

def flattenTheFolders(newFolder, filelists):
    res = []
    for f in filelists:
        pp = os.path.join(newFolder, f)
        if os.path.isfile(pp):
            res.append(f)
        elif os.path.isdir(pp):
            for root, dirs, files in os.walk(pp):
                for f in files:
                    res.append(os.path.relpath(os.path.join(root, f), newFolder))
    return res

def extractAddFile(t):
    lists = t.right_only
    subs = [(key, extractAddFile(s)) for (key, s) in t.subdirs.items()]
    subs = [map(lambda x: key+'/'+x, xs) for (key, xs) in subs]
    return reduce(lambda x, y: x+y, [lists]+subs, [])
        
def extractDeleteFile(t):
    lists = t.left_only
    subs = [(key, extractDeleteFile(s)) for (key, s) in t.subdirs.items()]
    subs = [map(lambda x: key+'/'+x, xs) for (key, xs) in subs]
    return reduce(lambda x, y: x+y, [lists]+subs, [])

def extractDiffFile(t):
    lists = t.diff_files
    subs = [(key, extractDiffFile(s)) for (key, s) in t.subdirs.items()]
    subs = [map(lambda x: key+'/'+x, xs) for (key, xs) in subs]
    return reduce(lambda x, y: x+y, [lists]+subs, [])

def outputDiff(addedFiles, deletedFiles, modFiles):
    if len(addedFiles) == 0 and len(deletedFiles) == 0 and len(modFiles) == 0:
        return ''
    else:
        return '\n'.join(['A '+ f for f in addedFiles]) + '\n' + \
            '\n'.join(['D '+ f for f in deletedFiles]) + '\n' +  \
            '\n'.join(['M '+f for f in modFiles])


pkgDiff('../../build_release/', '../../build/', '../../up.zip')

