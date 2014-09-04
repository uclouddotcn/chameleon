import codecs, json, md5, os
from string import Template

__all__ = [
    "afterCfgLoaded", # loading the config from 
    "afterCopy", # after copying the source tree 
        ]


def afterCfgLoaded(cfg):
    cfg["appPrivateKey"] = calcPrivateKey(cfg["appKey"], cfg["appSecret"])
    return cfg

def afterCopy(projSetting, cfg):
    manifest = projSetting['AndroidManifest.xml']
    manifest.setMetaData('QHOPENSDK_APPID', cfg['appId'])
    manifest.setMetaData('QHOPENSDK_APPKEY', cfg['appKey'])
    manifest.setMetaData('QHOPENSDK_PRIVATEKEY', cfg['appPrivateKey'])
    manifest.setMetaData('QHOPENSDK_CHANNEL', cfg['channel'])

def calcPrivateKey(appKey, appSecret):
    m = md5.new(appSecret + '#' + appKey)
    return m.hexdigest()

