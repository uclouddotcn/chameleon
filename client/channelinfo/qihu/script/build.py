import hashlib, json, os

def md5(str):
    m = hashlib.md5()
    m.update(str)
    return m.hexdigest()

def preBuild(channel, project):
    jsonf = os.path.join(project, 'cfg', channel, 'config.json')
    #with open(jsonf, 'r') as f:
    #    text = f.read()
    text = open(jsonf, 'r', encoding='utf-8').read()
    if len(text) == 0:
        return False
    config = json.loads(text)
    appSecret = config['channel']['sdks'][0]['config']['appId']
    appKey = config['channel']['sdks'][0]['config']['appKey']

    str = appSecret.strip() + '#' + appKey.strip()
    appPrivateKey = md5(str.encode())
    config['channel']['sdks'][0]['config']['appPrivateKey'] = appPrivateKey

    with open(jsonf, 'w', encoding='utf-8') as f:
        f.write(json.dumps(config))

    return True
