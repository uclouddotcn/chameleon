var pathLib = require('path');
var fs = require('fs-extra');
var optimist = require('optimist');


function AddChannel(env) {
    this.prjtemplate = pathLib.join(env.resourceFolder, 'prjtemplate');
    this.env = env;
    this.demands = ['channel', 'desc', 'version'];
}

AddChannel.prototype.doit = function (argv, cb) {
    if (argv.length != 3) {
        setImmediate(cb, new Error('addchannel需要三个参数: channel desc version'));
        return;
    }
    var self = this;
    var args = {
        channel: argv[0],
        desc: argv[1],
        version: argv[2],
        chamver: self.env.chamver
    }
    var channelDir = pathLib.join(self.env.baseFolder, 'channels', args.channel);
    if (fs.existsSync(channelDir)) {
        setImmediate(cb, new Error('该SDK的文件夹已经存在: ' + args.channels));
        return;
    }
    fs.copy(self.prjtemplate, channelDir, function (err) {
        if (err) {
            cb(new Error('拷贝文件出错'));
            return;
        }
        try {
            var amfile = 'AndroidManifest.xml';
            var amSrcPath = pathLib.join(self.prjtemplate, amfile);
            var amTargetPath = pathLib.join(channelDir, amfile);
            replaceTemplateFile(amSrcPath, amTargetPath, args);

            var cfgJsonSrc = pathLib.join(self.prjtemplate, 'chameleon_build', 'cfg.json');
            var cfgJsonTarget = 
                pathLib.join(channelDir, 'chameleon_build', 'cfg.json');
            replaceTemplateFile(cfgJsonSrc, cfgJsonTarget, args);
        } catch (e) {
            cb(e);
            return;
        }
        var srcDir = pathLib.join(channelDir, 'src', 'prj', 'chameleon', args.channel);
        var filename = args.channel[0].toUpperCase() + 
            args.channel.substr(1) + 'ChannelApi.java';
        fs.ensureFile(pathLib.join(srcDir, filename), function (err) {
            if (err) {
                cb(new Error('无法创建: ' + srcDir + ' '+ err.message));
                return;
            }
            cb(null);
        });
    
    });
};

function replaceTemplateFile(src, target, args) {
    var content = fs.readFileSync(src, 'utf-8');
    var newContent = replaceTemplate(content, args);
    fs.writeFileSync(target, newContent, 'utf-8');
}

function replaceTemplate (content, args) {
    return content.replace(/\${(.+)}\$/g, function (k, x) {
        if (args[x] === undefined) {
            throw new Error('未知的替换项: ' + x);
        }
        return args[x];
    });
}

module.exports = AddChannel;


