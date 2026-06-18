/**
 * Aliyot module — the core: who got an aliyah, when, why
 */

function logAliyah(args) {
  if (!args.member_id) throw new Error('member_id חובה');
  if (!args.synagogue_id) throw new Error('synagogue_id חובה');
  if (!args.date) args.date = new Date().toISOString().substring(0,10);
  if (!args.channel) args.channel = 'web';
  // if event_id given, mark event as done
  if (args.event_id) {
    try { updateRow_('events', args.event_id, {status:'done'}); } catch(e){}
  }
  return appendRow_('aliyot', args);
}

function listAliyot(args) {
  args = args || {};
  var all = sheetToObjects_('aliyot');
  if (args.synagogue_id) all = all.filter(function(a){ return a.synagogue_id === args.synagogue_id; });
  if (args.from) all = all.filter(function(a){ return String(a.date) >= args.from; });
  if (args.to) all = all.filter(function(a){ return String(a.date) <= args.to; });
  if (args.member_id) all = all.filter(function(a){ return String(a.member_id) === String(args.member_id); });
  if (args.date) all = all.filter(function(a){ return String(a.date) === args.date; });
  all.sort(function(a,b){
    var c = String(b.date).localeCompare(String(a.date));
    if (c !== 0) return c;
    return (a.aliyah_order||0) - (b.aliyah_order||0);
  });
  return all;
}

function aliyotForShabbat(args) {
  var date = args.date;
  var synId = args.synagogue_id;
  return sheetToObjects_('aliyot').filter(function(a){
    return String(a.date) === String(date) && a.synagogue_id === synId;
  });
}

function deleteAliyah(args) {
  return deleteRow_('aliyot', args.id);
}

function updateAliyah(args) {
  var id = args.id;
  delete args.id;
  return updateRow_('aliyot', id, args);
}

/**
 * For each member, return last aliyah date.
 * Used for rotation reports.
 */
function lastAliyahPerMember(args) {
  var synId = (args || {}).synagogue_id;
  var aliyot = sheetToObjects_('aliyot');
  if (synId) aliyot = aliyot.filter(function(a){ return a.synagogue_id === synId; });
  var byMember = {};
  aliyot.forEach(function(a) {
    var d = String(a.date);
    if (!byMember[a.member_id] || byMember[a.member_id].date < d) {
      byMember[a.member_id] = {date: d, aliyah: a};
    }
  });
  return byMember;
}

/**
 * Suggest members for a slot based on:
 * 1. Tribe match (cohen/levi/israel slot)
 * 2. Not already given today
 * 3. Longest time since last aliyah
 */
function suggestForSlot(args) {
  var date = args.date;
  var synId = args.synagogue_id;
  var aliyahName = args.aliyah_name; // כהן/לוי/שלישי...
  var members = listMembers({synagogue_id: synId, status: 'active'});

  // filter by tribe for cohen/levi slots
  if (aliyahName === 'כהן') members = members.filter(function(m){ return m.tribe === 'כהן'; });
  else if (aliyahName === 'לוי') members = members.filter(function(m){ return m.tribe === 'לוי'; });
  else members = members.filter(function(m){ return m.tribe === 'ישראל'; });

  var todays = aliyotForShabbat({date: date, synagogue_id: synId});
  var givenToday = {};
  todays.forEach(function(a){ givenToday[a.member_id] = true; });
  members = members.filter(function(m){ return !givenToday[m.id]; });

  var lastMap = lastAliyahPerMember({synagogue_id: synId});
  members.forEach(function(m) {
    m._lastDate = (lastMap[m.id] && lastMap[m.id].date) || '0000-00-00';
  });
  members.sort(function(a,b){ return String(a._lastDate).localeCompare(String(b._lastDate)); });
  return members.slice(0, 20);
}
