/*jshint browser:true*/
/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("errorControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

			var errorMsg=page.cache.get("errorMessage");
			if (errorMsg) {
				$scope.message = errorMsg;
			}
	}]);
}());
