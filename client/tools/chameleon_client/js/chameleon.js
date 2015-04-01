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
var ADMZip = require('adm-zip');

var Logger = require('./lib/logger');
var Project = require('./lib/project');
var Channel = require('./lib/channel').Channel;
var ChannelMeta = require('./lib/channel').ChannelMeta;
var env = require('../env.json');
var constants = require('./constants');

function ChameleonTool(){
    if (process.env['CHAMELEON_DEV_MODE'] === 'wsk') {
        // wsk's development mode
        this.projectRoot = '../app/projects/';
        this.configRoot = '../../chameleon_build/chameleon/';
    } else {
        // production mode
        this.projectRoot = constants.chameleonHome;
        this.configRoot = pathLib.join(__dirname, '..', 'chameleon');
    }

    this.dbPath = pathLib.join(constants.chameleonHome, 'db');
    fs.ensureDirSync(this.dbPath);
    this.dbPath = pathLib.join(this.dbPath, 'chameleon');
    this.channelMeta = null;
}

ChameleonTool.prototype.init = function(callback){
    var self = this;
    async.series([ function (cb) {
        self.channelMeta = self.initChannelMetas();
        setImmediate(cb);
    }, function (cb) {
        var dbContext = self.newSqllitesContext();
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
                cb(null);
            });
        });
        dbContext.close();
    }], function (err) {
        callback(err);
    });
};


ChameleonTool.prototype.initChannelMetas = function () {
    var channelInfo = fs.readJsonFileSync(
        this.configRoot + '/channelinfo/channellist.json');
    var channelMeta = {};
    for (var p in channelInfo) {
        channelMeta[p] = new ChannelMeta(p, channelInfo[p]);
    }
    return channelMeta;
};

ChameleonTool.prototype.newSqllitesContext = function () {
    return new sqlite3.Database(this.dbPath);
}

ChameleonTool.prototype.getAllProjects = function(callback){
    var projects = [],
        dbContext = this.newSqllitesContext();
    var self = this;

    dbContext.all("select * from project", function(err, rows){
        var projects = [];
        if(err) {
            Logger.log("getAllProject() failed.", err);
            callback(err);
            return;
        }
        for(var i=0; i<rows.length; i++){
            var row = rows[i];
            var project = {
                id : row.id,
                name : row.name,
                landscape : row.landscape == 0 ? false : true,
                version : row.version,
                path : row.path,
                signConfig : JSON.parse(row.signConfig),
                config : JSON.parse(row.config)
            };
            if(project.config.icon){
                project.config.icon = pathLib.join(this.projectRoot, project.config.icon);
            }
            projects.push(project);
        }
        callback(null, projects);
    });

    dbContext.close();
};

ChameleonTool.prototype.getProject = function(id, callback){
    var project = {},
        dbContext = this.newSqllitesContext();
    var self = this;

    dbContext.all("select * from project where id=$id", {$id: id}, function(err, rows){
        var project = {};
        if(err) {
            Logger.log("getProject() failed.", err);
            callback(err);
            return;
        }
        var row = rows[0];
        project = {
            id : row.id,
            name : row.name,
            landscape : row.landscape == 0 ? false : true,
            version : row.version,
            path : row.path,
            signConfig : JSON.parse(row.signConfig),
            config : JSON.parse(row.config)
        };
        if(project.config.icon){
            project.config.icon = pathLib.join(this.projectRoot, project.config.icon);
        }

        callback(null, project);
    });

    dbContext.close();
}

ChameleonTool.prototype.initProject = function(project){
    var instance = new Project(this);
    instance.initFromDBObj(project);
    return instance;
}

ChameleonTool.prototype.createEmptyProject = function(){
    return new Project(this);
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

    if(project.config.icon){
        project.config.icon = project.config.icon.replace(this.projectRoot, '');
        project.config.icon = project.config.icon.split('\\').join('/');
    }

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

            channel._meta = new ChannelMeta(p, channelInfo[p]);
            channel.config.icon = channelInfo[p].icon == 1 ? {} : undefined;
            channel.config.SDKName = channelInfo[p].sdk;
            channel.config.isGlobalConfig = true;

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
            console.log('123' + channel.sdks[j].svrver)
            config.sdks.push({
                name: channel.channelName,
                type: 'pay,user',
                version: channel.sdks[j].svrver,
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

function getOutputProjectObject(project){
    var result = {};
    result.name = project.name;
    result.landscape = project.landscape;
    result.signConfig = project.signConfig;
    result.config = project.config;
    result.channels = [];
    for(var i=0; i<project.channels.length; i++){
        var channel = project.channels[i];
        result.channels.push({
            channelName: channel.channelName,
            config: channel.config,
            signConfig : channel.signConfig,
            sdks: channel.sdks
        });
    }

    return result;
}
ChameleonTool.prototype.getOutputZip = function(project){
    var zip = new ADMZip();

    zip.addLocalFolder(pathLib.join(this.projectRoot, project.name, 'cfg'), 'cfg');
    //zip.addFile('cfg', new Buffer(0), '', 0);
    var output = JSON.stringify(getOutputProjectObject(project));
    output = output.replace(new RegExp(this.projectRoot, 'g'), '');
    zip.addFile('project.json', new Buffer(output));

    return zip;
}

ChameleonTool.prototype.loadConfigFromZip = function(path, callback){
    try{
        var zip = new ADMZip(path);
        var self = this;

        var projectEntry = zip.getEntry('project.json');
        var projectFolderEntry = zip.getEntry('cfg');
        console.log(projectFolderEntry);
        var project = zip.readFile(projectEntry).toString();
        project = JSON.parse(project);
        var projectInstance = this.initProject(project);
        if(fso.existsSync(pathLib.join(self.projectRoot, projectInstance.name))){
            return callback({message: "Folder exists, please delete folder first."});
        }

        this.createProject(projectInstance, function(err, data){
            if(err){
                callback(err);
                return;
            }

            console.log(data);
            projectInstance.id = data;
            var task = [];
            var num = 0;
            for(var i = 0; i < projectInstance.channels.length; i++){
                task.push(function(cb){
                    var channel = projectInstance.channels[num];
                    channel.id = 0;
                    projectInstance.setChannel(data, channel, function(err, id){
                        if(err){
                            return cb(err);
                        }
                        cb(null, id);
                    });
                    num ++;
                });
            }
            async.series.apply(this, [task, function(err){
                if(err){
                    return callback(err);
                }
                self.createProjectDirectory(projectInstance.name);
                console.log(projectFolderEntry);
                if(projectFolderEntry){
                    console.log(111111);
                    zip.extractEntryTo(projectFolderEntry, pathLib.join(self.projectRoot, projectInstance.name, 'cfg'));
                };
                callback(null);
            }]);
        });
    }catch (e){
        callback(e);
    }
}

module.exports = ChameleonTool;
