/*globals angular,window,ActiveXObject*/
(function appInit() { "use strict";

	var entry="/index";

	angular.module("app",["ngRoute",
		"jqCookies",
		"appControllers",
		"appTemplateCache",
		"appProviders",
		"appFilters"
		]).

	// Config
	config(["$routeProvider", "$sceProvider", function ($route, $sceProvider) {
		// The minimum bar for $sce is IE8 in standards mode.
		// IE7 standards mode is not supported.
		// If you must support IE7, you should disable $sce completely.
		// http://stackoverflow.com/questions/18506458/sceiequirks-strict-contextual-escaping-does-not-support-internet-explorer-ve
		$sceProvider.enabled(false);
		
		var conditions = {
			// 浏览器兼容性检查
			browserCheckOnce: ["$q","$location","page", function ($q,$location,page) {
				var q=$q.defer();
				var undef;
				var browserCheckResult=page.cache.get("browserCheckResult");

				if (browserCheckResult === undef) {
					// 尚未进行过浏览器检查
					page.log("执行浏览器检查");
					if (!window.ActiveXObject) {
						q.reject();
						page.cache.put("errorMessage","暂不支持您的浏览器，请使用IE浏览器访问");
						page.redirectTo("/error");
						page.log("ActiveXObject不存在，不支持的浏览器");
						page.cache.put("browserCheckResult", false);
					} else {
						q.resolve();
						page.cache.put("browserCheckResult", true);
					}
				} else if (browserCheckResult){
					page.log("浏览器检查通过");
					q.resolve();
				} else {
					page.log("浏览器检查未通过");
					q.reject();
					page.redirectTo("/error");
				}
				return q.promise;
			}]
		};

		$route.
		when('/login',{
			templateUrl: "views/login.html",
			controller: "loginControl",
			resolve: conditions
		}).
		when('/room',{
			templateUrl: "views/room.html",
			controller: "roomControl",
			resolve: {
				browserCheck: conditions.browserCheckOnce,
				groupInfoFeched: ["$q","page", function ($q,page) {
					// 需要进一步拿到openid,accesstoken,uid,grouplist
					var q=$q.defer();
					if (oldLocation == null) {
						// 直接用/room这个path过来的请求，会自动跳转到/index
						// 这里避免重复发起请求
						return;
					}
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
								q.resolve();
							} else {
								q.reject();
								//page.dialog.alert(res.message);
								if (res.message=="不在白名单内") {
									page.cache.put("errorMessage","账号未开放体验资格，请尝试使用其他账号登入");
								} else {
									page.cache.put("errorMessage",res.message);
								}
								page.redirectTo("/login");
							}
						}).error(function () {
							q.reject();
							page.dialog.alert("获取用户信息失败");
						});
					});
					return q.promise;
				}]
			}
		}).
		when('/index',{
			template:"",
			controller: "indexControl",
			resolve: conditions
		}).
		when('/error', {
			templateUrl: "views/error.html",
			controller: "errorControl"
		}).
		otherwise({
			redirectTo: entry
		});

	}]).

	run(["$rootScope", "page", "$location", function ($rootScope, page, $location) {
		page.log("init");
		$rootScope.$on('$routeChangeStart', function(angularEvent, next) {
			// 禁止直接跳转到除 /index 以外的页面
			var newLocation;
			if (next && next.$$route) {
				newLocation = next.$$route.originalPath;
				if (oldLocation === null && newLocation != "/index") {
					$location.path("/index");
					return;
				}
			}
			oldLocation = newLocation;
		});
	}]);

	var oldLocation = null;

	angular.module("appControllers", []);
	angular.module("appProviders", []);
	angular.module("appFilters", []);
	angular.module("appDirectives", []);

}());
