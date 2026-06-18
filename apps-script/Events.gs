/**
 * Events module — obligations (חיובים) tracked per shabbat
 * Yahrzeit recurring uses hebrew dates
 */

var EVENT_TYPES = ['יארצייט','בר_מצווה','חתן','ברית','אבל_שבעה','אבל_שלושים','אבל_שנה','שמחה','חולה','גומל','אורח','אחר'];

function listEvents(args) {
  args = args || {};
  var all = sheetToObjects_('events');
  if (args.synagogue_id) all = all.filter(function(e){ return e.synagogue_id === args.synagogue_id; });
  if (args.status) all = all.filter(function(e){ return e.status === args.status; });
  if (args.member_id) all = all.filter(function(e){ return String(e.member_id) === String(args.member_id); });
  return all;
}

function addEvent(args) {
  if (!args.member_id) throw new Error('member_id חובה');
  if (!args.type) throw new Error('type חובה');
  if (!args.status) args.status = 'pending';
  if (args.recurring === undefined) args.recurring = (args.type === 'יארצייט');
  // compute relevant_shabbat
  if (!args.relevant_shabbat && args.hebrew_day && args.hebrew_month) {
    args.relevant_shabbat = computeRelevantShabbat({
      day: parseInt(args.hebrew_day),
      month: args.hebrew_month
    });
  }
  if (!args.synagogue_id) {
    var member = findById_('members', args.member_id);
    if (member) args.synagogue_id = member.primary_synagogue_id;
  }
  return appendRow_('events', args);
}

function updateEvent(args) {
  var id = args.id;
  delete args.id;
  return updateRow_('events', id, args);
}

function deleteEvent(args) {
  return deleteRow_('events', args.id);
}

/**
 * Events for an upcoming shabbat (or current week)
 * Returns events whose relevant_shabbat falls in the next 7 days
 * AND recurring yahrtzeits whose hebrew anniversary falls this week
 */
function eventsForShabbat(args) {
  var synId = args.synagogue_id;
  var refDate = args.date ? new Date(args.date) : nextShabbat_(new Date());
  var refStr = refDate.toISOString().substring(0,10);
  var weekStart = new Date(refDate.getTime() - 7*24*3600*1000).toISOString().substring(0,10);

  var all = sheetToObjects_('events');
  if (synId) all = all.filter(function(e){ return e.synagogue_id === synId; });
  all = all.filter(function(e){ return e.status === 'pending'; });

  var matches = [];
  all.forEach(function(e) {
    if (e.recurring && e.hebrew_day && e.hebrew_month) {
      // recurring yahrtzeit
      var heb = nextHebrewAnniversary({day: parseInt(e.hebrew_day), month: e.hebrew_month}, refDate);
      if (heb && heb.gregorian) {
        var diff = (new Date(heb.gregorian) - refDate) / (24*3600*1000);
        if (diff >= -7 && diff <= 7) {
          e._upcoming = heb.gregorian;
          matches.push(e);
        }
      }
    } else if (e.relevant_shabbat) {
      if (String(e.relevant_shabbat) >= weekStart && String(e.relevant_shabbat) <= refStr) {
        e._upcoming = e.relevant_shabbat;
        matches.push(e);
      }
    }
  });
  // attach member info
  var members = sheetToObjects_('members');
  var byId = {};
  members.forEach(function(m){ byId[m.id] = m; });
  matches.forEach(function(e){ e._member = byId[e.member_id] || null; });
  return matches;
}

function computeRelevantShabbat(hebDate) {
  // For non-recurring events with hebrew date, compute the gregorian shabbat
  // For now — simple: convert hebrew date to gregorian, then snap to next saturday
  var greg = hebrewToGregorian({day: hebDate.day, month: hebDate.month, year: currentHebrewYear_()});
  if (!greg) return '';
  var d = new Date(greg);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d.toISOString().substring(0,10);
}

function nextShabbat_(from) {
  var d = new Date(from);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d;
}

function eventTypes() { return EVENT_TYPES; }
