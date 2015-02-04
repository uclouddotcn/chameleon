import os, json, shutil

MSDK_DEBUG = """[dev.g domains start]
MSDK_URL=http://msdktest.qq.com
[dev.g domains end]
"""

MSDK_RELEASE = """[dev.g domains start]
MSDK_URL=http://msdk.qq.com
[dev.g domains end]
"""

def preBuild(binfo, cfg):
    print cfg
    p = os.path.join(binfo.buildpath)
    realp = os.path.join(binfo.prjpath, p, 'assets')
    if os.path.exists(realp):
        shutil.rmtree(realp)
    try:
        os.makedirs(realp)
    except:
        pass
    print cfg
    if cfg.get('btest'):
        with open(os.path.join(realp, 'msdkconfig.ini'), 'w') as f:
            f.write(MSDK_DEBUG)
    else:
        with open(os.path.join(realp, 'msdkconfig.ini'), 'w') as f:
            f.write(MSDK_RELEASE)
    binfo.assets.append(p)


