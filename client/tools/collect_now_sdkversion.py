import os, json, codecs, sys

BASEDIR = os.path.split(os.path.realpath(__file__))[0]
CHANNEL_DIR = os.path.join(BASEDIR, '..', 'channels')

def flatten(seq):
    l = []
    for elt in seq:
        t = type(elt)
        if t is tuple or t is list:
            for elt2 in flatten(elt):
                l.append(elt2)
            else:
                l.append(elt)
    return l

def collectClientVersion(f):
    p = os.path.join(f, 'chameleon_build', 'cfg.json')
    with codecs.open(p, 'r', 'utf8') as f:
        obj = json.load(f)
        return (obj['name'], obj['desc'], obj['version'])

def collectVersion():
    ds = [(x, os.path.join(CHANNEL_DIR, x)) for x in os.listdir(CHANNEL_DIR)]
    ds = filter(lambda x : os.path.isdir(x[1]) and os.path.exists(os.path.join(x[1], 'chameleon_build', 'cfg.json')), ds)
    return [collectClientVersion(x[1]) for x in ds]


if __name__ == '__main__':
    stdoutwrapper = codecs.getwriter('utf-8')(sys.stdout)
    stdoutwrapper.write(u'\n'.join([u','.join(x) for x in collectVersion()]))
