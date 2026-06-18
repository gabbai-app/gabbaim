/**
 * Database layer — Google Sheets as DB
 * Sheet schema:
 *   synagogues, members, gabbais, events, aliyot, settings, audit
 */

var SHEETS = {
  synagogues: ['id','name','address','nusach','notes','created_at'],
  members:    ['id','first_name','last_name','tribe','father_name','phone','primary_synagogue_id','also_synagogue_ids','status','notes','created_at','updated_at'],
  gabbais:    ['id','name','phone','pin_code','synagogue_id','role','status','created_at'],
  events:     ['id','member_id','synagogue_id','type','hebrew_day','hebrew_month','hebrew_year_first','recurring','relevant_shabbat','status','notes','created_at'],
  aliyot:     ['id','date','hebrew_date','synagogue_id','day_type','parsha_name','aliyah_name','aliyah_order','member_id','reason','event_id','gabbai_id','channel','notes','created_at'],
  settings:   ['key','value','updated_at'],
  audit:      ['id','ts','actor','action','entity','entity_id','before','after']
};

function getSS_() {
  var id = PropertiesService.getScriptProperties().getProperty(SS_KEY);
  if (id) {
    try { return SpreadsheetApp.openById(id); } catch(e) {}
  }
  var ss = SpreadsheetApp.create('גבאים מעלה עמוס — נתונים');
  PropertiesService.getScriptProperties().setProperty(SS_KEY, ss.getId());
  initSheets_(ss);
  return ss;
}

function initSheets_(ss) {
  Object.keys(SHEETS).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var headers = SHEETS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#f0f0f0');
      sh.setFrozenRows(1);
    }
  });
  // delete default Sheet1 if empty
  var s1 = ss.getSheetByName('Sheet1');
  if (s1 && s1.getLastRow() <= 1 && s1.getLastColumn() <= 1) ss.deleteSheet(s1);
  // seed initial synagogues if empty
  var sg = ss.getSheetByName('synagogues');
  if (sg.getLastRow() === 1) {
    appendRow_('synagogues', {id: 'sg1', name: 'בית כנסת מרכזי', address: 'מעלה עמוס', nusach: 'ספרד', notes: ''});
    appendRow_('synagogues', {id: 'sg2', name: 'בית כנסת שני', address: 'מעלה עמוס', nusach: 'אשכנז', notes: ''});
  }
  var st = ss.getSheetByName('settings');
  if (st.getLastRow() === 1) {
    appendRow_('settings', {key: 'app_version', value: '1.0'});
    appendRow_('settings', {key: 'default_synagogue', value: 'sg1'});
  }
  var gb = ss.getSheetByName('gabbais');
  if (gb.getLastRow() === 1) {
    appendRow_('gabbais', {id: 'g1', name: 'יוסף שניידר', phone: '', pin_code: '1234', synagogue_id: 'sg1', role: 'super_admin', status: 'active'});
  }
}

function sh_(name) { return getSS_().getSheetByName(name); }

function sheetToObjects_(name) {
  var sh = sh_(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var rng = sh.getDataRange().getValues();
  var headers = rng.shift();
  return rng.map(function(row) {
    var o = {};
    headers.forEach(function(h, i) { o[h] = row[i]; });
    return o;
  });
}

function appendRow_(name, obj) {
  var sh = sh_(name);
  var headers = SHEETS[name];
  if (!obj.id && headers.indexOf('id') === 0) obj.id = name.substring(0,3) + '_' + Utilities.getUuid().substring(0,8);
  if (headers.indexOf('created_at') >= 0 && !obj.created_at) obj.created_at = new Date().toISOString();
  var row = headers.map(function(h){ return obj[h] !== undefined ? obj[h] : ''; });
  sh.appendRow(row);
  return obj;
}

function updateRow_(name, id, patch) {
  var sh = sh_(name);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      headers.forEach(function(h, j) {
        if (patch[h] !== undefined) values[i][j] = patch[h];
      });
      if (headers.indexOf('updated_at') >= 0) values[i][headers.indexOf('updated_at')] = new Date().toISOString();
      sh.getRange(i+1, 1, 1, headers.length).setValues([values[i]]);
      var obj = {};
      headers.forEach(function(h, j){ obj[h] = values[i][j]; });
      return obj;
    }
  }
  return null;
}

function deleteRow_(name, id) {
  var sh = sh_(name);
  var values = sh.getDataRange().getValues();
  var headers = values[0];
  var idCol = headers.indexOf('id');
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sh.deleteRow(i+1);
      return true;
    }
  }
  return false;
}

function findById_(name, id) {
  var arr = sheetToObjects_(name);
  for (var i = 0; i < arr.length; i++) if (String(arr[i].id) === String(id)) return arr[i];
  return null;
}

function bulkAppend_(name, objs) {
  if (!objs || !objs.length) return 0;
  var sh = sh_(name);
  var headers = SHEETS[name];
  var rows = objs.map(function(o) {
    if (!o.id && headers.indexOf('id') === 0) o.id = name.substring(0,3) + '_' + Utilities.getUuid().substring(0,8);
    if (headers.indexOf('created_at') >= 0 && !o.created_at) o.created_at = new Date().toISOString();
    return headers.map(function(h){ return o[h] !== undefined ? o[h] : ''; });
  });
  sh.getRange(sh.getLastRow()+1, 1, rows.length, headers.length).setValues(rows);
  return rows.length;
}

function ensureInit() {
  getSS_();
  return {ok:true, sheetId: PropertiesService.getScriptProperties().getProperty(SS_KEY)};
}
