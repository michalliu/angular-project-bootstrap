angular.module('appTemplateCache', ['views/login.html', 'views/room.html']);

angular.module("views/login.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("views/login.html",
    "<a ng-click=\"doLogin()\" href=\"javascript:void(0);\" id=\"qqLoginBtn\">QQ登录</a>\n" +
    "");
}]);

angular.module("views/room.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("views/room.html",
    "<h1>微群直播</h1>\n" +
    "<div><span>{{profile.user.nickname}}</span><a href=\"javascript:void(0);\" ng-click=\"logout()\">退出</a></div>\n" +
    "<p>共有{{grouplist.groupListTotal}}个群</p>\n" +
    "<ol>\n" +
    "	<li ng-repeat=\"groupInfo in grouplist.groupInfoList\"><a href=\"javascript:void(0);\" ng-click=\"enterOrSwitchAudioRoom(groupInfo.group.gid)\" >{{groupInfo.group.gname}}</span></a></li>\n" +
    "</ol>\n" +
    "<button ng-click=\"startLiveAudio()\" ng-disabled=\"!currentGroupId || audioRoomInfo\">开始直播</button><button ng-click=\"stopLiveAudio()\" ng-disabled=\"!audioRoomInfo\">暂停直播</button>\n" +
    "<p>背景音乐</p>\n" +
    "<button ng-click=\"toggleBackgroundMusic()\" ng-disabled=\"!audioRoomInfo\">{{backgroundMusicEnabled && \"关闭\" || \"打开\"}}背景音乐</button>\n" +
    "<p>音量控制</p>\n" +
    "<p>麦克风音量:{{micVolume}} <button ng-click=\"decreaseMicVolume()\">减小</button><button ng-click=\"increaseMicVolume()\">增大</button></p>\n" +
    "<p>背景音乐音量:{{backgroundMusicVolume}} <button ng-click=\"decreaseBackgroundMusicVolume()\">减小</button><button ng-click=\"increaseBackgroundMusicVolume()\">增大</button></p>\n" +
    "");
}]);
