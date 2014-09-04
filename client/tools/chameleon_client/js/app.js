'use strict';

/* App Module */
var chameleonApp = angular.module('chameleonApp', [
    'ngGrid',
    'ngRoute',
    'chameleonControllers',
    'chameleonTool',
    'ui.bootstrap',
    'ui.router',
    'DWand.nw-fileDialog'
])
.run(
    [          '$rootScope', '$state', '$stateParams', '$log',
        function ($rootScope,   $state,   $stateParams, $log) {

          // It's very handy to add references to $state and $stateParams to the $rootScope
          // so that you can access them from any scope within your applications.For example,
          // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
          // to active whenever 'contacts.list' or one of its decendents is active.
            $rootScope.$state = $state;
            $rootScope.$stateParams = $stateParams;
            $rootScope.$on('$stateChangeError', function(event, toState, toParams, fromState, fromParams, errors){
                $log.log('Fail to change state ' + event + ' ' + toState +
                    ' ' + toParams + ' ' + fromState + ' ' + fromParams);
                console.log(event);
                console.log(errors);
                console.log(errors.stack);
            });
        }
    ]
);

/*
chameleonApp.config(['$routeProvider',
  function($routeProvider) {
    $routeProvider.
      when('init', {
        templateUrl: 'partials/init.html',
        controller: 'ToolInitCtrl'
      }).
      when('/projects', {
        templateUrl: 'partials/projects.html',
        controller: 'ProjectListCtrl'
      }).
      when('/newproj', {
        templateUrl: 'partials/newproject.html',
        controller: 'NewProjectCtrl'
      }).
      when('/project/:projectId', {
        templateUrl: 'partials/project.html',
        controller: 'ProjectDetailCtrl'
      }).
      otherwise({
        redirectTo: '/projects'
      });
  }]);

  */

chameleonApp.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
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
}]);

chameleonApp.controller('NavCtrl', 
['$scope', '$state', '$location', function ($scope, $state, $location) {
    $scope.navClass = function (page) {
        var currentRoute = $location.path().substring(1) || 'projects';
        return page === currentRoute ? 'active' : '';
    };
  
    $scope.loadHome = function () {
        $state.go('projectlist');
    };
    
}])
.directive("champic", function(){
  return {
    restrict: "E",
    require: "",
    scope: {
        baseIcon: '@',
        dump: '='
    },
    templateUrl: 'partials/cham_icon.html',
    link: function(scope, element, attrs){
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
});


