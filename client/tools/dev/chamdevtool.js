#!/usr/bin/env node
var pathLib = require('path');
var fs = require('fs-extra');

var AddChannel = require('./libs/addchannel')

function loadEnv() {
    var env = {};
    env.resourceFolder = pathLib.join(__dirname, 'resource');
    env.baseFolder = pathLib.join(__dirname, '..', '..');
    var versionTxt =  pathLib.join(__dirname, '..', '..', 'version', 'version.txt');
    var content = fs.readFileSync(versionTxt, 'utf-8').replace(/\r*\n$/, '');
    env.chamver = content;
    return env;
}

function makeCmd(env) {
    var res = {};
    res['addch'] = new AddChannel(env);
    return res;
}

function main() {
    var env = loadEnv();
    var cmds = makeCmd(env);
    var cmd = process.argv[2];
    if (typeof cmd != 'string') {
        console.log('可用的命令有: ' + Object.keys(cmds).join(','));
        return;
    }
    if (cmds[cmd] === undefined) {
        console.log('未知的命令 ' + cmd + '. 可用的命令有: ' + Object.keys(cmds).join(','));
        return;
    }
    cmds[cmd].doit(process.argv.slice(3), function (err) {
        if (err) {
            console.log('执行命令失败: ' + err.message);
            return;
        }
        console.log('执行命令成功');
    })
}

main();


