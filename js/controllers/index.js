/*jshint browser:true*/
/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("indexControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

		// this controller acts as like router
		page.log("index control init");

		// 未登录，跳转到登录页
		if (!page.isBasicLogin()) {
			page.log("qq connect login needed");
			page.redirectTo("/login");
			return;
		}
		
		page.redirectTo("/room");

		page.log("index control init finished");
	}]);
}());
