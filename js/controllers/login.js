/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("loginControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

		page.log("login control init");

		// 已经登录了
		if (page.isBasicLogin()) {
			page.log("user already logged in, redirect to index page");
			page.redirectTo("/index");
		}

		$scope.doLogin = function () {
			page.login();
		};
	}]);
}());
