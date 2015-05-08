__author__ = 'Jerry'

import os, sys, shutil, zipfile
from optparse import OptionParser

def merge(dir1, dir2, difflist):
    print('difflist: ', difflist)
    for d in difflist:
        if d.endswith('v4') or d.endswith('.dex') or d.endswith('.arsc'):
            return
        joind1 = os.path.join(dir1, d)
        joind2 = os.path.join(dir2, d)
        if os.path.isdir(joind1):
            shutil.copytree(joind1, joind2)
        else:
            shutil.copy(joind1, joind2)

def diff(dir1, dir2):
    d1 = set(os.listdir(dir1))
    d2 = set(os.listdir(dir2))
    difflist = list(d1.difference(d2))#d1中有 d2中没有的
    merge(dir1, dir2, difflist)

    intersectionlist = list(d1.intersection(d2))#d1 d2 交集
    print('intersectionlist: ', intersectionlist)
    for item in intersectionlist:
        joind1 = os.path.join(dir1, item)
        joind2 = os.path.join(dir2, item)
        #如果是文件 那么就不需要再比较了， 如果是目录，那么应该更深入一层的比较
        if os.path.isdir(joind1) and os.path.isdir(joind1):
            print('item: ', item)
            diff(joind1, joind2)

def init(path1, path2):
    print(path1, path2)
    if os.path.isdir(path1):
        diff(path1, path2)
    if zipfile.is_zipfile(path1):
        print('this is a zip file, now unzip...')
        filename = os.path.splitext(os.path.basename(path1))[0]
        path3 =  os.path.join(os.path.dirname(path1), filename)
        with zipfile.ZipFile(path1) as zipf:
            zipf.extractall(filename)
        diff(path3, path2)
    else:
        print('can not diff file ...')

def main():
    parser = OptionParser()
    parser.add_option('-p', '--path', dest='path', help='path to compare')
    parser.add_option('-c', '--compare', dest='compare', help='compare path to merge')

    (options, values) = parser.parse_args()

    if options.path is None or options.compare is None:
        parser.print_help()
        return

    path1 = options.path
    path2 = options.compare

    init(path1, path2)

    return 0

if __name__ == '__main__':
    sys.exit(main())
