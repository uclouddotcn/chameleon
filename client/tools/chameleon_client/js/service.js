/**
 * Created by Administrator on 2015/1/13.
 */
'use strict';

var ChameleonTool = require('./js/chameleon');

var chameleonTool = angular.module('chameleonTool', ['ngResource']);
var fs = require('fs-extra');
var pathLib = require('path');
var async = require('async');

chameleonTool.service('ProjectMgr', ["$q", "$log", function($q, $log){
    function checkSign(channel) {
        return channel.signConfig.keyStoreFile &&
            channel.signConfig.keyStoreSecret &&
            channel.signConfig.alias &&
            channel.signConfig.aliasSecret;
    }

    var ProjectMgr = function(){
        this.tool = new ChameleonTool();
    };

    ProjectMgr.prototype.init = function(){
        var defered = $q.defer();

        try{
            this.tool.init(function(err, data){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }

                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to create tables' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }

        return defered.promise;
    };

    ProjectMgr.prototype.getProjectList = function(){
        var defered = $q.defer();

        try{
            this.tool.getAllProjects(function(err, data){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }

                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to fetch project list ' + e.message);
            global.setImmediate(function(){
                defered.resolve([]);
            });
        }
        return defered.promise;
    };

    ProjectMgr.prototype.createProject = function(project){
        if(!project) return this.tool.createEmptyProject();

        var defered = $q.defer();
        try{
            this.tool.createProject(project, function(err, data){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to create project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    };

    ProjectMgr.prototype.getProject = function(id){
        var defered = $q.defer();
        try{
            this.tool.getProject(id, function(err, data){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to get project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.removeProject = function(id){
        this.tool.deleteProject(id);
    };

    ProjectMgr.prototype.updateProject = function(project){
        var defered = $q.defer();
        try{
            project.save(function(err, data){
                if(err) throw err;
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to update project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    };


    ProjectMgr.prototype.getAllChannels = function(project){
        var defered = $q.defer();
        try{
            var projectInstance = project;
            projectInstance.getAllChannels(project.id, function(err, data){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }

                project.channels = data;
                defered.resolve(project);
            });
        }catch (e){
            $log.log('Fail to get channels of project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    };

    ProjectMgr.prototype.setChannel = function(project, channel){
        var defered = $q.defer();
        try{
            var projectInstance = project;
            projectInstance.setChannel(channel, function(err, channel){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }
                defered.resolve(channel);
            });
        }catch (e){
            $log.log('Fail to set channel of project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    };

    ProjectMgr.prototype.newProjectModel = function (projInDB) {
        return this.tool.initProject(projInDB);
    };

    ProjectMgr.prototype.saveIcon = function (canvas, baseIcon, overlayIcon, targetFile, callback) {
        var baseImg = new Image();
        baseImg.src = baseIcon;
        var overlayImage = new Image();
        overlayImage.src = overlayIcon
        var readyCount = 0;
        function onLoad() {
            readyCount++;
            if (readyCount === 2) {
                try {
                    var context = canvas.getContext('2d');
                    context.drawImage(baseImg, 0, 0, canvas.width, canvas.height);
                    context.drawImage(overlayImage, 0, 0);
                    var dataURL = canvas.toDataURL();
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    var data = dataURL.replace(/^data:image\/\w+;base64,/, "");
                    var buf = new Buffer(data, 'base64');
                    fs.writeFileSync(targetFile, buf);
                    callback(null);
                } catch (e) {
                    callback(e);
                }
            }
        }
        baseImg.onload = onLoad;
        overlayImage.onload = onLoad;
    };


    ProjectMgr.prototype.preparePackChannels = function (project, channels, canvas) {
        var defered = $q.defer();
        var self = this;
        var task = function (channel, callback) {
            var signCfg = channel.config.isGlobalConfig ? project.signConfig : channel.signConfig;
            signCfg = signCfg || {};
            var splashPath = channel.meta.getSplashScreenPath(project.landscape);
            var iconPath = null,
                overlay = null;
            var data = {
                projectName: project.name,
                landscape: project.landscape,
                signConfig: {
                    keystore: signCfg.keyStoreFile,
                    keypass: signCfg.keyStoreSecret,
                    alias: signCfg.alias,
                    storepass: signCfg.aliasSecret
                },
                channel: {
                    channelName: channel.channelName,
                    packageName: channel.config.packageName,
                    sdks: channel.sdks ? channel.sdks.map(function (sdk) {return sdk.genClientCfg();}) : [],
                    iconPath: null,
                    splashPath: splashPath
                }
            };
            var waitForTask = false;
            iconPath = channel.config.icon ? channel.config.icon.path : project.icon;
            overlay = channel.config.icon ? channel.config.icon.position : 0;
            if (!iconPath) {
                iconPath = project.icon; // the path in channel.config.icon maybe null
            }
            data.channel.iconPath = iconPath;
            if (overlay) {
                var overlayPath = channel.meta.getOverlayPath(channel.config.icon.position);
                if (overlayPath) {
                    waitForTask = true;
                    var targetPath = pathLib.join(project.getChannelResFolder(channel), 'icon.png');
                    data.channel.iconPath = targetPath;
                    self.saveIcon(canvas, iconPath, overlayPath, targetPath, function (err) {
                        callback(err, data);
                    })
                }
            }
            if (!waitForTask) {
                global.setImmediate(callback, null, data);
            }
        };
        async.mapSeries(channels, task, function (err, s) {
            if (err) {
                return defered.reject(err);
            }
            defered.resolve(s);
        });
        return defered.promise;
    };

    ProjectMgr.prototype.packChannel = function (project, channel, configData, apkVersion, callback, process) {
        var self = this;
        fs.writeJSONFile(pathLib.join(project.getChannelFolder(channel), 'config.json'), configData, function (err) {
            if (err) {
                return callback(err);
            }
            var configRoot = self.chameleonPath().configRoot;
            self.commandOnProcess('python', [
                '-u',
                pathLib.normalize(pathLib.join(configRoot, 'tools', 'buildtool', 'chameleon_tool', 'build_package.py')),
                '-c',
                channel.channelName,
                '-r',
                pathLib.normalize(pathLib.join(configRoot, 'sdk')),
                '-d',
                false,
                '-a',
                true,
                '-V',
                apkVersion.trim(),
                '-P',
                pathLib.normalize(project.getRootFolder())
            ], callback, process);
        });
    };
    ProjectMgr.prototype.deleteChannel = function(project, channel){
        var defered = $q.defer();
        try{
            var projectInstance = project;
            projectInstance.deleteChannel(channel.id, function(err, data){
                if(err) throw err;
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to delete channel of project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.getChannelList = function(){
        return this.tool.getChannelList();
    }

    ProjectMgr.prototype.getSDKList = function(){
        return this.tool.getSDKList();
    }

    ProjectMgr.prototype.getAPKVersionList = function(projectName){
        return this.tool.getAPKVersionList(projectName);
    }

    ProjectMgr.prototype.dirName = function(){
        return this.tool.dirName();
    }

    ProjectMgr.prototype.createProjectDirectory = function(name){
        return this.tool.createProjectDirectory(name);
    }

    ProjectMgr.prototype.createChannelDirectory = function(project, channelName){
        return this.tool.createChannelDirectory(project, channelName);
    }

    ProjectMgr.prototype.removeProjectDirectory = function(name){
        return this.tool.removeProjectDirectory(name);
    }

    ProjectMgr.prototype.removeChannelDirectory = function(project, channelName){
        return this.tool.removeChannelDirectory(project, channelName);
    }

    ProjectMgr.prototype.command = function(command, args){
        var defered = $q.defer();
        try{
            this.tool.command(command, args, function(err, data){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err});
                    return;
                }
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to command: ' + command);
            global.setImmediate(function(){
                defered.resolve(e);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.commandOnProcess = function(command, args, callback, process){
        return this.tool.command(command, args, callback, process);
    }

    ProjectMgr.prototype.generateProductForServer = function(project){
        return this.tool.generateProductForServer(project);
    }

    ProjectMgr.prototype.getEnv = function(){
        return this.tool.env();
    }

    ProjectMgr.prototype.encrypt = function(input){
        return this.tool.encrypt(input);
    }

    ProjectMgr.prototype.checkJavaHome = function(){
        return this.tool.checkJavaHome();
    }

    ProjectMgr.prototype.chameleonPath = function(){
        return this.tool.chameleonPath();
    }

    ProjectMgr.prototype.getOutputZip = function(project){
        return this.tool.getOutputZip(project);
    }

    ProjectMgr.prototype.loadConfigFromZip = function(path){
        var defered = $q.defer();

        try{
            this.tool.loadConfigFromZip(path, function(err){
                if(err) {
                    console.log(err);
                    defered.resolve({err: err, message: err.message});
                    return;
                }

                defered.resolve('载入游戏成功');
            });
        }catch (e){
            $log.log('Fail to load project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }

        return defered.promise;
    }

    return new ProjectMgr();
}])
.factory('WaitingDlg', ['$q', '$modal', function ($q, $modal) {
    var WaitingDlg = function () {
        this.controller = function ($scope, $modalInstance, data) {
            $scope.tips = data.tips;
            data.p.then(function (x) {
                $modalInstance.close(x);
                return x;
            }, function (x) {
                $modalInstance.dismiss(x);
                return x;
            });
        };
    };

    WaitingDlg.prototype.wait = function (promise, tips) {
        var instance = $modal.open({
            templateUrl: 'partials/waitdlg.html',
            controller: this.controller,
            resolve: {
                data: function () {
                    return {
                        p: promise,
                        tips: tips
                    };
                }
            },
            backdrop: false,
            keyboard: false,
            size: 'sm'
        });
        return instance.result;
    };

    return new WaitingDlg();
}])
.factory('sliderbox',['$timeout',function($timeout){
    var sliders = {};

    function _slideFn(){
        var _scrolling = "";
        var a = 1;
        var $slider = $('.slider ul');
        var $slider_child_l = $('.slider ul li').length;
        var $slider_width = 150;
        var slider_count = 0;


        $timeout(function(){
            $slider_child_l = $('.slider ul li').length;
//                    $slider.width($slider_child_l * $slider_width);
            if ($slider_child_l <= 4) {
                $('#btn-right').css({cursor: 'auto'});
                $('#btn-right').removeClass("dasabled");
            }
        },300)
        function moveToRight() {
            if (slider_count >= $slider_child_l - 4) {
                a = 0;
                moveToLeft();
            } else {
                slider_count++;
                $slider.animate({left: '-=' + $slider_width + 'px'}, 300);
                moveAction();

            }
        }
        function moveToLeft() {
            if (slider_count <= 0) {
                a = 1;
                moveToRight();
            } else {
                slider_count--;
                $slider.animate({left: '+=' + $slider_width + 'px'}, 300);
                moveAction();

            }
        }
        function moveEndRight() {
            if (slider_count >= $slider_child_l - 4) {
                return false;
            } else {
                slider_count++;
                $slider.animate({left: '-=' + $slider_width + 'px'}, 300);
                moveAction();
            }
        }
        function moveEndLeft() {
            if (slider_count <= 0) {
                return false;
            } else {
                slider_count--;
                $slider.animate({left: '+=' + $slider_width + 'px'}, 300);
                moveAction();
            }
        }
        function moveAction() {
            if (slider_count >= $slider_child_l - 4) {
                $('#btn-right').css({cursor: 'auto'});
                $('#btn-right').addClass("dasabled");
            }
            else if (slider_count > 0 && slider_count <= $slider_child_l - 4) {
                $('#btn-left').css({cursor: 'pointer'});
                $('#btn-left').removeClass("dasabled");
                $('#btn-right').css({cursor: 'pointer'});
                $('#btn-right').removeClass("dasabled");
            }
            else if (slider_count <= 0) {
                $('#btn-left').css({cursor: 'auto'});
                $('#btn-left').addClass("dasabled");
            }
        }
        $('#btn-left').unbind('click').click(function(){
            moveEndLeft();
        })
        $('#btn-right').unbind('click').click(function(){
            moveEndRight();
        })
    }

    return sliders = {
        slideFn : _slideFn
    }

}]);