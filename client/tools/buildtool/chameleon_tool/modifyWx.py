import os,sys

BASEDIR = os.path.split(os.path.realpath(__file__))[0]
channleinfo = os.path.join(BASEDIR, '..', '..', '..' ,'channelinfo')

POSITION_HOLDER_PACKAGE = '%package%'

def makeWXEntryActivity(smaliRoot, channel, newPackage):

    channelSmali = os.path.join(channleinfo, channel, 'script', 'WXEntryActivity.smali')
    if not os.path.exists(channelSmali):
        return
    with open(channelSmali, encoding='utf-8') as f:
        smaliStr = f.read()

    oldPackage = POSITION_HOLDER_PACKAGE
    pathArray = newPackage.split('.')
    newPackage = pathArray[0]
    for x in pathArray[1:]:
        newPackage+='/'+x

    smaliStr = smaliStr.replace(oldPackage, newPackage)

    #从newPackage中拿到要创建的文件夹

    smaliPath = os.path.join(smaliRoot, *pathArray)

    smaliPath = os.path.join(smaliPath, 'wxapi')

    #print('this dir will be make：' + smaliPath)

    #判断文件夹是否存在  不存在就创建相关文件夹
    if not os.path.exists(smaliPath):
        os.makedirs(smaliPath)

    #print('make dir : ' + smaliPath)

    smaliFile = os.path.join(smaliPath, 'WXEntryActivity.smali')
    fp = open(smaliFile, mode = 'w')
    fp.write(smaliStr)
    fp.close()