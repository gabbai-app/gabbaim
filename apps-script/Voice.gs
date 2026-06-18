/**
 * Yemot HaMashiach voice module
 * Returns JSON actions according to api type extension protocol.
 * Reference: project_yosef_voice_agent.md
 *
 * The state machine uses ApiCallId to persist across calls.
 */

function handleYemot(req) {
  // req: {yemot:true, params: {ApiCallId, ApiPhone, ApiExtension, ApiYemotVer, ApiTime, ...}}
  var p = req.params || req;
  var state = _voiceLoadState(p.ApiCallId);
  var phone = p.ApiPhone || '';
  var input = p.input || p.val_1 || p.val || '';
  var step = state.step || 'gabbai_pin';

  // log it
  try { _voiceLog(p.ApiCallId, step, input); } catch(e){}

  // Step 1: identify gabbai
  if (step === 'gabbai_pin') {
    if (!input) {
      return _vSay('שלום וברוכים הבאים למערכת ניהול עליות. אנא הקש את קוד הגבאי שלך.', true);
    }
    var gabbai = _findGabbaiByPin(input);
    if (!gabbai) return _vSay('קוד שגוי. נסה שוב.', true);
    state.gabbai_id = gabbai.id;
    state.synagogue_id = gabbai.synagogue_id;
    state.step = 'main_menu';
    _voiceSaveState(p.ApiCallId, state);
    return _vMenu('שלום ' + gabbai.name + '. תפריט ראשי. הקש 1 לחיובי השבת, 2 לרישום עלייה, 3 להוספת אירוע, 4 למי לא עלה הרבה זמן, 5 לחיפוש מתפלל, 0 לסיום.');
  }

  if (step === 'main_menu') {
    if (input === '1') return _showObligations(p, state);
    if (input === '2') { state.step = 'rec_search'; _voiceSaveState(p.ApiCallId, state); return _vSay('הקש את 3 הספרות הראשונות של שם משפחה. או 0 לאחור.', true); }
    if (input === '3') { state.step = 'add_event_type'; _voiceSaveState(p.ApiCallId, state); return _vMenu('הקש 1 ליארצייט, 2 לבר מצווה, 3 לחתן, 4 לאחר.'); }
    if (input === '4') return _topAbsent(p, state);
    if (input === '5') { state.step = 'search'; _voiceSaveState(p.ApiCallId, state); return _vSay('הקש את האותיות של השם.', true); }
    if (input === '0') return _vHangup('להתראות.');
    return _vMenu('לא הובן. נסה שוב. 1 חיובים, 2 רישום עלייה, 3 הוסף אירוע, 4 רחוקים, 5 חיפוש.');
  }

  if (step === 'rec_search') {
    if (input === '0') { state.step = 'main_menu'; _voiceSaveState(p.ApiCallId, state); return _vMenu('תפריט ראשי.'); }
    // input is keypad string — map to results
    var results = _searchByPad(input, state.synagogue_id);
    if (!results.length) return _vSay('לא נמצאו מתפללים. נסה שוב.', true);
    state.search_results = results.slice(0, 5).map(function(m){ return m.id; });
    state.step = 'rec_pick_member';
    _voiceSaveState(p.ApiCallId, state);
    var msg = 'נמצאו תוצאות. ';
    results.slice(0, 5).forEach(function(m, i) {
      msg += 'הקש ' + (i+1) + ' עבור ' + (m.first_name||'') + ' ' + (m.last_name||'') + '. ';
    });
    msg += 'הקש 0 לחזור.';
    return _vMenu(msg);
  }

  if (step === 'rec_pick_member') {
    if (input === '0') { state.step = 'main_menu'; _voiceSaveState(p.ApiCallId, state); return _vMenu('תפריט ראשי.'); }
    var idx = parseInt(input) - 1;
    if (!state.search_results || idx < 0 || idx >= state.search_results.length) return _vSay('בחירה לא תקינה.', true);
    state.selected_member_id = state.search_results[idx];
    state.step = 'rec_aliyah';
    _voiceSaveState(p.ApiCallId, state);
    return _vMenu('איזו עלייה? 1 כהן, 2 לוי, 3 שלישי, 4 רביעי, 5 חמישי, 6 שישי, 7 שביעי, 8 מפטיר.');
  }

  if (step === 'rec_aliyah') {
    var names = ['','כהן','לוי','שלישי','רביעי','חמישי','שישי','שביעי','מפטיר'];
    var name = names[parseInt(input)];
    if (!name) return _vSay('בחירה לא תקינה.', true);
    var m = findById_('members', state.selected_member_id);
    var today = new Date().toISOString().substring(0,10);
    logAliyah({
      member_id: state.selected_member_id,
      synagogue_id: state.synagogue_id,
      gabbai_id: state.gabbai_id,
      aliyah_name: name,
      aliyah_order: parseInt(input),
      channel: 'voice',
      date: today
    });
    state.step = 'main_menu';
    _voiceSaveState(p.ApiCallId, state);
    return _vMenu('נרשם. ' + (m ? (m.first_name + ' ' + m.last_name) : '') + ' קיבל עליית ' + name + '. תפריט ראשי?');
  }

  if (step === 'add_event_type') {
    if (input === '0') { state.step = 'main_menu'; _voiceSaveState(p.ApiCallId, state); return _vMenu('תפריט ראשי.'); }
    var types = ['','יארצייט','בר_מצווה','חתן','אחר'];
    var t = types[parseInt(input)];
    if (!t) return _vSay('בחירה לא תקינה.', true);
    state.new_event_type = t;
    state.step = 'add_event_search';
    _voiceSaveState(p.ApiCallId, state);
    return _vSay('הקש את 3 הספרות הראשונות של שם המתפלל.', true);
  }

  if (step === 'add_event_search') {
    var res = _searchByPad(input, state.synagogue_id);
    if (!res.length) return _vSay('לא נמצא.', true);
    state.event_member_id = res[0].id;
    state.step = 'add_event_date';
    _voiceSaveState(p.ApiCallId, state);
    return _vSay('הקש יום בחודש העברי, 1 עד 30.', true);
  }

  if (step === 'add_event_date') {
    var day = parseInt(input);
    if (day < 1 || day > 30) return _vSay('יום לא תקין.', true);
    state.event_day = day;
    state.step = 'add_event_month';
    _voiceSaveState(p.ApiCallId, state);
    return _vMenu('הקש חודש: 1 ניסן, 2 אייר, 3 סיון, 4 תמוז, 5 אב, 6 אלול, 7 תשרי, 8 חשוון, 9 כסלו, 10 טבת, 11 שבט, 12 אדר.');
  }

  if (step === 'add_event_month') {
    var months = ['','ניסן','אייר','סיון','תמוז','אב','אלול','תשרי','חשוון','כסלו','טבת','שבט','אדר'];
    var m2 = months[parseInt(input)];
    if (!m2) return _vSay('חודש לא תקין.', true);
    addEvent({
      member_id: state.event_member_id,
      synagogue_id: state.synagogue_id,
      type: state.new_event_type,
      hebrew_day: state.event_day,
      hebrew_month: m2,
      recurring: (state.new_event_type === 'יארצייט')
    });
    state.step = 'main_menu';
    _voiceSaveState(p.ApiCallId, state);
    return _vMenu('האירוע נשמר. תפריט ראשי?');
  }

  if (step === 'search') {
    var res2 = _searchByPad(input, state.synagogue_id);
    if (!res2.length) return _vSay('לא נמצא.', true);
    var msg2 = '';
    res2.slice(0, 3).forEach(function(m) {
      var last = memberLastAliyah(m.id);
      msg2 += (m.first_name||'') + ' ' + (m.last_name||'') + '. ';
      msg2 += 'שבט ' + (m.tribe||'ישראל') + '. ';
      msg2 += last ? ('עלייה אחרונה ' + last.date + '. ') : 'מעולם לא עלה. ';
    });
    state.step = 'main_menu';
    _voiceSaveState(p.ApiCallId, state);
    return _vMenu(msg2 + ' חזרה לתפריט.');
  }

  // fallback
  state.step = 'main_menu';
  _voiceSaveState(p.ApiCallId, state);
  return _vMenu('תפריט ראשי. 1 חיובים, 2 רישום, 3 אירוע, 4 רחוקים, 5 חיפוש, 0 יציאה.');
}

function _showObligations(p, state) {
  var obs = eventsForShabbat({synagogue_id: state.synagogue_id});
  if (!obs.length) return _vMenu('אין חיובים השבת. תפריט ראשי?');
  var msg = 'חיובים השבת: ';
  obs.forEach(function(e) {
    var m = e._member || {};
    msg += (m.first_name||'') + ' ' + (m.last_name||'') + ' — ' + (e.type||'') + '. ';
  });
  return _vMenu(msg + ' חזרה לתפריט.');
}

function _topAbsent(p, state) {
  var members = reportLongAbsent({synagogue_id: state.synagogue_id, days: 60}).slice(0, 5);
  if (!members.length) return _vMenu('כולם עלו לאחרונה. תפריט ראשי?');
  var msg = 'לא עלו זמן רב: ';
  members.forEach(function(m) {
    msg += (m.first_name||'') + ' ' + (m.last_name||'') + '. ';
  });
  return _vMenu(msg + ' תפריט?');
}

// keypad-letter mapping for Hebrew names — very simplified: maps based on first letter
function _searchByPad(digits, synId) {
  if (!digits) return [];
  var all = listMembers({synagogue_id: synId, status: 'active'});
  var d = String(digits).substring(0, 3);
  return all.filter(function(m) {
    var name = String(m.last_name||'') + String(m.first_name||'');
    var enc = _hebToDigits(name).substring(0, d.length);
    return enc === d;
  });
}

function _hebToDigits(s) {
  // Simplified Hebrew→keypad mapping for voice search
  var map = {
    'א':'2','ב':'2','ג':'2','ד':'3','ה':'3','ו':'3','ז':'4','ח':'4','ט':'4',
    'י':'5','כ':'5','ך':'5','ל':'5','מ':'6','ם':'6','נ':'6','ן':'6','ס':'7',
    'ע':'7','פ':'7','ף':'7','צ':'8','ץ':'8','ק':'8','ר':'9','ש':'9','ת':'9'
  };
  var out = '';
  for (var i = 0; i < s.length; i++) out += (map[s[i]] || '');
  return out;
}

function _findGabbaiByPin(pin) {
  var all = sheetToObjects_('gabbais');
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].pin_code) === String(pin) && all[i].status === 'active') return all[i];
  }
  return null;
}

function _voiceLoadState(callId) {
  if (!callId) return {};
  var cache = CacheService.getScriptCache();
  var raw = cache.get('vs_'+callId);
  return raw ? JSON.parse(raw) : {};
}

function _voiceSaveState(callId, state) {
  if (!callId) return;
  var cache = CacheService.getScriptCache();
  cache.put('vs_'+callId, JSON.stringify(state), 3600);
}

function _voiceLog(callId, step, input) {
  // append to audit
  appendRow_('audit', {
    ts: new Date().toISOString(),
    actor: callId || 'voice',
    action: 'voice',
    entity: step,
    entity_id: '',
    before: '',
    after: input
  });
}

// Yemot action helpers — JSON output format compatible with Yemot API extension type
function _vSay(text, getInput) {
  // returns action list
  return {
    actions: [
      {action: 'tts', text: text},
      (getInput ? {action: 'read', mode:'tap', max:8, timeout:6} : {action:'hangup'})
    ]
  };
}

function _vMenu(text) {
  return {
    actions: [
      {action: 'tts', text: text},
      {action: 'read', mode:'tap', max:1, timeout:8}
    ]
  };
}

function _vHangup(text) {
  return {actions: [{action: 'tts', text: text}, {action: 'hangup'}]};
}
