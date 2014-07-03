/*global angular, QC, console, location*/
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

		var cgi="/cgi-bin/radio_comm_cgi";

		var page={
			log: log,
			loginInfo: null,
			loginProfile: null,
			setLoginInfo: function (info) {
				if (info) {
					if (!info.loginType) {
						info.loginType = 2; // 2为QQ登录 1是微信登录
					}
					info.format="json"; // 固定以json格式输出
				}
				this.loginInfo=info;
			},
			setLoginProfile: function (p) {
				this.loginProfile=p;
			},
			isBasicLogin: function () { // 只检查是否进行基本的登录
				return QC.Login.check();
			},
			isLogin: function () { // 检查是否具有openid和accesstoken并且有微群账号信息
				return page.loginInfo && page.loginProfile;
			},
			login: function () {
				var popup = QC.Login.showPopup({
					appId:"101001181",
					redirectURI:"http://wq.qq.com/live/callback.html"
				});
				var popupWinCheck=setInterval(function () {
					if(popup.closed){
						location.reload();
					}
				}, 100);
			},
			logout: function(){
				QC.Login.signOut();
			},
			getOpenID: function(callback) {
				QC.Login.getMe(function(openId, accessToken){
					if(callback) callback(openId, accessToken);
				});
			},
			redirectTo: function(url) {
				$location.path(url);
			},
			dialog:{
				alert: function (message) {
					alert(message);
				}
			},
			api:{
				getProfile: function () {
					return $http.get(cgi,{
						params: angular.extend(angular.copy(page.loginInfo), {
							cmd: "GetRadiorProfileAndGroupList",
							code: "",
							req: {
								"profile":{"uid":"","gid":""},
								"groupList":{"uid":"","attachInfo":"","etag":""}
							}
						})
					});
				}
			}
		};

		log("page init");

		return page;
	}]);

	function log(str) {
		console.info("[ng-app] " + str);
	}
}());
