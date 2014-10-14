'use strict';

/* App Module */
var chameleonApp = angular.module('chameleonApp', [
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
    .factory('globalCache',[function(){
        var globalCache;

        globalCache = {
            projectId : '',
            rowIndex  : '',
            project   : '',
            allsdks   : ''
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
                url: '/playmanage/:projectId',
                templateUrl: 'partials/play_manage.html',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', 'WaitingDlg','globalCache', '$q',
                        function ($stateParams, ProjectMgr, WaitingDlg,globalCache, $q) {

                            var defered = $q.defer();
                            // 全部数据
                            var promise = ProjectMgr.loadProject($stateParams.projectId);
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
                controller: ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg','globalCache', function ($scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg,globalCache) {
                    $scope.show.index = true;
                    $scope.show.header = 'loadPlayManage';
                    $scope.project = project;

                    $scope.projectDoc = project.__doc;
                    $scope.toolversion = ProjectMgr.version;
                    $scope.hasChanged = false;
                    $scope.hasChangedLandscape = false;
                    var promise = ProjectMgr.getProjectList();
                    globalCache.project = project;
                    promise.then(
                        function (data) {
                            $scope.projects = data;
                        }
                    );
                    var signcfg = project.getSignCfg();
                    var cfg = project.cloneGlobalCfg();
                    var sdkset = project.getAllSDKs();


                    $scope.$watch('selectedsdk.cfg.landscape',function(nw,ow){
                        $scope.hasChangedLandscape = nw == ow ? false : true;

                    })
                    $scope.selectedsdk = {
                        cfg: cfg,
                        signcfg: signcfg,
                        desc: '全局配置',
                        sdkset:sdkset,
                        isnew: false,
                        outdated: false,
                        updateFunc: function () {
                            return ProjectMgr.updateGlobalCfg(project,
                                cfg);
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
                                            console.log($scope.projectDoc);
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
//                    $scope.updateCurrentCfg = function () {
//                        alert(1)
//                        var sdk = $scope.selectedsdk;
//                        var promise = sdk.updateFunc();
//                        promise = WaitingDlg.wait(promise, '更新配置中');
//                        promise.then(function () {
//                        }, function (e) {
//                            alert(e.message);
//                        });
//                    };

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
                controller: ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg','globalCache', function ($scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg,globalCache) {
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
                        sdkset:sdkset,
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
                templateUrl: 'partials/load_method.html',
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
                                        console.log(res)
                                        return res;
                                    }
                                }
                            });
                            instance.result.then(function () {
                                $state.go($state.$current, null, { reload: true });
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
                                                console.log(res.s)
                                                return [res.s];
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
                controller : ['$scope',function($scope){
                    console.log($scope)

                }]

            })
            .state('project.channel', {
                url: '/channel/:channelname',
                templateUrl: 'partials/channeldefault.html'
            })
            .state('loadmethod.channel', {
                url: '/channel/:channelname',
                controller : 'loadMethod'
            })
            .state('loadmethod.channel.sdkconfig', {
                url: '/sdkconfig',
                views : {
                    'sdkconfig' : {
                        templateUrl: 'partials/selectsdkconfig.html'
                    }
                },
                controller: 'SelectChannelController'
            })
            .state('versionManage',{
                url : '/versionManage/:projectId',
                templateUrl : 'partials/version_manage.html',
                resolve: {
                    project: ['$stateParams', 'ProjectMgr', 'WaitingDlg',
                        function ($stateParams, ProjectMgr, WaitingDlg) {
                            // 全部数据
                            var promise = ProjectMgr.loadProject($stateParams.projectId);
                            return WaitingDlg.wait(promise, "加载工程中");
//                            return promise;
                        }],
                    versionManages : ['$http',function($http){
                        return $http({
                            method : 'GET',
                            url : 'js/versionManage.json'
                        })
                    }]
                },
                controller : 'versionCtrl'

            })
    }])

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



