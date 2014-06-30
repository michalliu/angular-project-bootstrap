/*globals angular*/
(function appInit() { "use strict";

	angular.module("app",["ngRoute",
		"jqCookies",
		"appControllers",
		"appTemplateCache",
		"appProviders",
        "appFilters"
		]).

	// Config
	config(["$routeProvider", function ($route) {

	}]);

	angular.module("appControllers", []);
	angular.module("appProviders", []);
	angular.module("appFilters", []);
	angular.module("appDirectives", []);

}());
