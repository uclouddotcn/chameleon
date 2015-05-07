'use strict';

/* Controllers */


var chameleonControllers = angular.module('chameleonControllers', ['ui.router']);

chameleonControllers
    .controller('ToolInitCtrl', function($scope) {})
    .controller('InitController', function ($scope, $state, $modal, ProjectMgr, WaitingDlg) {
        var promise = ProjectMgr.init();
        promise.then(function(){
            if(!ProjectMgr.checkJavaHome()){
                alert("JAVA环境不存在，请安装JDK");
            }
            $state.go('projectlist');
        });
    })
    .controller('ProjectListCtrl', ['$scope', '$state', 'ProjectMgr', '$modal','globalCache', 'fileDialog', function($scope, $state, ProjectMgr, $modal,globalCache, fileDialog) {
        $scope.projects = [];
        //$scope.show.index = true;

        var promise = ProjectMgr.getProjectList();
        promise.then(
            function (data) {
                $scope.projects = data;
            }
        );
        $scope.addProject = function () {
            var modalInstance = $modal.open({
                templateUrl: 'partials/newproject.html',
                controller: 'NewProjectCtrl',
                size: 'lg',
                resolve: {
                },
                backdrop: false,
                keyboard: false
            });
            modalInstance.result.then(function(result){
                if(result){
                    $scope.projects.push(result);
                    ProjectMgr.createProjectDirectory(result.name);
                }
            });
        };

        $scope.selectedProject = [];

        $scope.projectTable = {
            data: 'projects',
            columnDefs: [
                {
                    displayName: '游戏名称',
                    field: 'name',
                    width: '100%',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selectedProject,
            showSelectionCheckbox: true,
            showGroupPanel: false,
            beforeSelectionChange: function() {
                return !$scope.compiling;
            },
            rowTemplate: '<div ng-dblclick="onDblClickRow(row)" ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">' +
                '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
                '<div ng-cell></div>' +
                '</div>'
        };
        $scope.onDblClickRow = function (row) {
            globalCache.rowIndex = row.rowIndex;
            var project = $scope.projects[row.rowIndex];
            if (project) {
                $state.go('playmanage', {projectID: project.id});
            }
        }

        $scope.openProject = function () {
            if ($scope.selectedProject.length > 0) {
                var project = $scope.selectedProject[0];
                $state.go('playmanage', {projectID: project.id});
            }
        }

        $scope.removeProject = function () {
            angular.forEach($scope.selectedProject, function(rowItem) {
                $scope.projects.splice($scope.projects.indexOf(rowItem),1);
                ProjectMgr.removeProjectDirectory(rowItem.name);
                ProjectMgr.removeProject(rowItem.id);
            });
        }

        $scope.loadConfig = function(){
            try{
                fileDialog.openFile(function(fileName){
                    var promise = ProjectMgr.loadConfigFromZip(fileName);
                    promise.then(function(data){
                        if(data.err){
                            return alert(data.err.message);
                        }
                        if(data){
                            var p = ProjectMgr.getProjectList();
                            p.then(
                                function (data) {
                                    $scope.projects = data;
                                }
                            );
                        }
                    });
                });
            }catch (e){
                console.log(e);
                alert('导入失败： 未知错误');
            }

        };
    }])
    .controller('NewProjectCtrl', function ($scope, $modalInstance, ProjectMgr) {
        $scope.newProject = ProjectMgr.createProject();
        $scope.cancel = function(){
            $modalInstance.close();
        }
        $scope.create = function () {
            if(!$scope.newProject){
                return $modalInstance.close();
            }
            try {
                $scope.newProjectPromise = ProjectMgr.createProject($scope.newProject);
                $scope.newProjectPromise.then(
                    function (projectID) {
                        $scope.newProject.id = projectID;
                        $modalInstance.close($scope.newProject);
                    },
                    function (err) {
                        alert(err.message);
                    });
            } catch (e) {
                console.log(e);
                console.log(e.stack);
            }
        };
    })
    .controller('UpgradeController',function ($scope, $modalInstance, project, outdatedChannels, ProjectMgr) {
        $scope.outdatedChannelData = outdatedChannels;
        $scope.outdatedChannels = {
            data: 'outdatedChannelData',
            columnDefs: [
                {
                    displayName: '渠道列表2',
                    field: 'name',
                    width: '30%',
                    resizable: false,
                    groupable: false
                },
                {
                    displayName: 'SDK状态',
                    field: 'depends',
                    width: '70%',
                    resizable: false,
                    groupable: false,
                    cellTemplate: '<div><div ng-repeat="d in row.entity[col.field]">{{d.desc}}({{d.from}} => {{d.to}}),</div></div>'
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selected,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false,
            rowTemplate: '<div style="height: 100%" ng-class="{outdated_reconfig: row.getProperty(\'needReconfig\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
        };

        $scope.upgrade = function () {
            var promise = ProjectMgr.upgradeProject(project);
            promise.then(function () {
                var promise = ProjectMgr.reloadProject(project);
                promise.then(function () {
                    $modalInstance.close();
                });
            }, function () {

            });
        }
    })
    .controller('LogPanelController',function ($scope, $modalInstance, logs) {
        $scope.logs = [];
        $scope.openLog = function (logfile) {
            console.log(logfile);
            require('nw.gui').Shell.openItem(logfile);
        };
        for (var i = 0; i < logs.length; i++) {
            if (typeof logs[i] === 'string') {
                $scope.logs.push({
                    msg: logs[i]
                });
            } else {
                $scope.logs.push({
                    msg: logs[i].msg,
                    logfile: logs[i].logfile
                });
            }
        }
    })
    .controller('NavCtrl',['$scope', '$state', '$location','globalCache', function ($scope, $state, $location,globalCache) {

        $scope.show = {};
        $scope.show.index = true;
        $scope.globalCache = globalCache;
        $scope.headerTpl = 'partials/nav.html';
        //console.log($scope)
        $scope.navClass = function (page) {
            var currentRoute = $location.path().substring(1) || 'projects';
            return page === currentRoute ? 'active' : '';
        };

        $scope.loadHome = function (str) {
            $scope.show.index = true;
            $scope.show.header = str;
            $scope.globalCache.projectId = '';
            $state.go('projectlist',{projectId:globalCache.projectId});
        };

        $scope.loadPlayManage = function (str) {
            $scope.show.index = false;
            $scope.show.header = str;
            $state.go('playmanage',{projectId:globalCache.projectId});
            console.log($scope)

        };
        $scope.loadSdk = function (str) {
            $scope.show.index = false;
            $scope.show.header = str;

            $state.go('loadsdk',{projectId:globalCache.projectId});


        };
        $scope.loadMethod = function (str) {
            $scope.show.index = false;
            $scope.show.header = str;
            $state.go('loadmethod',{projectId:globalCache.projectId});

        };
        $scope.versionManage = function (str) {
            $scope.show.index = false;
            $scope.show.header = str;
            $state.go('versionManage',{projectId:globalCache.projectId});

        };

    }])
    .controller('setVersionCfg',['$scope','$modalInstance',function ($scope,$modalInstance) {
        $scope.vcommit = function () {
            $modalInstance.close();
        };

        $scope.vcancel = function () {
            $modalInstance.dismiss();
        };

    }])
    .controller('versionCtrl',['$scope','versionManages','$q','$timeout','sliderbox','$modal',function($scope,versionManages,$q,$timeout,sliderbox,$modal){
        $scope.versionsDate = versionManages.data;
        console.log($scope.versionsDate)
        //default select the last version!!!
        $scope.tabVersion = 0;
        $scope.aImages = versionManages.data[$scope.tabVersion].images;
        $scope.vmodels = {
            vcontent : $scope.versionsDate[$scope.tabVersion].content,
            vupdate  : $scope.versionsDate[$scope.tabVersion].update
        }

        $scope.tabData = function(index){
            $scope.tabVersion = index;
            $scope.aImages = versionManages.data[$scope.tabVersion].images;
            $scope.vmodels = {
                vcontent : $scope.versionsDate[$scope.tabVersion].content,
                vupdate  : $scope.versionsDate[$scope.tabVersion].update
            }

        }
        $scope.saveVscontent = function(){
            $scope.globalsetting.vcontent.$dirty = false;
        }
        $scope.saveVsupdate = function(){
            $scope.globalsetting.vupdate.$dirty = false;
        }
        $scope.changContent = function(){
            $scope.globalsetting.vcontent.$dirty = true;
        }
        $scope.changUpdate = function(){
            $scope.globalsetting.vupdate.$dirty = true;
        }


        $scope.setVersionCfg = function () {
            var modalInstance = $modal.open({
                templateUrl: 'partials/setVersion.html',
                controller: 'setVersionCfg',
                backdrop: false,
                keyboard: false,
                resolve:{

                }

            })
            modalInstance.result.then(function(result){
                console.log(result)
            }, function (reason) {
                console.log(reason)
            })

        };

        $scope.setFiles = function(element) {
            $scope.$apply(function() {
                    var fse = require('fs-extra');
                    var uploadPath = element.files[0].path;
                    var newPath = '/tmp/mynewfile/'+ new Date().getTime() +uploadPath.split('\\')[uploadPath.split('\\').length-1];
                    var defer = $q.defer();
                    var promise = defer.promise;
                    fse.copy(uploadPath, newPath, function(err){
                        if (err) return console.error(err);
                    });
                    $timeout(function(){
                        $scope.versionsDate[$scope.tabVersion].images.push(newPath);
                        $scope.aImages = $scope.versionsDate[$scope.tabVersion].images;
                    },200)

                    sliderbox.slideFn()

                    $scope.uploadPath = uploadPath;
                }
            );
        };



    }])
