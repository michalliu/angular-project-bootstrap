angular.module('appTemplateCache', ['views/error.html', 'views/login.html', 'views/room.html']);

angular.module("views/error.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("views/error.html",
    "<div class=\"login-wrap login\">\n" +
    "    <div class=\"login-header\">\n" +
    "        <div class=\"logo\"></div>\n" +
    "        <!-- <p class=\"title\"></p> -->\n" +
    "    </div>\n" +
    "    <div class=\"login-content\">\n" +
    "        <div class=\"warning\"><span class=\"icon-warning\"></span><br/>\n" +
    "            {{message}}</div>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("views/login.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("views/login.html",
    "<div class=\"login-wrap login\">\n" +
    "    <div class=\"login-header\">\n" +
    "        <div class=\"logo\"></div>\n" +
    "        <!-- <p class=\"title\"></p> -->\n" +
    "    </div>\n" +
    "    <div class=\"login-content\">\n" +
    "		<div class=\"warning\" ng-show=\"message\"><span class=\"icon-warning\"></span>{{message}}</div>\n" +
    "        <button class=\"qq_login\" ng-click=\"doLogin()\"><span class=\"icon-qq\"></span>QQ登录</button>\n" +
    "        <p class=\"tips_txt\">暂时仅支持QQ账号登入</p>\n" +
    "    </div>\n" +
    "</div>\n" +
    "");
}]);

angular.module("views/room.html", []).run(["$templateCache", function($templateCache) {
  $templateCache.put("views/room.html",
    "<div class=\"cover_bg\">\n" +
    "	<div class=\"wrap login\">\n" +
    "	<div class=\"header\">\n" +
    "		<div class=\"logo\"></div>\n" +
    "		<div class=\"status\">\n" +
    "			<div class=\"avator\"><img width=\"38\" height=\"38\" ng-src=\"http://shp.qlogo.cn/wegroup/{{profile.user.uid}}/{{profile.user.uid}}/200\"/></div>\n" +
    "			<div class=\"txt-status\"><span class=\"txt-name\">{{profile.user.nickname}}</span> | <a href=\"javascript:void(0);\" class=\"txt_exit\" ng-click=\"logout($event)\">退出账号</a></div>\n" +
    "		</div>\n" +
    "	</div>\n" +
    "	<div class=\"contact\">\n" +
    "		<div class=\"aside\" ng-show=\"grouplist.groupListTotal > 1 || ((grouplist.groupListTotal == 1) && !currentGroupInfo)\">\n" +
    "			<div class=\"bd\">\n" +
    "				<ul>\n" +
    "					<li class=\"item\" ng-repeat=\"groupInfo in grouplist.groupInfoList\" ng-class=\"{'active': currentGroupInfo.group.gid == groupInfo.group.gid}\" ng-click=\"enterOrSwitchAudioRoom(groupInfo.group.gid)\">\n" +
    "					<div class=\"avator\"><img ng-src=\"{{groupInfo.group.logo}}\" width=\"40\" height=\"40\"/></div>\n" +
    "						<div class=\"group-name\">{{groupInfo.group.gname}}</div>\n" +
    "						<span class=\"wave\" ng-show=\"(currentGroupInfo.group.gid == groupInfo.group.gid) && audioRoomInfo\"></span>\n" +
    "					</li>\n" +
    "				</ul>\n" +
    "			</div>\n" +
    "		</div>\n" +
    "		<div class=\"content\" ng-class=\"{'full':(grouplist.groupListTotal == 1) && currentGroupInfo}\">\n" +
    "			<div class=\"no-chose-tips f30\" ng-show=\"!currentGroupInfo\"><span class=\"arr\"></span>从左侧选择一个微群</div>\n" +
    "			<!-- 【语音直播准备】-->\n" +
    "			<div class=\"hd live\" ng-class=\"{'l_invisible': currentGroupInfo == null}\" ng-show=\"currentGroupInfo\">\n" +
    "				<!--<div class=\"menu\"></div>-->\n" +
    "				<div class=\"sign-out\" ng-click=\"signOutAudioRoom()\"></div>\n" +
    "				<div class=\"ui-modal\" ng-show=\"exitAudioRoomDialogShown\">\n" +
    "					<button type=\"button\" class=\"ui-btn ui-btn-link\" ng-click=\"hideExitAudioRoomDialog()\">&times;</button>\n" +
    "					<div class=\"ui-modal-body\">\n" +
    "						<h5>退出提示</h5>\n" +
    "						<p>语音正在直播，确定退出？</p>\n" +
    "					</div>\n" +
    "					<div class=\"ui-modal-footer\">\n" +
    "						<a href=\"javascript:void(0);\" class=\"ui-btn ui-btn-primary ui-btn-wid\" ng-click=\"exitAudioRoomDirectly()\">确定</a>\n" +
    "						<a href=\"javascript:void(0);\" class=\"ui-btn ui-btn-wid\" ng-click=\"hideExitAudioRoomDialog()\">取消</a>\n" +
    "					</div>\n" +
    "					<span class=\"arr-down\"></span>\n" +
    "				</div>\n" +
    "				<div class=\"avator\"><img ng-src=\"{{currentGroupInfo.group.logo}}\" width=\"100\" height=\"100\"/></div>\n" +
    "				<div class=\"user-info\">\n" +
    "					<div class=\"user-name\">{{currentGroupInfo.group.gname}}</div>\n" +
    "					<p class=\"txt-green\" ng-show=\"audioRoomInfo\">正在直播</p>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "			<div class=\"micro\" ng-show=\"currentGroupInfo\">\n" +
    "				<p class=\"voice_txt\" ng-bind=\"voiceMessage\" ng-show=\"voiceMessage && !audioRoomInfo\"></p>\n" +
    "				<p class=\"voice_txt txt-green\" id=\"voiceTiming\" ng-show=\"audioRoomInfo\">00:00</p>\n" +
    "				<div class=\"micro-bd\">\n" +
    "					<!--减少background-position: 122px 0; 里面的122px数字,可以向左增加音量-->\n" +
    "					<div class=\"v_left\"><span class=\"bg\" style=\"background-position: 122px 0;\" id=\"energy_left\"></span><span class=\"img\"></span></div>\n" +
    "					<div class=\"voice\" id=\"voiceButton\" ng-class=\"{'disable': !currentGroupInfo, 'stop': currentGroupInfo && audioRoomInfo, 'start': currentGroupInfo && !audioRoomInfo}\" ng-click=\"toggleLiveAudio($event)\"></div>\n" +
    "					<!--减少background-position: 122px 0; 里面的122px数字,可以向右增加音量-->\n" +
    "					<div class=\"v_right\"><span class=\"bg\" style=\"background-position: -122px 0;\" id=\"energy_right\"></span><span class=\"img\"></span></div>\n" +
    "				</div>\n" +
    "			</div>\n" +
    "			<div class=\"tools\" ng-show=\"currentGroupInfo\">\n" +
    "				<ul>\n" +
    "					<li class=\"\">\n" +
    "					<span class=\"accompany\" id=\"accompany\" ng-click=\"toggleBackgroundMusic()\">\n" +
    "					</span>\n" +
    "						<a href=\"javascript:void(0);\" class=\"txt\" ng-click=\"toggleBackgroundMusic()\" ng-show=\"!backgroundMusicEnabled\">添加QQ音乐伴奏</a>\n" +
    "						<span class=\"progressbar\" ng-show=\"backgroundMusicEnabled\" data-role=\"backgroundMusic\">\n" +
    "							<span class=\"progress\"><span class=\"point\"></span></span>\n" +
    "						</span>\n" +
    "					</li>\n" +
    "					<li class=\"\">\n" +
    "					<span ng-class=\"{'microphone-off': !micEnabled, 'microphone': micEnabled}\" id=\"microphone\" ng-click=\"toggleMic()\"></span>\n" +
    "					<span class=\"progressbar\" data-role=\"mic\">\n" +
    "							<span class=\"progress\" ng-show=\"micEnabled\"><span class=\"point\"></span></span>\n" +
    "						</span>\n" +
    "					</li>\n" +
    "				</ul>\n" +
    "			</div>  \n" +
    "		</div>\n" +
    "	</div>\n" +
    "	</div>\n" +
    "</div>\n" +
    "");
}]);
