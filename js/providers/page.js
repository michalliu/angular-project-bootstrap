/*jshint browser:true*/
/*global angular, QC, console, location,$, document*/
(function pageProviderInit(){ "use strict";
	var appCache;
	var eventTracerLastEvent=false;
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
			preventWindowClose: function (message) {
				$(window).off('beforeunload').on('beforeunload', function(){
					page.log("beforeunload triggered");
					if (eventTracerLastEvent) {
						page.log("beforeunload ignored");
						return;
					}
					return message;
				});
			},
			allowWindowClose: function() {
				page.log("beforeunload 解除注册");
				$(window).off('beforeunload');
			},
			getGroupInfoById: function (gid) {
				var list, grpInfo;
				if (page.loginProfile &&
						page.loginProfile.groupList &&
						page.loginProfile.groupList.groupInfoList) {
					list = page.loginProfile.groupList.groupInfoList;
					for (var i in list) {
						if (list.hasOwnProperty(i)) {
							grpInfo = list[i];
							if (grpInfo.group.gid == gid) {
								return grpInfo;
							}
						}
					}
				}
				page.log("");
				return null;
			},
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
				page.log("登出QQ互联");
				QC.Login.signOut();
				page.liveUpload.destory();
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
				destory: function () {
					page.log("请求释放控件");
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
						page.log("无法释放控件，控件尚未初始化");
					}
				},
				onProcessStart: function (iResultCode) {
					page.log("[live-upload] process start with code " + iResultCode);
					if (1 == iResultCode) {
						page.liveUpload.destory();
						// 客户端只允许一个实例
						page.dialog.alert("已经登录了一个账号，不能重复登录", function () {
							window.close();
						});
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
									page.log("[live-upload]发生事件，QQ音乐开始播放");
									if (page.liveUpload.onMusicPlayingStateChange) page.liveUpload.onMusicPlayingStateChange("playing");
									break;
								case "noplaying":
									page.log("发生事件，QQ音乐停止播放");
									if (page.liveUpload.onMusicPlayingStateChange) page.liveUpload.onMusicPlayingStateChange("noplaying");
									break;
							}
							break;
						case "VolumeFeedback":
							page.log("energe change " + sInfo);
							if (page.liveUpload.onEnergeChange) {
								page.liveUpload.onEnergeChange(sInfo);
							}
							break;
						case "ErrCloseQqMusic":
							// QQ音乐音效插件安装失败
							page.log("发生事件，QQ音乐插件安装失败，需要关闭QQ音乐后重新安装");
							if (page.liveUpload.onInstallQQMusicPluginFailed) page.liveUpload.onInstallQQMusicPluginFailed();
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
						case "startvolfeedback":
						case "stopvolfeedback":
						case "save_record":
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
				alert: function (message, ok) {
					if (false) {
						$win.alert(message);
						if(ok) ok();
					} else {
						$("#alertDialogClose").unbind("click.room").bind("click.room", function () {
							$("#alertDialog").hide();
						});
						$("#alertDialogContent").text(message);
						$("#alertDialogCloseButton").unbind("click.room").bind("click.room", function () {
							$("#alertDialog").hide();
							if (ok) ok();
						});
						$(".mask").height($(document).height() + "px");
						$("#alertDialog").show();
					}
				},
				confirm: function(title, message, ok, cancel, attrs) {
					if (false) {
						if($win.confirm(message)){
							if(ok) ok();
						} else{
							if(cancel) cancel();
						}
					} else {
						if (title) $("#confirmDialogTitle").text(title);
						$("#confirmDialogClose").unbind("click.room").bind("click.room", function () {
							$("#confirmDialog").hide();
							if (cancel) cancel();
						});
						$("#confirmDialogContent").text(message);
						$("#confirmDialogConfirmButton").
							unbind("click.room").
							text(attrs && attrs.confirmText ? attrs.confirmText : "确定").
							bind("click.room", function () {
							$("#confirmDialog").hide();
							if (ok) ok();
						});
						$("#confirmDialogCloseButton").
							unbind("click.room").
							text(attrs && attrs.cancelText ? attrs.cancelText : "关闭").
							bind("click.room", function () {
							$("#confirmDialog").hide();
							if (cancel) cancel();
						});
						$(".mask").height($(document).height() + "px");
						$("#confirmDialog").show();
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
								"forceType": 1,
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
			},
			traceEvent: function () {
				eventTracer();
			}
		};

		window.onunload=function () {
			if (page.exe) {page.exe.Uninit();}
			if (page.onAppExit) {page.onAppExit();}
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

	function eventTracer() {
		eventTracerLastEvent=true;
		setTimeout(function() {
			eventTracerLastEvent=false;
		}, 100);
	}

	if (document.body.addEventListener) {
		document.body.addEventListener("click", eventTracer, true);
	} else if(document.body.attachEvent) {
		document.attachEvent("onclick", eventTracer);
	}

}());
