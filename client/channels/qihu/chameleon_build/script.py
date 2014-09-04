import codecs, json, md5, os
from string import Template

__all__ = [
    "afterCfgLoaded", # loading the config from 
    "afterCopy", # after copying the source tree 
        ]


def afterCfgLoaded(cfg):
    cfg["sappPrivateKey"] = calcPrivateKey(cfg["sappKey"], cfg["happSecret"])
    return cfg

def calcPrivateKey(appKey, appSecret):
    m = md5.new(appSecret + '#' + appKey)
    return m.hexdigest()

