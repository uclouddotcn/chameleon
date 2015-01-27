/**
 * Created by Administrator on 2015/1/12.
 */
var fs = require('fs');
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
    var channelList = [];
    var data = fs.readFileSync('././res/channellist.json');
    var channelInfo = JSON.parse(data);
    for(var p in channelInfo){
        var channel = new Channel();
        channel.channelName = p;
        channel.desc = channelInfo[p].name;
        channel.checked = false;
        channel.config.pkgsuffix = channelInfo[p].pkgsuffix;
        channel.config.splashPath = channelInfo[p].splashscreen == 1 ? '': undefined;

        channelList.push(channel);
    }
    return channelList;
}

ChameleonTool.prototype.getSDKList = function(){
    var data = fs.readFileSync('././res/sdklist.json');
    var SDKInfo = JSON.parse(data);
    var SDKList = SDKInfo.channels;
    for(var i=0; i<SDKList.length; i++){
        SDKList[i].checked = false;
    }

    return SDKList;
}

ChameleonTool.prototype.dirName = function(){
    return __dirname;
}

module.exports = ChameleonTool;