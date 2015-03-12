import codecs, os, json
from collections import namedtuple

LibInfo = namedtuple('LibInfo', ['name', 'path', 'cfg', 'type'])
GLOBALCFGNAME = "config.json"


def getCommCfg(projChannelPath):
    with codecs.open(os.path.join(projChannelPath, GLOBALCFGNAME), 'r', 'utf8') as f:
        jsoncfg = json.load(f)

        return jsoncfg


def _loadCfg(p):
    with codecs.open(p, 'r', 'utf8') as f:
        cfg = json.load(f)
        return cfg['cfg']


def _mergeCfg(to, f):
    to.update(f)
    if f['blandscape']:
        to['horientation'] = 'landscape'
    else:
        to['horientation'] = 'portrait'
    return to


def _loadDependLibInfo(globalcfg, info, libPath):
    if str(globalcfg['landscape']).casefold() in ['true', '1']:
        info["config"]['orientation'] = "landscape"
    else:
        info["config"]['orientation'] = "portrait"
    info["config"]["packageId"] = globalcfg["channel"]["packageName"]
    cfg = info["config"]
    return LibInfo(info['name'], os.path.join(libPath, info['name']), 
            cfg, info['type'])


def getDependLibs(channelPath, globalcfg):
        dependLibs = globalcfg["channel"]['sdks']
        return [_loadDependLibInfo(globalcfg, item, channelPath) for item in dependLibs]



