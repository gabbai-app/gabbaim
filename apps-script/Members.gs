/**
 * Members module
 */

function listMembers(args) {
  args = args || {};
  var all = sheetToObjects_('members');
  if (args.synagogue_id) {
    all = all.filter(function(m) {
      if (m.primary_synagogue_id === args.synagogue_id) return true;
      var also = (m.also_synagogue_ids || '').split(',').map(function(x){ return x.trim(); });
      return also.indexOf(args.synagogue_id) >= 0;
    });
  }
  if (args.status) all = all.filter(function(m){ return m.status === args.status; });
  if (args.tribe) all = all.filter(function(m){ return m.tribe === args.tribe; });
  if (args.search) {
    var q = String(args.search).toLowerCase();
    all = all.filter(function(m){
      return (String(m.first_name||'') + ' ' + String(m.last_name||'')).toLowerCase().indexOf(q) >= 0;
    });
  }
  return all;
}

function getMember(args) {
  return findById_('members', args.id);
}

function addMember(args) {
  if (!args.first_name) throw new Error('first_name חובה');
  if (!args.tribe) args.tribe = 'ישראל';
  if (!args.status) args.status = 'active';
  return appendRow_('members', args);
}

function updateMember(args) {
  if (!args.id) throw new Error('id חובה');
  var id = args.id;
  delete args.id;
  return updateRow_('members', id, args);
}

function deleteMember(args) {
  return deleteRow_('members', args.id);
}

function memberLastAliyah(memberId) {
  var aliyot = sheetToObjects_('aliyot');
  var mine = aliyot.filter(function(a){ return String(a.member_id) === String(memberId); });
  if (!mine.length) return null;
  mine.sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
  return mine[0];
}

function memberStats(args) {
  var id = args.id;
  var aliyot = sheetToObjects_('aliyot').filter(function(a){ return String(a.member_id) === String(id); });
  aliyot.sort(function(a,b){ return String(b.date).localeCompare(String(a.date)); });
  var now = new Date();
  var thirty = new Date(now.getTime() - 30*24*3600*1000).toISOString().substring(0,10);
  var ninety = new Date(now.getTime() - 90*24*3600*1000).toISOString().substring(0,10);
  var year = new Date(now.getTime() - 365*24*3600*1000).toISOString().substring(0,10);
  return {
    total: aliyot.length,
    last_30: aliyot.filter(function(a){ return String(a.date) >= thirty; }).length,
    last_90: aliyot.filter(function(a){ return String(a.date) >= ninety; }).length,
    last_year: aliyot.filter(function(a){ return String(a.date) >= year; }).length,
    last_aliyah: aliyot[0] || null,
    recent: aliyot.slice(0, 20)
  };
}

function importMembersBulk(args) {
  var rows = args.rows || [];
  return bulkAppend_('members', rows);
}

function searchMembersByName(args) {
  var q = String(args.q || '').trim();
  if (!q) return [];
  var all = sheetToObjects_('members');
  q = q.toLowerCase();
  return all.filter(function(m) {
    var full = (String(m.first_name||'') + ' ' + String(m.last_name||'') + ' ' + String(m.father_name||'')).toLowerCase();
    return full.indexOf(q) >= 0;
  }).slice(0, 50);
}
