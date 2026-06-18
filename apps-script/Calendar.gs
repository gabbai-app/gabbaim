/**
 * Hebrew calendar engine — based on classical Hebrew calendar algorithm
 * Pure JS implementation (no external libs since GAS has limited library support).
 * Returns hebrew date, parsha name, day type, number of aliyot per day.
 */

var HEB_MONTHS = ['ניסן','אייר','סיון','תמוז','אב','אלול','תשרי','חשוון','כסלו','טבת','שבט','אדר','אדר_א','אדר_ב'];
var HEB_MONTHS_DISPLAY = {
  'ניסן': 'ניסן', 'אייר': 'אייר', 'סיון': 'סיוון', 'תמוז': 'תמוז',
  'אב': 'אב', 'אלול': 'אלול', 'תשרי': 'תשרי', 'חשוון': 'חשוון',
  'כסלו': 'כסלו', 'טבת': 'טבת', 'שבט': 'שבט', 'אדר': 'אדר',
  'אדר_א': 'אדר א׳', 'אדר_ב': 'אדר ב׳'
};

// ===== Core Hebrew calendar arithmetic =====

function _isHebLeap(y) {
  return ((y * 7 + 1) % 19) < 7;
}

function _hebYearMonths(y) { return _isHebLeap(y) ? 13 : 12; }

function _hebMonthsElapsed(y) {
  var m = Math.floor((235 * y - 234) / 19);
  return m;
}

function _hebDelay1(y) {
  var monthsElapsed = _hebMonthsElapsed(y);
  var parts = 12084 + 13753 * monthsElapsed;
  var day = monthsElapsed * 29 + Math.floor(parts / 25920);
  if (((3 * (day + 1)) % 7) < 3) day++;
  return day;
}

function _hebDelay2(y) {
  var last = _hebDelay1(y - 1);
  var present = _hebDelay1(y);
  var next = _hebDelay1(y + 1);
  if (next - present === 356) return 2;
  if (present - last === 382) return 1;
  return 0;
}

function _hebYearDays(y) {
  return _hebDays1Tishri(y + 1) - _hebDays1Tishri(y);
}

function _hebDays1Tishri(y) {
  return _hebDelay1(y) + _hebDelay2(y);
}

function _hebMonthDays(y, m) {
  // m: 1=ניסן ... 12=אדר (or 13 in leap = אדר ב)
  if (m === 2 || m === 4 || m === 6 || m === 10 || m === 13) return 29;
  if (m === 12 && !_isHebLeap(y)) return 29;
  if (m === 12 && _isHebLeap(y)) return 30; // אדר א in leap = 30
  if (m === 8) {
    // חשוון — depends on year type
    var d = _hebYearDays(y);
    return (d === 355 || d === 385) ? 30 : 29;
  }
  if (m === 9) {
    // כסלו
    var d2 = _hebYearDays(y);
    return (d2 === 353 || d2 === 383) ? 29 : 30;
  }
  return 30;
}

// Convert hebrew date (y, m=1..13 ניסן start) to absolute day number from epoch
function _hebToAbs(y, m, d) {
  var days = d;
  if (m < 7) { // ניסן..אלול
    for (var i = 7; i <= _hebYearMonths(y); i++) days += _hebMonthDays(y, i);
    for (var j = 1; j < m; j++) days += _hebMonthDays(y, j);
  } else {
    for (var k = 7; k < m; k++) days += _hebMonthDays(y, k);
  }
  return days + _hebDays1Tishri(y);
}

function _gregToAbs(y, m, d) {
  var days = d;
  for (var i = 1; i < m; i++) days += _daysInGregMonth(y, i);
  return days + 365 * (y - 1) + Math.floor((y-1)/4) - Math.floor((y-1)/100) + Math.floor((y-1)/400);
}

function _daysInGregMonth(y, m) {
  if (m === 2) {
    return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28;
  }
  return [31,28,31,30,31,30,31,31,30,31,30,31][m-1];
}

function _absToGreg(abs) {
  var approx = Math.floor(abs / 366);
  var y = approx;
  while (_gregToAbs(y+1, 1, 1) <= abs) y++;
  var m = 1;
  while (m <= 12 && _gregToAbs(y, m, _daysInGregMonth(y, m)) < abs) m++;
  var d = abs - _gregToAbs(y, m, 1) + 1;
  return {year: y, month: m, day: d};
}

function _absToHeb(abs) {
  var approx = Math.floor((abs + 1373429) / 366);
  var y = approx;
  while (_hebToAbs(y+1, 7, 1) <= abs) y++;
  var startMonth = abs < _hebToAbs(y, 1, 1) ? 7 : 1;
  var m = startMonth;
  while (m <= _hebYearMonths(y) && _hebToAbs(y, m, _hebMonthDays(y, m)) < abs) m++;
  var d = abs - _hebToAbs(y, m, 1) + 1;
  return {year: y, month: m, day: d};
}

// ===== Public API =====

function gregorianToHebrew(args) {
  var d = args.date ? new Date(args.date) : new Date();
  var abs = _gregToAbs(d.getFullYear(), d.getMonth()+1, d.getDate());
  var heb = _absToHeb(abs);
  return {
    year: heb.year,
    month_num: heb.month,
    month_name: _hebMonthName(heb.year, heb.month),
    day: heb.day,
    display: heb.day + ' ב' + _hebMonthName(heb.year, heb.month) + ' ' + _hebYearGematria(heb.year)
  };
}

function hebrewToGregorian(args) {
  var monthName = args.month;
  var year = args.year || currentHebrewYear_();
  var monthNum = _hebMonthNum(year, monthName);
  if (!monthNum) return null;
  var abs = _hebToAbs(year, monthNum, args.day);
  var g = _absToGreg(abs);
  var s = g.year + '-' + _pad(g.month) + '-' + _pad(g.day);
  return s;
}

function nextHebrewAnniversary(args, fromDate) {
  var from = fromDate || new Date();
  var monthName = args.month;
  var day = args.day;
  for (var i = 0; i < 3; i++) {
    var y = currentHebrewYear_(from) + i;
    var m = _hebMonthNum(y, monthName);
    if (!m) continue;
    var abs = _hebToAbs(y, m, day);
    var g = _absToGreg(abs);
    var gDate = new Date(g.year, g.month-1, g.day);
    if (gDate >= from) {
      return {
        hebrew_year: y,
        gregorian: g.year + '-' + _pad(g.month) + '-' + _pad(g.day)
      };
    }
  }
  return null;
}

function _hebMonthNum(year, name) {
  // map a month name to a number (1..13)
  var leap = _isHebLeap(year);
  var idx = {
    'ניסן': 1, 'אייר': 2, 'סיון': 3, 'סיוון': 3, 'תמוז': 4, 'אב': 5, 'אלול': 6,
    'תשרי': 7, 'חשוון': 8, 'מרחשוון': 8, 'כסלו': 9, 'טבת': 10, 'שבט': 11
  };
  if (idx[name]) return idx[name];
  if (name === 'אדר' || name === 'אדר_ב' || name === 'אדר ב' || name === 'אדר ב׳') return leap ? 13 : 12;
  if (name === 'אדר_א' || name === 'אדר א' || name === 'אדר א׳') return leap ? 12 : 12;
  return 0;
}

function _hebMonthName(year, m) {
  var leap = _isHebLeap(year);
  var map = ['','ניסן','אייר','סיון','תמוז','אב','אלול','תשרי','חשוון','כסלו','טבת','שבט','אדר','אדר_ב'];
  if (m === 12 && leap) return 'אדר_א';
  if (m === 13 && leap) return 'אדר_ב';
  return map[m] || '';
}

function currentHebrewYear_(d) {
  d = d || new Date();
  return gregorianToHebrew({date: d.toISOString()}).year;
}

function _hebYearGematria(y) {
  // simple gematria for 5786 = תשפ"ו
  var mod = y % 1000;
  var thousand = Math.floor(y / 1000);
  var letters = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  var prefix = letters[thousand] || '';
  var hundreds = Math.floor(mod / 100);
  var tens = Math.floor((mod % 100) / 10);
  var ones = mod % 10;
  var hMap = ['','ק','ר','ש','ת','תק','תר','תש','תת','תתק'];
  var tMap = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
  var oMap = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
  var rest = (hMap[hundreds]||'') + (tMap[tens]||'') + (oMap[ones]||'');
  // handle 15 and 16
  if (tens === 1 && ones === 5) rest = (hMap[hundreds]||'') + 'טו';
  if (tens === 1 && ones === 6) rest = (hMap[hundreds]||'') + 'טז';
  // insert " before last letter
  if (rest.length >= 2) rest = rest.substring(0, rest.length-1) + '"' + rest.substring(rest.length-1);
  return rest;
}

function _pad(n) { return n < 10 ? '0'+n : ''+n; }

// ===== Day type / Parsha =====

function dayInfo(args) {
  var d = args.date ? new Date(args.date) : new Date();
  var heb = gregorianToHebrew({date: d.toISOString()});
  var dow = d.getDay(); // 0=sun..6=sat
  var type = 'weekday';
  var aliyot_count = 0;
  var aliyot_names = [];

  // determine type
  if (dow === 6) {
    type = 'shabbat';
    aliyot_count = 8;
    aliyot_names = ['כהן','לוי','שלישי','רביעי','חמישי','שישי','שביעי','מפטיר'];
  } else if (dow === 1 || dow === 4) {
    type = 'sheni_chamishi';
    aliyot_count = 3;
    aliyot_names = ['כהן','לוי','שלישי'];
  }

  // override for special days
  if (heb.day === 1 || (heb.day === 30 && _hebMonthDays(heb.year, heb.month_num) === 30)) {
    // rosh chodesh
    if (dow !== 6) {
      type = 'rosh_chodesh';
      aliyot_count = 4;
      aliyot_names = ['כהן','לוי','שלישי','רביעי'];
    }
  }

  // chanuka — kislev 25 through tevet 2-3
  if ((heb.month_name === 'כסלו' && heb.day >= 25) || (heb.month_name === 'טבת' && heb.day <= 3)) {
    if (dow !== 6) {
      type = 'chanukah';
      aliyot_count = 3;
      aliyot_names = ['כהן','לוי','שלישי'];
    }
  }

  // yom kippur — תשרי 10
  if (heb.month_name === 'תשרי' && heb.day === 10) {
    type = 'yom_kippur';
    aliyot_count = 7;
    aliyot_names = ['כהן','לוי','שלישי','רביעי','חמישי','שישי','מפטיר'];
  }

  // chol hamoed
  if ((heb.month_name === 'תשרי' && heb.day >= 17 && heb.day <= 20) ||
      (heb.month_name === 'ניסן' && heb.day >= 17 && heb.day <= 20)) {
    if (dow !== 6) {
      type = 'chol_hamoed';
      aliyot_count = 4;
      aliyot_names = ['כהן','לוי','שלישי','רביעי'];
    }
  }

  return {
    date: d.toISOString().substring(0,10),
    hebrew: heb,
    day_of_week: dow,
    day_of_week_name: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][dow],
    type: type,
    aliyot_count: aliyot_count,
    aliyot_names: aliyot_names,
    parsha: _approxParsha(d, heb)
  };
}

function _approxParsha(d, heb) {
  // Very simplified — list of parshas, count from Simchat Torah (Tishrei 23)
  var parshiot = [
    'בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא','וישלח','וישב','מקץ','ויגש','ויחי',
    'שמות','וארא','בא','בשלח','יתרו','משפטים','תרומה','תצוה','כי תשא','ויקהל','פקודי',
    'ויקרא','צו','שמיני','תזריע','מצורע','אחרי מות','קדושים','אמור','בהר','בחקתי',
    'במדבר','נשא','בהעלותך','שלח','קרח','חקת','בלק','פינחס','מטות','מסעי',
    'דברים','ואתחנן','עקב','ראה','שופטים','כי תצא','כי תבוא','נצבים','וילך','האזינו','וזאת הברכה'
  ];
  // approximate by week of jewish year
  // Find Simchat Torah (Tishrei 23) of current year
  try {
    var stAbs = _hebToAbs(heb.year, 7, 23);
    var curAbs = _gregToAbs(d.getFullYear(), d.getMonth()+1, d.getDate());
    var weeksSince = Math.floor((curAbs - stAbs) / 7);
    if (weeksSince < 0) weeksSince = parshiot.length + weeksSince;
    return parshiot[weeksSince % parshiot.length] || '';
  } catch(e) { return ''; }
}

function thisWeekShabbat(args) {
  var from = args && args.date ? new Date(args.date) : new Date();
  var d = new Date(from);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return dayInfo({date: d.toISOString()});
}
