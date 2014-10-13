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
    .directive('sliderbox',['$timeout',function($timeout){
        return {
            restrict : 'E',
            replace: true ,
            scope : {
                aImages : '='
            },
            templateUrl : 'partials/sliderbox.html',
            link : function(scope,element,attrs){
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
                })




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
                $('#btn-left').click(function(){
                    moveEndLeft();
                })
                $('#btn-right').click(function(){
                    moveEndRight();
                })
            }


        }

    }])



