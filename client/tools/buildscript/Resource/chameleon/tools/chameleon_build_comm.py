import codecs, os, json
from collections import namedtuple

LibInfo = namedtuple('LibInfo', ['name', 'path', 'cfg', 'cfgpath'])

def _getCommCfg():
    with codecs.open(os.path.join('chameleon', 'champroject.json'), 'r', 'utf8') as f:
        jsoncfg = json.load(f)
        return jsoncfg['globalcfg']

def _loadCfg(p):
    with codecs.open(p, 'r', 'utf8') as f:
        cfg = json.load(f)
        return cfg['cfg']

def _mergeCfg(to, f):
    to.update(f)
    if f['blandscape'] == 'true':
        to['horientation'] = 'landscape'
    else:
        to['horientation'] = 'portrait'
    return to

def _loadDependLibInfo(info, globalcfg, libPath):
    p = os.path.join('chameleon', 'sdkcfg', info['cfg'])
    cfg = _loadCfg(p)
    return LibInfo(info['name'], os.path.join(libPath, info['name']), 
            _mergeCfg(cfg, globalcfg), p)

def getDependLibs(channel):
    globalCfg = _getCommCfg()
    channelPath = os.path.join('chameleon', 'channels', channel)
    prjJsonPath = os.path.join(channelPath, 'project.json')
    libPath = os.path.join('chameleon', 'libs')
    with codecs.open(prjJsonPath, 'r', 'utf8') as f:
        prjJson = json.load(f)
        dependLibs = prjJson['dependLibs']
        return [_loadDependLibInfo(item, globalCfg, libPath) for item in dependLibs]



