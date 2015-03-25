/**
 * Created by Administrator on 2015/1/12.
 */
var fs = require('fs-extra');
var fso = require('fs');
var childprocess = require("child_process");
var pathLib = require("path");
var os = require('os');
var async = require('async');
var util = require('util');
var urlLib = require('url');
var _ = require('underscore');
var crypto = require('crypto');
var sqlite3 = require('sqlite3').verbose();

var Logger = require('./lib/logger');
var Project = require('./lib/project');
var Channel = require('./lib/channel');
var env = require('../env.json');
var constants = require('./constants');

function ChameleonTool(){
    this.projectRoot = constants.chameleonHome;
    this.configRoot = pathLib.join(__dirname, '..', 'chameleon');
    fs.ensureDirSync(this.configRoot);
    this.dbPath = pathLib.join(constants.chameleonHome, 'db');
    fs.ensureDirSync(this.dbPath);
    this.dbPath = pathLib.join(this.dbPath, 'chameleon');
}

ChameleonTool.prototype.init = function(callback){
    var dbContext = new sqlite3.Database(this.dbPath);

    dbContext.serialize(function () {
        dbContext.run("create table if not exists 'project' ('id' integer PRIMARY KEY AUTOINCREMENT NOT NULL, 'name' varchar(50), 'landscape' boolean, 'version' varchar(50), 'path' text, 'signConfig' text, 'config' text)", function(err) {
            if(err) {
                Logger.log('Create table project failed.', err);
                return;
            }
            console.log('Table project created.')
        });
        dbContext.run("create table if not exists 'channel' ('id' integer PRIMARY KEY AUTOINCREMENT NOT NULL, 'projectID' int not null, 'channelName' varchar(50), 'config' text, 'desc' varchar(50), 'signConfig' text, 'sdks' text)", function(err) {
            if(err) {
                Logger.log('Create table channel failed.', err);
                return;
            }
            console.log('Table channel created.');
        });
        dbContext.run("create table if not exists 'history' ( 'version' varchar(50) PRIMARY KEY NOT NULL, 'config' text )", function(err) {
            if(err) {
                Logger.log('Create table history failed.', err);
                return;
            }
            console.log('Table history created.');
            callback(null, "success");
        });
    });

    dbContext.close();
}

ChameleonTool.prototype.getAllProjects = function(callback){
    var projects = [],
        dbContext = new sqlite3.Database(this.dbPath);

    dbContext.all("select * from project", function(err, rows){
        if(err) {
            Logger.log("getAllProject() failed.", err);
            callback(err);
            return;
        }
        for(var i=0; i<rows.length; i++){
            var project = new Project();
            var row = rows[i];
            project.id = row.id;
            project.name = row.name;
            project.landscape = row.landscape == 0 ? false : true;
            project.version = row.version;
            project.path = row.path;
            project.signConfig = JSON.parse(row.signConfig);
            project.config = JSON.parse(row.config);
            projects.push(project);
        }
        callback(null, projects);
    });

    dbContext.close();
}

ChameleonTool.prototype.initProject = function(project){
    var instance = new Project();
    return _.extend(instance, project);
}

ChameleonTool.prototype.createEmptyProject = function(){
    return new Project();
}

ChameleonTool.prototype.createProject = function(project, callback){
    var dbContext = new sqlite3.Database(this.dbPath);

    dbContext.run("insert into project (name, landscape, version, path, signConfig, config) values ($name, $landscape, $version, $path, $signConfig, $config)", {
        $name: project.name,
        $landscape: project.landscape,
        $version: project.version,
        $path: project.path,
        $signConfig: JSON.stringify(project.signConfig),
        $config: JSON.stringify(project.config)
    }, function(err){
        if(err){
            callback(err);
            return;
        }
        callback(null, this.lastID);
    });

    dbContext.close();
}

ChameleonTool.prototype.deleteProject = function(id){
    var dbContext = new sqlite3.Database(this.dbPath);

    dbContext.run("delete from project where id=$id", {$id: id});

    dbContext.close();
}

ChameleonTool.prototype.updateProject = function(project, callback){
    var dbContext = new sqlite3.Database(this.dbPath);

    dbContext.run("update project set name=$name, landscape=$landscape, version=$version, path=$path, signConfig=$signConfig, config=$config where id=$id", {
        $id: project.id,
        $name: project.name,
        $landscape: project.landscape,
        $version: project.version,
        $path: project.path,
        $signConfig: JSON.stringify(project.signConfig),
        $config: JSON.stringify(project.config)
    }, function(err){
        if(err){
            callback(err);
            return;
        }
        callback(null, this.changes);
    });

    dbContext.close();
}

ChameleonTool.prototype.getChannelList = function(){
    try {
        var channelList = [];
        var channelInfo = fs.readJsonFileSync(pathLib.join(this.configRoot, 'channelinfo', 'channellist.json'));
        for (var p in channelInfo) {
            var channel = new Channel();

            channel.channelName = p;
            channel.desc = channelInfo[p].name;
            channel.checked = false;
            channel.config.pkgsuffix = channelInfo[p].pkgsuffix;
            if(channelInfo[p].splashscreen == 1) channel.config.splash = '1';
            if(channelInfo[p].splashscreen == 2) channel.config.splash = true;
            channel.config.icon = channelInfo[p].icon == 1 ? {} : undefined;
            channel.config.iconFlag = channelInfo[p].icon;
            channel.config.SDKName = channelInfo[p].sdk;

            channelList.push(channel);
        }
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }

    return channelList;
}

ChameleonTool.prototype.getSDKList = function(){
    try {
        var SDKInfo = fs.readJsonFileSync(pathLib.join(this.configRoot , 'info.json'));
        var SDKList = SDKInfo.channels;
        for (var i = 0; i < SDKList.length; i++) {
            SDKList[i].checked = false;
        }
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }

    return SDKList;
}

ChameleonTool.prototype.getAPKVersionList = function(projectName){
    var folder = pathLib.join(this.projectRoot, projectName, 'build', 'target');
    var versionList = fso.readdirSync(folder);

    return versionList;
}

ChameleonTool.prototype.dirName = function(){
    return this.configRoot;
}

ChameleonTool.prototype.chameleonPath = function(){
    return {
        projectRoot: this.projectRoot,
        configRoot: this.configRoot
    }
}

ChameleonTool.prototype.createProjectDirectory = function(name){
    var root = this.projectRoot;
    try{
        var path = pathLib.join(root, name);
        fs.ensureDirSync(pathLib.join(path, 'cfg'));
        fs.ensureDirSync(pathLib.join(path, 'build', 'target'))
        fs.ensureDirSync(pathLib.join(path, 'output'));
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.createChannelDirectory = function(project, channelName){
    var root = pathLib.join(this.projectRoot, project.name, 'cfg');

    try{
        var path = pathLib.join(root, channelName);
        fs.mkdirpSync(path);
        var path1 = pathLib.join(path, 'res');
        fs.mkdirpSync(path1);
        var path2 = pathLib.join(path, 'build');
        fs.mkdirpSync(path2);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.removeProjectDirectory = function(name){
    var root = this.projectRoot;

    try{
        var path = pathLib.join(root, name);
        fs.removeSync(path);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.removeChannelDirectory = function(project, channelName){
    var root = pathLib.join(this.projectRoot, project.name, 'cfg');

    try{
        var path = pathLib.join(root, channelName);
        fs.removeSync(path);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.generateServerConfig = function(project){
    var result = {};
    var url = urlLib.parse(project.config.payCallbackUrl);
    var host = url.protocol + '//' + url.host;
    var pathName = url.pathname;

    result['_product.json'] = {
        appcb: {
            host: host,
            payCbUrl: pathName
        }
    }
    for(var i=0; i<project.channels.length; i++){
        var channel = project.channels[i];
        var config = {};
        config.sdks = [];
        for(var j=0; j<channel.sdks.length; j++){
            config.sdks.push({
                name: channel.channelName,
                type: 'pay,user',
                cfg: channel.sdks[j].config
            });
        }
        result[channel.channelName + '.json'] = config;
    }

    return result;
}

ChameleonTool.prototype.generateProductForServer = function(project){
    var result = {};
    var url = urlLib.parse(project.config.payCallbackUrl);
    var host = url.protocol + '//' + url.host;
    var pathName = url.pathname;

    result['name'] = project.config.code;
    result['settings'] ={
        appcb: {
            host: host,
            payCbUrl: pathName
        }
    };
    result['channels'] = {};
    for(var i=0; i<project.channels.length; i++){
        var channel = project.channels[i];
        var config = {};
        config.sdks = [];
        for(var j=0; j<channel.sdks.length; j++){
            config.sdks.push({
                name: channel.channelName,
                type: 'pay,user',
                cfg: channel.sdks[j].config
            });
        }
        //config['name'] = channel.channelName;
        result.channels[channel.channelName] = config;
    }

    return result;
}

ChameleonTool.prototype.env = function(){
    return env;
}

ChameleonTool.prototype.encrypt = function(input){
    var pem = fso.readFileSync(pathLib.join(env.keyPath, 'chameleon-server.key.pem'));
    var key = pem.toString('ascii');
    var cipher = crypto.createCipher('aes-256-cbc', key);
    var encrypted = cipher.update(input, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
}

ChameleonTool.prototype.checkJavaHome = function(){
    if(process.env.JAVA_HOME){
        return true;
    }else{
        return false;
    }
}

ChameleonTool.prototype.command = function(command, args, callback, process){
    var spawn = childprocess.spawn,
        message = '';

    console.log(command, args.join(" "));
    var result = spawn(command, args);

    result.stdout.on('data', function(data){
        console.log(data.toString());
        message += data;
        if(process){
            process(data.toString());
        }
    });

    result.stderr.on('data', function(data){
        return callback(data);
    });

    result.on('close', function (code) {
        console.log('child process exited with code ' + code);
        if(code !== 0){
            return callback({message : 'failed.'});

        }

        return callback(null, message);

    });
}

module.exports = ChameleonTool;
