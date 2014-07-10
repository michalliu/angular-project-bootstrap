/*jshint browser:true*/
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
			warn: logWarn,
			loginInfo: null,
			loginProfile: null,
			cache: appCache,
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
						clearInterval(popupWinCheck);
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
			exe: null,
			liveUpload:{
				onProcessStart: function (iResultCode) {
					page.log("[live-upload] process start with code " + iResultCode);
					if (1 == iResultCode) {
						if (page.exe) {
							try {
								page.exe.Uninit();
								page.exe = null;
							} catch (ex) {
								page.log("释放控件失败，" + ex);
								return;
							}
							page.log("释放控件成功");
						} else {
							page.log("无法释放控件，控件不存在");
						}
						page.dialog.alert("已经有一个客户端在运行了");
						window.close();
					}
				},
				onNotifyInfo: function (sType, sInfo) {
					page.log("[live-upload] notify received, type " + sType + ", info " + sInfo);
					switch(sType) {
						case "QQ音乐未安装":
							page.warn("QQMusic未安装");
							break;
						case "MusicPlayingChanged":
							switch(sInfo) {
								case "playing":
									page.info("[live-upload]发生事件，QQ音乐开始播放");
									break;
								case "noplaying":
									page.info("发生事件，QQ音乐停止播放");
									break;
							}
							break;
					}
				},
				onGetInfo: function (vKey, iResultCode, vValue) {
					page.log("[live-upload] get info callback " + [vKey, iResultCode, vValue].join(","));
					if (page.liveUpload.getInfoCallback) {
						page.liveUpload.getInfoCallback(vKey, iResultCode, vValue);
					}
				},
				onSetInfo: function (vKey, iResultCode, arg1, arg2, arg3) {
					page.log("[live-upload] set info callback " + [vKey, iResultCode, arg1, arg2, arg3].join(","));
				},
				getInfo: function (sCommand) {
					page.log("[live-upload] getInfo " + sCommand);
					switch(sCommand){
						case "IsQQMusicInstalled":
						case "IsQQMusicPlaying":
							if (!page.exe) {
								page.warn("[live-upload] no exe");
							} else {
								page.exe.GetInfo(sCommand);
							}
							break;
						default:
							page.log("[live-upload] GetInfo unrecognized command " + sCommand);
					}
				},
				setInfo: function(sCommand, sInfo) {
					page.log("[live-upload] setInfo, command " + sCommand + " args " + sInfo);
					switch(sCommand){
						case "beginlive":
						case "stoplive":
						case "setvolume":
						case "backgroundmusic":
						case "encodeparam":
							if (!page.exe) {
								page.warn("[live-upload] no exe");
							} else {
								page.exe.SetInfo(sCommand, sInfo, "", "");
							}
							break;
						default:
							page.log("[live-upload] SetInfo unrecognized command " + sCommand);
					}
				}
			},
			dialog:{
				alert: function (message) {
					$win.alert(message);
				},
				confirm: function(title, message, ok, cancel) {
					if($win.confirm(message)){
						if(ok) ok();
					} else{
						if(cancel) cancel();
					}
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
				},
				requestAudioRoomMic: function(gid){
					return $http.get(cgi, {
						params: angular.extend(angular.copy(page.loginInfo), {
							cmd: "AudioRoomCreateOrControlMic",
							code: "",
							req: {
								"gid": gid,
								"forceType": "",
								"from_pc": 1
							}
						})
					});
				},
				requestReleaseAudioRoomMic: function(gid) {
					return $http.get(cgi, {
						params: angular.extend(angular.copy(page.loginInfo), {
							cmd: "AudioRoomReleaseMic",
							code: "",
							req: {
								"gid": gid
							}
						})
					});
				},
				requestExitAudioRoom: function(gid) {
					return $http.get(cgi, {
						params: angular.extend(angular.copy(page.loginInfo), {
							cmd: "AudioRoomExit",
							code: "",
							req: {
								"gid": gid
							}
						})
					});
				},
				getAudioRoomStatus: function(gid) {
					return $http.get(cgi, {
						params: angular.extend(angular.copy(page.loginInfo), {
							cmd: "AudioRoomPushStatusPull",
							code: "",
							req: {
								"gid": gid,
								"changeMicId":""
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
		if(window.console) console.info("[ng-app] " + str);
	}
	function logWarn(str) {
		if(window.console) console.warn("[ng-app] " + str);
	}
}());
