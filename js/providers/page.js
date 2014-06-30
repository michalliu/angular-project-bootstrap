/*global angular*/
(function pageProviderInit(){ "use strict";
	var appCache;
	angular.module("appProviders").

	factory("page",["$rootScope",
		"$location",
		"$http",
		"$q",
		"$cacheFactory",
		"cookieStore",
		"$window",function($rootScope,
			$location,
			$http,
			$q,
			$cacheFactory,
			cookieStore,
			$win){

		if (!appCache){
			appCache=$cacheFactory("appCache");
		}

		var page={
		};

		return page;
	}]);
}());
