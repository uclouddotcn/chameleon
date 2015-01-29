__author__ = 'Peter Zhu'

#!/usr/bin/env python
import subprocess, sys, os, re, json, codecs
import shutil
import xml.dom.minidom as dom
from chameleon_gen import *
from optparse import OptionParser
import json


def makeCfg(channelcfgroot, channel):
    icfg = dict([])
    jcfg = json.loads('{"projectName":"sanguofire","landscape":true,"path":"","signConfig":{"keystore":"mykeystore","storepass":"a1988106","keypass":"1988106","alias":"com.xianyugame.hxsg"},"channel":{"channelName":"xiaomi","packageName":"com.xianyugame.sanguofire","sdks":[{"name":"xiaomi","type":"pay,user","config":{"appId":"2882303761517282217","appKey":"5641728296217"}}]}}')
    jcfg['channel']['channelName'] = channel
    jcfg['channel']['sdks'][0]['name'] = channel
    if os.path.exists(os.path.join(channelcfgroot, channel)):
        shutil.rmtree(os.path.join(channelcfgroot, channel))


    os.mkdir(os.path.join(channelcfgroot, channel))

    with codecs.open(os.path.join(channelcfgroot, channel, 'projectcfg.json'), "w", "utf-8") as f:
        json.dump(jcfg, f)
        f.close()


def main():
    parser = OptionParser()

    parser.add_option('-f', '--function', dest='function', help='compile channel or build the package, channel/package')
    parser.add_option('-r', '--channelRoot', dest='channelRoot', help='Root directory of the channels')
    parser.add_option('-g', '--generatePath', dest='generatePath', help='the path where the packed\
                            files of the channel is stored.')
    parser.add_option('-c', '--cfgRoot', dest='cfgRoot', help='the root path of the configure files.')

    (options, values) = parser.parse_args()

    channels = os.listdir(options.channelRoot)
    print (channels)

    if options.function == 'channel':
        for channel in channels:
            if channel.startswith('.'):
                continue
            os.system("build_channel.py -c " + channel + " -r " + options.channelRoot + " -g " + options.generatePath)
            makeCfg(options.cfgRoot, channel)
    else:
        for zipf in channels:
            channel = zipf.split('.')[0]
            os.system('build_package.py -c ' + channel + ' -r ' + options.channelRoot + ' -g ' + channel + '.apk -P '+options.generatePath+' -d false -a true')

sys.exit(main())
