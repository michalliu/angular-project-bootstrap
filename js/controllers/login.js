/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("loginControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

		page.log("login control init");

		var errorMsg=page.cache.get("errorMessage");

		if (errorMsg) {
			$scope.message = errorMsg;
		}

		$scope.doLogin = function () {
			page.login();
		};

		page.log("login control init finished");
	}]);
}());
