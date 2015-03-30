'use strict';

/* Controllers */


var chameleonControllers = angular.module('chameleonControllers', ['ui.router']);

chameleonControllers
    .controller('ToolInitCtrl', function($scope) {})
    .controller('loadMethod', ['$scope', '$log', '$stateParams', '$state', '$modal', 'project', 'ProjectMgr', 'WaitingDlg','globalCache', function ($scope, $log, $stateParams, $state, $modal, project, ProjectMgr, WaitingDlg,globalCache) {
        $scope.project = project;

        $scope.project2 = Project.upgradeHistory;

        (function InitProject() {

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
        $scope.show.index = true;
        $scope.disable = true;
        $scope.editinput = function () {
            $scope.disable = false
        }
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


        // compile dialog
        $scope.openBuildDialog = function () {
            $modal.open({
                templateUrl: 'partials/buildproject.html',
                controller: 'BuildProjectController',
                size: 'lg',
                resolve: {
                    project: function () {
                        return project;
                    },
                    defaultSelected: function () {
                        return null;
                    }
                },
                backdrop: false,
                keyboard: false
            });
        };

        // show server management
        $scope.openServerDialog = function () {
            var instance = $modal.open({
                templateUrl: 'partials/serverinfo.html',
                controller: 'ManageServerController',
                size: 'lg',
                backdrop: false,
                keyboard: false,
                resolve: {
                    project: function () {
                        return project;
                    }
                }
            });
            instance.result.then(function (serverInfoStat) {
                if (serverInfoStat) {
                    var doc = project.__doc;
                    doc.svrinfo = serverInfoStat;
                    ProjectMgr.updateProjectDoc(doc);
                }
            });
        };


        //The historical recode update
        $scope.historicalRecode = function () {
            var instance = $modal.open({
                templateUrl: 'partials/historicalRecode.html',
                controller: 'ManageServerController',
                size: 'lg',
                backdrop: false,
                keyboard: false,
                resolve: {
                    project: function () {
                        return project;
                    }
                }
            });
            instance.result.then(function(data){
                console.log(data)
            },function(reason){
                console.log(reason)
            })
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
                    packageName: nowChannel.packageName
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
            $scope.watchPackage = function () {
                $scope.vForm.vPackage.$dirty = true;
            }
            $scope.saveChannel = function () {
                try {
                    $scope.channel.payLib = $scope.channel.sdk;
                    $scope.channel.userLib = $scope.channel.sdk;
                    var promise = ProjectMgr.setChannel(
                        project, $scope.channel.data, $scope.channel);
                    promise = WaitingDlg.wait(promise, '更新配置中');
                    promise.then(function (newcfg) {
                        delete $scope.channel.isdirty;
                        $scope.disable = true;
                        $scope.vForm.vPackage.$dirty = false;
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
                            console.log(sdks);
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
                    console.log(sdk)
                    if (!$scope.channel.sdk ||
                        $scope.channel.sdk.name !== sdk.name) {
                        $scope.channel.isdirty = true;
                        $scope.channel.sdk = sdk;
                    }
                }, function () {
                    console.log('dialog dismissed');
                });

            };

            $scope.editSDK = function() {
                var fs = require('fs');
                var _ = require('underscore');
                var channelname = $scope.channel.data.metaInfo.name;
                var channelTemplate = function(channelName){
                    var result = "";
                    var channelInfo = fs.readFileSync('./channelInfo.json', 'utf-8');
                    var channelInfo = channelInfo.replace('/\n/g', '');
                    var context = JSON.parse(channelInfo);
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
                            + '<input id="@descLow" name="@descLow" type="text" style="width:60%;" ng-model="selectedsdk.cfg.@datafield" />'
                            + '</div>'
                            + '</div>';
                        }
                        if(type === 'int' || type === 'float'){
                            nodeText =  '<div class="control-group">'
                            + '<label class="control-label" for="@descLow">@desc</label>'
                            + '<div class="controls">'
                            + '<input id="@descLow" name="@descLow" type="number" style="width:60%;" ng-model="selectedsdk.cfg.@datafield" />'
                            + '</div>'
                            + '</div>';
                        }
                        if(type === 'url'){
                            nodeText =  '<div class="control-group">'
                            + '<label class="control-label" for="@descLow">@desc</label>'
                            + '<div class="controls">'
                            + '<input id="@descLow" name="@descLow" type="url" style="width:60%;" ng-model="selectedsdk.cfg.@datafield" />'
                            + '</div>'
                            + '</div>';
                        }
                        if(type === 'boolean'){
                            nodeText = '<div class="control-group" >'
                            + '<label class="control-label">@desc</label>'
                            + '<div class="controls">'
                            + '<div class="btn-group">'
                            + '<label class="btn btn-primary" ng-model="selectedsdk.cfg.@datafield" btn-radio="true">是</label>'
                            + '<label class="btn btn-primary" ng-model="selectedsdk.cfg.@datafield" btn-radio="false">否</label>'
                            + '</div>'
                            + '</div>'
                            + '</div>';
                        }
                        nodeText = nodeText.replace(/@desc/g, desc);
                        nodeText = nodeText.replace(/@descLow/g, descLow);
                        nodeText = nodeText.replace(/@datafield/g, datafield);
                        return nodeText;
                    }
                    var channelConfig = _.findWhere(context.channels, {name: channelname});
                    for(var key in channelConfig.cfgitem){
                        result += getControlNode(key, channelConfig.cfgitem[key]);
                    }
                    result += ('<div class="control-group" style="margin: 5px;">'
                        + '<div class="controls">'
                        + '<button type="submit" class="btn" ng-disabled="!channelCfgForm.$dirty || channelCfgForm.$invalid">保存</button>'
                        + '<button type="button" class="btn" ng-click="submitCancel()">取消</button>'
                        + '</div></div>');
                    return result;
                }
                var template = channelTemplate(channelname);
                var instance = $modal.open({
                    templateUrl: 'partials/sdkConfig.html',
                    controller:'editSDKController',
                    size: 'lg',
                    backdrop: false,
                    keyboard: false,
                    resolve: {
                        selectedsdk: function(){
                            console.log($scope);
                            var sdk = $scope.channel.sdk;
                            return {
                                cfg: sdk.cfg,
                                data: sdk,
                                name: sdk.metaInfo.name,
                                outdated: false,
                                updateFunc: function () {
                                    console.log(project);
                                    return ProjectMgr.updateSDKCfg(
                                        project, sdk.cfg, sdk);
                                }
                            };
                        },
                        template: function(){
                            return template;
                        }
                    }
                });
                $scope.openModalInstance = instance;
            }




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

            $scope.setChannelSignCfg = function () {
                var instance = $modal.open({
                    templateUrl: 'partials/setsign.html',
                    controller: 'SetSignController',
                    backdrop: false,
                    keyboard: false,
                    resolve: {
                        signcfg: function () {
                            var signcfg = $scope.channel.signcfg;
                            if (!signcfg) {
                                return {
                                    keystroke: '',
                                    keypass: '',
                                    storepass: '',
                                    alias: '',
                                    channel: $scope.channel.data.name
                                };
                            } else {
                                var pathLib = require('path');
                                if (!signcfg.keystroke) {
                                    var keystroke = '';
                                } else {
                                    var keystroke = pathLib.join($scope.projectDoc.path, $scope.channel.signcfg.keystroke);
                                }
                                return {
                                    keystroke: keystroke,
                                    keypass: signcfg.keypass,
                                    storepass: signcfg.storepass,
                                    alias: signcfg.alias,
                                    channel: $scope.channel.data.name
                                };
                            }
                        }
                    }
                });
                instance.result.then(function (signcfg) {
                    if (signcfg) {
                        var pathLib = require('path');
                        var relpath = pathLib.relative($scope.projectDoc.path,
                            signcfg.keystroke);
                        if (pathLib.sep !== '/') {
                            relpath = relpath.split(pathLib.sep).join('/');
                        }
                        console.log('pathLib:' + pathLib)
                        signcfg.keystroke = relpath;
                    }
                    $scope.channel.signcfg = signcfg;
                    $scope.channel.isdirty = true;
                }, function () {
                    console.log('dialog dismissed');
                });
            };

            $scope.selectIcon = function () {
                var icons = projectIcons;
                var images = $scope.channel.data.metaInfo.getIconOverlay(icons);
                var availablePos = $scope.channel.data.metaInfo.availableIconPos;
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
                        },
                        availablePos: function () {
                            return availablePos;
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
                        return {
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
                    };
                    var newChannel = ProjectMgr.newChannel(project, channel.name);
                    $scope.channel = initShownChannel(newChannel);
                    $scope.channels.push(newChannel);
                    var l = $scope.channels.length - 1;
                    gridEventHandler = function () {
                        $scope.installedChTable.selectRow(
                            l, true);
                    };
                    //create an empty sdk for new channel
                   var promise = ProjectMgr.newSDK(project, channel.name, '');
                        promise.then(function(sdkcfg){
                            var sdk = sdkcfg;
                            $scope.channel.sdk = sdk;
                            //ProjectMgr.updateSDKCfg(project, sdk.cfg, sdk);
                            //ProjectMgr.setChannel(project, $scope.channel.data, $scope.channel);
                            $scope.saveChannel();

                    });
                }, function () {
                    console.log('dialog dismissed');
                });
            };
        })();

        (function SettingUpSDKTable() {
            $scope.selectedsdk = null;
            //这里是列表数据
            var sdkset = project.getAllSDKs();
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

            $scope.updateCurrentCfg = function () {

                var sdk = $scope.selectedsdk;
                var promise = sdk.updateFunc();
                promise = WaitingDlg.wait(promise, '更新配置中');
                promise.then(function () {
                    alert(1111)
                }, function (e) {
                    alert(e.message);
                });
            };
        })();


        $scope.selectChannelPanel = function () {
            $state.go('project.channel');
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

        //测试数据

        $scope.tab = [
            {
                active: false
            },
            {
                active: true
            }
        ];

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
                signcfg: nowChannel.signCfg,
                splashscreen: nowChannel.splashscreen,
                sdk: sdk,
                data: nowChannel,
                scWidth: scWidth,
                scHeight: scHeight,
                iconshown: iconshown,
                icons: nowChannel.icons,
                packageName: nowChannel.packageName
            };
            if (sdk) {
                $scope.selected[0] = sdk;
            }
        };

        $scope.selected = [];
        $scope.gridOptions = {
            data: 'allsdks',
            columnDefs: [
                {
                    displayName: '现有的SDK配置',
                    field: 'desc',
                    width: '*',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selected,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false,
            afterSelectionChange : function(){
                $scope.channel.sdk = $scope.selected[0];
                $scope.channel.isdirty = true;
                $scope.saveSDK = function () {
                }
            },
            rowTemplate: '<div ng-click="saveSDK()"  style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
        };
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
                $scope.disable = true;
                /**
                 * 渠道列表这里就已经获取到了sdk列表的数据 start
                 * */
                var sdks = project.getAllSDKs();
                var allsdks = [];
                var requiredSDK =
                    $scope.channel.data.requiredSDK;
                for (var i in sdks) {
                    if (sdks[i].sdkid === requiredSDK) {
                        allsdks.push(sdks[i]);
                    }
                }


                $scope.allsdks = allsdks;

                /**
                 * 渠道列表这里就已经获取到了sdk列表的数据 end
                 * */

                $state.go('loadmethod.channel',{projectId:globalCache.projectId});
            },
            rowTemplate: '<div style="height: 100%" ng-class="{red: row.getProperty(\'outdated\')}"><div ng-repeat="col in renderedColumns" ng-class="col.colIndex()" class="ngCell "><div ng-cell></div></div></div>'
        };



    }])
    .controller('InitController', function ($scope, $state, $modal, ProjectMgr, WaitingDlg) {
        var promise = ProjectMgr.init();
        promise.then(function(){
            if(!ProjectMgr.checkJavaHome()){
                alert("JAVA环境不存在，请安装JDK");
            }
            $state.go('projectlist');
        });
    })
    .controller('InitDlgController',function ($scope, $modalInstance, fileDialog, ProjectMgr, inited, sdkroot) {
        $scope.inited = inited;
        $scope.setSDKRoot = function () {
            fileDialog.openDir(function (d) {
                $scope.env.sdkroot = d;
                if (!$scope.env.anthome) {
                    $scope.env.anthome = ProjectMgr.guessAntHome(d);
                }
                $scope.$apply();
            })
        }
        $scope.env = {
            sdkroot: sdkroot,
            anthome: ProjectMgr.guessAntHome(sdkroot)
        };
        $scope.setAntHome = function () {
            fileDialog.openDir(function (d) {
                $scope.env.anthome = d;
                $scope.$apply();
            })
        };
        $scope.submit = function () {
            var promise = ProjectMgr.setAndroidPath($scope.env);
            promise.then(function () {
                $modalInstance.close();
            }, function (err) {
                alert(err.message);
            });
        };
        $scope.cancel = function () {
            $modalInstance.dismiss();
        };
    })
    .controller('ProjectListCtrl', ['$scope', '$state', 'ProjectMgr', '$modal','globalCache', function($scope, $state, ProjectMgr, $modal,globalCache) {
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
                $scope.projects.push(result);
                ProjectMgr.createProjectDirectory(result.name);
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
                $state.go('playmanage', {project: JSON.stringify(project)});
            }
        }

        $scope.openProject = function () {
            if ($scope.selectedProject.length > 0) {
                var project = $scope.selectedProject[0];
                $state.go('playmanage', {projectId: JSON.stringify(project)});
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
    .controller('BindProjectCtrl', ['$scope', '$state', 'ProjectMgr', 'fileDialog', 'globalCache', function ($scope, $state, ProjectMgr, fileDialog, globalCache) {
        $scope.newProjectPromise = null;
        $scope.project = {
        };
        $scope.msg = "";
        $scope.setPath = function() {
            fileDialog.openDir(function (d) {
                try {
                    $scope.project = ProjectMgr.loadTempProject(d);
                    $scope.gamePath = d;
                    $scope.msg = "";
                } catch (e) {
                    $scope.msg = e.message;
                }
                $scope.$apply();
            })
        };
        $scope.bind = function () {
            try {
                $scope.newProjectPromise = ProjectMgr.bindProject($scope.gameName,
                    $scope.gamePath);
                $scope.newProjectPromise.then(
                    function (projectId) {
                        console.log('switch to projects');
                        globalCache.projectId = projectId;
                        $state.go('playmanage', {projectId: projectId});
                    },
                    function (err) {
                        // error handling
                    });
            } catch (e) {
                console.log(e);
            }
        };
    }])
    .controller('NewProjectCtrl', function ($scope, $modalInstance, ProjectMgr) {
        $scope.newProject = ProjectMgr.createProject();
        $scope.cancel = function(){
            $modalInstance.close();
        }
        $scope.create = function () {
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
    .controller('AddSDKController',function ($scope, $modalInstance, supportedSDK) {
        $scope.selected = [];
        $scope.info = {
            desc: ''
        };
        $scope.addSDK = function () {
            $modalInstance.close({
                sdk: $scope.selected[0],
                desc: $scope.info.desc
            });
        };
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
        $scope.supportedSDK = [];
        for (var i in supportedSDK) {
            $scope.supportedSDK.push(supportedSDK[i]);
        }
        $scope.gridOptions = {
            data: 'supportedSDK',
            columnDefs: [
                {
                    displayName: '支持的SDK',
                    field: 'desc',
                    width: '*',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selected,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false

        };
        window.setTimeout(function(){
            $(window).resize();
            $(window).resize();
        }, 100);
    })
    .controller('SplashScreenController',function  ($scope, $modalInstance, scData, landscape) {
        $scope.curimg = null;
        $scope.scData = scData;
        var self = this;
        this.table = {
            data: 'scData',
            columnDefs: [
                {
                    displayName: '图片',
                    field: 'path',
                    width: '70%',
                    resizable: false,
                    groupable: false
                },
                {
                    displayName: '持续时间',
                    field: 'duration',
                    width: '20%',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: self.curimg,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false
        };
        if (landscape) {
            this.width = 480;
            this.height = 320;
        } else {
            this.height = 480;
            this.width = 320;
        }

        $scope.addImage = function () {
        };

        $scope.removeImage = function () {
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
    .controller('SetSignController', function ($scope, $modalInstance, signcfg) {
        $scope.signcfgModel = signcfg;
        $scope.commit = function () {
            $modalInstance.close($scope.signcfgModel);
        };

        $scope.dismissSign = function () {
            $modalInstance.close(null);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss();
        };

        $scope.setFiles = function(element) {
            $scope.$apply(function(scope) {
                    $scope.signcfgModel.keystroke = element.files[0].path;
                }
            );
        };
    })
    .controller('AddChannelController',function ($scope, $modalInstance, channels) {
        $scope.selected = [];
        $scope.addChannel = function () {
            $modalInstance.close($scope.selected[0]);
        };
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
        $scope.channels = channels;
        $scope.gridOptions = {
            data: 'channels',
            columnDefs: [
                {
                    displayName: '未安装的渠道',
                    field: 'desc',
                    width: '*',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selected,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false

        };
        window.setTimeout(function(){
            $(window).resize();
            $(window).resize();
        }, 100);
    })
    .controller('ChannelCfgController', ['$scope', '$stateParams',
        'ProjectMgr','$timeout', function($scope, $stateParams, ProjectMgr,$timeout) {

        }])
    .controller('BuildProjectController',function ($scope, $modalInstance, $modal, project, defaultSelected, ProjectMgr) {
        $scope.channels = [];
        var channels = project.getAllChannels();
        for (var i in channels) {
            $scope.channels.push({
                name: channels[i].name,
                status: 0
            });
        }
        $scope.selectedChannels = [];
        if (defaultSelected) {
            for (var i in defaultSelected) {
                for (var j in $scope.channels) {
                    if ($scope.channels[j].name === defaultSelected[i]) {
                        $scope.selectedChannels.push($scope.channels[j]);
                    }
                }
            }
        }
        $scope.compiling = false;
        $scope.channelTable = {
            data: 'channels',
            columnDefs: [
                {
                    displayName: '渠道列表',
                    field: 'name',
                    width: '70%',
                    resizable: false,
                    groupable: false
                },
                {
                    displayName: '状态',
                    field: 'status',
                    width: '30%',
                    resizable: false,
                    groupable: false,
                    cellTemplate: '<div ng-show="row.entity[col.field] === 0"></div><div ng-show="row.entity[col.field] == 1"><img src="partials/ajax-loader.gif">编译中</div><div ng-show="row.entity[col.field] === 2"><img src="partials/tick_circle.png">编译完成</div><div ng-show="row.entity[col.field] === 3"><img src="partials/fails.png">编译失败</div>'
                }
            ],
            multiSelect: true,
            selectedItems: $scope.selectedChannels,
            showSelectionCheckbox: true,
            showGroupPanel: false,
            showFooter: true,
            beforeSelectionChange: function() {
                return !$scope.compiling;
            },
            footerTemplate: '<div class="ngTotalSelectContainer" ><div class="ngFooterTotalItems" ng-class="{\'ngNoMultiSelect\': !multiSelect}" ><span class="ngLabel">总渠道数 {{maxRows()}}</span></div><div class="ngFooterSelectedItems" ng-show="multiSelect"><span class="ngLabel">选中的渠道数 {{selectedItems.length}}</span></div></div>'
        };
        $scope.close = function () {
            $modalInstance.close();
        };
        $scope.isCollapsed = true;
        $scope.compileInfo = [];
        $scope.result = [];
        var showResult = function (r) {
            if (r.code == 0) {
                return {
                    msg: '编译'+r.target+'成功',
                    logfile: r.logfile
                };
            } else {
                return {
                    msg: '编译'+r.target+'失败',
                    logfile: r.logfile
                };
            }
        };

        $scope.openBuildPath = function() {
            var p = pathLib.join(project.__doc.path, 'chameleon_build', 'release');
            if (!fs.existsSync(p)) {
                alert("请先编译当前工程!!!");
                return;
            }
            require('nw.gui').Shell.openItem(p);
        };

        $scope.showBuildLog = function () {
            $modal.open({
                templateUrl: 'partials/logpanel.html',
                controller: 'LogPanelController',
                resolve: {
                    logs: function () {
                        return $scope.result.map(showResult);
                    }
                }
            });
        };
        $scope.startCompile = function () {
            $scope.result = [];
            $scope.compiling = true;
            var compileQueue = $scope.selectedChannels.map(function (x) { return x.name;});
            var cpunum = require('os').cpus().length;
            var nowPos = 0;
            var pendingPromise = [];
            var doneCallback = function () {
                $scope.compiling = false;
            };
            var promiseDoneFunc = function (compileResult) {
                for (var i in $scope.channels) {
                    if ($scope.channels[i].name === compileResult.target) {
                        if (compileResult.code !== 0) {
                            $scope.channels[i].status = 3;
                        } else {
                            $scope.channels[i].status = 2;
                        }
                        break;
                    }
                }
                $scope.result.push(compileResult);
                doUntilDone();
            };
            var doUntilDone = function () {
                if (nowPos >= compileQueue.length) {
                    if (pendingPromise.length === 0) {
                        return doneCallback();
                    } else {
                        return;
                    }
                }
                for (var i = pendingPromise.length; i < cpunum; ++i) {
                    var target = compileQueue[nowPos];
                    var promise = ProjectMgr.compileProject(project, target);
                    promise.then(promiseDoneFunc);
                    for (var i in $scope.channels) {
                        if ($scope.channels[i].name === target) {
                            $scope.channels[i].status = 1;
                        }
                    }
                    nowPos += 1;
                    if (nowPos >= compileQueue.length) {
                        break;
                    }
                }
            };
            doUntilDone();
        };
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
    .controller('ManageServerController',function ($scope, $modal, $modalInstance, $log, project, ProjectMgr, fileDialog) {
        $scope.svrinfo = project.__doc.svrinfo;
        $scope.vlist = project.upgradeHistory;

        if (!$scope.svrinfo) {
            $scope.svrinfo  = {
                nick: project.__doc._id.toString(),
                paycbUrl: ''
            };
        }

        $scope.build = function (h) {
            $modal.open({
                templateUrl: 'partials/buildproject.html',
                controller: 'BuildProjectController',
                size: 'lg',
                resolve: {
                    project: function () {
                        return project;
                    },
                    defaultSelected: function () {
                        return h.upgradeChannels.map(function (o) {return o.name});
                    }
                },
                backdrop: false,
                keyboard: false
            });
        };

        $scope.close = function (dirty) {
            if (dirty) {
                $modalInstance.close({
                    nick: $scope.svrinfo.nick,
                    paycbUrl: $scope.svrinfo.paycbUrl
                })
            } else {
                $modalInstance.dismiss();
            }
        }

        $scope.openDump = function () {
            console.log($scope);
        }
        $scope.outputfile = ($scope.svrinfo.nick || $scope.prjid) + '.zip';
        $scope.project = project;
        var l = [];
        var channels = project.getAllChannels();
        for (var i in channels) {
            l.push(channels[i].desc);
        }
        $scope.channels = l.join(', ');

        $scope.setFiles = function(element) {
            $scope.$apply(function(scope) {
                    $scope.gamePath = element.files[0].path;
                }
            );
        };
        $scope.dumpServerCfg = function () {
            var nick = project.__doc._id;
            if ($scope.svrinfo.nick) {
                nick = $scope.svrinfo.nick;
            }
            var AdmZip = require('adm-zip');
            var url = require('url');
            try {
                var zip = new AdmZip();
                var cfgs = project.genServerCfg($scope.svrinfo.paycbUrl);
                for (var i in cfgs) {
                    zip.addFile(nick + '/' + i, new Buffer(JSON.stringify(cfgs[i])), "");
                }
                zip.addFile('manifest.json', new Buffer(JSON.stringify({
                    'product': $scope.svrinfo.nick
                })));
                fileDialog.saveAs(function (filename) {
                    zip.writeZip(filename+'.zip');
                    alert('保存成功');
                }, $scope.svrinfo.nick+'.zip');
            } catch (e) {
                $log.log('Fail to output svr config ');
                $log.log(e);
                alert('导出失败: 未知错误');
            }
        };
        console.log($scope)
    })
    .controller('SelectChannelController',function ($scope, $modalInstance, $stateParams,allsdks,globalCache) {
        $scope.selected = [];
        $scope.useSDK = function () {
            console.log($scope.selected)
            $modalInstance.close($scope.selected[0]);
        };

        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
        $scope.allsdks = allsdks;
        $scope.gridOptions = {
            data: 'allsdks',
            columnDefs: [
                {
                    displayName: '现有的SDK配置',
                    field: 'desc',
                    width: '*',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selected,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false

        };
        console.log($scope.selected)
        window.setTimeout(function(){
            $(window).resize();
            $(window).resize();
        }, 100);
    })
    .controller('SelectSplashController',function ($scope, $modalInstance, orient, images) {
        $scope.selected = [];
        $scope.useImage = function () {
            $modalInstance.close($scope.selected[0]);
        };
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        };
        $scope.images = images;
        if (orient === 'portrait') {
            $scope.width = 240;
            $scope.height = 360;
        } else {
            $scope.width = 360;
            $scope.height = 240;
        }
        $scope.url = null;
        $scope.gridOptions = {
            data: 'images',
            columnDefs: [
                {
                    displayName: '现有的SDK配置2',
                    field: 'desc',
                    width: '*',
                    resizable: false,
                    groupable: false
                }
            ],
            multiSelect: false,
            selectedItems: $scope.selected,
            showSelectionCheckbox: false,
            showGroupPanel: false,
            showFooter: false,
            afterSelectionChange: function () {
                if ($scope.selected.length <= 0) {
                    return;
                }
                $scope.url = $scope.selected[0].path;
            }
        };
        window.setTimeout(function(){
            $(window).resize();
            $(window).resize();
        }, 100);
    })
    .controller('SelectIconController',function ($scope, $modalInstance, ProjectMgr, project, images, config, availablePos) {
        $scope.url = null;
        $scope.hasImg = [availablePos&0x1, availablePos&0x2, availablePos&0x4, availablePos&0x8];
        $scope.selectedPosition = config.position;
        $scope.shownimages = {
            image: images,
            selected: {
                position: config.position
            }
        }
        $scope.dump = {};
        $scope.useImage = function () {
            var tempgenIcon = {};
            for (var i in images) {
                tempgenIcon[i] = ProjectMgr.getTempFile(project,
                        'icon-'+i+'-'+$scope.shownimages.selected.position+'.png');
            }
            $scope.dump.func(tempgenIcon);
            $modalInstance.close({
                position: $scope.shownimages.selected.position,
                tempicons: tempgenIcon
            });
        };
        $scope.cancel = function () {
            $modalInstance.dismiss('cancel');
        }
        window.setTimeout(function(){
            $(window).resize();
            $(window).resize();
        }, 100);
    })
    .controller('playManageCtrl', ['$state', function ($state) {
        console.log($state.params)

    }])
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
    .controller('canctrl',['$scope', '$log', '$stateParams', '$state', '$modal',  'WaitingDlg', '$timeout',function ($scope, $log, $stateParams, $state, $modal, WaitingDlg,$timeout) {
        /**$scope.updateCurrentCfg = function () {
            var sdk = $scope.selectedsdk;
            var promise = sdk.updateFunc();
            promise = WaitingDlg.wait(promise, '更新配置中');
            promise.then(function () {
                $scope.channelCfgForm.$setPristine();
            }, function (e) {
                alert(e.message);
            });
        };*/
    }])
    .controller('editSDKController', function($scope, $modalInstance, selectedsdk, template){
        console.log(template);
        $scope.selectedsdk = selectedsdk;
        $scope.sdkConfigHtml = template;
        $scope.submitCancel = function(){
            $modalInstance.close();
        }
        $scope.updateCurrentCfg = function () {
            console.log(selectedsdk);
            var sdk = selectedsdk;
            var promise = sdk.updateFunc();
            promise.then(function () {
                //$scope.channelCfgForm.$setPristine();
                $modalInstance.close();
            }, function (e) {
                alert(e.message);
            });
        };
    });
