(function () {
  "use strict";

  var state = {
    version: "0.0.3",
    startedAt: new Date().toISOString ? new Date().toISOString() : String(new Date()),
    device: {},
    features: {},
    codecs: {},
    platform: {},
    tests: {
      storage: "not-run",
      network: "not-run",
      video: "not-run"
    },
    keys: []
  };

  var tileIndex = 0;
  var panelOpen = false;
  var remotePanelActive = false;
  var tiles = [];
  var pointerBridge = {
    lastX: null,
    lastY: null,
    lastNavAt: 0,
    seenMoves: 0,
    enabled: false
  };
  var backGuardMode = "none";
  var backGuardArmed = false;
  var exitWindowUntil = 0;
  var VIDEO_URL = "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

  function on(el, eventName, handler) {
    if (!el) {
      return;
    }
    if (el.addEventListener) {
      el.addEventListener(eventName, handler, false);
    } else if (el.attachEvent) {
      el.attachEvent("on" + eventName, handler);
    }
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(el, value) {
    if (!el) {
      return;
    }
    if (typeof el.textContent !== "undefined") {
      el.textContent = value;
    } else {
      el.innerText = value;
    }
  }

  function hasClass(el, name) {
    return (" " + el.className + " ").indexOf(" " + name + " ") !== -1;
  }

  function addClass(el, name) {
    if (!hasClass(el, name)) {
      el.className = (el.className + " " + name).replace(/^\s+|\s+$/g, "");
    }
  }

  function removeClass(el, name) {
    var pattern = new RegExp("(^|\\s)" + name + "(\\s|$)", "g");
    el.className = el.className.replace(pattern, " ").replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  }

  function boolText(value) {
    return value ? "YES" : "NO";
  }

  function statusClass(value) {
    if (value === true || value === "probably" || value === "maybe" || value === "PASS" || value === "SUPPORTED") {
      return "pass";
    }
    if (value === false || value === "" || value === "FAIL" || value === "UNSUPPORTED") {
      return "fail";
    }
    return "warn";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function safeRun(fn, fallback) {
    try {
      return fn();
    } catch (error) {
      return typeof fallback === "undefined" ? false : fallback;
    }
  }

  function storageWorks(name) {
    return safeRun(function () {
      var storage = window[name];
      var key = "__kerotv_probe__";
      storage.setItem(key, "ok");
      var ok = storage.getItem(key) === "ok";
      storage.removeItem(key);
      return ok;
    }, false);
  }

  function canPlay(type) {
    return safeRun(function () {
      var video = document.createElement("video");
      if (!video || !video.canPlayType) {
        return "";
      }
      return video.canPlayType(type) || "";
    }, "");
  }

  function collectDeviceInfo() {
    state.device.userAgent = navigator.userAgent || "unknown";
    state.device.platform = navigator.platform || "unknown";
    state.device.language = navigator.language || navigator.userLanguage || "unknown";
    state.device.online = typeof navigator.onLine === "boolean" ? navigator.onLine : "unknown";
    state.device.screen = (window.screen ? window.screen.width + "x" + window.screen.height : "unknown");
    state.device.viewport = (document.documentElement.clientWidth || window.innerWidth || 0) + "x" + (document.documentElement.clientHeight || window.innerHeight || 0);
    state.device.pixelRatio = typeof window.devicePixelRatio !== "undefined" ? window.devicePixelRatio : "unknown";
    state.device.protocol = window.location.protocol;
    state.device.host = window.location.host || "local-file";
  }

  function collectFeatureInfo() {
    state.features.json = typeof window.JSON !== "undefined";
    state.features.objectKeys = typeof Object.keys === "function";
    state.features.arrayIsArray = typeof Array.isArray === "function";
    state.features.promise = typeof window.Promise !== "undefined";
    state.features.fetch = typeof window.fetch === "function";
    state.features.xhr = typeof window.XMLHttpRequest !== "undefined";
    state.features.localStorage = storageWorks("localStorage");
    state.features.sessionStorage = storageWorks("sessionStorage");
    state.features.webSocket = typeof window.WebSocket !== "undefined";
    state.features.requestAnimationFrame = typeof window.requestAnimationFrame === "function" || typeof window.webkitRequestAnimationFrame === "function";
    state.features.fullscreen = !!(document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.webkitRequestFullScreen ||
      document.documentElement.mozRequestFullScreen ||
      document.documentElement.msRequestFullscreen);
    state.features.pageVisibility = typeof document.hidden !== "undefined" || typeof document.webkitHidden !== "undefined";
    state.features.cssSupports = !!(window.CSS && typeof window.CSS.supports === "function");
    state.features.flexbox = safeRun(function () {
      if (window.CSS && window.CSS.supports) {
        return window.CSS.supports("display", "flex") || window.CSS.supports("display", "-webkit-flex");
      }
      var style = document.createElement("div").style;
      return typeof style.flex !== "undefined" || typeof style.webkitFlex !== "undefined";
    }, false);
    state.features.cssGrid = safeRun(function () {
      return !!(window.CSS && window.CSS.supports && window.CSS.supports("display", "grid"));
    }, false);
  }

  function collectCodecInfo() {
    state.codecs.h264Mp4 = canPlay('video/mp4; codecs="avc1.42E01E, mp4a.40.2"');
    state.codecs.webmVp8 = canPlay('video/webm; codecs="vp8, vorbis"');
    state.codecs.hls = canPlay("application/vnd.apple.mpegurl") || canPlay("application/x-mpegURL");
    state.codecs.hevc = canPlay('video/mp4; codecs="hvc1"') || canPlay('video/mp4; codecs="hev1"');
  }

  function collectPlatformHints() {
    var ua = (navigator.userAgent || "").toLowerCase();
    state.platform.hbbtvUserAgent = ua.indexOf("hbbtv") !== -1;
    state.platform.vewdOrOperaHint = ua.indexOf("vewd") !== -1 || ua.indexOf("opera") !== -1 || ua.indexOf("opr/") !== -1;
    state.platform.oipfObjectFactory = typeof window.oipfObjectFactory !== "undefined";
    state.platform.oipfApplicationManager = typeof window.oipfApplicationManager !== "undefined";
    state.platform.sonyHint = ua.indexOf("sony") !== -1 || ua.indexOf("bravia") !== -1;
  }

  function runCompatibilityScan() {
    collectDeviceInfo();
    collectFeatureInfo();
    collectCodecInfo();
    collectPlatformHints();

    setText(byId("scanState"), "DONE");
    setText(byId("healthText"), "Shell running");
    setText(byId("bootMessage"), "Core shell booted. Open Compatibility for the detected capability floor.");
    addClass(byId("healthDot"), "pass");
  }

  function makeRow(name, value, note) {
    var cls = statusClass(value);
    var displayValue = value;
    if (typeof value === "boolean") {
      displayValue = boolText(value);
    }
    if (displayValue === "") {
      displayValue = "NO";
    }
    return '<div class="result-row">' +
      '<span class="result-name">' + escapeHtml(name) + '</span>' +
      (note ? '<span class="result-note">' + escapeHtml(note) + '</span>' : '') +
      '<span class="result-value ' + cls + '">' + escapeHtml(displayValue) + '</span>' +
      '</div>';
  }

  function renderCompatibility() {
    var html = "";
    html += makeRow("User agent", "INFO", state.device.userAgent);
    html += makeRow("Screen", "INFO", state.device.screen + " · viewport " + state.device.viewport + " · DPR " + state.device.pixelRatio);
    html += makeRow("Protocol / host", "INFO", state.device.protocol + " // " + state.device.host);
    html += makeRow("Online", state.device.online, "navigator.onLine");
    html += makeRow("JSON", state.features.json, "Core report serialization");
    html += makeRow("XMLHttpRequest", state.features.xhr, "Required baseline network API");
    html += makeRow("Fetch", state.features.fetch, "Optional; KeroTV can use XHR instead");
    html += makeRow("Promises", state.features.promise, "Optional; V0 core does not depend on them");
    html += makeRow("localStorage", state.features.localStorage, "Preferred lightweight persistence");
    html += makeRow("sessionStorage", state.features.sessionStorage, "Session-only fallback");
    html += makeRow("WebSocket", state.features.webSocket, "Optional future companion/control channel");
    html += makeRow("requestAnimationFrame", state.features.requestAnimationFrame, "Useful for smooth UI motion");
    html += makeRow("Fullscreen API", state.features.fullscreen, "Browser chrome may still be controlled by TV firmware");
    html += makeRow("Flexbox", state.features.flexbox, "Optional progressive layout");
    html += makeRow("CSS Grid", state.features.cssGrid, "Not required");
    html += makeRow("H.264 / MP4", state.codecs.h264Mp4 || false, "canPlayType result");
    html += makeRow("WebM VP8", state.codecs.webmVp8 || false, "canPlayType result");
    html += makeRow("HLS", state.codecs.hls || false, "canPlayType result");
    html += makeRow("HEVC", state.codecs.hevc || false, "canPlayType result");
    html += makeRow("HbbTV UA hint", state.platform.hbbtvUserAgent, "User-agent inspection only");
    html += makeRow("OIPF factory", state.platform.oipfObjectFactory, "Legacy TV application API hint");
    html += makeRow("OIPF app manager", state.platform.oipfApplicationManager, "Legacy TV application API hint");
    html += makeRow("Vewd / Opera hint", state.platform.vewdOrOperaHint, "User-agent inspection only");
    openPanel("Compatibility", "AUTOMATIC SCAN", html);
  }

  function openPanel(title, kicker, html) {
    setText(byId("panelTitle"), title);
    setText(byId("panelKicker"), kicker);
    byId("panelBody").innerHTML = html;
    addClass(byId("panel"), "is-open");
    byId("panel").setAttribute("aria-hidden", "false");
    panelOpen = true;
    remotePanelActive = false;
  }

  function closePanel() {
    removeClass(byId("panel"), "is-open");
    byId("panel").setAttribute("aria-hidden", "true");
    byId("panelBody").innerHTML = "";
    panelOpen = false;
    remotePanelActive = false;
    focusTile(tileIndex);
  }

  function remotePanelHtml() {
    return '<p>Press buttons on the Sony remote. KeroTV records both real key events and Sony browser pointer-emulation events. Unknown input is valuable.</p>' +
      '<div id="remoteKeyDisplay" class="key-display">Waiting for remote input…</div>' +
      '<div class="small">Try: ↑ ↓ ← → · OK · Back/Return · number keys · Play · Pause · Stop · Red · Green · Yellow · Blue.</div>' +
      '<div id="remoteKeyLog" class="key-log">No input recorded yet.</div>';
  }

  function openRemoteTest() {
    openPanel("Remote input", "LIVE KEY LOGGER", remotePanelHtml());
    remotePanelActive = true;
    setText(byId("remoteState"), "LISTENING");
    renderKeyLog();
  }

  function keyName(code, key) {
    var map = {
      8: "Backspace / possible Back",
      13: "OK / Enter",
      19: "Pause",
      27: "Escape / possible Back",
      32: "Space / possible Play-Pause",
      37: "Left",
      38: "Up",
      39: "Right",
      40: "Down",
      403: "Red",
      404: "Green",
      405: "Yellow",
      406: "Blue",
      413: "Stop",
      415: "Play",
      461: "Back / Return (TV)"
    };
    return map[code] || key || "Unknown";
  }

  function recordKey(event) {
    var code = event.keyCode || event.which || 0;
    var name = keyName(code, event.key);
    var item = {
      code: code,
      key: event.key || "",
      name: name,
      time: new Date().toLocaleTimeString ? new Date().toLocaleTimeString() : String(new Date())
    };

    state.keys.push(item);
    if (state.keys.length > 24) {
      state.keys.shift();
    }

    setText(byId("lastKey"), "Last key: " + name + " [" + code + "]");

    if (remotePanelActive) {
      renderKeyLog();
    }
  }


  function recordSyntheticInput(name, code) {
    var item = {
      code: code,
      key: "",
      name: name,
      time: new Date().toLocaleTimeString ? new Date().toLocaleTimeString() : String(new Date())
    };

    state.keys.push(item);
    if (state.keys.length > 24) {
      state.keys.shift();
    }

    setText(byId("lastKey"), "Last input: " + name);

    if (remotePanelActive) {
      renderKeyLog();
    }
  }

  function activatePointerBridge() {
    if (!pointerBridge.enabled) {
      pointerBridge.enabled = true;
      addClass(document.body, "remote-pointer-mode");
      setText(byId("remoteState"), "POINTER");
      setText(byId("bootMessage"), "Sony remote pointer mode detected. KeroTV is translating pointer motion into D-pad navigation.");
    }
  }

  function handlePointerMove(event) {
    var x = typeof event.clientX === "number" ? event.clientX : event.screenX;
    var y = typeof event.clientY === "number" ? event.clientY : event.screenY;
    var dx;
    var dy;
    var absX;
    var absY;
    var direction;
    var now;

    if (typeof x !== "number" || typeof y !== "number") {
      return;
    }

    if (pointerBridge.lastX === null || pointerBridge.lastY === null) {
      pointerBridge.lastX = x;
      pointerBridge.lastY = y;
      return;
    }

    dx = x - pointerBridge.lastX;
    dy = y - pointerBridge.lastY;
    pointerBridge.lastX = x;
    pointerBridge.lastY = y;

    absX = Math.abs(dx);
    absY = Math.abs(dy);

    if (absX < 3 && absY < 3) {
      return;
    }

    now = new Date().getTime();
    if (now - pointerBridge.lastNavAt < 140) {
      return;
    }

    direction = absX >= absY ? (dx < 0 ? "Left" : "Right") : (dy < 0 ? "Up" : "Down");
    pointerBridge.seenMoves += 1;

    if (pointerBridge.seenMoves >= 2) {
      activatePointerBridge();
    }

    if (!pointerBridge.enabled) {
      return;
    }

    pointerBridge.lastNavAt = now;

    if (remotePanelActive) {
      recordSyntheticInput("Remote pointer " + direction, "pointer-" + direction.toLowerCase());
      return;
    }

    if (panelOpen) {
      return;
    }

    if (direction === "Left") {
      moveFocus(-1);
    } else if (direction === "Right") {
      moveFocus(1);
    } else if (direction === "Up") {
      moveFocus(-3);
    } else if (direction === "Down") {
      moveFocus(3);
    }

    recordSyntheticInput("Remote " + direction, "pointer-" + direction.toLowerCase());
  }

  function handlePointerClick(event) {
    if (!pointerBridge.enabled) {
      return true;
    }

    if (remotePanelActive) {
      recordSyntheticInput("Remote OK / pointer click", "pointer-click");
      return true;
    }

    if (panelOpen) {
      return true;
    }

    if (event) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      if (event.stopPropagation) {
        event.stopPropagation();
      }
      event.cancelBubble = true;
      event.returnValue = false;
    }

    recordSyntheticInput("Remote OK / focused tile", "pointer-click");
    if (tiles[tileIndex]) {
      invokeAction(tiles[tileIndex].getAttribute("data-action"));
    }
    return false;
  }

  function pushHistoryGuard() {
    try {
      window.history.pushState({ kerotvGuard: true }, document.title, window.location.href);
      backGuardArmed = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  function armBackGuard() {
    try {
      if (window.history && window.history.pushState && window.history.replaceState) {
        window.history.replaceState({ kerotvBase: true }, document.title, window.location.href);
        if (pushHistoryGuard()) {
          backGuardMode = "history";
          return;
        }
      }
    } catch (historyError) {}

    try {
      backGuardMode = "hash";
      backGuardArmed = true;
      if (window.location.hash !== "#kerotv") {
        window.location.hash = "kerotv";
      }
    } catch (hashError) {
      backGuardMode = "none";
      backGuardArmed = false;
    }
  }

  function showExitHint() {
    setText(byId("bootMessage"), "Back captured by KeroTV. Press Back again quickly to leave the app.");
  }

  function handleGuardedBack() {
    var now = new Date().getTime();

    if (!backGuardArmed) {
      return;
    }

    if (panelOpen) {
      closePanel();
      exitWindowUntil = 0;

      if (backGuardMode === "history") {
        pushHistoryGuard();
      } else if (backGuardMode === "hash" && window.location.hash !== "#kerotv") {
        window.location.hash = "kerotv";
      }
      return;
    }

    if (now < exitWindowUntil) {
      backGuardArmed = false;
      exitWindowUntil = 0;
      try {
        window.history.back();
      } catch (ignore) {}
      return;
    }

    exitWindowUntil = now + 1600;
    showExitHint();

    if (backGuardMode === "history") {
      pushHistoryGuard();
    } else if (backGuardMode === "hash" && window.location.hash !== "#kerotv") {
      window.location.hash = "kerotv";
    }
  }

  function handlePopState() {
    if (backGuardMode === "history") {
      handleGuardedBack();
    }
  }

  function handleHashChange() {
    if (backGuardMode === "hash" && window.location.hash !== "#kerotv") {
      handleGuardedBack();
    }
  }

  function renderKeyLog() {
    var display = byId("remoteKeyDisplay");
    var log = byId("remoteKeyLog");
    var i;
    var lines = [];

    if (!display || !log) {
      return;
    }

    if (state.keys.length === 0) {
      setText(display, "Waiting for remote input…");
      setText(log, "No keys recorded yet.");
      return;
    }

    var last = state.keys[state.keys.length - 1];
    setText(display, last.name + "  ·  keyCode " + last.code);

    for (i = state.keys.length - 1; i >= 0; i--) {
      lines.push(state.keys[i].time + "  |  " + state.keys[i].name + "  |  code=" + state.keys[i].code + "  key=" + (state.keys[i].key || "—"));
    }
    setText(log, lines.join("\n"));
  }

  function runStorageTest() {
    var localOk = storageWorks("localStorage");
    var sessionOk = storageWorks("sessionStorage");
    state.tests.storage = localOk || sessionOk ? "PASS" : "FAIL";
    state.features.localStorage = localOk;
    state.features.sessionStorage = sessionOk;
    setText(byId("storageState"), state.tests.storage);

    var html = "";
    html += makeRow("localStorage read/write", localOk, "Write → read → delete probe");
    html += makeRow("sessionStorage read/write", sessionOk, "Write → read → delete probe");
    html += '<p class="small">One working storage mechanism is enough for V0. If both fail, a future phone pairing flow can keep state server-side.</p>';
    openPanel("Storage", "PERSISTENCE TEST", html);
  }

  function runNetworkTest() {
    state.tests.network = "RUNNING";
    setText(byId("networkState"), "TESTING");

    var html = '<p>Requesting <strong>README.md</strong> from the same origin with XMLHttpRequest…</p>' +
      '<div id="networkResult" class="key-display">Testing…</div>' +
      '<p class="small">This deliberately tests XHR instead of Fetch because XHR is the safer compatibility floor for an older TV browser.</p>';
    openPanel("Network", "SAME-ORIGIN XHR", html);

    if (typeof XMLHttpRequest === "undefined") {
      finishNetwork(false, "XMLHttpRequest does not exist.");
      return;
    }

    try {
      var xhr = new XMLHttpRequest();
      var done = false;

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && !done) {
          done = true;
          if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
            finishNetwork(true, "HTTP " + xhr.status + " · " + xhr.responseText.length + " bytes");
          } else {
            finishNetwork(false, "HTTP " + xhr.status);
          }
        }
      };

      xhr.onerror = function () {
        if (!done) {
          done = true;
          finishNetwork(false, "Network error");
        }
      };

      xhr.open("GET", "README.md?probe=" + new Date().getTime(), true);
      xhr.send(null);

      window.setTimeout(function () {
        if (!done) {
          done = true;
          try {
            xhr.abort();
          } catch (ignore) {}
          finishNetwork(false, "Timed out after 8 seconds");
        }
      }, 8000);
    } catch (error) {
      finishNetwork(false, error.message || String(error));
    }
  }

  function finishNetwork(ok, message) {
    state.tests.network = ok ? "PASS" : "FAIL";
    setText(byId("networkState"), state.tests.network);
    var el = byId("networkResult");
    if (el) {
      setText(el, (ok ? "PASS · " : "FAIL · ") + message);
      addClass(el, ok ? "pass" : "fail");
    }
  }

  function videoPanelHtml() {
    return '<p>This test loads a small public H.264/MP4 sample over HTTPS. Codec support and successful network playback are recorded separately.</p>' +
      makeRow("Browser H.264 claim", state.codecs.h264Mp4 || false, 'video.canPlayType("video/mp4; codecs=avc1…")') +
      '<button id="videoStartBtn" class="action-button">Start MP4 test</button>' +
      '<div id="videoStatus" class="key-display">Not started</div>' +
      '<div class="video-wrap"><video id="probeVideo" preload="none"></video></div>' +
      '<p class="small">Source: Google GTV public sample. If codec support says YES but loading fails, the problem may be TLS/network rather than decoding.</p>';
  }

  function openVideoTest() {
    openPanel("Video", "REAL PLAYBACK TEST", videoPanelHtml());
    var button = byId("videoStartBtn");
    if (button) {
      on(button, "click", startVideoTest);
      try {
        button.focus();
      } catch (ignore) {}
    }
  }

  function startVideoTest() {
    var video = byId("probeVideo");
    var status = byId("videoStatus");

    if (!video || !status) {
      return;
    }

    state.tests.video = "RUNNING";
    setText(byId("videoState"), "TESTING");
    setText(status, "Loading MP4…");

    on(video, "loadedmetadata", function () {
      setText(status, "Metadata loaded · " + video.videoWidth + "x" + video.videoHeight);
    });

    on(video, "canplay", function () {
      setText(status, "Can play · starting…");
      try {
        var result = video.play();
        if (result && typeof result.catch === "function") {
          result.catch(function () {
            setText(status, "Loaded, but play() was blocked. Press OK again.");
          });
        }
      } catch (error) {
        setText(status, "Loaded. play() threw: " + (error.message || String(error)));
      }
    });

    on(video, "playing", function () {
      state.tests.video = "PASS";
      setText(byId("videoState"), "PASS");
      setText(status, "PASS · video is playing");
      addClass(status, "pass");
    });

    on(video, "error", function () {
      var code = video.error ? video.error.code : "unknown";
      state.tests.video = "FAIL";
      setText(byId("videoState"), "FAIL");
      setText(status, "FAIL · media error code " + code);
      addClass(status, "fail");
    });

    video.src = VIDEO_URL;
    try {
      video.load();
    } catch (error2) {
      state.tests.video = "FAIL";
      setText(byId("videoState"), "FAIL");
      setText(status, "FAIL · " + (error2.message || String(error2)));
      addClass(status, "fail");
    }
  }

  function reportObject() {
    collectDeviceInfo();
    return state;
  }

  function reportText() {
    var data = reportObject();
    if (window.JSON && JSON.stringify) {
      return JSON.stringify(data, null, 2);
    }

    return "JSON.stringify unavailable.\n" +
      "User agent: " + state.device.userAgent + "\n" +
      "Screen: " + state.device.screen + "\n" +
      "Viewport: " + state.device.viewport + "\n" +
      "Storage: " + state.tests.storage + "\n" +
      "Network: " + state.tests.network + "\n" +
      "Video: " + state.tests.video;
  }

  function openReport() {
    openPanel(
      "Probe report",
      "CAPTURE THIS SCREEN",
      '<p>Take a photo or copy this report after the TV test pass. It is the input for KeroTV V1 architecture.</p>' +
      '<div class="report">' + escapeHtml(reportText()) + '</div>'
    );
  }

  function invokeAction(action) {
    if (action === "scan") {
      runCompatibilityScan();
      renderCompatibility();
    } else if (action === "remote") {
      openRemoteTest();
    } else if (action === "storage") {
      runStorageTest();
    } else if (action === "network") {
      runNetworkTest();
    } else if (action === "video") {
      openVideoTest();
    } else if (action === "report") {
      openReport();
    }
  }

  function focusTile(index) {
    var i;
    if (!tiles.length) {
      return;
    }

    if (index < 0) {
      index = 0;
    }
    if (index >= tiles.length) {
      index = tiles.length - 1;
    }

    tileIndex = index;

    for (i = 0; i < tiles.length; i++) {
      removeClass(tiles[i], "is-focused");
      tiles[i].setAttribute("tabindex", i === tileIndex ? "0" : "-1");
    }

    addClass(tiles[tileIndex], "is-focused");
    try {
      tiles[tileIndex].focus();
    } catch (ignore) {}
  }

  function moveFocus(delta) {
    var next = tileIndex + delta;
    if (next < 0) {
      next = 0;
    }
    if (next >= tiles.length) {
      next = tiles.length - 1;
    }
    focusTile(next);
  }

  function handleKeyDown(event) {
    var code = event.keyCode || event.which || 0;
    recordKey(event);

    if (panelOpen) {
      if (code === 8 || code === 27 || code === 461) {
        if (event.preventDefault) {
          event.preventDefault();
        }
        closePanel();
        return false;
      }
      return true;
    }

    if (code === 37) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      moveFocus(-1);
      return false;
    }

    if (code === 39) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      moveFocus(1);
      return false;
    }

    if (code === 38) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      moveFocus(-3);
      return false;
    }

    if (code === 40) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      moveFocus(3);
      return false;
    }

    if (code === 13) {
      if (event.preventDefault) {
        event.preventDefault();
      }
      invokeAction(tiles[tileIndex].getAttribute("data-action"));
      return false;
    }

    return true;
  }

  function updateClock() {
    var now = new Date();
    var h = now.getHours();
    var m = now.getMinutes();
    setText(byId("clock"), (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m);
  }

  function initTiles() {
    var container = byId("tiles");
    var buttons = container ? container.getElementsByTagName("button") : [];
    var i;

    for (i = 0; i < buttons.length; i++) {
      tiles.push(buttons[i]);
      (function (button, index) {
        on(button, "focus", function () {
          tileIndex = index;
          var j;
          for (j = 0; j < tiles.length; j++) {
            removeClass(tiles[j], "is-focused");
          }
          addClass(button, "is-focused");
        });

        on(button, "click", function (event) {
          if (pointerBridge.enabled && !panelOpen) {
            if (event) {
              if (event.preventDefault) {
                event.preventDefault();
              }
              event.cancelBubble = true;
              event.returnValue = false;
            }
            return false;
          }

          invokeAction(button.getAttribute("data-action"));
          return true;
        });
      }(buttons[i], i));
    }

    focusTile(0);
  }

  function init() {
    initTiles();
    on(document, "keydown", handleKeyDown);
    on(document, "mousemove", handlePointerMove);
    on(document, "click", handlePointerClick);
    on(window, "popstate", handlePopState);
    on(window, "hashchange", handleHashChange);
    updateClock();
    window.setInterval(updateClock, 30000);
    runCompatibilityScan();
    armBackGuard();

    if (document.addEventListener) {
      document.addEventListener("mouseup", function (event) {
        if (pointerBridge.enabled && !panelOpen) {
          handlePointerClick(event);
        }
      }, true);
    }
  }

  if (document.readyState === "loading") {
    on(document, "DOMContentLoaded", init);
  } else {
    init();
  }
}());
