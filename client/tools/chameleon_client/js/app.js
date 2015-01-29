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
            createMenu($modal);
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
                url: '/playmanage/:project',
                templateUrl: 'partials/projectManager.html',
                resolve: {
                    project: ['$stateParams', function ($stateParams) {
                            return JSON.parse($stateParams.project);
                        }]
                },
                controller: ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg', 'globalCache', function ($scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg, globalCache) {
                    var _ = require('underscore');
                    var fs = require('fs');
                    //project manage
                    $scope.project = project;
                    $scope.fileread = project.signConfig.keyStoreFile;
                    $scope.isProjectUnchanged = true;
                    $scope.setFiles = function(element){
                        if(element[0].name == "channel") $scope.selectedChannel.signConfig.keyStoreFile = $scope.fileread.path;
                        if(element[0].name == "project") $scope.project.signConfig.keyStoreFile = $scope.fileread.path;
                        if(element[0].name == "splash") $scope.selectedChannel.config.splash = $scope.fileread.path;
                        if(element[0].name == "icon") {
                            if(!$scope.selectedChannel.config.icon) $scope.selectedChannel.config.icon = {};
                            $scope.selectedChannel.config.icon.path = $scope.fileread.path;
                            $scope.pictureToDraw = {
                                base: $scope.selectedChannel.config.icon.path,
                                overlay: $scope.selectedChannel.config.icon.position
                            }
                        }
                    }
                    $scope.saveProjectConfig = function(){
                        var promise = ProjectMgr.updateProject($scope.project);
                        promise.then(function(data){
                            if(!data){
                                alert("Update project config failed.");
                            }
                            $scope.isProjectUnchanged = true;
                        });
                    };

                    $scope.$watch('project', function(newValue, oldValue) {
                        if(newValue !== oldValue) $scope.isProjectUnchanged = false;
                    }, true);

                    //channel manage
                    $scope.hideGrid = true;
                    $scope.selectedChannels = { };
                    $scope.channelList = ProjectMgr.getChannelList();
                    $scope.gridOptions1 = {
                        data: 'channelList',
                        columnDefs: [{
                            field: 'desc',
                            displayName: " 备选渠道列表",
                            cellTemplate: '<div ng-class="ngCellText" ><input style="margin:2px;" type="checkbox" ng-click="toggleChannel($event, row.entity)" ng-checked="{{row.entity.checked}}" class="selectChannel" />{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.gridOptions2 = {
                        data: 'selectedChannels',
                        multiSelect: false,
                        columnDefs: [{
                            field: 'desc',
                            displayName: "已选渠道列表",
                            cellTemplate: '<div ng-class="ngCellText" style="margin: 2px;">{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    var promise = ProjectMgr.getAllChannels($scope.project);
                    promise.then(function(){
                        $scope.selectedChannels = $scope.project.channels;
                        if($scope.selectedChannels.length > 0){
                            //set channelList checkbox value.
                            for(var i=0; i<$scope.selectedChannels.length; i++){
                                (_.findWhere($scope.channelList, {channelName: $scope.selectedChannels[i].channelName})).checked = true;
                            }
                        }
                        $scope.hideGrid = false;
                    });
                    $scope.toggleChannel = function(event, channel){
                        if(event.target.checked){
                            var promise = ProjectMgr.setChannel($scope.project, channel);
                            promise.then(function(){
                                $scope.project.channels.push(channel);
                                $scope.selectedChannels = $scope.project.channels;
                            });
                        }else{
                            var channelToDelete = _.findWhere($scope.project, {channelName: channel.channelName});
                            var promise = ProjectMgr.deleteChannel($scope.project, channelToDelete);
                            promise.then(function(){
                                $scope.project.channels = _.reject($scope.project.channels, function(element){
                                    return element.channelName == channel.channelName;
                                });
                                $scope.selectedChannels = $scope.project.channels;
                            });
                        }
                    };
                    $scope.selectChannel = function(event, channel){
                        $scope.selectedChannel = channel;
                        $scope.selectedSDKs = channel.sdks;
                        $scope.hideGridOptions4 = true;
                        setTimeout(function(){
                            for(var i=0; i<$scope.selectedSDKs.length; i++){
                                (_.findWhere($scope.SDKList, {name: $scope.selectedSDKs[i].name})).checked = true;
                            }
                            $scope.hideGridOptions4 = false;
                        }, 500);
                    };


                    //sdk manage
                    $scope.selectedChannel = { };
                    $scope.SDKList = ProjectMgr.getSDKList();
                    $scope.gridOptions3 = {
                        data: 'selectedSDKs',
                        multiSelect: false,
                        columnDefs: [{
                            field: 'desc',
                            displayName: "SDK列表",
                            cellTemplate: '<div ng-class="ngCellText" >{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.gridOptions4 = {
                        data: 'SDKList',
                        columnDefs: [{
                            field: 'desc',
                            displayName: "SDK",
                            cellTemplate: '<div ng-class="ngCellText" ><input id="{{row.entity.name}}" style="margin:2px;" type="checkbox" ng-click="toggleSDK($event, row.entity)" ng-checked="{{row.entity.checked}}" class="sdkList" />{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.gridOptions5 = {
                        data: 'selectedChannels',
                        multiSelect: false,
                        columnDefs: [{
                            field: 'desc',
                            displayName: "渠道名",
                            cellTemplate: '<div ng-class="ngCellText" ng-click="selectChannelForSDK($event, row.entity)">{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.toggleSDK = function(event, sdk){
                        if(event.target.checked){
                            $scope.selectedChannel.sdks.push(sdk);
                            (_.findWhere($scope.project.channels, {channelName: $scope.selectedChannel.channelName})).sdks = $scope.selectedChannel.sdks;
                            $scope.selectedSDKs = $scope.selectedChannel.sdks;
                            ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                        }else{
                            $scope.selectedChannel.sdks = _.reject($scope.selectedChannel.sdks, function(element){
                                return element.name == sdk.name;
                            });
                            (_.findWhere($scope.project.channels, {channelName: $scope.selectedChannel.channelName})).sdks = $scope.selectedChannel.sdks;
                            $scope.selectedSDKs = $scope.selectedChannel.sdks;
                            ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                        }
                    }
                    $scope.selectChannelForSDK = function(event, channel){
                        //hack css to fix grid problem.
                        $('.sdkList').prop({'checked':false});
                        $scope.selectedChannel = channel;
                        $scope.selectedSDKs = channel.sdks;
                        for (var i = 0; i < $scope.selectedSDKs.length; i++) {
                            (_.findWhere($scope.SDKList, {name: $scope.selectedSDKs[i].name})).checked = true;
                            $('#' + $scope.selectedSDKs[i].name).prop({'checked': true});
                        }
                    }

                    //sdk config
                    $scope.gridOptions6 = {
                        data: 'selectedChannels',
                        multiSelect: false,
                        afterSelectionChange: function(rowItem, event){
                            var channel = rowItem.entity;
                            $scope.selectedChannel = channel;
                            $scope.fileread = channel.signConfig.keyStoreFile;
                            $scope.selectedSDKs = channel.sdks;
                            $scope.selectedSDK = {};
                            $('#SDKConfigView').empty();
                        },
                        columnDefs: [{
                            field: 'desc',
                            displayName: "渠道名",
                            cellTemplate: '<div ng-class="ngCellText">{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.gridOptions7 = {
                        data: 'selectedSDKs',
                        multiSelect: false,
                        afterSelectionChange: function(rowItem, event){
                            var sdk = rowItem.entity;
                            $scope.selectedSDK = sdk;
                            $scope.SDKConfigHtml = SDKTemplate(sdk.name);
                        },
                        columnDefs: [{
                            field: 'desc',
                            displayName: "SDK列表",
                            cellTemplate: '<div ng-class="ngCellText" >{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.selectChannelForConfig = function(event, channel){
                        $scope.selectedChannel = channel;
                        $scope.fileread = channel.signConfig.keyStoreFile;
                        $scope.selectedSDKs = channel.sdks;
                        $scope.selectedSDK = {};
                        $('#SDKConfigView').empty();
                    }
                    var SDKTemplate = function(SDKName){
                        var result = "";
                        var SDKInfo = fs.readFileSync('././res/sdklist.json', 'utf-8');
                        SDKInfo = SDKInfo.replace('/\n/g', '');
                        var context = JSON.parse(SDKInfo);
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
                                + '<input id="@descLow" name="@descLow" type="text" style="width:60%;" ng-model="selectedSDK.@datafield" />'
                                + '</div>'
                                + '</div>';
                            }
                            if(type === 'int' || type === 'float'){
                                nodeText =  '<div class="control-group">'
                                + '<label class="control-label" for="@descLow">@desc</label>'
                                + '<div class="controls">'
                                + '<input id="@descLow" name="@descLow" type="number" style="width:60%;" ng-model="selectedSDK.@datafield" />'
                                + '</div>'
                                + '</div>';
                            }
                            if(type === 'url'){
                                nodeText =  '<div class="control-group">'
                                + '<label class="control-label" for="@descLow">@desc</label>'
                                + '<div class="controls">'
                                + '<input id="@descLow" name="@descLow" type="url" style="width:60%;" ng-model="selectedSDK.@datafield" />'
                                + '</div>'
                                + '</div>';
                            }
                            if(type === 'boolean'){
                                nodeText = '<div class="control-group" >'
                                + '<label class="control-label">@desc</label>'
                                + '<div class="controls">'
                                + '<div class="btn-group">'
                                + '<label class="btn btn-primary" ng-model="selectedSDK.@datafield" btn-radio="true">是</label>'
                                + '<label class="btn btn-primary" ng-model="selectedSDK.@datafield" btn-radio="false">否</label>'
                                + '</div>'
                                + '</div>'
                                + '</div>';
                            }
                            nodeText = nodeText.replace(/@desc/g, desc);
                            nodeText = nodeText.replace(/@descLow/g, descLow);
                            nodeText = nodeText.replace(/@datafield/g, datafield);
                            return nodeText;
                        }
                        var SDKConfig = _.findWhere(context.channels, {name: SDKName});
                        for(var key in SDKConfig.cfgitem){
                            result += getControlNode(key, SDKConfig.cfgitem[key]);
                        }
                        return result;
                    }
                    $scope.setSDKConfig = function(){
                        ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                    }
                    $scope.generateConfigFile = function(){
                        var path = './res/output.json';
                        var dirName = ProjectMgr.dirName();
                        var project = $scope.project||{};
                        var channel = $scope.selectedChannel;
                        var root = dirName.substr(0, dirName.length-2);
                        var data = {};
                        data.projectName = project.name;
                        data.landscape = project.landscape;
                        data.signConfig = project.signConfig;
                        if(channel){
                            data.channel = {};
                            data.channel.channelName = channel.channelName;
                            data.channel.packageName = channel.config.packageName;
                            data.channel.splashPath = channel.config.splash;
                            data.channel.iconPath = root + 'res/channels/' + channel.channelName + '.png';
                            if(channel.sdks && channel.sdks.length>0){
                                data.channel.sdks = [];
                                for(var i =0; i<channel.sdks.length; i++){
                                    data.channel.sdks.push({
                                        name: channel.channelName,
                                        type: 'pay',
                                        config: channel.sdks[i]
                                    });
                                }
                            }
                        }
                        var buf = new Buffer(JSON.stringify(data));
                        fs.writeFileSync(path, buf);
                    };

                    //icon config
                    $scope.applyPositionToAll = false;
                    $scope.gridOptions8 ={
                        data: 'selectedChannels',
                        multiSelect: false,
                        afterSelectionChange: function(rowItem){
                            var channel = rowItem.entity;
                            $scope.selectedChannel = channel;
                            if(channel.config.icon&&channel.config.icon.path){
                                $scope.pictureToDraw = {
                                    base: $scope.selectedChannel.config.icon.path,
                                    overlay: $scope.selectedChannel.config.icon.position
                                }
                            }else{
                                $scope.pictureToDraw = undefined;
                            }

                            //empty file selection
                            $('#icon').empty();
                        },
                        columnDefs: [{
                            field: 'desc',
                            displayName: '渠道',
                            cellTemplate: '<div ng-class="ngCellText" >{{row.getProperty(col.field)}}</div>'
                        }]
                    }
                    $scope.$watch('selectedChannel.config.icon.position', function(){
                        if($scope.selectedChannel.config){
                            $scope.pictureToDraw = {
                                base: $scope.selectedChannel.config.icon.path,
                                overlay: $scope.selectedChannel.config.icon.position
                            }
                        }
                    });
                    $scope.saveIcon = function(){
                        var canvas = $('#drawingIcon')[0];
                        var channel = $scope.selectedChannel;
                        var saveImage = function(canvas, path){
                            var dataURL = canvas.toDataURL();
                            var data = dataURL.replace(/^data:image\/\w+;base64,/, "");
                            var buf = new Buffer(data, 'base64');
                            fs.writeFileSync(path, buf);
                        }
                        var saveImageWithoutDisplay = function(canvas, base, overlay, path, channel){
                            var drawImage = function(canvas, base, overlay, path){
                                var context = canvas.getContext('2d');
                                var baseImage = new Image();
                                var overlayImage = new Image();
                                var readyFlag = 0;
                                var saveImage = function(canvas, path){
                                    var dataURL = canvas.toDataURL();
                                    var data = dataURL.replace(/^data:image\/\w+;base64,/, "");
                                    var buf = new Buffer(data, 'base64');
                                    fs.writeFileSync(path, buf);
                                }
                                var drawFunc = function () {
                                    context.clearRect(0, 0, canvas.width, canvas.height);
                                    context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
                                    context.drawImage(overlayImage, 0, 0);
                                    saveImage(canvas, path);
                                }
                                baseImage.onload = function () {
                                    readyFlag += 1;
                                    if (readyFlag < 2) {
                                        return;
                                    }
                                    drawFunc();
                                }
                                overlayImage.onload = function () {
                                    readyFlag += 1;
                                    if (readyFlag < 2) {
                                        return;
                                    }
                                    drawFunc();
                                }
                                baseImage.src = base;
                                overlayImage.src = overlay;
                            }
                            var getOverlayPath = function(position){
                                var path = 'icon-decor-';
                                if(position === 1) path += 'leftup';
                                if(position === 2) path += 'leftdown';
                                if(position === 3) path += 'rightup';
                                if(position === 4) path += 'rightdown';
                                return path + '.png';
                            }
                            var b = base;
                            var o = './res/channels/' + channel.channelName + '/drawable/' + getOverlayPath(overlay);
                            drawImage(canvas, b, o, path);
                        }
                        var path = './res/channels/' + channel.channelName + '/icon/' + channel.channelName + '.png';
                        saveImage(canvas, path);
                        ProjectMgr.setChannel($scope.project, $scope.selectedChannel);
                        //if 'apply to all' is selected.
                        if($scope.applyPositionToAll){
                            var position = $scope.selectedChannel.config.icon.position;
                            for(var i=0; i<$scope.selectedChannels.length; i++){
                                var config = $scope.selectedChannels[i].config;
                                if(config.icon){
                                    config.icon.position = position;
                                    ProjectMgr.setChannel($scope.project, $scope.selectedChannels[i]);
                                    if(config.icon.path){
                                        var savePath = './res/channels/' + $scope.selectedChannels[i].channelName + '/icon/' + $scope.selectedChannels[i].channelName + '.png';
                                        saveImageWithoutDisplay(canvas, config.icon.path, config.icon.position, savePath, $scope.selectedChannels[i]);
                                    }
                                }
                            }
                            $scope.pictureToDraw = {
                                base: $scope.selectedChannel.config.icon.path,
                                overlay: $scope.selectedChannel.config.icon.position
                            }
                        }
                    }
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
            .state('loadmethod', {
                url: '/loadmethod/:projectId',
                templateUrl: 'partials/loadMethod.html',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', 'WaitingDlg',
                        function ($stateParams, ProjectMgr, WaitingDlg) {

                            var promise = ProjectMgr.loadProject($stateParams.projectId);
                            return WaitingDlg.wait(promise, "加载渠道配置中");
                        }]
                },
                controller: 'loadMethod'
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

                        $scope.saveChannel = function () {
                            try {
                                $scope.channel.payLib = $scope.channel.sdk;
                                $scope.channel.userLib = $scope.channel.sdk;
                                var promise = ProjectMgr.setChannel(
                                    project, $scope.channel.data, $scope.channel);
                                promise = WaitingDlg.wait(promise, '更新配置中');
                                promise.then(function (newcfg) {
                                    delete $scope.channel.isdirty;
                                    $scope.disable = false;
                                }, function (e) {
                                    alert(e.message);
                                });
                            } catch (e) {
                                alert(e.message);
                            }
                        }

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

                        $scope.selectSpashScreen = function () {
                            var instance = $modal.open({
                                templateUrl: 'partials/selectSplash.html',
                                controller: 'SelectSplashController',
                                size: 'lg',
                                backdrop: false,
                                keyboard: false,
                                resolve: {
                                    images: function () {
                                        var obj = $scope.channel.data.metaInfo;
                                        var images = obj.getSplashScreen(
                                            project.orient);
                                        return images;
                                    },
                                    orient: function () {
                                        return project.orient;
                                    }
                                }
                            });
                            instance.result.then(function (image) {
                                $scope.channel.splashscreen = image.path;
                                $scope.channel.splashscreenToCp = image;
                                $scope.channel.isdirty = true;
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
                var drawImage = function(canvas, base, overlay){
                    var context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    var baseImage = new Image();
                    var overlayImage = new Image();
                    var readyFlag = 0;
                    var drawFunc = function () {
                        context.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
                        context.drawImage(overlayImage, 0, 0);
                    }
                    baseImage.onload = function () {
                        readyFlag += 1;
                        if (readyFlag < 2) {
                            return;
                        }
                        drawFunc();
                    }
                    overlayImage.onload = function () {
                        readyFlag += 1;
                        if (readyFlag < 2) {
                            return;
                        }
                        drawFunc();
                    }
                    baseImage.src = base;
                    overlayImage.src = overlay;
                }
                var getOverlayPath = function(position){
                    var path = 'icon-decor-';
                    if(position === 1) path += 'leftup';
                    if(position === 2) path += 'leftdown';
                    if(position === 3) path += 'rightup';
                    if(position === 4) path += 'rightdown';
                    return path + '.png';
                }
                var renderIcon = function(){
                    var canvas = element[0];
                    if(!scope.pictureToDraw) {
                        var context = canvas.getContext('2d');
                        context.clearRect(0, 0, canvas.width, canvas.height);
                        return;
                    }
                    if(!scope.pictureToDraw.base) return;
                    if(!scope.pictureToDraw.overlay) return;
                    var channel = scope.selectedChannel;
                    var base = scope.pictureToDraw.base;
                    var overlay = './res/channels/' + channel.channelName + '/drawable/' + getOverlayPath(scope.pictureToDraw.overlay);
                    drawImage(canvas, base, overlay);
                }

                scope.$watch('pictureToDraw', renderIcon);
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



