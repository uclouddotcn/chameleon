import os, json, shutil

MSDK_DEBUG = """[dev.g domains start]
MSDK_URL=http://opensdktest.tencent.com
[dev.g domains end]
"""

MSDK_RELEASE = """[dev.g domains start]
MSDK_URL=http://opensdk.tencent.com
[dev.g domains end]
"""

def preBuild(channel, project):
    jsonf = os.path.join(project, 'cfg', channel, 'config.json')
    realp = os.path.join(project, 'build', channel, 'assets')
    if os.path.exists(realp):
        shutil.rmtree(realp)
    try:
        os.makedirs(realp)
    except:
        pass
    text = open(jsonf, 'r', encoding='utf-8').read()
    if len(text) == 0:
        return False

    config = json.loads(text)

    if config['channel']['sdks'][0]['config']['test']:
        with open(os.path.join(realp, 'msdkconfig.ini'), 'w') as f:
            f.write(MSDK_DEBUG)
        return True
    else:
        with open(os.path.join(realp, 'msdkconfig.ini'), 'w') as f:
            f.write(MSDK_RELEASE)
        return True