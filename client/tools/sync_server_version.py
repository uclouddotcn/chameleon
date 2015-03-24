import os, json, codecs

__all__ = ["syncServerVer"]

def ignoreBuildVersion(ver):
    v = ver.split('.')
    return '.'.join(v[0:3])

def syncServerVer(baseDir):
    sdkPluginDir = os.path.join(baseDir, 'server', 'sdkplugins')
    m = collectAllSvrVersion(sdkPluginDir)
    return rollAllInClient(baseDir,m)


def getVersion(f):
    f = codecs.open(os.path.join(f,  'package.json'), 'r', 'utf-8')
    a = json.load(f)
    return ignoreBuildVersion(a["version"])

def collectAllSvrVersion(baseDir):
    folders = [(x, os.path.join(baseDir, x)) for x in os.listdir(baseDir) if not x.startswith('_')]
    folders = [x for x in folders if os.path.isdir(x[1])]
    return dict([(x[0], getVersion(x[1])) for x in folders])

def rollAllInClient(baseDir, m):
    T = os.path.join(baseDir, 'client', 'channels')
    folders = filter(lambda x : os.path.isdir(x[1]), [(x, os.path.join(T, x)) for x in os.listdir(T)])
    for a, b in folders:
        p = os.path.join(b, 'chameleon_build', 'cfg.json')
        if not os.path.isfile(p):
            continue
        newcfg = None
        with codecs.open(p, 'r', 'utf-8') as f:
            v = json.load(f)
            svrver = m.get(a)
            if svrver and svrver != v.get('svrver'):
                v['svrver'] = svrver
                newcfg = v
        if newcfg:
            print('sync new server version ' + newcfg['svrver'] + ' in channel ' + a)
            with codecs.open(p, 'w', 'utf8') as f:
                json.dump(newcfg, f, ensure_ascii=False, indent=4, sort_keys=True)
                #json.dump(f, newcfg)
