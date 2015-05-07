/**
 * Created by Administrator on 2015/1/13.
 */
var sqlite3 = require('sqlite3').verbose();
var fs = require('fs-extra');
var pathLib = require('path');

var Logger = require('./logger');
var Channel = require('./channel').Channel;
var ChameleonError = require('./chameleonError');
var _ = require('underscore');
var constants = require('../constants');

function Project(chtool){
    this.id = 0;
    this.name = '';
    this.landscape = true;
    this.version = '';
    this.path = '';
    this.signConfig ={};
    this.config = {};
    this.channels = [];
    this._chTool = chtool;
    this._projectRoot = null;
    this._projectIconPath = null;
    this._iconCfg = null;
}

Project.prototype.getRootFolder = function () {
    return this._projectRoot;
};

Project.prototype._findSDKMeta = function (sdkName) {
    for (var i = 0; i < this._chTool.sdkList.length; ++i) {
        if (this._chTool.sdkList[i].name === sdkName) {
            return this._chTool.sdkList[i];
        }
    }
    return null;
}

Project.prototype.initFromDBObj = function (projInDB) {
    _.assign(this, projInDB);
    this._projectRoot = pathLib.join(this._chTool.chameleonPath().projectRoot, this.name);
    this._projectIconPath = pathLib.join(this._projectRoot, 'cfg', 'icon.png');
    if (fs.existsSync(this._projectIconPath)) {
        this._iconCfg = this._projectIconPath;
    }
};


Project.prototype.getAllChannels = function(projectID, callback){
    var self = this;
    var dbContext = this._chTool.newSqllitesContext();
    try {
        var sqlText = "select * from channel where projectID=$projectID";
        var params = {
            $projectID: projectID
        };
        dbContext.all(sqlText, params, function(err, rows){
            var result = [];
            var chname = null;
            if(err)
                return callback(err);
            for(var i = 0; i < rows.length; i++){
                chname = rows[i].channelName;
                var metaInfo = self._chTool.channelMeta[chname];
                if (metaInfo === null) {
                    console.error('Fail to find meta info for ' + metaInfo)
                    continue;
                }
                var channel = new Channel(metaInfo);
                channel.id = rows[i].id;
                channel.channelName = rows[i].channelName;
                channel.desc = rows[i].desc;
                channel.signConfig = JSON.parse(rows[i].signConfig);
                channel.config = JSON.parse(rows[i].config);
                channel.sdks = JSON.parse(rows[i].sdks).map(function (sdk) {
                    var meta = self._findSDKMeta(sdk.name);
                    if (!meta) {
                        Logger.log("Fail to find sdk meta: " + sdk.name);
                        return null;
                    }
                    return meta.newFromDB(sdk);
                }).filter(function (s) {
                    return s;
                });
                if(channel.config && channel.config.icon && channel.config.icon.path){
                    channel.config.icon.path = pathLib.join(self._projectRoot, channel.config.icon.path);
                }
                result.push(channel);
            }
            callback(null, result);
        });
    }catch (e){
        Logger.log("Method: getAllChannel() failed.", e);
    }finally{
        dbContext.close();
    }
};

Project.prototype.getChannelResFolder = function (channel) {
    return pathLib.join(this._projectRoot, 'cfg', channel.channelName, 'res');
};

Project.prototype.getChannelFolder = function (channel) {
    return pathLib.join(this._projectRoot, 'cfg', channel.channelName);
};

Project.prototype.setChannel = function(channel, callback){
    var self = this;
    var projectID = this.id;
    var dbContext = this._chTool.newSqllitesContext();
    if(channel.config && channel.config.icon && channel.config.icon.path){
        channel.config.icon.path = channel.config.icon.path.replace(this.projectRoot, '');
        channel.config.icon.path = channel.config.icon.path.split('\\').join('/');
    }
    try {
        var sqlText = "update channel set projectID=$projectID, channelName=$channelName, config=$config, desc=$desc, signConfig=$signConfig, sdks=$sdks where id=$id";
        if(!channel.id || channel.id === 0) {
            sqlText = "insert into channel (projectID, channelName, config, desc, signConfig, sdks) values ($projectID, $channelName, $config, $desc, $signConfig, $sdks)";
        }
        var params = {
            $projectID: projectID,
            $id: channel.id,
            $channelName: channel.channelName,
            $config: JSON.stringify(channel.config),
            $desc: channel.desc,
            $signConfig: JSON.stringify(channel.signConfig),
            $sdks: JSON.stringify(channel.sdks.map(function (sdk) {
                return sdk.toJson();
            }))
        };

        if(!channel.id || channel.id === 0)
            delete params.$id;
        dbContext.run(sqlText, params, function(err){
            if(err)
                throw err;
            if (!channel.id) {
                channel.id = this.lastID;
                self.channels.push(channel);
            }
            self._chTool.createChannelDirectory(self, channel.channelName);
            callback(null, channel);
        });
    }catch (e){
        callback(e);
        Logger.log("Method: setChannel() failed.", e);
    }finally {
        dbContext.close();
    }
};

Object.defineProperty(Project.prototype, "icon", {
    get: function () {
        return this._iconCfg;
    },
    set: function (iconPath) {
        this._iconCfg =  iconPath;
    }
});

Project.prototype._saveIfIconChg = function () {
    if (this._iconCfg && this._iconCfg !== this._projectIconPath) {
        fs.copySync(this._iconCfg, this._projectIconPath);
        this._iconCfg = this._projectIconPath;
    }
};

Project.prototype.save = function (callback) {
    this._saveIfIconChg();

    var dbContext = this._chTool.newSqllitesContext();

    dbContext.run("update project set name=$name, landscape=$landscape, version=$version, path=$path, signConfig=$signConfig, config=$config where id=$id", {
        $id: this.id,
        $name: this.name,
        $landscape: this.landscape,
        $version: this.version,
        $path: this.path,
        $signConfig: JSON.stringify(this.signConfig),
        $config: JSON.stringify(this.config)
    }, function(err){
        if(err){
            callback(err);
            return;
        }
        callback(null, this.changes);
    });

    dbContext.close();
};

Project.prototype.deleteChannel = function(channelID, callback){
    if(channelID<=0){
        return callback(new ChameleonError(null, 'Channel ID is invalid.', 'deleteChannel()'));
    }
    var self = this;
    var dbContext = this._chTool.newSqllitesContext();
    try{
        var sqlText = "delete from channel where id=$id";
        var params = {
            $id: channelID
        };
        dbContext.run(sqlText, params, function(err){
            if(err)
                callback(err);
            for (var i = 0; i < self.channels.length; ++i) {
                if (self.channels[i].id === channelID) {
                    self.channels.splice(i, 1);
                    break;
                }
            }
            if(callback)
                callback(null, this.changes);
        });
    }catch (e){
        Logger.log("Method deleteChannel failed.", e);
        callback(e);
    }finally{
        dbContext.close();
    }
};


module.exports = Project;
