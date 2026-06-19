// Hebrew calendar — wrapper around @hebcal/core (loaded via CDN as window.hebcal)
// Provides accurate parsha (incl. combined parshas), holidays, special shabbats,
// rosh chodesh, chol hamoed, fast days etc.

const CAL = (function() {

  function _hebcal() {
    if (!window.hebcal) throw new Error('hebcal לא נטען — בדוק חיבור לאינטרנט');
    return window.hebcal;
  }

  function _toIso(d) {
    if (typeof d === 'string') return d.substring(0, 10);
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toISOString().substring(0, 10);
  }

  function _toDate(input) {
    if (input instanceof Date) return new Date(input);
    if (!input) return new Date();
    return new Date(input);
  }

  function _eventsForDate(d) {
    const h = _hebcal();
    return h.HebrewCalendar.calendar({
      start: d,
      end: d,
      sedrot: true,
      noHolidays: false,
      il: true,         // Israel calendar
      shabbatMevarchim: true,
      candlelighting: false
    });
  }

  function gregorianToHebrew(input) {
    const h = _hebcal();
    const d = _toDate(input);
    const hd = new h.HDate(d);
    return {
      year: hd.getFullYear(),
      month_num: hd.getMonth(),
      month_name: hd.getMonthName(),
      day: hd.getDate(),
      display: hd.renderGematriya(true) // e.g. "ז' תמוז תשפ"ו"
    };
  }

  function hebrewToGregorian(args) {
    const h = _hebcal();
    const year = args.year || currentHebrewYear();
    const monthName = String(args.month || '').replace('_', ' ').trim();
    // Map Hebrew month name to hebcal month number
    let monthNum;
    try {
      monthNum = h.HDate.monthFromName(monthName);
    } catch (e) {
      const map = {
        'ניסן': 1, 'אייר': 2, 'סיון': 3, 'סיוון': 3, 'תמוז': 4, 'אב': 5, 'אלול': 6,
        'תשרי': 7, 'חשוון': 8, 'מרחשוון': 8, 'כסלו': 9, 'טבת': 10, 'שבט': 11,
        'אדר': 12, 'אדר א': 12, 'אדר ב': 13, "אדר א'": 12, "אדר ב'": 13
      };
      monthNum = map[monthName];
    }
    if (!monthNum) return null;
    try {
      const hd = new h.HDate(parseInt(args.day), monthNum, year);
      const g = hd.greg();
      return g.toISOString().substring(0, 10);
    } catch (e) { return null; }
  }

  function nextHebrewAnniversary(args, fromDate) {
    const from = fromDate || new Date();
    for (let i = 0; i < 3; i++) {
      const y = currentHebrewYear(from) + i;
      const greg = hebrewToGregorian({ day: args.day, month: args.month, year: y });
      if (!greg) continue;
      const gd = new Date(greg);
      if (gd >= from) {
        return { hebrew_year: y, gregorian: greg };
      }
    }
    return null;
  }

  function currentHebrewYear(d) {
    d = d || new Date();
    return new (_hebcal()).HDate(d).getFullYear();
  }

  function _categorizeDay(date) {
    const h = _hebcal();
    const events = _eventsForDate(date);
    const F = h.flags;

    const out = {
      parsha: '',
      parsha_he: '',
      holidays: [],         // string array of Hebrew holiday names
      is_shabbat: date.getDay() === 6,
      is_rosh_chodesh: false,
      is_chol_hamoed: false,
      is_yom_tov: false,
      is_yom_kippur: false,
      is_chanukah: false,
      is_purim: false,
      is_fast: false,
      is_special_shabbat: false,
      special_shabbat_name: ''
    };

    events.forEach(function(ev) {
      const fl = ev.getFlags();
      const desc = ev.getDesc();
      const he = ev.render('he') || '';
      const heNoNikkud = he.replace(/[֑-ׇ]/g, '');

      if (fl & F.PARSHA_HASHAVUA) {
        out.parsha = ev.basename().replace('Parashat ', '');
        out.parsha_he = heNoNikkud.replace('פרשת ', '');
      }
      if (fl & F.ROSH_CHODESH) out.is_rosh_chodesh = true;
      if (fl & F.CHOL_HAMOED) out.is_chol_hamoed = true;
      if (fl & F.CHAG) out.is_yom_tov = true;
      if (fl & F.YOM_KIPPUR) out.is_yom_kippur = true;
      if (fl & F.CHANUKAH_CANDLES) out.is_chanukah = true;
      if (fl & (F.MAJOR_FAST | F.MINOR_FAST)) out.is_fast = true;
      if (fl & F.SPECIAL_SHABBAT) {
        out.is_special_shabbat = true;
        out.special_shabbat_name = heNoNikkud;
      }
      if (heNoNikkud && heNoNikkud.indexOf('פורים') >= 0) out.is_purim = true;
      if (he && !(fl & F.PARSHA_HASHAVUA)) out.holidays.push(heNoNikkud);
    });

    return out;
  }

  // Determine day type + aliyot count + parsha + special context
  function dayInfo(input) {
    const date = _toDate(input);
    const heb = gregorianToHebrew(date);
    const dow = date.getDay();
    const ctx = _categorizeDay(date);

    let type = 'weekday_no_torah';
    let aliyot_count = 0;
    let aliyot_names = [];
    let two_torahs = false;

    if (ctx.is_yom_kippur) {
      type = 'yom_kippur';
      aliyot_count = 7;
      aliyot_names = ['כהן', 'לוי', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'מפטיר'];
      two_torahs = true;
    } else if (ctx.is_yom_tov) {
      type = 'yom_tov';
      aliyot_count = 6;
      aliyot_names = ['כהן', 'לוי', 'שלישי', 'רביעי', 'חמישי', 'מפטיר'];
      two_torahs = true;
    } else if (ctx.is_shabbat) {
      type = ctx.is_special_shabbat ? 'shabbat_special' : 'shabbat';
      aliyot_count = 8;
      aliyot_names = ['כהן', 'לוי', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שביעי', 'מפטיר'];
      if (ctx.is_rosh_chodesh || ctx.special_shabbat_name.indexOf('שקלים') >= 0 ||
          ctx.special_shabbat_name.indexOf('זכור') >= 0 || ctx.special_shabbat_name.indexOf('פרה') >= 0 ||
          ctx.special_shabbat_name.indexOf('החודש') >= 0) {
        two_torahs = true;
      }
    } else if (ctx.is_chol_hamoed) {
      type = 'chol_hamoed';
      aliyot_count = 4;
      aliyot_names = ['כהן', 'לוי', 'שלישי', 'רביעי'];
    } else if (ctx.is_rosh_chodesh) {
      type = 'rosh_chodesh';
      aliyot_count = 4;
      aliyot_names = ['כהן', 'לוי', 'שלישי', 'רביעי'];
    } else if (ctx.is_chanukah) {
      type = 'chanukah';
      aliyot_count = 3;
      aliyot_names = ['כהן', 'לוי', 'שלישי'];
    } else if (ctx.is_fast) {
      type = 'fast';
      aliyot_count = 3;
      aliyot_names = ['כהן', 'לוי', 'שלישי'];
    } else if (ctx.is_purim) {
      type = 'purim';
      aliyot_count = 3;
      aliyot_names = ['כהן', 'לוי', 'שלישי'];
    } else if (dow === 1 || dow === 4) {
      type = 'sheni_chamishi';
      aliyot_count = 3;
      aliyot_names = ['כהן', 'לוי', 'שלישי'];
    }

    return {
      date: _toIso(date),
      hebrew: heb,
      day_of_week: dow,
      day_of_week_name: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'][dow],
      type: type,
      aliyot_count: aliyot_count,
      aliyot_names: aliyot_names,
      parsha: ctx.parsha_he || ctx.parsha,
      holidays: ctx.holidays,
      is_special_shabbat: ctx.is_special_shabbat,
      special_shabbat_name: ctx.special_shabbat_name,
      is_rosh_chodesh: ctx.is_rosh_chodesh,
      is_chol_hamoed: ctx.is_chol_hamoed,
      is_yom_tov: ctx.is_yom_tov,
      is_yom_kippur: ctx.is_yom_kippur,
      is_chanukah: ctx.is_chanukah,
      is_fast: ctx.is_fast,
      is_purim: ctx.is_purim,
      two_torahs: two_torahs
    };
  }

  function nextShabbat(from) {
    const d = _toDate(from);
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    return d;
  }

  function thisWeekShabbat(arg) {
    const start = (arg && arg.date) ? _toDate(arg.date) : new Date();
    return dayInfo(nextShabbat(start));
  }

  // Holidays/events for a date range (used for the "important days ahead" panel)
  function upcomingHolidays(args) {
    const h = _hebcal();
    const start = args.start ? _toDate(args.start) : new Date();
    const end = args.end ? _toDate(args.end) : new Date(start.getTime() + 30 * 86400000);
    const evs = h.HebrewCalendar.calendar({
      start: start, end: end,
      sedrot: false, noHolidays: false,
      il: true
    });
    return evs.map(function(ev) {
      return {
        date: ev.getDate().greg().toISOString().substring(0, 10),
        he: (ev.render('he') || '').replace(/[֑-ׇ]/g, ''),
        en: ev.basename(),
        flags: ev.getFlags()
      };
    });
  }

  return {
    gregorianToHebrew: gregorianToHebrew,
    hebrewToGregorian: hebrewToGregorian,
    nextHebrewAnniversary: nextHebrewAnniversary,
    currentHebrewYear: currentHebrewYear,
    dayInfo: dayInfo,
    thisWeekShabbat: thisWeekShabbat,
    nextShabbat: nextShabbat,
    upcomingHolidays: upcomingHolidays
  };
})();
