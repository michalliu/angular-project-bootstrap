/*global angular,ActiveXObject,$,document,setTimeout,setInterval,clearInterval,window*/
(function () {
	"use strict";

	angular.module("appControllers")
	.controller("roomControl", ["$rootScope","$scope","$http","$timeout", "$q", "page",function ($rootScope,
			$scope,
			$http,
			$timeout,
			$q,
			page) {

		page.log("room control init");

		if (!page.loginProfile || !page.loginProfile){
			page.warn("room 信息不足, init refused");
			return;
		}


		$scope.currentGroupInfo = null; // 当前所在群组信息
		$scope.audioRoomInfo = null; // 是否控麦，有控麦就有房间信息
		$scope.backgroundMusicEnabled = false;
		$scope.micEnabled = true;
		$scope.exitAudioRoomDialogShown = false; // 隐藏退出房间浮层

		var pullMicStatusPromise=null;
		var initLiveUploadPluginPromise=null;
		var liveTime=0; // 显示直播进行的时间
		var liveTimeTimer; // 直播时间计时器

		var backgroundMusicVolume=50;
		var micVolume=50;
		var micVolumeSaved;
		var voiceMessages={
			NORMAL: "点击按钮说话"
		};

		var playStates={
			PLAYING: "playing",
			STOPPED: "noplaying"
		};

		var unloadMessages={
			INLIVE: "语音直播正在进行中，确定要离开页面吗？"
		};

		var backgroundMusicPlayState=playStates.STOPPED; // 默认是停止状态

		// 到这里来信息必须已经完全填充
		$scope.profile=page.loginProfile.profile.profile;
		$scope.grouplist=page.loginProfile.groupList;
		$scope.voiceMessage=voiceMessages.NORMAL; // 默认的提示信息

		$scope.logout=function(evt) {

			// IE8 不支持event capture，手动唤醒一下
			page.traceEvent();
			evt.stopPropagation();

			function doLogout() {
				page.log("开始登出");
				$scope.currentGroupInfo = null;
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
			if ($scope.currentGroupInfo) {
				if ($scope.currentGroupInfo.group.gid == gid) {
					page.warn("已经在房间 " + gid + " 中，无法切换");
					return;
				}
				if ($scope.audioRoomInfo) {
					requestExitAudioRoom("直播正在进行中，确定要切换房间？", function () {
						$scope.currentGroupInfo = page.getGroupInfoById(gid);
						$scope.audioRoomInfo = null;
						$scope.voiceMessage=voiceMessages.NORMAL; // 更新提示信息
						page.log("切换房间成功，当前gid " + gid + "，房间信息已清空");
					}, function (error) {
						if (error == "退出房间操作被取消") {
							page.log("用户取消了切换房间操作");
						} else {
							page.dialog.alert("暂时不能切换房间，原因是" + error);
						}
					});
				} else {
					$scope.currentGroupInfo = page.getGroupInfoById(gid);
					$scope.audioRoomInfo = null;
					$scope.voiceMessage=voiceMessages.NORMAL; // 更新提示信息
					page.log("切换房间成功，当前gid " + gid + "，房间信息已清空");
				}
			} else {
				$scope.currentGroupInfo = page.getGroupInfoById(gid);
				$scope.audioRoomInfo = null;
				$scope.voiceMessage=voiceMessages.NORMAL; // 更新提示信息
				page.log("切换房间成功，当前gid " + gid + "，房间信息已清空");
			}
		};


		function initLiveUpload() {
			var d,promise,msg;
			if (!initLiveUploadPluginPromise) {
				d = $q.defer();
				promise=d.promise;
				promise.success=function(fn) {
					promise.then(fn);
					return promise;
				};
				promise.error=function(fn) {
					promise.then(null, fn);
					return promise;
				};
				try {
					page.log("初始化控件...");
					page.exe = new ActiveXObject("TencentLiveUpload.Uploader");
				} catch(ex) {
					msg="尚未安装控件，请按照提示安装";
					//page.dialog.alert(msg);
					page.warn(msg);
					d.reject(msg);
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
				setBackgroundMusicVolume(backgroundMusicVolume); // 设置背景音乐音量
				setMicVolume(micVolume); // 设置麦克风音量
				page.log("控件初始化完毕");
				d.resolve();
			}
			if (promise) initLiveUploadPluginPromise = promise;
			return initLiveUploadPluginPromise;
		}

		// 格式化时间显示
		function formatLiveTime(seconds) {
			var second=seconds%60;
			var minute=Math.floor(seconds/60%60);
			var hour=Math.floor(seconds/3600);
			if (second < 10) {
				second = "0" + second;
			}
			if(minute < 10) {
				minute = "0" + minute;
			}
			if(hour) {
				if (hour < 10) {
					hour = "0" + hour;
				}
				return [hour,minute,second].join(":");
			} else {
				return [minute,second].join(":");
			}
		}

		// 开始直播时间显示
		function startShowLiveTime() {
			liveTime = 0;
			var area=$("#voiceTiming");
			// 更新直播时间显示
			liveTimeTimer=setInterval(function updateLiveTime() {
				liveTime++;
				area.text(formatLiveTime(liveTime));
			},1000);
		}

		// 停止直播时间显示
		function stopShowLiveTime() {
			liveTime = 0;
			clearInterval(liveTimeTimer);
			$("#voiceTiming").text("00:00");
		}

		// 开始直播
		// 如果已经控麦，则直接直播
		// 未控麦，先执行控麦，再直播
		function startLiveAudio () {
			page.log("请求开始直播");

			function doStartLiveAudio(roominfo) {
				page.log("开始直播，调用控件接口");
				var iplist=JSON.parse(roominfo.ipList);
				//var ip = iplist[0].ip[0];
				var params="srcid={{srcid}}&userid={{userid}}&servernum={{servernum}}".
					replace("{{srcid}}", roominfo.status.srcid).
					replace("{{userid}}", roominfo.status.usrid).
					replace("{{servernum}}", iplist.length);

				var iptemplate="ip{{index}}={{ip}}&port{{index}}={{port}}";

				for (var i=0,l=iplist.length,ip;i<l;i++){
					ip=iplist[i].ip[0];
					params += "&" + iptemplate.replace("{{index}}",i).
											replace("{{index}}",i).
											replace("{{ip}}",ip.host).
											replace("{{port}}",ip.port);
				}

				page.log("开始轮询房间状态");
				$timeout.cancel(pullMicStatusPromise);
				startPullAudioRoomStatus();
				startShowLiveTime();
				try{
					page.liveUpload.setInfo("beginlive",params);
					page.liveUpload.setInfo("startvolfeedback","");
				} catch (ex){
					page.dialog.alert("开始直播失败，" + ex);
				}
			}

			function requestMicAndStart() {
				if ($scope.audioRoomInfo) {
					// 当前已控麦，直接开始发送语音数据
					doStartLiveAudio($scope.audioRoomInfo);
				} else {
					// 未控麦，先执行控麦
					if ($scope.currentGroupInfo) {
						requestAudioRoomMic($scope.currentGroupInfo.group.gid, doStartLiveAudio, function (error) {
							page.log("抢麦失败，" + error);
							//
							$scope.voiceMessage=error;
							$("#voiceButton").attr("class", "disable");
							$timeout(function () {
								$scope.voiceMessage=voiceMessages.NORMAL;
								$("#voiceButton").attr("class", "start");
							}, 1000);
						});
					} else {
						page.warn("当前房间为空，请选择一个微群");
					}
				}
			}

			initLiveUpload().success(requestMicAndStart).error(function (msg) {
				page.dialog.alert(msg);
			});

		}

		// 停止直播
		// 如果已经控麦，则直接停止
		// 未控麦，报错
		function stopLiveAudio(passive) {
			page.log("请求停止直播");

			var q=$q.defer(),msg;

			function doStopLiveAudio() {
				page.log("停止直播");
				try{
					page.liveUpload.setInfo("stopvolfeedback","");
					page.liveUpload.setInfo("stoplive","");
				} catch (ex){
					//page.dialog.alert("停止直播失败，" + ex);
					msg="停止直播失败，" + ex;
					page.warn(msg);
					q.reject(msg);
					return;
				}
				$scope.voiceMessage=voiceMessages.NORMAL; // 默认的提示信息
				setEnergyProgress(0);
				stopShowLiveTime();
				q.resolve();
			}

			// 已经选择群
			if ($scope.currentGroupInfo) {
				// 当前已控麦，先释放麦，再停止发送语音
				if ($scope.audioRoomInfo) {
					if (passive) { // 被动释放麦
						// 这里已经确定已经失去麦了，没必要再请求停止，用于轮询房间状态的回调
						$scope.audioRoomInfo = null;
						doStopLiveAudio();
					} else {
						requestReleaseAudioRoomMic($scope.currentGroupInfo.group.gid, doStopLiveAudio, function (error) {
							page.warn("释放麦失败，" + error + "，停止发送语音");
							doStopLiveAudio();
						});
					}
				} else {
					msg="还未控麦";
					page.warn("还未控麦");
					q.reject(msg);
				}
			} else {
				// 未选择群
				msg="还未选择群";
				page.warn(msg);
				q.reject(msg);
			}

			return q.promise;
		}

		$scope.toggleLiveAudio = function (evt) {
			if (evt.target.className == "disable") {
				page.log("当前禁止点击voice按钮");
				return;
			}
			if ($scope.audioRoomInfo) {
				stopLiveAudio();
			} else {
				startLiveAudio();
			}
		};

		// 开启背景音乐
		$scope.toggleBackgroundMusic= function() {
			function doToggleBackgroundMusic() {
				if($scope.backgroundMusicEnabled) {
					// 关闭背景音乐
					try {
						page.liveUpload.setInfo("backgroundmusic","opt=close");
					} catch (ex) {
						page.dialog.alert("关闭背景音乐失败，" + ex);
						return;
					}
					$("#accompany").attr("class","accompany");
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
									return;
								}
								$scope.backgroundMusicEnabled = true;
								$scope.$apply();
							}
						} else if (sKey == "IsQQMusicPlaying") {
							if (vValue == "yes" && $scope.backgroundMusicEnabled) {
								$("#accompany").attr("class","accompanying");
							} else {
								$("#accompany").attr("class","accompany");
							}
							page.liveUpload.getInfoCallback = null;
						}
					};
					// 呼起QQ音乐的时候不知为何会触发IE的beforeunload事件，win8 X64,IE10
					// 暂时解绑
					page.liveUpload.getInfo("IsQQMusicInstalled");
					page.liveUpload.getInfo("IsQQMusicPlaying");
				}
			}

			initLiveUpload().success(doToggleBackgroundMusic).error(function (msg) {
				page.dialog.alert(msg);
			});
		};

		// 开始/禁用 麦克风
		$scope.toggleMic=function () {
			function doToggleMic() {
				if($scope.micEnabled) {
					page.log("关闭麦克风");
					// 关闭麦克风
					micVolumeSaved = micVolume; // 保存之前的音量
					setMicVolume(0); // 禁用麦克风采用设置音量为0实现
					$scope.micEnabled = false;
					page.log("关闭麦克风成功");
				} else{
					page.log("开启麦克风");
					// 开启麦克风
					setMicVolume(micVolumeSaved); // 恢复之前的音量
					$scope.micEnabled = true;
					page.log("开启麦克风成功");
				}
			}

			initLiveUpload().success(doToggleMic).error(function (msg) {
				page.dialog.alert(msg);
			});
		};

		$scope.signOutAudioRoom=function(){
			if ($scope.currentGroupInfo && $scope.audioRoomInfo ) {
				// 当前正在控麦，显示确认浮层
				$scope.exitAudioRoomDialogShown = true; // 显示退出房间浮层
			} else {
				// 否则直接退出房间
				$scope.currentGroupInfo = null; // 当前所在群组信息
				$scope.audioRoomInfo = null; // 是否控麦，有控麦就有房间信息
			}
		};

		$scope.exitAudioRoomDirectly=function() { // 退出房间
			requestExitAudioRoom(null, function () {
				$scope.exitAudioRoomDialogShown = false; // 隐藏退出房间浮层
			}, function () {
				$scope.exitAudioRoomDialogShown = false; // 隐藏退出房间浮层
			});
		};

		$scope.hideExitAudioRoomDialog=function(){
			$scope.exitAudioRoomDialogShown = false; // 显示退出房间按钮
		};

		// 退出房间逻辑，退出房间成功后设置当前房间id为null，失败不做操作
		function requestExitAudioRoom(msg, success, error) {

			function doSendExitAudioRoomRequest() {
				page.log("发送退出房间网络请求");
				page.api.requestExitAudioRoom($scope.currentGroupInfo.group.gid).success(function (res) {
					if (res.code === 0) {
						page.log("退出房间成功，gid " + res.data.status.gid);
						$scope.currentGroupInfo = null;
						$scope.audioRoomInfo = null;
						if (success) success();
					} else {
						if (error) error("退出房间失败，" + res.message);
					}
				}).error(function () {
					if (error) error("退出房间失败，服务器错误");
				});
			}

			function sendExitAudioRoomRequest() {
				stopLiveAudio().always(doSendExitAudioRoomRequest);
			}

			// 直播中
			if ($scope.audioRoomInfo) {
				if (msg) {
					page.dialog.confirm(null, msg, sendExitAudioRoomRequest, function () {
						if (error) error("退出房间操作被取消");
					});
				} else {
					sendExitAudioRoomRequest();
				}
			} else {
				if (error) error("直播还未开始");
			}
		}

		//AudioRoomStatusCreate		= 0x01,		//创建房间通知
		//AudioRoomStatusJoin         = 0x02,		//加入房间通知
		//AudioRoomStatusExit         = 0x04,		//退出房间通知
		//AudioRoomStatusControlMic	= 0x08,		//用户控制麦克风通知
		//AudioRoomStatusReleaseMic	= 0x10,		//用户释放麦克风通知
		//AudioRoomStatusClear		= 0x20,		//清除房间通知
		//AudioRoomStatusMofify		= 0x40,		//状态条自定义通知
		//AudioRoomStatusForced		= 0x80,		//后台强制踢（包括：群主踢出群
		// 对某个群控麦api
		function requestAudioRoomMic(gid, success, error){
			var msg;
			page.log("发送抢麦网络请求");
			page.api.requestAudioRoomMic(gid).success(function (res) {
				var gid,username;
				if (res.code === 0 && res.data && res.data.status) {
					// 控麦成功
					if (res.data.status.status === 0 &&
						res.data.status.user.uid == $scope.profile.user.uid ) {
						// 服务器状态是自己控麦  客户端显示麦空闲，自己抢麦 就会status为0
						msg = "您已经在其它房间控麦，不能再次控麦";
						page.warn(msg);
						if (error) error(msg);
					} else if ( res.data.status.user.uid &&
						res.data.status.user.uid ==  res.data.status.group_owner &&
						res.data.status.group_owner != $scope.profile.user.uid) {
						// 群主正在控麦，但自己不是群主
						msg = "群主已控麦，请稍候再试";
						page.warn(msg);
						if (error) error(msg);
					} else if (res.data.status.user.uid == $scope.profile.user.uid) {
						gid = res.data.status.gid;
						username = res.data.status.user.nickname;
						$scope.currentGroupInfo = page.getGroupInfoById(gid);
						$scope.audioRoomInfo = res.data;
						page.log(username + " get mic success, group " + gid);
						if(success) success(res.data);
					} else {
						msg = "控麦失败，请稍候再试";
						page.warn(msg + ", status " + res.data.status.status);
						if(error) error(msg);
					}
				} else {
					msg="控麦失败，" + res.message;
					$scope.audioRoomInfo = null;
					//page.dialog.alert(msg);
					if(error) error(msg);
				}
			}).error(function () {
				msg="控麦失败，服务器错误";
				$scope.audioRoomInfo = null;
				//page.dialog.alert(msg);
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
			if ($scope.currentGroupInfo && $scope.audioRoomInfo){
				page.api.getAudioRoomStatus($scope.currentGroupInfo.group.gid).success(function (res) {
					if (res.code === 0 && res.data) {
						// 查询状态
						var micer=res.data.status.user;
						// 当前控麦者
						if ($scope.currentGroupInfo &&
							$scope.audioRoomInfo &&
							(micer.uid && micer.uid != $scope.profile.user.uid)) {
							// 控麦者不是本人，按目前的逻辑，应该是被群主抢麦的，只有群主能抢主播的麦
							page.dialog.alert("群主已控麦，你暂时不能抢麦");
							page.warn("已被抢麦，当前控麦者" + [micer.uid, micer.nickname].join(","));
							stopLiveAudio(true);
						} else if (!micer.uid && $scope.audioRoomInfo){ // 被动停止控麦
							// 可能是长时间不说话引起的
							page.log("已停止控麦");
							page.dialog.alert("您已停止控麦，请确认麦克风已经插好并工作正常");
							stopLiveAudio(true);
						} else if($scope.currentGroupInfo &&
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

		function setVolume(volumeType, volume, success, error){
			volume = volume || 0;
			volume = Math.max(0, volume);
			volume = Math.min(100, volume);
			// 如果音量为0，改变相应的图标为off状态
			switch(volumeType) {
				case "background":
					$("#accompany").attr("class",volume <= 0 ? "accompany-off" : (backgroundMusicPlayState == playStates.PLAYING ?  "accompanying" : "accompany"));
					break;
				case "mic":
					$("#microphone").attr("class",volume <= 0 ? "microphone-off" : "microphone");
					break;
			}
			try {
				page.liveUpload.setInfo("setvolume","type="+ volumeType +"&volume=" + volume);
			} catch (ex) {
				if (error) error("设置麦克风音量失败，" + ex);
				return;
			}
			if (success) success();
		}

		// 保存录音文件
		function saveRecordFile() {
			page.log("请求保存录音文件");
			try {
				page.liveUpload.setInfo("save_record","");
			} catch (ex) {
				if (error) error("保存录音文件失败，" + ex);
				return;
			}
		}

		// 点击音量调整
		$(document).off("click.room").on("click.room", ".progressbar", function (e) {
			var that = $(this);
			var posX = that.offset().left;
			var total = that.width();
			var bar = that.find(".progress");
			var p=Math.floor((e.pageX - posX)/total*100);
			var role = that.attr("data-role");
			p=Math.max(0,Math.min(p,100));
			bar.width(p+"%");
			switch(role) {
				case "backgroundMusic":
					page.log("请求背景音乐音量调整为" + p + "%");
					if (page.exe) {
						setVolume("background",p);
					}
					backgroundMusicVolume=p;
					break;
				case "mic":
					page.log("请求麦克风音量调整为" + p + "%");
					if (page.exe) {
						setVolume("mic",p);
					}
					micVolume=p;
					break;
			}
		});

		// 伴奏图标
		$("#accompany").unbind("mouseover.room mouseout.room").bind("mouseover.room", function () {
			if ($scope.backgroundMusicEnabled){
				//改变小图标为关闭音乐，仅当伴奏开启时
				$(this).attr("class","accompany-off");
			}
		}).bind("mouseout.room", function () {
			var that=$(this);
			//改变小图标为关闭音乐
			page.liveUpload.getInfoCallback=function(sKey, iResultCode, vValue) {
				if (sKey == "IsQQMusicPlaying") {
					if (vValue == "yes") {
						$("#accompany").attr("class","accompanying");
					} else {
						that.attr("class","accompany");
					}
					page.liveUpload.getInfoCallback = null;
				}
			};
			if ($scope.backgroundMusicEnabled) {
				page.liveUpload.getInfo("IsQQMusicPlaying");
			} else {
				that.attr("class","accompany");
			}
		});

		page.liveUpload.onMusicPlayingStateChange = function(playingState) {
			if ($scope.backgroundMusicEnabled) {
				switch(playingState) {
					case "playing":
						$("#accompany").attr("class","accompanying");
						backgroundMusicPlayState=playStates.PLAYING;
						break;
					case "noplaying":
						$("#accompany").attr("class","accompany");
						backgroundMusicPlayState=playStates.STOPPED;
						break;
				}
			}
		};

		page.liveUpload.onInstallQQMusicPluginFailed = function() {
			page.dialog.alert("因为QQ音乐正在运行中，插件安装失败，请关闭QQ音乐后再刷新页面。");
		};

		function setBackgroundMusicVolume(volume){
			$(".progressbar[data-role=backgroundMusic] .progress").width(volume+"%");
			if (page.exe) setVolume("background",volume);
		}

		function setMicVolume(volume) {
			$(".progressbar[data-role=mic] .progress").width(volume+"%");
			if (page.exe) setVolume("mic",volume);
		}

		// 初始化音量条显示，默认音量是 50%，这里控件可能尚未初始化
		// 不过没关系，控件初始化完毕后会再设置一次
		setBackgroundMusicVolume(backgroundMusicVolume);
		setMicVolume(micVolume);

		// 语音能量反馈
		function setEnergyProgress(progress) {
			progress = progress || 0;
			progress = Math.max(0, progress);
			progress = Math.min(100, progress);
			progress = 100 - progress;
			var left = $("#energy_left");
			var right = $("#energy_right");
			var max=122;
			var current=Math.floor(progress * max / 100);
			left.css("background-position", current + "px");
			right.css("background-position", -current + "px");
		}

		page.liveUpload.onEnergeChange = function (energy) {
			setEnergyProgress(energy*10);
		};

		$(document).off("click.all").on("click.all", function () {
			// 延时初始化
			setTimeout(function () {
				initLiveUpload();
			},5000);
		});

		// 拖动调节音量
		$(".point").off("mousedown.room").on("mousedown.room", function () {
			var that = $(this);
			var bar = that.parent(); // 绿色的进度条
			var progressbar=bar.parent(); // 灰色进度条
			var role=progressbar.attr("data-role"); // 灰色进度条类型
			var posX = progressbar.offset().left; // 灰色进度条在页面中的位置
			var total = progressbar.width(); // 灰色进度条总长度

			$(document).off("mousemove.room").on("mousemove.room", function (evt) {
				if (evt.pageX > (posX + total) ||
					evt.pageX < posX) {
					//$(document).off("mousemove.room");
					page.warn("超出可调节范围");
					return;
				}
				var p=Math.floor((evt.pageX - posX)/total*100);
				p=Math.max(0,Math.min(p,100));
				bar.width(p+"%");
				switch(role) {
					case "backgroundMusic":
						page.log("请求背景音乐音量调整为" + p + "%");
						if (page.exe) {
							setVolume("background",p);
						}
						backgroundMusicVolume=p;
						break;
					case "mic":
						page.log("请求麦克风音量调整为" + p + "%");
						if (page.exe) {
							setVolume("mic",p);
						}
						micVolume=p;
						break;
				}
			});

			$(document).on("mouseup.room", function () {
				$(document).off("mousemove.room");
			});
		});

		// 捕捉窗口关闭事件
		$scope.$watch("audioRoomInfo", function (newValue, oldValue) {
			page.warn("audioRoomInfoChange");
			var undef;
			if (newValue) {
				page.preventWindowClose(unloadMessages.INLIVE);
			} else {
				page.allowWindowClose();
				// 提示保存录音文件
				if (oldValue != undef) { // 页面第一次进来不显示
					page.dialog.confirm("保存提示","语音直播已结束，是否保存录音文件？", function () {
						saveRecordFile();
					},null,{
						confirmText : "保存",
						cancelText : "关闭"
					});
				}
			}
		});

		// 关闭了浏览器窗口，退房间
		page.onAppExit=function () {
			if ($scope.currentGroupInfo) {
				// 实测任何发送http请求的代码在这里都无法执行了
				page.api.requestExitAudioRoom($scope.currentGroupInfo.group.gid);
			}
		};
		page.log("room control init finished");
	}]);
}());
