/**
 * Created by Administrator on 2014/12/18.
 */
var _ = require('underscore');
var async = require('async');
var WError = require('verror').WError;
var RedisClient = require('./redisClient');
var constant = require('./constant');

module.exports.createConfigStore=function(options,logger){
    return new ConfigStore(options,logger);
}

function ConfigStore(options, logger){
    this.client = RedisClient.createClient(this,options,logger);
    this.logger = logger;
    this.ttl = options.ttl||-1;
    this.keySettings = {
        prefix: constant.PROJECTNAME + ':'
    }
}

function redisKey(self, field, key){
    return self.keySettings.prefix + field + '-' + key;
}

function _setProductChannel(self, productID, channelName, channel, callback){
    self.client.hset(redisKey(self, 'channel', channelName), productID, JSON.stringify(channel), callback);
}

function _getProductChannel(self, productID, channelList, callback){
    var len = channelList.length,
        taskList = [],
        result={};

    for (var i = 0; i < len; i ++){
        var num = i;
        taskList.push(
            function(cb){
                self.client.hget(redisKey(self, 'channel', channelList[num]), productID, function(err, data){
                    cb(null, JSON.parse(data));
                });
            }
        );
    }

    async.parallel(taskList, function(err, array){
        if(err){
            callback(err);
            return;
        }
        for(var i = 0; i < array.length; i ++){
            result[channelList[i]] = array[i];
        }
        callback(null, result);
    });
}

ConfigStore.prototype.setProductChannel = function(productID, channelName, channel, callback){
    var self = this;
    _setProductChannel(self, productID, channelName, channel, function(err){
        if(err){
            callback(new WError(err, "Set product channel failed."));
            return;
        }
    });
    self.client.get(redisKey(self, 'product', productID), function(err, data){
        if(err){
            callback(new WError(err, "Get product failed."));
            return;
        }
        var product = JSON.parse(data),
            index = product.channel;
        index.push(channelName);
        product.channel = _.uniq(index);
        self.client.set(redisKey(self, 'product', productID), JSON.stringify(product), function(err, res){
            if(err){
                callback(new WError(err, "Set product failed."));
                return;
            }
            callback(null, res);
        });
    });
}

ConfigStore.prototype.getProductChannel = function(productID, channelList, callback){
    _getProductChannel(this, productID, channelList, callback);
}

ConfigStore.prototype.setProduct = function(product, callback){
    var self = this,
        productID,
        channel,
        index,
        taskList = [];

    if(product.productID){
        productID = product.productID;
    } else{
        throw  new WError("Product ID is not existed.");
    }

    if(product.channel){
        channel = product.channel;
    }else{
        throw  new WError("No channel exists for this product.");
    }

    if (!self.client) {
        throw new WError("The config store is not init");
    }
    this.logger.trace({ productID: productID }, 'add product');

    index = [];
    for(var property in channel) {
        index.push(property);
        taskList.push(
            function (cb) {
                _setProductChannel(self, productID, property, channel[property], function (err, res) {
                    cb(null, res || "No change.");
                });
            });
    }

    product.channel = index;
    taskList.push(
        function(cb){
            self.client.set(redisKey(self, 'product', productID), JSON.stringify(product), function(err, res){
                cb(null, res||"No change.");
            });
        });
    async.parallel(taskList, function(err){
        if(err){
            callback(new WError(err, "Set product failed."));
            return;
        }
        callback(null, "Set product success.");
    });
}

ConfigStore.prototype.getProduct=function(productID, callback){
    var key = productID.toString(),
        self = this,
        product = {};

    self.client.get(redisKey(self, 'product', key), function(err, data){
        if(err){
            callback(err);
            return;
        }
        _.extend(product, JSON.parse(data));
        _getProductChannel(self, key, product.channel, function(err, obj){
            if(err){
                callback(err);
            }
            console.log(obj);
            _.extend(product, {channel: obj});
            callback(null, product);
        });
    });
}

ConfigStore.prototype.deleteProduct=function(productID,callback){

}