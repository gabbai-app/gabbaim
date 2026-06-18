/**
 * Reports
 */

function reportRotation(args) {
  var synId = args.synagogue_id;
  var members = listMembers({synagogue_id: synId, status: 'active'});
  var lastMap = lastAliyahPerMember({synagogue_id: synId});
  members.forEach(function(m) {
    m.last_aliyah_date = (lastMap[m.id] && lastMap[m.id].date) || '—';
    m.days_since = (lastMap[m.id]) ? Math.floor((new Date() - new Date(lastMap[m.id].date)) / (24*3600*1000)) : 9999;
  });
  members.sort(function(a,b){ return b.days_since - a.days_since; });
  return members;
}

function reportFairness(args) {
  var synId = args.synagogue_id;
  var months = args.months || 6;
  var since = new Date(); since.setMonth(since.getMonth() - months);
  var sinceStr = since.toISOString().substring(0,10);
  var aliyot = sheetToObjects_('aliyot');
  if (synId) aliyot = aliyot.filter(function(a){ return a.synagogue_id === synId; });
  aliyot = aliyot.filter(function(a){ return String(a.date) >= sinceStr; });
  var byMember = {};
  aliyot.forEach(function(a) {
    byMember[a.member_id] = (byMember[a.member_id] || 0) + 1;
  });
  var members = listMembers({synagogue_id: synId, status: 'active'});
  members.forEach(function(m) { m.count = byMember[m.id] || 0; });
  members.sort(function(a,b){ return b.count - a.count; });
  return {members: members, period_months: months};
}

function reportOpenObligations(args) {
  var synId = args.synagogue_id;
  return listEvents({synagogue_id: synId, status: 'pending'});
}

function reportShabbatRecap(args) {
  var date = args.date;
  var synId = args.synagogue_id;
  var aliyot = aliyotForShabbat({date: date, synagogue_id: synId});
  var members = sheetToObjects_('members');
  var byId = {};
  members.forEach(function(m){ byId[m.id] = m; });
  aliyot.forEach(function(a){ a._member = byId[a.member_id] || null; });
  return aliyot;
}

function reportTribes(args) {
  var synId = args.synagogue_id;
  var members = listMembers({synagogue_id: synId, status: 'active'});
  var result = {'כהן': [], 'לוי': [], 'ישראל': []};
  members.forEach(function(m) {
    if (result[m.tribe]) result[m.tribe].push(m);
  });
  return {
    cohen: result['כהן'],
    levi: result['לוי'],
    israel: result['ישראל'],
    counts: {
      cohen: result['כהן'].length,
      levi: result['לוי'].length,
      israel: result['ישראל'].length
    }
  };
}

function reportLongAbsent(args) {
  var synId = args.synagogue_id;
  var days = args.days || 90;
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  var cutoffStr = cutoff.toISOString().substring(0,10);
  var lastMap = lastAliyahPerMember({synagogue_id: synId});
  var members = listMembers({synagogue_id: synId, status: 'active'});
  return members.filter(function(m) {
    var last = lastMap[m.id];
    return !last || String(last.date) < cutoffStr;
  }).map(function(m) {
    var last = lastMap[m.id];
    m.last_aliyah_date = last ? last.date : 'מעולם לא';
    return m;
  });
}

function dashboardSummary(args) {
  var synId = args.synagogue_id || 'sg1';
  var shabbat = thisWeekShabbat({});
  var obligations = eventsForShabbat({synagogue_id: synId, date: shabbat.date});
  var longAbsent = reportLongAbsent({synagogue_id: synId, days: 90});
  var tribes = reportTribes({synagogue_id: synId});
  var members = listMembers({synagogue_id: synId, status: 'active'});
  var recent = listAliyot({synagogue_id: synId}).slice(0, 10);
  var memMap = {};
  members.forEach(function(m){ memMap[m.id] = m; });
  recent.forEach(function(a){ a._member = memMap[a.member_id] || null; });

  // count last 30 days
  var thirty = new Date(); thirty.setDate(thirty.getDate() - 30);
  var thirtyStr = thirty.toISOString().substring(0,10);
  var aliyot30 = sheetToObjects_('aliyot').filter(function(a){
    return a.synagogue_id === synId && String(a.date) >= thirtyStr;
  });

  return {
    shabbat: shabbat,
    obligations: obligations,
    long_absent_top: longAbsent.slice(0, 5),
    tribes_count: tribes.counts,
    members_total: members.length,
    aliyot_last_30: aliyot30.length,
    recent_aliyot: recent
  };
}

function listSynagogues() { return sheetToObjects_('synagogues'); }
function listGabbais() { return sheetToObjects_('gabbais'); }

function addGabbai(args) {
  if (!args.name) throw new Error('שם חובה');
  if (!args.pin_code) throw new Error('קוד חובה');
  if (!args.status) args.status = 'active';
  return appendRow_('gabbais', args);
}
function updateGabbai(args) {
  var id = args.id; delete args.id;
  return updateRow_('gabbais', id, args);
}
function deleteGabbai(args) { return deleteRow_('gabbais', args.id); }
function addSynagogue(args) {
  if (!args.name) throw new Error('שם חובה');
  return appendRow_('synagogues', args);
}
function updateSynagogue(args) {
  var id = args.id; delete args.id;
  return updateRow_('synagogues', id, args);
}
