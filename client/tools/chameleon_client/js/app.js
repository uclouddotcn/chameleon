'use strict';

/* App Module */
var chameleonApp;
chameleonApp = angular.module('chameleonApp', [
    'ngGrid',
    'ngRoute',
    'chameleonControllers',
    'chameleonDirectives',
    'chameleonTool',
    'ui.bootstrap',
    'ui.router',
    'DWand.nw-fileDialog'
])
    .run(['$rootScope', '$state', '$stateParams', '$log', '$modal',
        function ($rootScope, $state, $stateParams, $log, $modal) {

            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
            $rootScope.$on('$stateChangeError', function (event, toState, toParams, fromState, fromParams, errors) {
                $log.log('Fail to change state ' + event + ' ' + toState +
                ' ' + toParams + ' ' + fromState + ' ' + fromParams);

            });
            //createMenu($modal);
        }
    ])
    .factory('globalCache', [function () {
        var globalCache;

        globalCache = {
            projectId: '',
            rowIndex: '',
            project: '',
            allsdks: ''
        }
        return globalCache;
    }])
    .config(['$stateProvider', '$urlRouterProvider', function ($stateProvider, $urlRouterProvider) {
        console.log('set config')
        $urlRouterProvider.otherwise('/init');
        // Now set up the states
        $stateProvider
            .state('init', {
                url: '/init',
                controller: 'InitController',
                templateUrl: 'partials/init.html'

            })
            .state('projectlist', {
                url: '/projects',
                templateUrl: 'partials/projects.html',
                controller: 'ProjectListCtrl'
            })
            .state('newproject', {
                url: '/newproj',
                templateUrl: 'partials/newproject.html',
                controller: 'NewProjectCtrl'
            })
            .state('playmanage', {
                url: '/playmanage/:projectID',
                templateUrl: 'partials/projectManager.html',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', function ($stateParams, ProjectMgr) {
                        var promise = ProjectMgr.getProject($stateParams.projectID);
                        return promise;
                    }]
                },
                controller: ['$scope', '$log', '$stateParams',
                    '$state', '$modal', 'project',
                    'ProjectMgr', 'WaitingDlg', 'fileDialog', '$http',
                    function ($scope, $log, $stateParams, $state, $modal, projectInDB, ProjectMgr, WaitingDlg, fileDialog, $http) {
                    var _ = require('underscore'),
                        fse = require('fs-extra'),
                        fs = require('fs'),
                        http = require('http'),
                        async = require('async'),
                        node_path = require('path');

                    var project = ProjectMgr.newProjectModel(projectInDB);
                    $scope.iconEnv = {
                        projectIcon: project.icon,
                        channelIcon: null,
                        overlay: 0
                    };

                    $scope.onOverlayChange = function (overlay) {
                        $scope.iconEnv.overlay = overlay;
                    };

                    var dirName = ProjectMgr.dirName(),
                        env = ProjectMgr.getEnv(),
                        chameleonPath = ProjectMgr.chameleonPath(),
                        //packingRoot = dirName.substr(0, dirName.length-19),
                        APKVersion = '',
                        tempImagePath = '';

                    //functions
                    var nodePath = function(path){
                        return node_path.join.apply(this, path.split('/'));
                    };
                    var iconPosition = function(){
                        var result = {};
                        var root = node_path.join(chameleonPath.configRoot,  nodePath('channelinfo'), $scope.selectedChannel.channelName, nodePath('/drawable/drawable-xhdpi/'));
                        result.leftDown = fs.existsSync(node_path.join(root, 'icon-decor-leftdown.png'));
                        result.leftUp = fs.existsSync(node_path.join(root, 'icon-decor-leftup.png'));
                        result.rightDown = fs.existsSync(node_path.join(root, 'icon-decor-rightdown.png'));
                        result.rightUp = fs.existsSync(node_path.join(root, 'icon-decor-rightup.png'));
                        return result;
                    };

                    //project manage
                    $scope.project = project;
                    $scope.fileread = project.signConfig.keyStoreFile;
                    $scope.isProjectUnchanged = true;

                    $scope.setFiles = function(element){
                        if(element[0].name == "channel") $scope.selectedChannel.signConfig.keyStoreFile = $scope.fileread.path;
                        if(element[0].name == "project") $scope.project.signConfig.keyStoreFile = $scope.fileread.path;
                        if(element[0].name == "projectIcon") {
                            $scope.project.icon = $scope.fileread.path;
                            $scope.iconEnv.projectIcon = $scope.fileread.path;
                        }
                        if(element[0].name == "icon") {
                            $scope.selectedChannel.setIcon($scope.fileread.path);
                            $scope.iconEnv.channelIcon = $scope.fileread.path;
                        }
                        if(element[0].name == "apk") {
                            var projectRoot = node_path.join(chameleonPath.projectRoot, $scope.project.name);
                            $scope.installAPKMessage = '';
                            $scope.apkFilePath = $scope.fileread.path;
                            var install = ProjectMgr.command('python', [
                                node_path.normalize(node_path.join(chameleonPath.configRoot, nodePath('tools/buildtool/chameleon_tool/build_package.py'))),
                                '-p',
                                $scope.apkFilePath,
                                '-P',
                                projectRoot,
                                '-d',
                                true,
                                '-a',
                                false
                            ]);
                            var promise = WaitingDlg.wait(install, '解压APK母包');
                            promise.then(function(data){
                                if(data.err){
                                    $scope.installAPKMessage = "解压APK母包失败";
                                    return;
                                }
                                //APKVersion = data;
                                var list = ProjectMgr.getAPKVersionList($scope.project.name);
                                $scope.APKVersionList = [];
                                for(var i = 0; i < list.length; i++){
                                    $scope.APKVersionList.push({
                                        name: 'APK',
                                        version: list[i]
                                    });
                                }
                            });
                        }
                    };
                    $scope.saveProjectConfig = function(){
                        var promise = ProjectMgr.updateProject($scope.project);
                        promise.then(function(data){
                            if(!data){
                                alert("Update project config failed.");
                                return;
                            }
                            $scope.isProjectUnchanged = true;
                        });
                    };
                    $scope.outputConfig = function(){
                        try{
                            var zip = ProjectMgr.getOutputZip($scope.project);
                            fileDialog.saveAs(function(fileName){
                                zip.writeZip(fileName);
                                alert('保存成功');
                            }, $scope.project.config.code + '.zip');
                        }catch (e){
                            console.log(e);
                            alert('导出失败： 未知错误');
                        }
                    };
                    $scope.$watch('project', function(newValue, oldValue) {
                        if(newValue !== oldValue) $scope.isProjectUnchanged = false;
                    }, true);

                    //channel manage
                    $scope.selectedChannels = [];
                    $scope.channelList = [];

                    $scope.gridOptions1 = {
                        data: 'channelList',
                        columnDefs: [{
                            field: 'desc',
                            displayName: " 备选渠道列表",
                            cellTemplate: '<div ng-class="ngCellText" ><input style="margin:2px;" type="checkbox" ng-click="toggleChannel($event, row.entity)" ng-checked="{{row.entity.checked}}" class="selectChannel" />{{row.getProperty(col.field)}}</div>'
                        }]
                    };
                    $scope.gridOptions2 = {
                        data: 'selectedChannels',
                        multiSelect: false,
                        columnDefs: [{
                            field: 'desc',
                            displayName: "已选渠道列表",
                            cellTemplate: '<div ng-class="ngCellText" style="margin: 2px;">{{row.getProperty(col.field)}}</div>'
                        }]
                    };

                    var promise = ProjectMgr.getAllChannels($scope.project);
                    promise.then(function(){
                        var channelList = ProjectMgr.getChannelList();
                        $scope.selectedChannels = $scope.project.channels;
                        for(var i=0; i<$scope.selectedChannels.length; i++){
                            (_.findWhere(channelList, {channelName: $scope.selectedChannels[i].channelName})).checked = true;
                        }
                        $scope.channelList = channelList;
                    });

                    $scope.toggleChannel = function(event, channelMeta){
                        var promise = null;
                        var channel = channelMeta.newChannel();
                        if(event.target.checked){
                            //make new channel default use global config.
                            channel.config.isGlobalConfig = true;
                            promise = ProjectMgr.setChannel($scope.project, channel);
                            promise.then(function(){
                                //$scope.selectedChannels = $scope.project.channels;
                            });
                        }else{
                            var channelToDelete = _.findWhere($scope.project.channels, {channelName: channel.channelName});
                            var promise = ProjectMgr.deleteChannel($scope.project, channelToDelete);
                            promise.then(function(){
                                $scope.project.channels = _.reject($scope.project.channels, function(element){
                                    return element.channelName == channel.channelName;
                                });
                                $scope.selectedChannels = $scope.project.channels;
                                if(channel.channelName === $scope.selectedChannel.channelName){
                                    $scope.selectedChannel = {};
                                    $scope.selectedSDKs = [];
                                    $scope.selectedSDK = {};
                                    $scope.editingSDKs = [];
                                    $('.sdkList').prop("checked", false);
                                    $scope.SDKConfigHtml = '';
                                }
                                ProjectMgr.removeChannelDirectory($scope.project, channelToDelete.channelName);
                            });
                        }
                    };

                    //sdk manage
                    $scope.selectedChannel = {};
                    $scope.selectedChannelValidator = {
                        pkgnameValidator: function (name) {

                        }
                    };
                    $scope.SDKList = ProjectMgr.getSDKList();

                    $scope.gridOptions3 = {
                        data: 'selectedSDKs',
                        multiSelect: false,
                        columnDefs: [{
                            field: 'desc',
                            displayName: "SDK列表",
                            cellTemplate: '<div ng-class="ngCellText" >{{row.getProperty(col.field)}}</div>'
                        }]
                    };
                    $scope.gridOptions4 = {
                        data: 'SDKList',
                        columnDefs: [{
                            field: 'desc',
                            displayName: "SDK",
                            cellTemplate: '<div ng-class="ngCellText" ><input id="{{row.entity.name}}" style="margin:2px;" type="checkbox" ng-click="toggleSDK($event, row.entity)" ng-checked="{{row.entity.checked}}" class="sdkList" />{{row.getProperty(col.field)}}</div>'
                        }]
                    };
                    $scope.gridOptions5 = {
                        data: 'selectedChannels',
                        multiSelect: false,
                        columnDefs: [{
                            field: 'desc',
                            displayName: "渠道名",
                            cellTemplate: '<div ng-class="ngCellText" ng-click="selectChannelForSDK($event, row.entity)">{{row.getProperty(col.field)}}</div>'
                        }]
                    };

                    $scope.toggleSDK = function(event, sdk){
                        if(!$scope.selectedChannel.channelName){
                            $(event.target).prop({'checked':false});
                            alert("请先选择一个渠道");
                            return false;
                        }
                        if(event.target.checked){
                            //refresh sdk config view.
                            sdk.config = {};
                            $scope.selectedChannel.sdks = [];
                            $('.sdkList').not(event.target).prop({'checked':false});
                            $scope.selectedChannel.sdks.push(sdk.newSDK());

                            $scope.selectedSDKs = $scope.selectedChannel.sdks;
                            ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                        }else{
                            $scope.selectedChannel.sdks = _.reject($scope.selectedChannel.sdks, function(element){
                                return element.name == sdk.name;
                            });
                            $scope.selectedSDKs = $scope.selectedChannel.sdks;
                            ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                        }
                    };

                    $scope.selectChannelForSDK = function(event, channel){
                        //hack css to fix grid problem.
                        $('.sdkList').prop({'checked':false});

                        if(!channel.sdks) channel.sdks = [];
                        $scope.selectedChannel = channel;
                        $scope.selectedSDKs = channel.sdks;

                        for (var i = 0; i < $scope.selectedSDKs.length; i++) {
                            (_.findWhere($scope.SDKList, {name: $scope.selectedSDKs[i].name})).checked = true;
                            //hack css to refresh with model
                            $('#' + $scope.selectedSDKs[i].name).prop({'checked': true});
                        }
                        _.each($scope.selectedChannels, function(c, index){
                            if(c.channelName === channel.channelName){
                                $scope.gridOptions6.selectItem(index, true);
                            }
                        });
                    };

                    //sdk config
                    $scope.hideSignConfig = true;
                    $scope.editingSDKs = [];
                    $scope.gridOptions6 = {
                        data: 'selectedChannels',
                        multiSelect: false,
                        afterSelectionChange: function(rowItem, event){
                            var channel = rowItem.entity;
                            $scope.selectedChannel = channel;
                            $scope.fileread = channel.signConfig.keyStoreFile;
                            $scope.selectedSDKs = channel.sdks;
                            $scope.selectedSDK = null;
                            $scope.editingSDKs.length = 0;
                            $scope.SDKConfigHtml = '';
                            $scope.SDKConfigForm.$setPristine();

                            _.each($scope.selectedChannels, function(c, index){
                                if(c.channelName === channel.channelName){
                                    $scope.gridOptions5.selectItem(index, true);
                                }
                            });
                        },
                        columnDefs: [{
                            field: 'desc',
                            displayName: "渠道名",
                            cellTemplate: '<div ng-class="ngCellText">{{row.getProperty(col.field)}}</div>'
                        }]
                    };
                    $scope.gridOptions7 = {
                        data: 'selectedSDKs',
                        multiSelect: false,
                        selectedItems: $scope.editingSDKs,
                        afterSelectionChange: function(rowItem, event){
                            var sdk = rowItem.entity;
                            $scope.selectedSDK = sdk;
                            $scope.SDKConfigHtml = '';
                            $scope.SDKConfigHtml = SDKTemplate(sdk.name, $scope.SDKList);
                        },
                        columnDefs: [{
                            field: 'desc',
                            displayName: "SDK列表",
                            cellTemplate: '<div ng-class="ngCellText" >{{row.getProperty(col.field)}}</div>'
                        }]
                    };

                    $scope.selectChannelForConfig = function(event, channel){
                        $scope.selectedChannel = channel;
                        $scope.fileread = channel.signConfig.keyStoreFile;
                        $scope.selectedSDKs = channel.sdks;
                        $scope.selectedSDK = {};
                        $scope.SDKConfigHtml = "";
                    };

                    $scope.setSDKConfig = function(){
                        ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                        $scope.SDKConfigForm.$setPristine();
                    };

                    //icon config
                    $scope.applyPositionToAll = false;
                    $scope.iconPosition = {};

                    $scope.gridOptions8 ={
                        data: 'selectedChannels',
                        multiSelect: false,
                        afterSelectionChange: function(rowItem){
                            var channel = rowItem.entity;
                            $scope.selectedChannel = channel;
                            if(channel.config.icon){
                                $scope.iconEnv.channelIcon = channel.config.icon.path;
                                $scope.iconEnv.overlay = channel.config.icon.position;
                            } else {
                                $scope.iconEnv.channelIcon = null;
                                $scope.iconEnv.overlay = null;
                            }
                            $scope.iconPosition = iconPosition();
                        },
                        columnDefs: [{
                            field: 'desc',
                            displayName: '渠道',
                            cellTemplate: '<div ng-class="ngCellText" >{{row.getProperty(col.field)}}</div>'
                        }]
                    };

                    $scope.channelValidator = {
                        errors: [],
                        onPackageName: function (newValue) {
                            var err = $scope.selectedChannel.meta.checkPackageName(newValue);
                            var allErrors = $scope.channelValidator.errors;
                            var pkgErrIdx = -1;
                            var i = 0;
                            for (i = 0; i < allErrors.length; ++i) {
                                if (allErrors[i].t === 'packageName') {
                                    pkgErrIdx = i;
                                    break;
                                }
                            }
                            if (err !== null) {
                                if (pkgErrIdx < 0) {
                                    allErrors.push({t:"packageName", msg: err});
                                }
                            } else {
                                if (pkgErrIdx >= 0) {
                                    allErrors.shift(i, 1);
                                }
                            }
                        }
                    };
                    $scope.saveIcon = function(){
                        var channel = $scope.selectedChannel;
                        //draw and save
                        var canvas = $('#drawingIcon')[0];
                        var position = $scope.selectedChannel.config.icon.position;
                        ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                    };

                    $scope.hasIcon = function(){
                        return true;
                    };

                    //pack SDK

                    $scope.gridOptions9 = {
                        data: 'selectedChannels',
                        multiSelect: true,
                        columnDefs: [
                            {
                                field: 'desc',
                                displayName: '渠道',
                                width: '20%',
                                cellTemplate: '<div ng-class="ngCellText">{{row.getProperty(col.field)}}</div>'
                            },
                            {
                                field: 'packingProgress',
                                displayName: '进度',
                                cellTemplate: '<progressbar class="ng-class: getPackingProgessBarClass(row)" value="row.getProperty(col.field)"></progressbar>'
                            },
                            {
                                field: 'packingResult',
                                displayName: '结果',
                                width: '20%',
                                cellTemplate: '<div ng-class="ngCellText" ng-style="{\'color\': row.getProperty(col.field)===2?\'red\':\'green\'}">{{row.getProperty(col.field) === 1 ? "打包成功" : (row.getProperty(col.field) === 2 ? "打包失败" : "")}}</div>'
                            }
                        ]
                    };
                    $scope.getPackingProgessBarClass = function (row) {
                        var res = "progress-striped ";
                        if (row.entity['packingResult'] === 0) {
                            res += ' active '
                        } else if (row.entity['packingResult'] === 2) {
                            res += ' danger '
                        }
                        return res;
                    };

                    $scope.isPackDisabled = false;

                    $scope.pack = function(){
                        var channelToPack = $scope.gridOptions9.$gridScope.selectedItems;

                        _.each($scope.selectedChannels, function(element, index){
                            element.packingResult = 0;
                            element.packingProgress = 0;
                        });

                        if(!APKVersion){
                            alert('请先选择APK母包');
                            return;
                        }

                        $scope.isPackDisabled = true;
                        var canvas = $('#dumpingIconCanvas')[0];
                        var promise = ProjectMgr.preparePackChannels(project, channelToPack, canvas);

                        function packChannel(channelInfo, callback) {
                            var channel = channelInfo.ch;
                            var data = channelInfo.data;
                            ProjectMgr.packChannel(project, channel, data, APKVersion,
                                function (err) {
                                    if (err) {
                                        channel.packingResult = 2;
                                        channel.packingProgress = 100;
                                        $scope.$apply();
                                        return callback(null);
                                    }
                                    channel.packingProgress = 100;
                                    channel.packingResult = 1;
                                    $scope.$apply();
                                    callback(null);
                                },
                                function (data) {
                                    if (data) {
                                        var reg = new RegExp("$", "g");
                                        var num = data.match(reg).length;

                                        channel.packingProgress += 10 * num;
                                        $scope.$digest();
                                    }
                                }
                            );
                        }
                        promise.then(function (datas) {
                            var input = [];
                            for (var i = 0; i < channelToPack.length; ++i) {
                                input.push({
                                    ch: channelToPack[i],
                                    data: datas[i]
                                });
                            }
                            console.log(datas.length);
                            async.eachLimit(input, 5, packChannel, function (err) {
                                $scope.isPackDisabled = false;
                            });
                        }, function (e) {
                            alert("无法开始打包: " + e.message);
                            $scope.isPackDisabled = false;
                        });
                    };
                    $scope.openOutputFolder = function(){
                        require('nw.gui').Shell.openItem(node_path.join(chameleonPath.projectRoot, project.name, 'output'));
                    };
                    $scope.dumpServerConfig = function(){
                        var id = $scope.project.config.code;
                        if(!id){
                            alert(" 请配置游戏在Server中的名称");
                            return;
                        }
                        if(!project.config.payCallbackUrl){
                            alert(" 请配置游戏回调地址");
                            return;
                        }
                        try{
                            var config = ProjectMgr.generateProductForServer($scope.project);
                            fileDialog.saveAs(function(fileName){
                                fse.writeJSON(fileName, config);
                                alert('保存成功');
                            }, $scope.project.config.code + '.json');
                        }catch(e){
                            console.log(e);
                            alert('导出失败： 未知错误');
                        }
                    }
                    $scope.pushServerConfig = function(){
                        var product = ProjectMgr.generateProductForServer($scope.project);
                        product = JSON.stringify(product);
                        product = ProjectMgr.encrypt(product);
                        var url = env.server.test + '/product';
                        $http.post(url, {product : encodeURIComponent(product)}).success(function(data){
                            console.log(data);
                            alert('推送服务器配置成功');
                        }).error(function(err){
                            console.log(err);
                            alert('推送服务器失败');
                        });
                    }

                    //manage APK
                    $scope.APKVersionList = [];
                    var list = ProjectMgr.getAPKVersionList($scope.project.name);
                    for(var i = 0; i < list.length; i++){
                        $scope.APKVersionList.push({
                            name: 'APK',
                            version: list[i]
                        });
                    }
                    $scope.selectedAPKVersion = [];
                    $scope.APKVersionTable = {
                        data: 'APKVersionList',
                        columnDefs: [
                            {
                                displayName: '请选择一个已解压的APK母包',
                                width: '100%',
                                field: 'version',
                                resizable: false,
                                groupable: false
                            }
                        ],
                        multiSelect: false,
                        selectedItems: $scope.selectedAPKVersion,
                        showGroupPanel: false,
                        beforeSelectionChange: function() {
                            return !$scope.compiling;
                        },
                        afterSelectionChange: function(rowItem){
                            APKVersion = rowItem.entity.version;
                        },
                        rowTemplate: '<div ng-style="{ cursor: row.cursor }" ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell {{col.cellClass}}">' +
                        '<div class="ngVerticalBar" ng-style="{height: rowHeight}" ng-class="{ ngVerticalBarVisible: !$last }">&nbsp;</div>' +
                        '<div ng-cell></div>' +
                        '</div>'
                    };
                }]
            })
            .state('versionManage', {
                url: '/versionManage/:projectId',
                templateUrl: 'partials/version_manage.html',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', 'WaitingDlg',
                        function ($stateParams, ProjectMgr, WaitingDlg) {
                            // 全部数据
                            var promise = ProjectMgr.loadProject($stateParams.projectId);
                            return WaitingDlg.wait(promise, "加载工程中");
//                            return promise;
                        }],
                    versionManages: ['$http', function ($http) {
                        return $http({
                            method: 'GET',
                            url: 'js/versionManage.json'
                        })
                    }]
                },
                controller: 'versionCtrl'

            })
    }])
    .directive('dynamicHtml', ['$compile', function($compile){
        return {
            restrict: 'A',
            replace: true,
            link: function(scope, element, attrs) {
                scope.$watch(attrs.dynamicHtml, function (html) {
                    element.html(html);
                    $compile(element.contents())(scope);
                });
            }
        }

    }])
    .directive("fileread", [function () {
        return {
            scope: {
                fileread: "="
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {
                    scope.$apply(function () {
                        scope.$parent.fileread = changeEvent.target.files[0];
                        scope.$parent.setFiles(element);
                    });
                });
            }
        }
    }])
    .directive("drawingIcon", ['ProjectMgr', function(ProjectMgr){
        return {
            restrict: 'A',
            link: function(scope, element){
                var fs = require('fs');
                var pathLib = require('path');
                var chameleonPath = ProjectMgr.chameleonPath();
                var drawImage = function(canvas, base, overlay){
                    var context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    var baseImage = new Image();
                    var overlayImage = new Image();
                    var readyFlag = 0;
                    var drawFunc = function () {
                        context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
                        context.drawImage(overlayImage, 0, 0);
                    };
                    baseImage.onload = function () {
                        readyFlag += 1;
                        if (readyFlag < 2) {
                            return;
                        }
                        drawFunc();
                    };
                    overlayImage.onload = function () {
                        readyFlag += 1;
                        if (readyFlag < 2) {
                            return;
                        }
                        drawFunc();
                    }
                    baseImage.src = 'file://'+base;
                    overlayImage.src = 'file://'+overlay;
                };
                var drawImageWithoutOverlay = function(canvas, base){
                    var context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    var baseImage = new Image();
                    baseImage.src = base;
                    baseImage.onload = function () {
                        context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
                    }
                };
                var renderIcon = function(){
                    var canvas = element[0];
                    var context = canvas.getContext('2d');
                    var overlay = null;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    var channel = scope.selectedChannel;
                    if(!scope.iconEnv || !channel)
                        return;
                    var base = scope.iconEnv.channelIcon || scope.iconEnv.projectIcon;
                    if (!base) {
                        return;
                    }
                    if(scope.iconEnv.overlay){
                        overlay = channel.meta.getOverlayPath(scope.iconEnv.overlay);
                    }
                    if(!overlay){
                        drawImageWithoutOverlay(canvas, base);
                    }else{
                        drawImage(canvas, base, overlay);
                    }
                };
                scope.$watch('iconEnv.projectIcon', renderIcon);
                scope.$watch('iconEnv.overlay', renderIcon);
                scope.$watch('iconEnv.channelIcon', renderIcon);
                scope.$watch('selectedChannel', renderIcon);
            }
        }
    }]);

function createMenu ($modal) {
    // Load native UI library
    var gui = require('nw.gui');

    var menu = new gui.Menu({
        type: 'menubar'
    });

    var optionMenu = new gui.MenuItem({label: "选项"});
    var optionSubMenu = new gui.Menu();
    optionSubMenu.append(new gui.MenuItem({
        label: '读取升级包' ,
        click: function () {
            var instance = $modal.open( {
                templateUrl: 'partials/upgradetool.html',
                backdrop: false,
                keyboard: false,
                controller: function ($scope, $modalInstance, fileDialog, ProjectMgr) {
                    $scope.zipFile = "";
                    $scope.status = {
                        upgradeBtnEnable : false,
                        msg: null
                    };
                    $scope.setFiles = function () {
                        fileDialog.openFile(function (d) {
                            $scope.zipFile = d;
                            try {
                                var manifest = ProjectMgr.chtool.readUpgradeFileInfo($scope.zipFile);
                                $scope.status.upgradeBtnEnable = true;
                                $scope.status.msg = "升级包信息：" + manifest.from + ' => ' + manifest.to;
                            } catch (e) {
                                $scope.status.upgradeBtnEnable = false;
                                $scope.status.msg = e.message;
                            }
                            $scope.$apply();
                        })
                    };
                    $scope.upgrade = function () {
                        ProjectMgr.chtool.upgradeFromFile($scope.zipFile);
                        $modalInstance.close();
                    }
                    $scope.cancel = function () {
                        $modalInstance.dismiss();
                    };
                }
            });
            instance.result.then(
                function () {
                    gui.App.restart();
                }
            );
        }
    }));
    optionMenu.submenu = optionSubMenu;

    // Add some items
    menu.append(optionMenu);
    gui.Window.get().menu = menu;
}

//Dynamic SDK View
function SDKTemplate(SDKName, SDKList){
    var getControlNode = function(key, value){
        var nodeText = '',
            desc = value.desc,
            descLow = key.toLowerCase(),
            datafield = key,
            type = value.type;

        if(type === 'string'){
            nodeText =  '<div class="control-group">'
            + '<label class="control-label" for="@descLow">@desc</label>'
            + '<div class="controls">'
            + '<input id="@descLow" name="@descLow" type="text" style="width:60%;" ng-model="selectedSDK.config.@datafield" />'
            + '</div>'
            + '</div>';
        }
        if(type === 'int' || type === 'float'){
            nodeText =  '<div class="control-group">'
            + '<label class="control-label" for="@descLow">@desc</label>'
            + '<div class="controls">'
            + '<input id="@descLow" name="@descLow" type="number" style="width:60%;" ng-model="selectedSDK.config.@datafield" />'
            + '</div>'
            + '</div>';
        }
        if(type === 'url'){
            nodeText =  '<div class="control-group">'
            + '<label class="control-label" for="@descLow">@desc</label>'
            + '<div class="controls">'
            + '<input id="@descLow" name="@descLow" type="url" style="width:60%;" ng-model="selectedSDK.config.@datafield" />'
            + '</div>'
            + '</div>';
        }
        if(type === 'boolean'){
            nodeText = '<div class="control-group" >'
            + '<label class="control-label">@desc</label>'
            + '<div class="controls">'
            + '<div class="btn-group">'
            + '<label class="btn btn-primary" ng-model="selectedSDK.config.@datafield" btn-radio="true">是</label>'
            + '<label class="btn btn-primary" ng-model="selectedSDK.config.@datafield" btn-radio="false">否</label>'
            + '</div>'
            + '</div>'
            + '</div>';
        }

        nodeText = nodeText.replace(/@desc/g, desc);
        nodeText = nodeText.replace(/@descLow/g, descLow);
        nodeText = nodeText.replace(/@datafield/g, datafield);

        return nodeText;
    };

    var result = "";
    var SDKConfig = _.findWhere(SDKList, {name: SDKName});

    for(var i=0; i<SDKConfig.cfgitem.length; i++){
        result += getControlNode(SDKConfig.cfgitem[i].name, SDKConfig.cfgitem[i]);
    }

    return result;
}


