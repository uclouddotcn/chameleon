var fs = require('fs');
var pathLib = require('path');
var globalEnv = require('./js/globalenv');
var USER_HOME = process.platform === 'win32' ? process.env.USERPROFILE :  process.env.HOME;
var appPath = globalEnv.APP_FOLDER;
var clientPath = appPath;
var channelPath = pathLib.join(appPath, 'chameleon');
var sdkPath = pathLib.join(appPath, 'chameleon');
var Database = require('nedb');

function startApp() {
    var gui = require('nw.gui');
    var win = gui.Window.get();
    win.hide();
    gui.Window.open('index.html', {
        toolbar: false,
        frame: true,
        position: "center",
        width: 1024,
        height: 700,
        focus: true
    })
}


var chameleonUpdateApp = angular.module('chameleonUpdateApp', ['ui.bootstrap']);
chameleonUpdateApp.controller('UpdateCtrl', ['$scope', '$modal',function ($scope, $modal) {

    var upgradeFilePath = pathLib.join(USER_HOME, '.prj_chameleon', 'upgrade.txt');
    if (fs.existsSync(upgradeFilePath)) {
        try {
            var Upgrader = require('./ts/upgrader').Upgrader;
            var content = fs.readFileSync(upgradeFilePath, {encoding: 'utf8'});
            var upgrader = new Upgrader(clientPath, channelPath, sdkPath);
            var upgradeInfo  = JSON.parse(content);
            upgrader.upgrade(upgradeInfo);
            var instance = $modal.open({
                templateUrl: 'partials/upgrader.html',
                controller: 'UpgradeCtrl',
                size: 'lg',
                backdrop: false,
                keyboard: false,
                resolve: {
                    upgrader: function () {
                        return upgrader;
                    }
                }
            });
            upgrader.on('upgrade_done', function (changelogs) {
                var Database = require('nedb');
                var tooldb = new Database({filename: pathLib.join(USER_HOME, '.prj_chameleon', 'tools.nedb'), autoload: true});
                tooldb.insert({_id: 'lastUpgradeTimestamp', timestamp: upgradeInfo.upgradeTimestamp});
                var chgDlgInstance = $modal.open({
                    templateUrl: 'partials/showchangelog.html',
                    controller: 'ShowChgLogCtrl',
                    size: 'lg',
                    backdrop: false,
                    keyboard: false,
                    resolve: {
                        changelogs: function () {
                            return changelogs;
                        }
                    }
                });
                chgDlgInstance.result.then(function(){
                    fs.unlink(upgradeFilePath);
                    startApp()
                });
            });
            upgrader.on('upgrade_fail', function (err) {
                alert("无法完成更新: " + err.message);
                fs.unlink(upgradeFilePath);
                startApp();
            })
        } catch (e) {
            alert("无法完成更新: " + e.message)
            fs.unlink(upgradeFilePath);
            startApp();
        }
    } else {
        startApp();
    }
}]);

function ShowChgLogCtrl ($scope, $modalInstance, changelogs) {
    $scope.changelogs = changelogs;
    $scope.submit = function () {
        $modalInstance.close();
    }
}

function UpgradeCtrl ($scope, $modalInstance, upgrader) {
    $scope.ver = "";
    $scope.total = upgrader.total;
    $scope.done = 0;
    upgrader.on('upgrade_proc', function (count, version) {
        $scope.done = count-1;
        $scope.ver = version;
        if ($scope.done === $scope.total) {
            $modalInstance.close();
        }
        $scope.$digest();
    });
}

