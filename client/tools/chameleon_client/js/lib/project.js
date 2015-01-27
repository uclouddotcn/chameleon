/**
 * Created by Administrator on 2015/1/13.
 */
var sqlite3 = require('sqlite3').verbose();

var Logger = require('./logger');
var Channel = require('./channel');
var ChameleonError = require('./chameleonError');

function Project(){
    this.id = 0;
    this.name = '';
    this.landscape = false;
    this.version = '';
    this.path = '';
    this.signConfig ={};
    this.config = {};
    this.channels = [];
}

Project.prototype.getAllChannels = function(projectID, callback){
    var dbContext = new sqlite3.Database('data/chameleon');
    try {
        var result = [];
        var sqlText = "select * from channel where projectID=$projectID";
        var params = {
            $projectID: projectID
        }
        dbContext.all(sqlText, params, function(err, rows){
            if(err) throw err;
            for(var i = 0; i < rows.length; i++){
                var channel = new Channel();
                channel.id = rows[i].id;
                channel.channelName = rows[i].channelName;
                channel.desc = rows[i].desc;
                channel.signConfig = JSON.parse(rows[i].signConfig);
                channel.config = JSON.parse(rows[i].config);
                channel.sdks = JSON.parse(rows[i].sdks);
                result.push(channel);
            }
            callback(null, result);
        });
    }catch (e){
        Logger.log("Method: getAllChannel() failed.", e);
    }finally{
        dbContext.close();
    }
}

Project.prototype.setChannel = function(projectID, channel, callback){
    if(projectID<=0){
        callback(new ChameleonError(null, 'Project ID is invalid.', 'setChannel()'));
    }
    var dbContext = new sqlite3.Database('data/chameleon');
    try {
        var sqlText = "update channel set projectID=$projectID, channelName=$channelName, config=$config, desc=$desc, signConfig=$signConfig, sdks=$sdks where id=$id";
        if(channel.id == 0) sqlText = "insert into channel (projectID, channelName, config, desc, signConfig, sdks) values ($projectID, $channelName, $config, $desc, $signConfig, $sdks)";
        var params = {
            $projectID: projectID,
            $id: channel.id,
            $channelName: channel.channelName,
            $config: JSON.stringify(channel.config),
            $desc: channel.desc,
            $signConfig: JSON.stringify(channel.signConfig),
            $sdks: JSON.stringify(channel.sdks)
        }
        if(channel.id ==0) delete params.$id;
        dbContext.run(sqlText, params, function(err){
            if(err) throw err;
            callback(null, this.lastID||this.changes);
        });
    }catch (e){
        Logger.log("Method: setChannel() failed.", e);
    }finally {
        dbContext.close();
    }
}

Project.prototype.deleteChannel = function(channelID, callback){
    if(channelID<=0){
        callback(new ChameleonError(null, 'Channel ID is invalid.', 'deleteChannel()'));
    }
    var dbContext = new sqlite3.Database('data/chameleon');
    try{
        var sqlText = "delete from channel where id=$id";
        var params = {
            $id: channelID
        }
        dbContext.run(sqlText, params, function(err){
            if(err) throw  err;
            if(callback) callback(null, this.changes);
        });
    }catch (e){
        Logger.log("Method deleteChannel failed.", e);
    }finally{
        dbContext.close();
    }
}

module.exports = Project;