/*jshint browser:true*/
/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("errorControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

			page.log("index control init");

			var errorMsg=page.cache.get("errorMessage");
			if (errorMsg) {
				$scope.message = errorMsg;
			}

			page.log("index control init finished");
	}]);
}());
