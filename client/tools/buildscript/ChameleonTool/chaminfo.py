import json

class ChamInfo(object):
    def __init__(self, prjmgr, mgr, env, localdir):
        self.mgr = mgr
        self.prjmgr = prjmgr
        self.env = env
        self.localdir = localdir

