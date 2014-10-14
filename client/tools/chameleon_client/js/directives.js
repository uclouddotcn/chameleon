'use strict';

/* App directives */
var chameleonDirectives = angular.module('chameleonDirectives', [
    'ui.router',
    'DWand.nw-fileDialog'
])
    .directive('projectListView', ['$state', function($state) {
        return {
            restrict: 'EA',
            transclude: false,
            templateUrl: 'partials/projecttable.html',
            controller: function ($scope) {
                $scope.showProject = function (project) {
                    $state.go('project.globalsdk', {projectId: project._id});
                };
            }
        };
    }])
    .directive("champic", function () {
        return {
            restrict: "E",
            require: "",
            scope: {
                baseIcon: '@',
                dump: '='
            },
            templateUrl: 'partials/cham_icon.html',
            link: function (scope, element, attrs) {
                console.log(element)
                console.log(scope)
                var state = {
                    index: -1,
                    images: null
                };
                var canvasList = element.find('canvas');
                var canvasMap = {};
                var columnOffset = ['medium', 'high', 'xhigh', 'xxhigh', 'xxxhigh'];
                for (var i in canvasList) {
                    canvasMap[columnOffset[i]] = canvasList[i];
                }
                var dumpfunc = function (densityTarget) {
                    var fs = require('fs');
                    for (var t in densityTarget) {
                        var canvas = canvasMap[t];
                        var dataURL = canvas.toDataURL();
                        var data = dataURL.replace(/^data:image\/\w+;base64,/, "");
                        var buf = new Buffer(data, 'base64');
                        fs.writeFileSync(densityTarget[t], buf);
                    }
                };
                var renderImage = function (canvas, base, overlay) {
                    var context = canvas.getContext('2d');
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    var imageObj = new Image();
                    var overlayImage = new Image()
                    var readyFlag = 0;
                    var drawFunc = function () {
                        context.drawImage(imageObj, 0, 0);
                        context.drawImage(overlayImage, 0, 0);
                        scope.dump.func = dumpfunc;
                    }
                    imageObj.onload = function () {
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
                    imageObj.src = 'file://' + base;
                    overlayImage.src = 'file://' + overlay;
                };
                var renderAll = function (value) {
                    if (!value) {
                        return;
                    }
                    var v = JSON.parse(value);
                    var pos = v.selected.position;
                    console.log(pos)
                    for (var t in v.image) {
                        console.log(v.image[t])
                        renderImage(canvasMap[t], v.image[t].base,
                            v.image[t].overlay[pos]);
                    }
                }
                scope.$watch('baseIcon', renderAll);
            }
        };
    })
    .directive('sliderbox',['$timeout','sliderbox',function($timeout,sliderbox){
        return {
            restrict : 'E',
            replace: true ,
            scope : {
                aImages : '='
            },
            templateUrl : 'partials/sliderbox.html',
            link : function(scope,element,attrs){
                sliderbox.slideFn()
            }
        }
    }])



