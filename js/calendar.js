// Hebrew calendar engine — pure client-side
// Converts Gregorian↔Hebrew, computes day type, aliyot count, parsha (approx), yahrzeit next anniversary

const CAL = (function() {

  function isLeap(y) { return ((y * 7 + 1) % 19) < 7; }
  function yearMonths(y) { return isLeap(y) ? 13 : 12; }

  function monthsElapsed(y) { return Math.floor((235 * y - 234) / 19); }

  function delay1(y) {
    const m = monthsElapsed(y);
    const parts = 12084 + 13753 * m;
    let day = m * 29 + Math.floor(parts / 25920);
    if (((3 * (day + 1)) % 7) < 3) day++;
    return day;
  }

  function delay2(y) {
    const last = delay1(y - 1);
    const present = delay1(y);
    const next = delay1(y + 1);
    if (next - present === 356) return 2;
    if (present - last === 382) return 1;
    return 0;
  }

  function days1Tishri(y) { return delay1(y) + delay2(y); }
  function yearDays(y) { return days1Tishri(y + 1) - days1Tishri(y); }

  function monthDays(y, m) {
    if (m === 2 || m === 4 || m === 6 || m === 10 || m === 13) return 29;
    if (m === 12 && !isLeap(y)) return 29;
    if (m === 12 && isLeap(y)) return 30;
    if (m === 8) { const d = yearDays(y); return (d === 355 || d === 385) ? 30 : 29; }
    if (m === 9) { const d = yearDays(y); return (d === 353 || d === 383) ? 29 : 30; }
    return 30;
  }

  function hebToAbs(y, m, d) {
    let days = d;
    if (m < 7) {
      for (let i = 7; i <= yearMonths(y); i++) days += monthDays(y, i);
      for (let j = 1; j < m; j++) days += monthDays(y, j);
    } else {
      for (let k = 7; k < m; k++) days += monthDays(y, k);
    }
    return days + days1Tishri(y);
  }

  function daysInGreg(y, m) {
    if (m === 2) return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 29 : 28;
    return [31,28,31,30,31,30,31,31,30,31,30,31][m-1];
  }

  function gregToAbs(y, m, d) {
    let days = d;
    for (let i = 1; i < m; i++) days += daysInGreg(y, i);
    return days + 365 * (y - 1) + Math.floor((y - 1) / 4) - Math.floor((y - 1) / 100) + Math.floor((y - 1) / 400);
  }

  function absToGreg(abs) {
    let y = Math.floor(abs / 366);
    while (gregToAbs(y + 1, 1, 1) <= abs) y++;
    let m = 1;
    while (m <= 12 && gregToAbs(y, m, daysInGreg(y, m)) < abs) m++;
    const d = abs - gregToAbs(y, m, 1) + 1;
    return { year: y, month: m, day: d };
  }

  function absToHeb(abs) {
    let y = Math.floor((abs + 1373429) / 366);
    while (hebToAbs(y + 1, 7, 1) <= abs) y++;
    let startMonth = abs < hebToAbs(y, 1, 1) ? 7 : 1;
    let m = startMonth;
    while (m <= yearMonths(y) && hebToAbs(y, m, monthDays(y, m)) < abs) m++;
    const d = abs - hebToAbs(y, m, 1) + 1;
    return { year: y, month: m, day: d };
  }

  function monthName(year, m) {
    const leap = isLeap(year);
    const map = ['', 'ניסן', 'אייר', 'סיון', 'תמוז', 'אב', 'אלול', 'תשרי', 'חשוון', 'כסלו', 'טבת', 'שבט', 'אדר', 'אדר_ב'];
    if (m === 12 && leap) return 'אדר_א';
    if (m === 13 && leap) return 'אדר_ב';
    return map[m] || '';
  }

  function monthNum(year, name) {
    const leap = isLeap(year);
    const idx = {
      'ניסן': 1, 'אייר': 2, 'סיון': 3, 'סיוון': 3, 'תמוז': 4, 'אב': 5, 'אלול': 6,
      'תשרי': 7, 'חשוון': 8, 'מרחשוון': 8, 'כסלו': 9, 'טבת': 10, 'שבט': 11
    };
    if (idx[name]) return idx[name];
    if (name === 'אדר' || name === 'אדר_ב' || name === 'אדר ב' || name === 'אדר ב׳') return leap ? 13 : 12;
    if (name === 'אדר_א' || name === 'אדר א' || name === 'אדר א׳') return leap ? 12 : 12;
    return 0;
  }

  function yearGematria(y) {
    const mod = y % 1000;
    const thousand = Math.floor(y / 1000);
    const letters = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
    const hundreds = Math.floor(mod / 100);
    const tens = Math.floor((mod % 100) / 10);
    const ones = mod % 10;
    const hMap = ['','ק','ר','ש','ת','תק','תר','תש','תת','תתק'];
    const tMap = ['','י','כ','ל','מ','נ','ס','ע','פ','צ'];
    const oMap = ['','א','ב','ג','ד','ה','ו','ז','ח','ט'];
    let rest = (hMap[hundreds] || '') + (tMap[tens] || '') + (oMap[ones] || '');
    if (tens === 1 && ones === 5) rest = (hMap[hundreds] || '') + 'טו';
    if (tens === 1 && ones === 6) rest = (hMap[hundreds] || '') + 'טז';
    if (rest.length >= 2) rest = rest.substring(0, rest.length - 1) + '"' + rest.substring(rest.length - 1);
    return rest;
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function gregorianToHebrew(dateOrISO) {
    const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO);
    const abs = gregToAbs(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const heb = absToHeb(abs);
    return {
      year: heb.year,
      month_num: heb.month,
      month_name: monthName(heb.year, heb.month),
      day: heb.day,
      display: heb.day + ' ב' + monthName(heb.year, heb.month).replace('_', ' ') + ' ' + yearGematria(heb.year)
    };
  }

  function hebrewToGregorian(args) {
    const year = args.year || currentHebrewYear();
    const m = monthNum(year, args.month);
    if (!m) return null;
    const abs = hebToAbs(year, m, args.day);
    const g = absToGreg(abs);
    return g.year + '-' + pad(g.month) + '-' + pad(g.day);
  }

  function nextHebrewAnniversary(args, fromDate) {
    const from = fromDate || new Date();
    for (let i = 0; i < 3; i++) {
      const y = currentHebrewYear(from) + i;
      const m = monthNum(y, args.month);
      if (!m) continue;
      const abs = hebToAbs(y, m, args.day);
      const g = absToGreg(abs);
      const gd = new Date(g.year, g.month - 1, g.day);
      if (gd >= from) {
        return {
          hebrew_year: y,
          gregorian: g.year + '-' + pad(g.month) + '-' + pad(g.day)
        };
      }
    }
    return null;
  }

  function currentHebrewYear(d) {
    d = d || new Date();
    return gregorianToHebrew(d).year;
  }

  const PARSHIOT = [
    'בראשית','נח','לך לך','וירא','חיי שרה','תולדות','ויצא','וישלח','וישב','מקץ','ויגש','ויחי',
    'שמות','וארא','בא','בשלח','יתרו','משפטים','תרומה','תצוה','כי תשא','ויקהל','פקודי',
    'ויקרא','צו','שמיני','תזריע','מצורע','אחרי מות','קדושים','אמור','בהר','בחקתי',
    'במדבר','נשא','בהעלותך','שלח','קרח','חקת','בלק','פינחס','מטות','מסעי',
    'דברים','ואתחנן','עקב','ראה','שופטים','כי תצא','כי תבוא','נצבים','וילך','האזינו','וזאת הברכה'
  ];

  function approxParsha(d, heb) {
    try {
      const stAbs = hebToAbs(heb.year, 7, 23);
      const curAbs = gregToAbs(d.getFullYear(), d.getMonth() + 1, d.getDate());
      let weeksSince = Math.floor((curAbs - stAbs) / 7);
      if (weeksSince < 0) weeksSince = PARSHIOT.length + weeksSince;
      return PARSHIOT[weeksSince % PARSHIOT.length] || '';
    } catch (e) { return ''; }
  }

  function dayInfo(dateInput) {
    const d = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput || new Date());
    const heb = gregorianToHebrew(d);
    const dow = d.getDay();
    let type = 'weekday';
    let count = 0;
    let names = [];

    if (dow === 6) {
      type = 'shabbat';
      count = 8;
      names = ['כהן','לוי','שלישי','רביעי','חמישי','שישי','שביעי','מפטיר'];
    } else if (dow === 1 || dow === 4) {
      type = 'sheni_chamishi';
      count = 3;
      names = ['כהן','לוי','שלישי'];
    }

    if ((heb.day === 1) || (heb.day === 30 && monthDays(heb.year, heb.month_num) === 30)) {
      if (dow !== 6) {
        type = 'rosh_chodesh';
        count = 4;
        names = ['כהן','לוי','שלישי','רביעי'];
      }
    }

    if ((heb.month_name === 'כסלו' && heb.day >= 25) || (heb.month_name === 'טבת' && heb.day <= 3)) {
      if (dow !== 6) {
        type = 'chanukah';
        count = 3;
        names = ['כהן','לוי','שלישי'];
      }
    }

    if (heb.month_name === 'תשרי' && heb.day === 10) {
      type = 'yom_kippur';
      count = 7;
      names = ['כהן','לוי','שלישי','רביעי','חמישי','שישי','מפטיר'];
    }

    if ((heb.month_name === 'תשרי' && heb.day >= 17 && heb.day <= 20) ||
        (heb.month_name === 'ניסן' && heb.day >= 17 && heb.day <= 20)) {
      if (dow !== 6) {
        type = 'chol_hamoed';
        count = 4;
        names = ['כהן','לוי','שלישי','רביעי'];
      }
    }

    return {
      date: d.toISOString().substring(0, 10),
      hebrew: heb,
      day_of_week: dow,
      day_of_week_name: ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][dow],
      type: type,
      aliyot_count: count,
      aliyot_names: names,
      parsha: approxParsha(d, heb)
    };
  }

  function nextShabbat(from) {
    const d = from instanceof Date ? new Date(from) : new Date(from || new Date());
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    return d;
  }

  function thisWeekShabbat(arg) {
    const d = nextShabbat(arg && arg.date ? arg.date : new Date());
    return dayInfo(d);
  }

  return {
    gregorianToHebrew: gregorianToHebrew,
    hebrewToGregorian: hebrewToGregorian,
    nextHebrewAnniversary: nextHebrewAnniversary,
    currentHebrewYear: currentHebrewYear,
    dayInfo: dayInfo,
    thisWeekShabbat: thisWeekShabbat,
    nextShabbat: nextShabbat,
    monthName: monthName,
    monthNum: monthNum,
    isLeap: isLeap,
    yearGematria: yearGematria,
    HEB_MONTHS: ['ניסן','אייר','סיון','תמוז','אב','אלול','תשרי','חשוון','כסלו','טבת','שבט','אדר','אדר_א','אדר_ב']
  };
})();
