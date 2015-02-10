/**
 * Created by Administrator on 2015/1/12.
 */
var fs = require('fs-extra');
var childprocess = require("child_process");
var pathLib = require("path");
var os = require('os');
var async = require('async');
var xml2js = require('xml2js');
var util = require('util');
var  AdmZip = require('adm-zip');
var urlLib = require('url');
var _ = require('underscore');
var sqlite3 = require('sqlite3').verbose();

var Logger = require('./lib/logger');
var Project = require('./lib/project');
var Channel = require('./lib/channel');

function ChameleonTool(){
    this.projectRoot = '../app/projects/';
    this.configRoot = '../app/chameleon/';
}

ChameleonTool.prototype.init = function(callback){
    var dbContext = new sqlite3.Database('data/chameleon');
    dbContext.serialize(function () {
        dbContext.run("create table if not exists 'project' ('id' integer PRIMARY KEY AUTOINCREMENT NOT NULL, 'name' varchar(50), 'landscape' boolean, 'version' varchar(50), 'path' text, 'signConfig' text, 'config' text)", function(err) {
            if(err) {
                Logger.log('Create table project failed.', err);
                return;
            }
            console.log('Table project created.')
        });
        dbContext.run("create table if not exists 'channel' ( 'id' integer PRIMARY KEY AUTOINCREMENT NOT NULL, 'projectID' int not null, 'channelName' varchar(50), 'config' text, 'desc' varchar(50), 'signConfig' text, 'sdks' text)", function(err) {
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
            console.log('Table history created..');
            callback(null, "success");
        });
    });
    dbContext.close();
}

ChameleonTool.prototype.getAllProjects = function(callback){
    var projects = [];
    var dbContext = new sqlite3.Database('data/chameleon');
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
            project.landscape = row.landscape;
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
    var dbContext = new sqlite3.Database('data/chameleon');
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
    var dbContext = new sqlite3.Database('data/chameleon');
    dbContext.run("delete from project where id=$id", {$id: id});
    dbContext.close();
}

ChameleonTool.prototype.updateProject = function(project, callback){
    var dbContext = new sqlite3.Database('data/chameleon');
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
        var channelInfo = fs.readJsonFileSync(this.configRoot + 'channelinfo/channellist.json');
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
        var SDKInfo = fs.readJsonFileSync(this.configRoot + 'info.json');
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

ChameleonTool.prototype.dirName = function(){
    return __dirname;
}

ChameleonTool.prototype.createProjectDirectory = function(name){
    var root = this.projectRoot;
    try{
        var path = root + name;
        fs.mkdirpSync(path);
        path += '/cfg';
        fs.mkdirpSync(path);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.createChannelDirectory = function(project, channelName){
    var root = this.projectRoot + project.name + '/cfg/';
    try{
        var path = root + channelName;
        fs.mkdirpSync(path);
        path1 = path + '/res/splash';
        path2 = path + '/res/drawable';
        fs.mkdirpSync(path1);
        fs.mkdirpSync(path2);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.removeProjectDirectory = function(name){
    var root = this.projectRoot;
    try{
        var path = root + name;
        fs.removeSync(path);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.removeChannelDirectory = function(project, channelName){
    var root = this.projectRoot + project.name + '/cfg/';
    try{
        var path = root + channelName;
        fs.removeSync(path);
    }catch (e){
        console.log(e);
        Logger.log(e.message, e);
    }
}

ChameleonTool.prototype.command = function(command, args, callback, process){
    var spawn = childprocess.spawn;
    var result = spawn(command, args);
    var message = '';
    console.log(command, args.join(" "));
    result.stdout.on('data', function(data){
        console.log(data.toString());
        message += data;
        if(process){
            process(data.toString());
        }
    });
    result.stderr.on('data', function(data){
        callback(data);
        return ;
    });
    result.on('close', function (code) {
        console.log('child process exited with code ' + code);
        callback(null, message);
        return ;
    });
}

module.exports = ChameleonTool;
