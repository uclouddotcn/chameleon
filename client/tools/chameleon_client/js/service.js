/**
 * Created by Administrator on 2015/1/13.
 */
'use strict';

var ChameleonTool = require('./js/chameleon');

var chameleonTool = angular.module('chameleonTool', ['ngResource']);

chameleonTool.service('ProjectMgr', ["$q", "$log", function($q, $log){
    var ProjectMgr = function(){
        this.tool = new ChameleonTool();
    }

    ProjectMgr.prototype.init = function(){
        var defered = $q.defer();
        try{
            this.tool.init(function(err, data){
                if(err) throw err;
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to create tables' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.getProjectList = function(){
        var defered = $q.defer();
        try{
            this.tool.getAllProjects(function(err, data){
                if(err) throw err;
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to fetch project list ' + e.message);
            global.setImmediate(function(){
                defered.resolve([]);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.createProject = function(project){
        if(!project) return this.tool.createEmptyProject();
        var defered = $q.defer();
        try{
            this.tool.createProject(project, function(err, data){
                if(err) throw err;
                defered.resolve(data);
            });
        }catch (e){
            $log.log('Fail to create project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.removeProject = function(id){
        this.tool.deleteProject(id);
    }

    ProjectMgr.prototype.updateProject = function(project){
        var defered = $q.defer();
        try{
            this.tool.updateProject(project, function(err, data){
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
    }

    ProjectMgr.prototype.getAllChannels = function(project){
        var defered = $q.defer();
        try{
            var projectInstance = this.tool.initProject(project);
            projectInstance.getAllChannels(project.id, function(err, data){
                if(err) throw err;
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
    }

    ProjectMgr.prototype.setChannel = function(project, channel){
        var defered = $q.defer();
        try{
            var projectInstance = this.tool.initProject(project);
            projectInstance.setChannel(project.id, channel, function(err, data){
                if(err) throw err;
                if(channel.id == 0){
                    channel.id = data;
                }
                defered.resolve(project);
            });
        }catch (e){
            $log.log('Fail to set channel of project' + e.message);
            global.setImmediate(function(){
                defered.resolve(null);
            });
        }
        return defered.promise;
    }

    ProjectMgr.prototype.deleteChannel = function(project, channel){
        var defered = $q.defer();
        try{
            var projectInstance = this.tool.initProject(project);
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
                    defered.resolve(err);
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

    ProjectMgr.prototype.generateServerConfig = function(project){
        return this.tool.generateServerConfig(project);
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