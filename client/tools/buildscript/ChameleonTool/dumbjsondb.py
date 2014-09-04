import codecs, json, os
from  tmpfile import TempFile

class DictWrapper(dict):
    def __init__(self, **d):
        for k,v in d.items():
            self[k] = v
    def __getattr__(self, name):
        return self.get(name, None)
    def __setattr__(self, name, value):
        self[name] = value

def _makeNamedObj(dictObj):
    t = DictWrapper(**dictObj) 
    return t

def loadJsonObj(f):
    with codecs.open(f, 'r', 'utf8') as fo:
        obj = json.load(fo, object_hook=_makeNamedObj)
    return obj

def dumpJsonObjToFile(obj, fo):
    fo.write(json.dumps(obj, ensure_ascii=False, indent=4).encode('utf8'))

def dumpJsonObj(obj, f):
    with TempFile(f) as fo:
        dumpJsonObjToFile(obj, fo)

class DumbJsonDB(object):
    def __init__(self, localfile):
        self.localfile = localfile
        if os.path.exists(self.localfile):
            with codecs.open(localfile, 'r', 'utf8') as fo:
                self._cfg = json.load(fo, object_hook=_makeNamedObj)
        else:
            self._cfg = {}

    def get(self, key):
        return self._cfg.get(key, None)

    def set(self, key, value):
        self._cfg[key] = value
        self._dump()

    def batchUpdate(self, cfg):
        self._cfg.update(cfg)
        self._dump()

    @property
    def cfg(self):
        return self._cfg

    def _dump(self):
        dumpJsonObj(self._cfg, self.localfile)
        

