import json, sys, traceback, os, codecs

def checkIfWrapPackage(argv):
    targetChannel = argv[0]
    channelFolder = os.path.join('chameleon', 'channels', targetChannel)
    with codecs.open(os.path.join(channelFolder, 'prjspecial.json'), 'r', 'utf8') as f:
        t = json.load(f)
        a = t.get('enableWrapPackage', 1)
        print a
    return a


def main():
    try:
        return checkIfWrapPackage(sys.argv[1:])
    except:
        exc_type, exc_value, exc_traceback = sys.exc_info()
        traceback.print_exception(exc_type, exc_value, exc_traceback, 
                limit=10, file=sys.stdout)
        return -1



if __name__ == '__main__':
    sys.exit(main())

