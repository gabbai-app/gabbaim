/**
 * מערכת ניהול עליות וגבאים — מעלה עמוס
 * Entry point: doGet (UI) + doPost (Yemot voice + API)
 */

var SS_KEY = 'GABBAI_SHEET_ID';
var CACHE_VERSION = 'v1';
var APP_TITLE = 'גבאים — מעלה עמוס';

function doGet(e) {
  var params = (e && e.parameter) || {};
  // API mode (called from GitHub Pages frontend via fetch)
  if (params.action) {
    try {
      var args = params.args ? JSON.parse(params.args) : {};
      var fn = this[params.action];
      if (typeof fn !== 'function') return _json({ok:false, error:'unknown action: '+params.action});
      var result = fn(args);
      return _json({ok:true, data: result});
    } catch(err) {
      return _json({ok:false, error: String(err)});
    }
  }
  // UI mode (Apps Script web app rendering — kept for fallback access)
  var page = params.page || 'dashboard';
  var allowed = ['dashboard','members','member_card','live_mode','events','reports','settings','login'];
  if (allowed.indexOf(page) === -1) page = 'dashboard';
  var t = HtmlService.createTemplateFromFile('index');
  t.page = page;
  t.params = params;
  return t.evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport','width=device-width,initial-scale=1,user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function doPost(e) {
  try {
    var body = {};
    var params = (e && e.parameter) || {};
    // form-urlencoded path (GitHub Pages frontend)
    if (params.action) {
      body.action = params.action;
      body.args = params.args ? JSON.parse(params.args) : {};
    } else if (e && e.postData && e.postData.contents) {
      // raw JSON or yemot
      var raw = e.postData.contents;
      try { body = JSON.parse(raw); }
      catch (jerr) { body = {}; }
    }
    if (body.yemot) return ContentService
      .createTextOutput(JSON.stringify(handleYemot(body)))
      .setMimeType(ContentService.MimeType.JSON);
    var action = body.action;
    if (!action) return _json({ok:false, error:'no action'});
    var fn = this[action];
    if (typeof fn !== 'function') return _json({ok:false, error:'unknown action: '+action});
    var result = fn(body.args || {});
    return _json({ok:true, data: result});
  } catch(err) {
    return _json({ok:false, error: String(err), stack: err.stack});
  }
}

function _json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

// gCall bridge — client side calls into here
function gCall(fn, args) {
  try {
    if (typeof this[fn] !== 'function') return {ok:false, error:'unknown fn: '+fn};
    return {ok:true, data: this[fn](args || {})};
  } catch(err) {
    return {ok:false, error: String(err), stack: err.stack};
  }
}

// Health
function ping() { return {pong: new Date().toISOString(), title: APP_TITLE}; }
