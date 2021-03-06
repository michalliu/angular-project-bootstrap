/*globals module,require*/
module.exports = function(grunt){
	var releaselocal="../htdocs/live/";
	var jadedata=function(){
		var config = require("./jade/config.json");
		config.maxage="31104000";
		config.lastupdate=new Date();
		config.cssversion="v1";
		config.jslibversion="v1";
		config.jspageversion="v1";
		return config;
	};
	grunt.initConfig({
		concat:{
			options:{
				separator: ';\n'
			},
			lib:{
				src:["js/lib/jquery-1.11.1.js",
					"js/lib/angular.js",
					"js/lib/parallel/**/*.js"],     // other libs which the order isn't important
				dest: "temp/js/lib.js"           // concat libs into one file
			},
			page:{
				src:["js/app.js",                // app config
					"js/providers/*.js",         // angular providers(plugins)
					"js/controllers/**/*.js"    // angular page controllers
					],
				dest: "temp/js/page.js"          // concated views logic to one
			},
			head:{
				src:["js/head/parallel/**/*.js"], // concat all the files need to run at head
				dest: "temp/js/head.js"
			},
			css:{
				src:["css/page.css",
					"css/parallel/**/*.js"],      // concat all stylesheets to one
				dest: "temp/all.css"
			}
		},
		uglify:{                                  // uglify concated js files
			release:{
				files:[{
					src:["temp/js/lib.js"],
					dest:releaselocal + "js/lib.js"
				},{
					src:["temp/js/page.js"],
					dest:releaselocal + "js/page.js"
				},{
					src:["temp/js/head.js"],
					dest:releaselocal + "js/head.js"
				}]
			}
		},
		cssmin:{                                   // uglify css files
			minify: {
				src:"temp/all.css",
				dest:releaselocal + "css/all.css"
			}
		},
		/* convert AngularJs html templates to cached JavaScript */
		html2js: {
			main: {
				options: {
					base: "",
					module: 'appTemplateCache'
				},
				src: [ 'views/**/*.html' ],
				dest: 'js/providers/templates.js'
			}
		},
		jade: {
			debug: {
				options:{
					data: jadedata,
					pretty:true
				},
				files:[{
					src: ["jade/index_dev.jade"],
					dest: "index_dev.html"
				}]
			},
			release: {
				options:{
					data: jadedata,
					pretty:false // default is false
				},
				files:[{
					src: ["jade/index.jade"],
					dest: releaselocal + "index.html"
				}]
			}
		},
//		includereplace:{
//			options:{
//				globals: {
//					"libversion": libversion,
//					"pageversion": pageversion,
//					"cssversion": cssversion,
//					"headversion": headversion
//				},
//				processIncludeContents:true
//			},
//			html_dev:{
//				src: 'include/dev/index.html',
//				dest: 'index_dev.html'
//			},
//			html_release:{
//				src: 'include/release/index.html',
//				dest: 'index.html'
//			}
//		},
//		htmlmin:{
//			dist:{
//				options:{
//					removeComments: true,
//					collapseWhitespace: true
//				},
//				files:{
//					src: ["index.html"],
//					dest: releaselocal + "index.html"
//				}
//			}
//		},
		copy: {
			index: {
				src:releaselocal + "index.html",
				dest: "index.html"
			}
		},
		clean:{
			index: ["index.html"]
		},
		compress:{
			main:{
				options: {
					archive: "upload.zip",
					mode:"zip"
				},
				files:[
					{expand:true, src: ["index.html","index_dev.html","callback.html","views/**/*.html"],dest:"/"}
				]
			}
		}
	});
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-html2js');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-jade');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-contrib-compress');
	//grunt.loadNpmTasks('grunt-contrib-htmlmin');
	//grunt.loadNpmTasks('grunt-include-replace');

	grunt.registerTask('css',['concat:css','cssmin']);
	grunt.registerTask('default',['html2js','concat','uglify',"cssmin","jade:release", "jade:debug"]);
	grunt.registerTask('debug',['jade:debug','compress:main']);
	grunt.registerTask('zip',['copy:index','compress:main','clean:index']);
};
