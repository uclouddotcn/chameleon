import os, json, codecs

BASEDIR = os.path.split(os.path.realpath(__file__))[0]
CHANNEL_DIR = os.path.join(BASEDIR, '..', 'channels')

def collectClientVersion(f):
    p = os.path.join(f, 'chameleon_build', 'cfg.json')
    with codecs.open(p, 'r', 'utf8') as f:
        obj = json.load(f)
        return obj['version']

def collectVersion():
    ds = [(x, os.path.join(CHANNEL_DIR, x)) for x in os.listdir(CHANNEL_DIR)]
    ds = filter(lambda x : os.path.isdir(x[1]) and os.path.exists(os.path.join(x[1], 'chameleon_build', 'cfg.json')), ds)
    return [(x[0], collectClientVersion(x[1])) for x in ds]


if __name__ == '__main__':
    print '\n'.join([x[0]+','+x[1] for x in collectVersion()])
