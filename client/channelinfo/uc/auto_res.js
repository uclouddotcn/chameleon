#!/usr/bin/env node
var fs = require('fs-extra');
var path = require('path');
var sdkroot = process.argv[2];
var iconpath = getIconInfo(sdkroot);
copyIcon(iconpath);

function getIconInfo(rootPath) {
    var f = fs.readdirSync(rootPath).filter(function (x) {
        return x.substr(0, 3) === ('07-');
    });
    if (f.length !== 1) {
        throw new Error('cant locate 07- folder');
    }
    var folder1 = path.join(rootPath, f[0], '游戏图标角标');
    if (!fs.existsSync(folder1)) {
        throw new Error('cant locate icon folder');
    }
    var fnRegex = /^(\d+)x\d+/;
    var iconNames = fs.readdirSync(folder1);
    var iconinfo = iconNames.map(function (x) {
        var match = fnRegex.exec(x);
        if (match === null) {
            console.log('Fail to recognize ' + x);
            return null;
        }
        switch (parseInt(match[1])) {
            case 48:
                return {
                    res: 'mdpi',
                    pos: 4,
                    p: path.join(folder1, x)
                };
            case 72:
                return {
                    res: 'hdpi',
                    pos: 4,
                    p: path.join(folder1, x)
                };
            case 96:
                return {
                    res: 'xhdpi',
                    pos: 4,
                    p: path.join(folder1, x)
                };
            case 144:
                return {
                    res: 'xxhdpi',
                    pos: 4,
                    p: path.join(folder1, x)
                };
            default:
                return null;
        }
    })
    return iconinfo.filter(function (x) {return x !== null;});
}

function ensureLocalPathExists(pathArray) {
    var localPath = __dirname;
    var currentPath = localPath;
    for (var i in pathArray) {
        currentPath = path.join(currentPath, pathArray[i]);
        if (!fs.existsSync(currentPath)) {
            fs.mkdirSync(currentPath);
        }
    }
    return currentPath;
}

function copyIcon(iconInfo) {
    iconInfo.forEach(function (x) {
        var drawableDir = 'drawable-'+x.res;
        var folder = ensureLocalPathExists(['drawable', drawableDir]);
        var filename = '';
        var prefix = 'icon-decor-';
        switch (x.pos) {
            case 1:
                filename = prefix+'leftup'+'.png';
                break;
            case 2:
                filename = prefix+'rightup'+'.png';
                break;
            case 3:
                filename = prefix+'leftdown'+'.png';
                break;
            case 4:
                filename = prefix+'rightdown'+'.png';
                break;
            default:
                throw new Error('unknown pos: ' + JSON.stringify(x));
        }
        fs.copy(x.p, path.join(folder, filename));
    });
}


