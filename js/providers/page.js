/*global angular, QC*/
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
			log: log,
			isLogin: function () { // 是否登录
				return QC.Login.check();
			}
		};

		log("page init");

		// 未登录，跳转到登录页
		if (!page.isLogin()) {
			$location.path("/login");
		}
		return page;
	}]);

	function log(str) {
		console.log("[ng-app]:" + str);
	}
}());
