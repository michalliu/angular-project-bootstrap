/*globals angular*/
(function appInit() { "use strict";

	var entry="/index";

	angular.module("app",["ngRoute",
		"jqCookies",
		"appControllers",
		"appTemplateCache",
		"appProviders",
		"appFilters"
		]).

	// Config
	config(["$routeProvider", "$sceProvider", function ($route, $sceProvider) {
		// The minimum bar for $sce is IE8 in standards mode.
		// IE7 standards mode is not supported.
		// If you must support IE7, you should disable $sce completely.
		// http://stackoverflow.com/questions/18506458/sceiequirks-strict-contextual-escaping-does-not-support-internet-explorer-ve
		$sceProvider.enabled(false);
		$route.
		when('/login',{
			templateUrl: "html/login.html",
			controller: "loginControl"
		}).
		when('/room',{
			templateUrl: "html/room.html",
			controller: "roomControl"
		}).
		when('/index',{
			template:"",
			controller: "indexControl"
		}).
		otherwise({
			redirectTo: entry
		});
	}]).

	run(["$rootScope", "page", function ($rootScope, page) {
		page.log("init");
	}]);

	angular.module("appControllers", []);
	angular.module("appProviders", []);
	angular.module("appFilters", []);
	angular.module("appDirectives", []);

}());
