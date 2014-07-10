/*global angular,ActiveXObject*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("roomControl", ["$rootScope","$scope","$http","$timeout", "page",function ($rootScope,
			$scope,
			$http,
			$timeout,
			page) {

		page.log("room control init");

		$scope.currentGroupId = null; // 当前所在房间 gid
		$scope.audioRoomInfo = null; // 是否控麦，有控麦就有房间信息
		$scope.backgroundMusicEnabled = false;
		
		var micVolume=50, backgroundMusicVolume=50;

		$scope.micVolume = micVolume; // 麦克风音量
		$scope.backgroundMusicVolume = backgroundMusicVolume; // 背景音乐音量

		var pullMicStatusPromise;

		// 到这里来信息必须已经完全填充
		if(!page.isLogin()) {
			page.redirectTo("/index");
			return;
		}

		$scope.profile=page.loginProfile.profile.profile;
		$scope.grouplist=page.loginProfile.groupList;

		$scope.logout=function() {

			function doLogout() {
				page.log("开始登出");
				$scope.currentGroupId = null;
				$scope.audioRoomInfo = null;
				page.logout();
				page.setLoginInfo(null);
				page.setLoginProfile(null);
				page.redirectTo("/index");
				page.log("登出完毕");
			}

			if($scope.audioRoomInfo) {
				requestExitAudioRoom("直播正在进行中，确定要退出？", function () {
					doLogout();
				}, function (error) {
					if (error == "退出房间操作被取消") {
						// 用户点击了cancel按钮
						page.log("用户取消退出房间");
					} else {
						// 其它情况，强行登出
						page.warn("退出房间请求失败，" + error);
						page.warn("执行强行登出");
						doLogout();
					}
				});
			} else {
				page.log("直接登出");
				doLogout();
			}
		};

		// 进入或切换房间，如果已经在一个房间里，先执行退房间逻辑
		// 退出成功后更新为当前房间id
		$scope.enterOrSwitchAudioRoom=function(gid) {
			if ($scope.currentGroupId) {
				if ($scope.currentGroupId == gid) {
					page.warn("已经在房间 " + gid + " 中，无法切换");
					return;
				}
				if ($scope.audioRoomInfo) {
					requestExitAudioRoom("直播正在进行中，确定要切换房间？", function () {
						$scope.currentGroupId = gid;
						$scope.audioRoomInfo = null;
						page.log("切换房间成功，当前gid " + gid + "，房间信息已清空");
					}, function (error) {
						if (error == "退出房间操作被取消") {
							page.log("用户取消了切换房间操作");
						} else {
							page.dialog.alert("暂时不能切换房间，原因是" + error);
						}
					});
				} else {
					$scope.currentGroupId = gid;
					$scope.audioRoomInfo = null;
					page.log("切换房间成功，当前gid " + gid + "，房间信息已清空");
				}
			} else {
				$scope.currentGroupId = gid;
				$scope.audioRoomInfo = null;
				page.log("切换房间成功，当前gid " + gid + "，房间信息已清空");
			}
		};

		// 开始直播
		// 如果已经控麦，则直接直播
		// 未控麦，先执行控麦，再直播
		$scope.startLiveAudio = function () {
			page.log("请求开始直播");

			// 控件尚未初始化
			if (!page.exe) {
				try {
					page.log("初始化控件...");
					page.exe = new ActiveXObject("TencentLiveUpload.Uploader");
				} catch(ex) {
					page.dialog.alert("尚未安装控件，请按照提示安装");
					return;
				}
				// 判断组件版本号 便于安装升级
				page.log("Activex Version: "  + page.exe.Version("TencentLiveUpload.dll"));
				page.log("EXE Version: "  + page.exe.Version("TencentLiveUpload.exe"));
				page.exe.OnStartProcess = page.liveUpload.onProcessStart;
				page.exe.OnNotifyInfo = page.liveUpload.onNotifyInfo;
				page.exe.OnGetInfo = page.liveUpload.onGetInfo;
				page.exe.OnSetInfo = page.liveUpload.onSetInfo;
				page.exe.StartProcess();
				page.log("控件初始化完毕");
			}

			function doStartLiveAudio(roominfo) {
				page.log("开始直播，调用控件接口");
				var iplist=JSON.parse(roominfo.ipList);
				var ip = iplist[0].ip[0];
				var params="srcid={{srcid}}&userid={{userid}}&ip={{ip}}&port={{port}}".
					replace("{{srcid}}", roominfo.status.srcid).
					replace("{{userid}}", roominfo.status.usrid).
					replace("{{ip}}", ip.host).
					replace("{{port}}", ip.port);
				page.log("开始轮询房间状态");
				$timeout.cancel(pullMicStatusPromise);
				startPullAudioRoomStatus();
				try{
					page.liveUpload.setInfo("beginlive",params);
				} catch (ex){
					page.dialog.alert("开始直播失败，" + ex);
				}
			}

			if ($scope.audioRoomInfo) {
				// 当前已控麦，直接开始发送语音数据
				doStartLiveAudio($scope.audioRoomInfo);
			} else {
				// 未控麦，先执行控麦
				if ($scope.currentGroupId) {
					requestAudioRoomMic($scope.currentGroupId, doStartLiveAudio, function (error) {
						page.dialog.alert("暂时无法启动直播，抢麦失败");
						page.log("抢麦失败，" + error);
					});
				} else {
					// 到这里已经是逻辑有问题了
					page.warn("当前房间为空");
				}
			}
		};

		// 停止直播
		// 如果已经控麦，则直接停止
		// 未控麦，报错
		$scope.stopLiveAudio = function (passive) {
			page.log("请求停止直播");

			function doStopLiveAudio() {
				page.log("停止直播");
				try{
					page.liveUpload.setInfo("stoplive","");
				} catch (ex){
					page.dialog.alert("停止直播失败，" + ex);
				}
			}

			// 已经选择群
			if ($scope.currentGroupId) {
				// 当前已控麦，先释放麦，再停止发送语音
				if ($scope.audioRoomInfo) {
					if (passive) { // 被动释放麦
						// 这里已经确定已经失去麦了，没必要再请求停止，用于轮询房间状态的回调
						$scope.audioRoomInfo = null;
						doStopLiveAudio();
					} else {
						requestReleaseAudioRoomMic($scope.currentGroupId, doStopLiveAudio, function (error) {
							page.warn("释放麦失败，" + error + "，停止发送语音");
							doStopLiveAudio();
						});
					}
				} else {
					page.warn("还未控麦");
				}
			} else {
				// 未选择群
				page.warn("还未选择群");
			}
		};

		// 开启背景音乐
		$scope.toggleBackgroundMusic= function() {
			if($scope.backgroundMusicEnabled) {
				// 关闭背景音乐
				try {
					page.liveUpload.setInfo("backgroundmusic","opt=close");
				} catch (ex) {
					page.dialog.alert("关闭背景音乐失败，" + ex);
					return;
				}
				$scope.backgroundMusicEnabled = false;
			} else {
				// 打开背景音乐
				// 检查QQ音乐是否已经安装
				page.liveUpload.getInfoCallback=function(sKey, iResultCode, vValue) {
					if (sKey == "IsQQMusicInstalled") {
						if (vValue == "no") {
							page.dialog.alert("您还未安装QQ音乐，无法使用此功能，请安装后重试。");
						} else {
							try {
								page.liveUpload.setInfo("backgroundmusic","opt=open");
							} catch (ex) {
								page.dialog.alert("打开背景音乐失败，" + ex);
							}
							$scope.backgroundMusicEnabled = true;
						}
						page.liveUpload.getInfoCallback = null;
					}
				};
				page.liveUpload.getInfo("IsQQMusicInstalled");
			}
		};

		$scope.decreaseMicVolume=function() {
			micVolume = Math.max(0, --micVolume);
			try {
				page.liveUpload.setInfo("setvolume","type=mic&volume=" + micVolume);
			} catch (ex) {
				page.dialog.alert("设置麦克风音量失败，" + ex);
				return;
			}
			$scope.micVolume = micVolume;
		};

		$scope.increaseMicVolume=function() {
			micVolume = Math.min(100, ++micVolume);
			try {
				page.liveUpload.setInfo("setvolume","type=mic&volume=" + micVolume);
			} catch (ex) {
				page.dialog.alert("设置麦克风音量失败，" + ex);
				return;
			}
			$scope.micVolume = micVolume;
		};

		$scope.decreaseBackgroundMusicVolume=function() {
			backgroundMusicVolume = Math.max(0, --backgroundMusicVolume);
			try {
				page.liveUpload.setInfo("setvolume","type=background&volume=" + backgroundMusicVolume);
			} catch (ex) {
				page.dialog.alert("设置背景音乐音量失败，" + ex);
				return;
			}
			$scope.backgroundMusicVolume = backgroundMusicVolume;
		};

		$scope.increaseBackgroundMusicVolume=function() {
			backgroundMusicVolume = Math.min(100, ++backgroundMusicVolume);
			try {
				page.liveUpload.setInfo("setvolume","type=background&volume=" + backgroundMusicVolume);
			} catch (ex) {
				page.dialog.alert("设置背景音乐音量失败，" + ex);
				return;
			}
			$scope.backgroundMusicVolume = backgroundMusicVolume;
		};
		// 退出房间逻辑，退出房间成功后设置当前房间id为null，失败不做操作
		function requestExitAudioRoom(msg, success, error) {
			msg= msg || "直播正在进行中，确定退出？";
			// 直播中
			if ($scope.audioRoomInfo) {
				page.dialog.confirm(null,msg, function () {
					page.log("发送退出房间网络请求");
					page.api.requestExitAudioRoom($scope.currentGroupId).success(function (res) {
						if (res.code === 0) {
							page.log("退出房间成功，gid " + res.data.status.gid);
							$scope.currentGroupId = null;
							$scope.audioRoomInfo = null;
							if (success) success();
						} else {
							if (error) error("退出房间失败，" + res.message);
						}
					}).error(function () {
						if (error) error("退出房间失败，服务器错误");
					});
				}, function () {
					if (error) error("退出房间操作被取消");
				});
			} else {
				if (error) error("直播还未开始");
			}
		}

		// 对某个群控麦api
		function requestAudioRoomMic(gid, success, error){
			var msg;
			page.log("发送抢麦网络请求");
			page.api.requestAudioRoomMic(gid).success(function (res) {
				var gid,username;
				if (res.code === 0 && res.data) {
					// 控麦成功
					if (res.data.status.status === 0 &&
						res.data.status.user.uid == $scope.profile.user.uid ) {
						// 服务器状态是自己控麦  客户端显示麦空闲，自己抢麦 就会status为0
						msg = "您已经在其它房间控麦，不能再次控麦";
						page.warn(msg);
						page.dialog.alert(msg);
						if (error) error(msg);
					} else {
						gid = res.data.status.gid;
						username = res.data.status.user.nickname;
						$scope.currentGroupId = gid;
						$scope.audioRoomInfo = res.data;
						page.log(username + " get mic success, group " + gid);
						if(success) success(res.data);
					}
				} else {
					msg="控麦失败，" + res.message;
					$scope.audioRoomInfo = null;
					page.dialog.alert(msg);
					if(error) error(msg);
				}
			}).error(function () {
				msg="控麦失败，服务器错误";
				$scope.audioRoomInfo = null;
				page.dialog.alert(msg);
				if(error) error(msg);
			});
		}

		// 对某个群停止控麦
		function requestReleaseAudioRoomMic(gid, success, error){
			var msg;
			page.log("发送释放麦网络请求");
			page.api.requestReleaseAudioRoomMic(gid).success(function (res) {
				if (res.code === 0 && res.data) {
					// 停止控麦成功
					$scope.audioRoomInfo = null;
					page.log("release mic success, group id " + (res.data.status.gid || gid));
					if(success) success();
				} else {
					msg="停止控麦失败，" + res.message;
					page.dialog.alert(msg);
					if(error) error(msg);
				}
			}).error(function () {
				msg="停止控麦失败，服务器错误";
				page.dialog.alert(msg);
				if(error) error(msg);
			});
		}

		function startPullAudioRoomStatus() {
			page.log("控麦状态查询中...");
			if ($scope.currentGroupId && $scope.audioRoomInfo){
				page.api.getAudioRoomStatus($scope.currentGroupId).success(function (res) {
					if (res.code === 0 && res.data) {
						// 查询状态
						var micer=res.data.status.user;
						if ($scope.currentGroupId &&
							$scope.audioRoomInfo &&
							(micer.uid && micer.uid != $scope.profile.user.uid)) {
							// 控麦人不是本人
							page.dialog.alert("已被抢麦");
							page.warn("已被抢麦");
							$scope.stopLiveAudio(true);
						} else if (!micer.uid){
							// 可能是长时间不说话引起的
							page.log("已停止控麦");
							page.dialog.alert("已停止控麦");
							$scope.stopLiveAudio(true);
						} else if($scope.currentGroupId &&
							$scope.audioRoomInfo &&
							(micer.uid && micer.uid == $scope.profile.user.uid)) {
							page.log("控麦状态正常");
						} else {
							page.warn("未处理的控麦状态");
						}
					} else {
						page.warn("控麦状态查询错误，" + res.message);
					}
				}).error(function () {
					page.warn("控麦状态查询错误，服务器错误");
				}).always(function () {
					// 当前没有控麦的情况下自动停止查询
					pullMicStatusPromise = $timeout(startPullAudioRoomStatus, 3000); // 上次请求返回后隔段时间查询一次
				});
			} else {
				page.warn("停止查询房间状态，没有进入房间或未控麦");
			}
		}

	}]);
}());
