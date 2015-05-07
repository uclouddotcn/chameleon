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
            .state('bindproject', {
                url: '/bindproject',
                templateUrl: 'partials/bindproject.html',
                controller: 'BindProjectCtrl'
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
                                cellTemplate: '<div class="progress"><div class="progress-bar" role="progressbar" style="width:0%;"></div></div>'
                            },
                            {
                                field: 'packingMessage',
                                width: '20%',
                                cellTemplate: '<div ng-class="ngCellText" class="message">{{row.getProperty(col.field)}}</div>'
                            }
                        ]
                    };
                    $scope.isPackDisabled = false;

                    $scope.pack = function(){
                        var channelToPack = $scope.gridOptions9.$gridScope.selectedItems;
                        $('.progress-bar').css({'width': '0%'});

                        _.each($scope.selectedChannels, function(element, index){
                            element.index = index;
                            element.packingMessage = '';
                        });

                        APKVersion = "1.0";

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
                                        channel.packingMessage = '打包失败';
                                        $($('.message')[channel.index]).css({'color': 'red'});
                                        $scope.$apply();
                                        return callback(null);
                                    }
                                    $($('.progress-bar')[channel.index]).css({'width': '100%'});
                                    channel.packingMessage = '打包成功';
                                    $($('.message')[channel.index]).css({'color': 'green'});
                                    $scope.$apply();
                                    callback(null);
                                },
                                function (data) {
                                    if (data) {
                                        var reg = new RegExp("$", "g");
                                        var num = data.match(reg).length;

                                        channel.progress += 10 * num;
                                        $($('.progress-bar')[channel.index]).css({'width': channel.progress + '%'});
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
                            console.log(JSON.stringify(datas));
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
                    }
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
            .state('loadsdk', {
                url: '/loadsdk/:projectId',
                template: '',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', 'WaitingDlg',
                        function ($stateParams, ProjectMgr, WaitingDlg) {
                            var promise = ProjectMgr.loadProject($stateParams.projectId);
//                            return WaitingDlg.wait(promise, "加载工程中");
                            return promise;
                        }]
                },
                controller: ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg', 'globalCache', function ($scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg, globalCache) {
                    console.log(project);
                    $scope.show.index = true;

                    var promise = ProjectMgr.getProjectList();
                    promise.then(
                        function (data) {
                            $scope.projects = data;
                        }
                    );
                    var signcfg = project.getSignCfg();
                    var cfg = project.cloneGlobalCfg();
                    var sdkset = project.getAllSDKs();

                    $scope.selectedsdk = {
                        cfg: cfg,
                        signcfg: signcfg,
                        desc: '全局配置',
                        sdkset: sdkset,
                        isnew: false,
                        outdated: false,
                        updateFunc: function () {
                            return ProjectMgr.updateGlobalCfg(project,
                                cfg);
                        }
                    };

                    if (project) {
                        $scope.show.index = false;
                        $scope.show.header = 'loadSdk';
                        $state.go('project.globalsdk', {projectId: globalCache.projectId});
                    }

                    //测试数据
                    var selected = [];
                    $scope.sdks = [];
                    for (var i in sdkset) {
                        $scope.sdks.push(sdkset[i]);
                    }

                    $scope.installedSDKTable = {
                        data: 'sdks',
                        columnDefs: [
                            {
                                displayName: 'SDK列表',
                                field: 'desc',
                                width: '*',
                                resizable: false,
                                groupable: false
                            }
                        ],
                        multiSelect: false,
                        selectedItems: selected,
                        showSelectionCheckbox: false,
                        showGroupPanel: false,
                        showFooter: false,
                        afterSelectionChange: function () {
                            if (selected.length <= 0) {
                                return;
                            }
                            console.log(selected)
                            var sdk = selected[0];
                            if (sdk.sdkid) {
                                console.log(sdk)
                                var params = {
                                    sdkname: sdk.sdkid
                                };
                                var cfg = sdk.cloneCfg();
                                console.log(cfg)
                                $scope.selectedsdk = {
                                    cfg: cfg,
                                    data: sdk,
                                    name: sdk.desc,
                                    outdated: false,
                                    updateFunc: function () {
                                        return ProjectMgr.updateSDKCfg(
                                            project, cfg, sdk);
                                    }
                                };
                                //sdk 右边变化
                                $state.go('project.othersdk', params);
                            } else {
                                var cfg = project.cloneGlobalCfg();
                                $scope.selectedsdk = {
                                    cfg: cfg,
                                    signcfg: project.getSignCfg(),
                                    desc: '全局配置2',
                                    isnew: false,
                                    outdated: false,
                                    updateFunc: function () {
                                        return ProjectMgr.updateGlobalCfg(project,
                                            cfg);
                                    }
                                };
                                $state.go('project.globalsdk');
                            }
                        },
                        rowTemplate: '<div style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
                    };

                    //测试数据

                }]
            })
            .state('project', {
                abstract: true,
                url: '/project/:projectId',
                templateUrl: 'partials/project.html',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', 'WaitingDlg', '$q',
                        function ($stateParams, ProjectMgr, WaitingDlg, $q) {
                            var defered = $q.defer();
                            // 全部数据
                            var promise = ProjectMgr.loadProject($stateParams.projectId);
                            promise = WaitingDlg.wait(promise, "加载工程中");
                            promise.then(function (project) {
                                ProjectMgr.checkProjectUpgrade(project, function (err, desc) {
                                    // show desc
                                    defered.resolve(project);
                                });
                            }, function (err) {
                                defered.reject(err);
                            })
                            return defered.promise;
                        }]
                },
                controller: ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg', function ($scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg) {
                    (function InitProject() {
                        $scope.project = project;
                        $scope.projectDoc = project.__doc;
                        $scope.toolversion = ProjectMgr.version
                        $scope.openUpgradePanel = function () {
                            var instance = $modal.open({
                                templateUrl: 'partials/upgrade.html',
                                controller: 'UpgradeController',
                                backdrop: false,
                                keyboard: false,
                                resolve: {
                                    project: function () {
                                        return project;
                                    },
                                    outdatedChannels: function () {
                                        var oudatedInfos = project.getOutdatedProject()
                                        var res = [];
                                        for (var chname in oudatedInfos) {
                                            var infoObj = oudatedInfos[chname];
                                            var res1 = [];
                                            for (var i in infoObj.libs) {
                                                var sdk = ProjectMgr.sdkset.getChannelSDK(infoObj.libs[i].name);
                                                if (!sdk) {
                                                    $log.log('Fail to find sdk for ' + chname);
                                                    continue;
                                                }
                                                res1.push({
                                                    desc: sdk.desc,
                                                    name: infoObj.libs[i].name,
                                                    from: infoObj.libs[i].fromdesc,
                                                    to: infoObj.libs[i].todesc
                                                })
                                            }
                                            res.push({
                                                name: chname,
                                                depends: res1,
                                                needReconfig: infoObj.isMajorOutdated
                                            });
                                        }
                                        return res;
                                    }
                                }
                            });
                            instance.result.then(function () {
                                $state.go($state.$current, null, {reload: true});
                            })
                        };

                        $scope.upgradeAndCompile = function () {
                            if ($scope.isOutdated) {
                                alert("请先升级工程");
                                return;
                            }
                            var promise = ProjectMgr.compileProject(
                                $scope.project, $scope.channel.name);
                            promise = WaitingDlg.wait(promise, "编译中");
                            promise.then(function (res) {
                                if (res.code != 0) {
                                    $modal.open({
                                        templateUrl: 'partials/logpanel.html',
                                        controller: 'LogPanelController',
                                        resolve: {
                                            logs: function () {
                                                return [res];
                                            }
                                        }
                                    });
                                }
                                if ($scope.channel.outdated) {
                                    ProjectMgr.upgradeChannel($scope.project,
                                        $scope.channel.name);
                                    $scope.channel.outdated = null;
                                    delete $scope.project.outdatedChannels[$scope.channel.name]
                                    for (var i in $scope.channels) {
                                        if ($scope.channels[i].name == $scope.channel.name) {
                                            $scope.channels[i].outdated = null;
                                            $scope.channels[i].data.outdated = null;
                                            break;
                                        }
                                    }
                                }
                            });

                        }
                        $scope.tab = [
                            {
                                active: true
                            },
                            {
                                active: false
                            }
                        ];
                    })();
                    console.log(project);
                    $scope.formAble = true;

                    // sign manipulation
                    $scope.getSignDesc = function () {
                        var pathLib = require('path');
                        if ($scope.selectedsdk && $scope.selectedsdk.signcfg) {
                            return pathLib.basename($scope.selectedsdk.signcfg.keystroke);
                        } else {
                            return '未设定签名配置';
                        }
                    };

                    $scope.setSignCfg = function () {
                        var instance = $modal.open({
                            templateUrl: 'partials/setsign.html',
                            controller: 'SetSignController',
                            backdrop: false,
                            keyboard: false,
                            resolve: {
                                signcfg: function () {
                                    var signcfg = null;
                                    if (!$scope.selectedsdk.signcfg) {
                                        signcfg = {
                                            keystroke: '',
                                            keypass: '',
                                            storepass: '',
                                            alias: ''
                                        };
                                    } else {
                                        var pathLib = require('path');

                                        if (!$scope.selectedsdk.signcfg.keystroke) {
                                            var keystroke = '';
                                        } else {
                                            var keystroke = pathLib.join($scope.projectDoc.path, $scope.selectedsdk.signcfg.keystroke);
                                        }
                                        signcfg = {
                                            keystroke: keystroke,
                                            keypass: $scope.selectedsdk.signcfg.keypass,
                                            storepass: $scope.selectedsdk.signcfg.storepass,
                                            alias: $scope.selectedsdk.signcfg.alias
                                        };
                                    }
                                    return signcfg;
                                }
                            }
                        });
                        instance.result.then(function (signcfg) {

                            var pathLib = require('path');
                            var relpath = pathLib.relative($scope.projectDoc.path,
                                signcfg.keystroke);
                            if (pathLib.sep !== '/') {
                                relpath = relpath.split(pathLib.sep).join('/');
                            }
                            console.log('pathLib:' + pathLib)
                            signcfg.keystroke = relpath;
                            var promise = ProjectMgr.updateSignCfg(
                                $scope.project,
                                null,
                                signcfg);
                            promise = WaitingDlg.wait(promise, "更新签名配置");
                            promise.then(function (obj) {
                                $scope.selectedsdk.signcfg = signcfg;
                                project.updateSignCfg(
                                    null,
                                    signcfg);
                            }, function (err) {
                                // TODO: error handling
                            });
                        }, function () {
                            console.log('dialog dismissed');
                        });
                    };


                    $scope.selectSDKPanel = function () {
                        if (!$scope.selectedsdk) {
                            return;
                        }
                        if ($scope.selectedsdk.data) {
                            var params = {
                                sdkname: $scope.selectedsdk.data.sdkid
                            };
                            $state.go('project.othersdk', params);
                        } else {
                            $state.go('project.globalsdk');
                        }
                    };

                    $scope.selectChannelPanel = function () {
                        $state.go('project.channel');
                    };


                    (function SettingUpChTable() {
                        $scope.channels = [];
                        var projectIcons =
                            ProjectMgr.loadIcon(project.prjPath, project.am.getIcon());
                        var channels = project.getAllChannels();
                        for (var i in channels) {

                            $scope.channels.push(channels[i]);
                        }

                        $scope.channel = null;
                        var selectedChannel = [];
                        var initShownChannel = function (nowChannel) {
                            if (project.orient === 'portrait') {
                                var scHeight = 180;
                                var scWidth = 120;
                            } else {
                                var scHeight = 120;
                                var scWidth = 180;
                            }
                            var iconshown = nowChannel.shownIcon;
                            if (!iconshown) {
                                iconshown = projectIcons['medium'] || projectIcons['high'] || projectIcons['xhigh'];
                            }
                            var sdk = null;
                            if (nowChannel.userSDK) {
                                sdk = project.getSDKCfg(nowChannel.userSDK);
                            }
                            $scope.channel = {
                                desc: nowChannel.desc,
                                splashscreen: nowChannel.splashscreen,
                                sdk: sdk,
                                data: nowChannel,
                                scWidth: scWidth,
                                scHeight: scHeight,
                                iconshown: iconshown,
                                icons: nowChannel.icons,
                                packageName: project.am.getPkgName() + nowChannel.packageName
                            };
                        }
                        $scope.installedChTable = {
                            data: 'channels',
                            columnDefs: [
                                {
                                    displayName: '渠道列表',
                                    field: 'desc',
                                    width: '*',
                                    resizable: false,
                                    groupable: false
                                }
                            ],
                            multiSelect: false,
                            selectedItems: selectedChannel,
                            showSelectionCheckbox: false,
                            showGroupPanel: false,
                            showFooter: false,
                            afterSelectionChange: function () {
                                if (selectedChannel.length <= 0) {
                                    return;
                                }
                                var nowChannel = selectedChannel[0];
                                initShownChannel(nowChannel);
                                $state.go('project.channel');
                            },
                            rowTemplate: '<div style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
                        };
                        $scope.count = 0;
                        var gridEventHandler = null;
                        $scope.$on('ngGridEventData', function (event) {
                            if (!event.targetScope.tab[1].active ||
                                $scope.installedChTable.gridId != event.targetScope.gridId) {
                                return;
                            }
                            /* something is rendered and nothing is selected */
                            if (event.targetScope.renderedRows.length > 0 &&
                                event.targetScope.selectedItems.length === 0) {
                                event.targetScope.selectionProvider.setSelection(
                                    event.targetScope.renderedRows[0], true);
                            } else if (gridEventHandler) {
                                gridEventHandler();
                                gridEventHandler = null;
                            }
                        });

                        $scope.selectChannelSDK = function () {
                            var instance = $modal.open({
                                templateUrl: 'partials/selectsdk.html',
                                controller: 'SelectChannelController',
                                size: 'lg',
                                backdrop: false,
                                keyboard: false,
                                resolve: {
                                    allsdks: function () {
                                        var sdks = project.getAllSDKs();
                                        var res = [];
                                        var requiredSDK =
                                            $scope.channel.data.requiredSDK;
                                        for (var i in sdks) {
                                            if (sdks[i].sdkid === requiredSDK) {
                                                res.push(sdks[i]);
                                            }
                                        }
                                        return res;
                                    }
                                }
                            });
                            instance.result.then(function (sdk) {
                                if (!$scope.channel.sdk ||
                                    $scope.channel.sdk.name !== sdk.name) {
                                    $scope.channel.isdirty = true;
                                    $scope.channel.sdk = sdk;
                                }
                            }, function () {
                                console.log('dialog dismissed');
                            });
                        };

                        $scope.selectIcon = function () {
                            var icons = projectIcons;
                            var images = $scope.channel.data.metaInfo.getIconOverlay(icons);
                            var instance = $modal.open({
                                templateUrl: 'partials/selectIcon.html',
                                controller: 'SelectIconController',
                                size: 'lg',
                                backdrop: false,
                                keyboard: false,
                                resolve: {
                                    images: function () {
                                        return images;
                                    },
                                    config: function () {
                                        if (!$scope.channel.icons) {
                                            return {
                                                position: 3
                                            };
                                        }
                                        return $scope.channel.icons;
                                    },
                                    project: function () {
                                        return $scope.project;
                                    }
                                }
                            });
                            instance.result.then(function (infos) {
                                $scope.channel.icons = infos;
                                $scope.channel.iconshown = null;
                                $scope.channel.iconshown =
                                    infos.tempicons['medium'] ||
                                    infos.tempicons['high'] ||
                                    infos.tempicons['xhigh'];
                                $scope.channel.isdirty = true;

                            }, function () {
                                console.log('dialog dismissed');
                            });
                        }


                        $scope.addChannel = function () {
                            var instance = $modal.open({
                                templateUrl: 'partials/addchannel.html',
                                controller: 'AddChannelController',
                                size: 'lg',
                                backdrop: false,
                                keyboard: false,
                                resolve: {
                                    channels: function () {
                                        var channels = ProjectMgr.getAllChannels();
                                        var installedChannels =
                                            $scope.channels.map(function (x) {
                                                return x.name;
                                            });
                                        var uninstalled =
                                            channels.filter(function (x) {
                                                for (var i in installedChannels) {
                                                    if (installedChannels[i] === x.name) {
                                                        return false;
                                                    }
                                                }
                                                return true;
                                            });
                                        return uninstalled;
                                    }
                                }
                            });
                            instance.result.then(function (channel) {
                                var newChannel = ProjectMgr.newChannel(project, channel.name);
                                $scope.channels.push(newChannel);
                                var l = $scope.channels.length - 1;
                                gridEventHandler = function () {
                                    $scope.installedChTable.selectRow(
                                        l, true);
                                };
                            }, function () {
                                console.log('dialog dismissed');
                            });
                        };
                    })();

                    (function SettingUpSDKTable() {
                        $scope.selectedsdk = null;
                        //这里是列表数据
                        var sdkset = project.getAllSDKs();
                        $scope.needShow = Boolean(sdkset.length);


                        $scope.sdks = [];
                        for (var i in sdkset) {
                            $scope.sdks.push(sdkset[i]);
                        }
                        var selected = [];

                        $scope.installedSDKTable = {
                            data: 'sdks',
                            columnDefs: [
                                {
                                    displayName: 'SDK列表',
                                    field: 'desc',
                                    width: '*',
                                    resizable: false,
                                    groupable: false
                                }
                            ],
                            multiSelect: false,
                            selectedItems: selected,
                            showSelectionCheckbox: false,
                            showGroupPanel: false,
                            showFooter: false,
                            afterSelectionChange: function () {
                                if (selected.length <= 0) {
                                    return;
                                }

                                var sdk = selected[0];
                                if (sdk.sdkid) {

                                    var params = {
                                        sdkname: sdk.sdkid
                                    };
                                    var cfg = sdk.cloneCfg();

                                    $scope.selectedsdk = {
                                        cfg: cfg,
                                        data: sdk,
                                        name: sdk.desc,
                                        outdated: false,
                                        updateFunc: function () {
                                            return ProjectMgr.updateSDKCfg(
                                                project, cfg, sdk);
                                        }
                                    };
                                    //sdk 右边变化
                                    $state.go('project.othersdk', params);
                                } else {
                                    var cfg = project.cloneGlobalCfg();
                                    $scope.selectedsdk = {
                                        cfg: cfg,
                                        signcfg: project.getSignCfg(),
                                        desc: '全局配置2',
                                        isnew: false,
                                        outdated: false,
                                        updateFunc: function () {
                                            return ProjectMgr.updateGlobalCfg(project,
                                                cfg);
                                        }
                                    };
                                    $state.go('project.globalsdk');
                                }
                            },
                            rowTemplate: '<div style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
                        };
                        var gridEventHandler = null;
                        $scope.$on('ngGridEventData', function (event) {
                            if (!event.targetScope.tab[0].active ||
                                $scope.installedSDKTable.gridId != event.targetScope.gridId) {
                                return;
                            }
                            /* something is rendered and nothing is selected */
                            if (event.targetScope.renderedRows.length > 0 &&
                                event.targetScope.selectedItems.length === 0) {
                                event.targetScope.selectionProvider.setSelection(
                                    event.targetScope.renderedRows[0], true);
                            } else if (gridEventHandler) {
                                gridEventHandler();
                                gridEventHandler = null;
                            }
                        });

                        $scope.addSDK = function () {
                            var instance = $modal.open({
                                templateUrl: 'partials/addsdk.html',
                                controller: 'AddSDKController',
                                size: 'lg',
                                backdrop: false,
                                keyboard: false,
                                resolve: {
                                    supportedSDK: function () {
                                        return ProjectMgr.getSupportedDKs();
                                    }
                                }
                            });
                            instance.result.then(function (info) {
                                var promise =
                                    ProjectMgr.newSDK(project, info.sdk.name, info.desc);
                                promise = WaitingDlg.wait(promise, '创建新的SDK配置');
                                promise.then(function (sdkcfg) {
                                    $scope.sdks.push(sdkcfg);
                                    var l = $scope.sdks.length - 1;
                                    gridEventHandler = function () {
                                        $scope.installedSDKTable.selectRow(
                                            l, true);
                                    };
                                }, function (err) {
                                    alert(err.message);
                                });
                            }, function () {
                                console.log('dialog dismissed');
                            });
                        };

                        console.log($scope)

                    })();

                }]
            })
            .state('project.globalsdk', {
                url: '/sdk/globalsdk',
                templateUrl: 'partials/channelglobalcfg.html'
            })
            .state('project.othersdk', {
                url: '/sdk/:sdkname',
                templateUrl: function ($stateParams) {
                    var fs = require('fs');
                    var filename = 'partials/channels/' + $stateParams.sdkname + '.html';
                    if (fs.existsSync(filename)) {
                        return filename;
                    } else {
                        return 'partials/sdkdefault.xml';
                    }
                },
                controller: ['$scope', function ($scope) {
                    console.log($scope)

                }]

            })
            .state('project.channel', {
                url: '/channel/:channelname',
                templateUrl: 'partials/channeldefault.html'
            })
            .state('loadmethod.channel', {
                url: '/channel/:channelname',
                controller: 'loadMethod'
            })
            .state('loadmethod.channel.sdkconfig', {
                url: '/sdkconfig',
                views: {
                    'sdkconfig': {
                        templateUrl: 'partials/selectsdkconfig.html'
                    }
                },
                controller: 'SelectChannelController'
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
};


