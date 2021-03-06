import React, { Component } from "react"

import {
  StyleSheet,
  View,
  ActivityIndicator,
  Dimensions,
  Platform,
  AppState,
  TouchableOpacity,
  PanResponder
} from "react-native";

import TouchableDebounce from './TouchableDebounce';

import { WebView } from 'react-native-webview';

import EventEmitter from 'event-emitter'

import AsyncStorage from '@react-native-community/async-storage';

const URL = require("epubjs/libs/url/url-polyfill.js");

const embeddedHtml = (script, bridge, epubjs) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no, viewport-fit=cover">
  <title>epubjs</title>
  <link href="https://fonts.googleapis.com/css?family=Libre+Baskerville&display=swap" rel="stylesheet">
  <script>${process.env.POLYFILL}</script>
  <script>${epubjs}</script>
  <script>${bridge}</script>
  <style>
    #select-box {
      visibility: hidden;
      position: fixed;
      left: 0;
      top: 0;
      z-index: -1;
      height: 100%;
    }
    span {
      display: inline-block;
    }
    body {
      margin: 0;
      -webkit-touch-callout: none; /* iOS Safari */
      -webkit-user-select: none; /* Safari */
      -khtml-user-select: none; /* Konqueror HTML */
      -moz-user-select: none; /* Old versions of Firefox */
      -ms-user-select: none; /* Internet Explorer/Edge */
       user-select: none; /* Non-prefixed version, currently
                                  supported by Chrome, Opera and Firefox */
      -webkit-tap-highlight-color: rgba(0,0,0,0);
      -webkit-tap-highlight-color: transparent; /* For some Androids */
    }
    [ref="epubjs-mk"] {
      display: block;
      position : absolute;
      background-color: tomato;
      width: 20px;
      height: 20px;
      margin: 0;
  }
}


    /* For iPhone X Notch */
    @media only screen
      and (min-device-width : 375px)
      and (max-device-width : 812px)
      and (-webkit-device-pixel-ratio : 3) {
      body {
        padding-top: calc(env(safe-area-inset-top) / 2);
        padding-right: calc(env(safe-area-inset-right) / 2);
        padding-left: calc(env(safe-area-inset-left) / 2);
        padding-bottom: calc(env(safe-area-inset-bottom) / 2);
      }
    }
  </style>
</head><body>
<svg id="select-box" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100%" height="100%" stroke="black"
      stroke-width="2" fill="transparent" />
 </svg>
</body></html>
`;

class Rendition extends Component {

  constructor(props) {
    super(props);
  }

  componentDidMount() {
    this._isMounted = true;

    if (this.props.url) {
      this.load(this.props.url);
    }
  }

  componentWillUnmount() {
    this._isMounted = false;
    this.destroy();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.url !== this.props.url) {
      this.load(this.props.url);
    }

    if (prevProps.url !== this.props.url) {
      console.log("EPUB URL", prevProps.url, this.props.url);
      this.props.setLoaded(false);
    }

    if (prevProps.display !== this.props.display) {
      // this.setState({ loaded: false });
      console.log("EPUB DISPLAY CHANGE");
      this.display(this.props.display);
    }

    if (prevProps.orientation !== this.props.orientation) {
      console.log("EPUB ORIENTATION CHANGE");
      // this.setState({ loaded: false });
    }

    if (prevProps.flow !== this.props.flow) {
      console.log("EPUB FLOW CHANGE");
      this.flow(this.props.flow || "paginated");
    }

    let previousThemes = JSON.stringify(prevProps.themes);
    let currentThemes = JSON.stringify(this.props.themes)
    if ( previousThemes !== currentThemes) {
      console.log("EPUB THEMES CHANGE");
      this.themes(this.props.themes);
    }

    if (prevProps.theme !== this.props.theme || previousThemes !== currentThemes) {
      console.log("EPUB THEME CHANGE");
      this.theme(this.props.theme);
    }

    if (prevProps.fontSize !== this.props.fontSize) {
      console.log("EPUB FONT SIZE CHANGE");
      this.fontSize(this.props.fontSize);
    }

    if (prevProps.font !== this.props.font) {
      console.log("EPUB FONT CHANGE");
      this.font(this.props.font);
    }

    if (prevProps.width !== this.props.width ||
        prevProps.height !== this.props.height) {
      console.log("EPUB DIMENSION CHANGE");
      this.resize(this.props.width, this.props.height);
    }
  }

  clearSelected() {
    this.sendToBridge("deselect");
  }

  setAudioTime(time) {
    this.sendToBridge("currentAudioTime", [{ "audioTime": time}]);
  }

  load(bookUrl) {
    if (!this._webviewLoaded) return;

    __DEV__ && console.log("loading book: ", bookUrl);

    let config = {
      "minSpreadWidth": this.props.minSpreadWidth || 815,
      "flow": this.props.flow || "paginated",
      "gap": this.props.gap,
      "fullsize": true
    };

    if (this.props.stylesheet) {
      config.stylesheet = this.props.stylesheet;
    }

    if (this.props.webviewStylesheet) {
      config.webviewStylesheet = this.props.webviewStylesheet;
    }

    if (this.props.script) {
      config.script = this.props.script;
    }

    if (this.props.width) {
      config.width = this.props.width;
    }

    if (this.props.height) {
      config.height = this.props.height;
    }

    if (this.props.location) {
      config.location = this.props.location;
    }

    if (this.props.disableOrientationEvent) {
      config.resizeOnOrientationChange = this.props.resizeOnOrientationChange;
    }

    this.sendToBridge("open", [bookUrl, config]);

    this.display(this.props.display);

    if (this.props.themes) {
      this.themes(this.props.themes);
    }

    if (this.props.theme) {
      this.theme(this.props.theme);
    }

    if (this.props.fontSize) {
      this.fontSize(this.props.fontSize);
    }

    if (this.props.font) {
      this.font(this.props.font);
    }
  }

  display(target) {
    let spine = typeof target === "number" && target;

    if (!this._webviewLoaded) return;

    if (spine) {
      this.sendToBridge("display", [{ "spine": spine}]);
    } else if (target) {
      this.sendToBridge("display", [{ "target": target}]);
    } else {
      this.sendToBridge("display");
    }
  }

  resize(w, h) {
    if (!w || !h) {
      return;
    }
    this.sendToBridge("resize", [w,h]);
  }

  flow(f) {
    this.sendToBridge("flow", [f]);
  }

  themes(t) {
    this.sendToBridge("themes", [t]);
  }

  theme(t) {
    this.sendToBridge("theme", [t]);
  }

  font(f) {
    this.sendToBridge("font", [f]);
  }

  fontSize(f) {
    this.sendToBridge("fontSize", [f]);
  }

  override(name, value, priority) {
    this.sendToBridge("override", [name, value, priority]);
  }

  gap(gap) {
    this.sendToBridge("gap", [gap]);
  }

  setLocations(locations) {
    this.locations = locations;
    if (this.isReady) {
      this.sendToBridge("setLocations", [this.locations]);
    }
  }

  reportLocation() {
    if (this.isReady) {
      this.sendToBridge("reportLocation");
    }
  }

  highlight (cfiRange, data, cb, className, style) {
    this.sendToBridge("highlight", [cfiRange, data, cb, className,style]);
  }

  underline (cfiRange, data) {
    this.sendToBridge("underline", [cfiRange, data]);
  }

  mark (cfiRange, data) {
    this.sendToBridge("mark", [cfiRange, data]);
	}

  unhighlight (cfiRange) {
    this.sendToBridge("removeAnnotation", [cfiRange, "highlight"]);
	}

	ununderline (cfiRange) {
    this.sendToBridge("removeAnnotation", [cfiRange, "underline"]);
	}

	unmark (cfiRange) {
    this.sendToBridge("removeAnnotation", [cfiRange, "mark"]);
	}

  next() {
    this.sendToBridge("next");
  }

  prev() {
    this.sendToBridge("prev");
  }

  destroy() {

  }

  postMessage(str) {
    if (this.refs.webviewbridge) {
      return this.refs.webviewbridge.postMessage(str);
    }
  }

  sendToBridge(method, args, promiseId) {
    var str = JSON.stringify({
      method: method,
      args: args,
      promise: promiseId
    });

    if (!this.refs.webviewbridge) {
      return;
    }
    console.log("***TO BRIDGE", str);
    this.refs.webviewbridge.postMessage(str);
  }

  _onWebViewLoaded() {
    this._webviewLoaded = true;
    if (this.props.url) {
      this.load(this.props.url);
    }
  }

  _onBridgeMessage(e) {
    var msg = e.nativeEvent.data;
    var decoded;
    if (typeof msg === "string") {
      decoded = JSON.parse(msg);
    } else {
      decoded = msg; // webkit may pass parsed objects
    }
    var p;

    switch (decoded.method) {
      case "log": {
        console.log.apply(console.log, [decoded.value]);
        break;
      }
      case "error": {
        if (this.props.onError) {
          this.props.onError(decoded.value);
        } else {
          console.error.apply(console.error, [decoded.value]);
        }
        break;
      }
      case "loaded": {
        this._onWebViewLoaded();
        break;
      }
      case "rendered": {
        if (!this.props.loaded) {
          console.log("RENDERED");
          this.props.setLoaded(true);
        }
        break;
      }
      case "relocated": {
        let {location, pageBegin, pageEnd, smilChapter} = decoded;
        this._relocated(location, pageBegin, pageEnd, smilChapter);
        if (!this.props.loaded) {
          console.log("RELOCATED");
          this.props.setLoaded(true);
        }
        break;
      }
      case "resized": {
        let {size} = decoded;
        break;
      }
      case "press": {
        this.props.onPress && this.props.onPress(decoded.cfi, decoded.position, this);
        break;
      }
      case "longpress": {
        this.props.onLongPress && this.props.onLongPress(decoded.cfi, this);
        break;
      }
      case "dblpress": {
        this.props.onDblPress && this.props.onDblPress(decoded.cfi, decoded.position, decoded.imgSrc, this);
        break;
      }
      case "selected": {
        let {cfiRange} = decoded;
        this._selected(cfiRange);
        break;
      }
      case "markClicked": {
        let {cfiRange, data} = decoded;
        this._markClicked(cfiRange, data);
        break;
      }
      case "added": {
        let {sectionIndex} = decoded;
        this.props.onViewAdded && this.props.onViewAdded(sectionIndex);
        break;
      }
      case "removed": {
        let {sectionIndex} = decoded;
        this.props.beforeViewRemoved && this.props.beforeViewRemoved(sectionIndex);
        break;
      }
      case "ready": {
        this._ready();
        break;
      }
      case "set": {
        let hash = decoded
        let [v, setter] = this.props.stateChangeListeners[hash.key]
        if (hash.jsonValue) {
          setter((r) => JSON.parse(hash.jsonValue));
        } else {
          setter((r) => hash.value);
        }
        break;
      }
    }
  }

  _relocated(visibleLocation, pageBegin, pageEnd, smilChapter) {
    this._visibleLocation = visibleLocation;
    if (this.props.onRelocated) {
      this.props.onRelocated(visibleLocation, pageBegin, pageEnd, smilChapter, this);
    }
  }

  _selected(cfiRange) {
    if (this.props.onSelected) {
      this.props.onSelected(cfiRange, this);
    }
  }

  _markClicked(cfiRange, data) {
    if (this.props.onMarkClicked) {
      this.props.onMarkClicked(cfiRange, data, this);
    }
  }

  _ready() {
    this.isReady = true;
    if (this.locations) {
      this.sendToBridge("setLocations", [this.locations]);
    }
    this.props.onDisplayed && this.props.onDisplayed();
  }

  render() {
    let loader = (
      <TouchableDebounce onPress={() => this.props.onPress('')} style={styles.loadScreen}>
        <View style={[styles.loadScreen, {
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }]}>
            <ActivityIndicator
                color={this.props.color || "black"}
                size={this.props.size || "large"}
                style={{ flex: 1 }}
              />
        </View>
      </TouchableDebounce>
    );

    if (!this.props.url) {
      return loader;
    }

    return (
      <View ref="framer" style={[styles.container, {
          maxWidth: this.props.width, maxHeight: this.props.height,
          minWidth: this.props.width, minHeight: this.props.height
        }]}>
        <WebView
          ref="webviewbridge"
          source={{html: this.props.customHtml || embeddedHtml(this.props.script, this.props.bridge, this.props.epubjs), baseUrl: this.props.url}}
          style={[styles.manager, {
            backgroundColor: this.props.backgroundColor || "#FFFFFF"
          }]}
          bounces={false}
          javaScriptEnabled={true}
          scrollEnabled={true}
          pagingEnabled={this.props.flow === "paginated"}
          onMessage={this._onBridgeMessage.bind(this)}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          originWhitelist={['*']}
          decelerationRate={"fast"}
          allowsLinkPreview={false}
          allowsBackForwardNavigationGestures={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
        />
        {!this.props.loaded ? loader : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    margin: 10,
    flexDirection: "column",
  },
  manager: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
    marginTop: 0,
    flexDirection: "row",
    flexWrap: "nowrap",
    backgroundColor: "#F8F8F8",
  },
  rowContainer: {
    flex: 1,
  },
  loadScreen: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center"
  }
});

EventEmitter(Rendition.prototype);

export default Rendition;
