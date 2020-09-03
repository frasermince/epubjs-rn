var _interopRequireDefault=require("@babel/runtime/helpers/interopRequireDefault");Object.defineProperty(exports,"__esModule",{value:true});exports.default=void 0;var _classCallCheck2=_interopRequireDefault(require("@babel/runtime/helpers/classCallCheck"));var _createClass2=_interopRequireDefault(require("@babel/runtime/helpers/createClass"));var _reactNative=require("react-native");var _reactNativeStaticServer=_interopRequireDefault(require("react-native-static-server"));var _promiseRetry=_interopRequireDefault(require("promise-retry"));var _rnFetchBlob=_interopRequireDefault(require("rn-fetch-blob"));var _reactNativeZipArchive=require("react-native-zip-archive");var _pathWebpack=require("path-webpack");var Dirs=_rnFetchBlob.default.fs.dirs;var ls=_rnFetchBlob.default.fs.ls;if(!global.Blob){global.Blob=_rnFetchBlob.default.polyfill.Blob;}var Uri=require("epubjs/lib/utils/url");var EpubStreamer=function(){function EpubStreamer(opts){(0,_classCallCheck2.default)(this,EpubStreamer);opts=opts||{};this.port=opts.port||"3"+Math.round(Math.random()*1000);this.root=opts.root||"www";this.serverOrigin='file://';this.urls=[];this.locals=[];this.paths=[];this.started=false;this.server=undefined;}(0,_createClass2.default)(EpubStreamer,[{key:"setup",value:function setup(){var self=this;return(0,_promiseRetry.default)(function(retry,number){console.log("***DIRECTORY "+Dirs.DocumentDir+"/"+self.root);return _rnFetchBlob.default.fs.exists(Dirs.DocumentDir+"/"+self.root).then(function(exists){if(!exists){return _rnFetchBlob.default.fs.mkdir(Dirs.DocumentDir+"/"+self.root);}}).then(function(){return new _reactNativeStaticServer.default(self.port,self.root,{localOnly:true});}).catch(retry);});}},{key:"start",value:function start(){var _this=this;this.started=true;return this.setup().then(function(server){_this.server=server;return _this.server.start();}).then(function(url){_this.serverOrigin=url;return url;});}},{key:"stop",value:function stop(){this.started=false;if(this.server){this.server.stop();}}},{key:"kill",value:function kill(){this.started=false;if(this.server){this.server.kill();}}},{key:"add",value:function add(bookUrl){var _this2=this;var uri=new Uri(bookUrl);var filename=encodeURIComponent(this.filename(bookUrl));return _rnFetchBlob.default.config({fileCache:true,path:Dirs.DocumentDir+'/'+filename}).fetch("GET",bookUrl).then(function(res){var sourcePath=res.path();var targetPath=Dirs.DocumentDir+"/"+_this2.root+"/"+filename;var url=_this2.serverOrigin+"/"+filename+"/";console.log("***SOURCE PATH",sourcePath);console.log("***TARGET PATH",targetPath);return(0,_reactNativeZipArchive.unzip)(sourcePath,targetPath).then(function(path){_this2.urls.push(bookUrl);_this2.locals.push(url);_this2.paths.push(path);return url;});});}},{key:"check",value:function check(bookUrl){var filename=this.filename(bookUrl);var targetPath=Dirs.DocumentDir+"/"+this.root+"/"+filename;return _rnFetchBlob.default.fs.exists(targetPath);}},{key:"get",value:function get(bookUrl){var _this3=this;return this.check(bookUrl).then(function(exists){if(exists){var filename=_this3.filename(bookUrl);var url=_this3.serverOrigin+"/"+encodeURIComponent(filename)+"/";return url;}return _this3.add(bookUrl);});}},{key:"filename",value:function filename(bookUrl){var uri=new Uri(bookUrl);var finalFileName;if(uri.filename.indexOf("?")>-1){finalFileName=uri.filename.split("?")[0].replace(".epub","");}else{finalFileName=uri.filename.replace(".epub","");}return finalFileName;}},{key:"remove",value:function remove(path){var _this4=this;return _rnFetchBlob.default.fs.lstat(path).then(function(stats){var index=_this4.paths.indexOf(path);_this4.paths.splice(index,1);_this4.urls.splice(index,1);_this4.locals.splice(index,1);}).catch(function(err){});}},{key:"clean",value:function clean(){var _this5=this;this.paths.forEach(function(path){_this5.remove(path);});}}]);return EpubStreamer;}();var _default=EpubStreamer;exports.default=_default;