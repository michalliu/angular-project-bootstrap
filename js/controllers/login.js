/*global angular,$*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("loginControl", ["$rootScope","$scope","$http","page",function ($rootScope,
			$scope,
			$http,
			page) {

		page.log("login control init");

		// 已经登录了,数据齐全
		if (page.isLogin()) {
			page.log("user is logged in, redirect to index page");
			page.redirectTo("/index");
		} else if (page.isBasicLogin()) {
			// 需要进一步拿到openid,accesstoken,uid,grouplist
			page.log("user login info is incomplete, fetch openid...");
			page.getOpenID(function (id, token) {
				page.setLoginInfo({
					"openid": id,
					"token": token
				});
				page.log("login info filled, fetch profile...");
				page.api.getProfile().success(function (res) {
					if (res.code === 0 && res.data) {
						page.setLoginProfile(res.data);
						page.redirectTo("/index");
					} else {
						page.dialog.alert(res.message);
					}
				}).error(function () {
					page.dialog.alert("获取用户信息失败");
				});
			});
		}

		$scope.doLogin = function () {
			page.login();
		};
	}]);
}());
