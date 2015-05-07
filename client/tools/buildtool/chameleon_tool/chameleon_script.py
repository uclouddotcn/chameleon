__author__ = 'Jerry'
import os, imp

def preBuild(channel, project, client):
    path = os.path.join(client, 'channelinfo', channel)
    if not os.path.exists(os.path.join(path, 'script.py')):
        pass
    else:
        fp, pathname, description = imp.find_module('script', [path])
        try:
            m = imp.load_module('build', fp, pathname, description)
            f = m.__dict__.get('preBuild')
            if f:
                result = f(channel, project)
                return result
        finally:
            # Since we may exit via an exception, close fp explicitly.
            if fp:
                fp.close()