/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("roomControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

		page.log("room control init");

		if(!page.isLogin()) {
			page.redirectTo("/index");
			return;
		}

		$scope.profile=page.loginProfile.profile.profile;
		$scope.grouplist=page.loginProfile.groupList;

		$scope.logout=function() {
			page.logout();
			page.setLoginInfo(null);
			page.setLoginProfile(null);
			page.redirectTo("/index");
		};

		$scope.requestGroupMic=function(groupInfo){
			console.log(groupInfo);
		};
	}]);
}());
