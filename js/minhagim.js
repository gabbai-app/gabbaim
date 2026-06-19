// Minhagim (customs) knowledge base — for special shabbatot and chagim
// Each entry: { matches(info) → bool, name, summary, customs[], links[] }
// Allowed external sites only (per yosef's NetFree-safe list):
//   - הידברות hidabroot.org
//   - כאן יהדות kan.org.il/yahadut
// Links use site search so they always resolve.

const MINHAGIM = (function() {

  function _hidLink(query) {
    return 'https://www.hidabroot.org/he/search?text=' + encodeURIComponent(query);
  }
  function _kanLink(query) {
    return 'https://www.kan.org.il/yahadut/search.aspx?q=' + encodeURIComponent(query);
  }
  function _links(query) {
    return [
      { label: 'הידברות',   url: _hidLink(query) },
      { label: 'כאן יהדות', url: _kanLink(query) }
    ];
  }

  const ENTRIES = [
    {
      key: 'shekalim',
      name: 'שבת שקלים',
      matches: function(info) { return info.special_shabbat_name && info.special_shabbat_name.indexOf('שקלים') >= 0; },
      summary: 'ראשונה מארבע פרשיות. קוראים בנוסף לפרשת השבוע מפרשת כי תשא (מחצית השקל).',
      customs: [
        'מוציאים 2 ספרי תורה',
        'הפטרה מיוחדת מספר מלכים ב\'',
        'נהוג לאסוף "זכר למחצית השקל" לפני פורים'
      ],
      links: _links('שבת שקלים')
    },
    {
      key: 'zachor',
      name: 'שבת זכור',
      matches: function(info) { return info.special_shabbat_name && info.special_shabbat_name.indexOf('זכור') >= 0; },
      summary: 'שבת לפני פורים. מצוות זכירת מעשה עמלק (דברים כ"ה).',
      customs: [
        'מוציאים 2 ספרי תורה',
        'יש שיטה שקריאת פרשת זכור מן התורה (מצוות עשה מדאורייתא)',
        'הפטרה מיוחדת מספר שמואל א\' (פקדתי את אשר עשה עמלק)'
      ],
      links: _links('שבת זכור עמלק')
    },
    {
      key: 'parah',
      name: 'שבת פרה',
      matches: function(info) { return info.special_shabbat_name && info.special_shabbat_name.indexOf('פרה') >= 0; },
      summary: 'אחרי פורים. קוראים פרשת פרה אדומה (במדבר י"ט) לזכר טהרת כל ישראל לקראת פסח.',
      customs: [
        'מוציאים 2 ספרי תורה',
        'הפטרה מיוחדת מיחזקאל ל"ו (וזרקתי עליכם מים טהורים)'
      ],
      links: _links('שבת פרה')
    },
    {
      key: 'hachodesh',
      name: 'שבת החודש',
      matches: function(info) { return info.special_shabbat_name && info.special_shabbat_name.indexOf('החודש') >= 0; },
      summary: 'בשבת לפני ראש חודש ניסן (או בו). מצוות החודש הזה לכם.',
      customs: [
        'מוציאים 2 ספרי תורה',
        'הפטרה מיחזקאל מ"ה (בראשון באחד לחודש)'
      ],
      links: _links('שבת החודש ניסן')
    },
    {
      key: 'hagadol',
      name: 'שבת הגדול',
      matches: function(info) {
        // Shabbat before Pesach (15 ניסן)
        if (!info.is_shabbat) return false;
        try {
          const hd = info.hebrew;
          return hd.month_name === 'ניסן' && hd.day >= 8 && hd.day <= 14;
        } catch (e) { return false; }
      },
      summary: 'שבת לפני פסח. נקראת "הגדול" על שם הנס הגדול שאירע בשבת זו במצרים.',
      customs: [
        'הרב נושא דרשת שבת הגדול לציבור — הלכות פסח',
        'יש שקוראים חלק מההגדה אחרי מנחה',
        'הפטרה: וערבה (מספר מלאכי)'
      ],
      links: _links('שבת הגדול דרשה')
    },
    {
      key: 'shuva',
      name: 'שבת שובה',
      matches: function(info) {
        if (!info.is_shabbat) return false;
        try {
          const hd = info.hebrew;
          return hd.month_name === 'תשרי' && hd.day >= 3 && hd.day <= 9;
        } catch (e) { return false; }
      },
      summary: 'שבת תשובה — בין ראש השנה ליום הכיפורים.',
      customs: [
        'הרב נושא דרשת תשובה',
        'הפטרה: שובה ישראל (הושע)',
        'נהוג להחמיר בתשובה ובקיום מצוות בשבוע זה'
      ],
      links: _links('שבת שובה דרשה')
    },
    {
      key: 'chazon',
      name: 'שבת חזון',
      matches: function(info) {
        if (!info.is_shabbat) return false;
        try {
          const hd = info.hebrew;
          return hd.month_name === 'אב' && hd.day >= 1 && hd.day <= 9;
        } catch (e) { return false; }
      },
      summary: 'שבת לפני תשעה באב. הפטרה: חזון ישעיהו.',
      customs: [
        'אין סימני אבילות בולטים בעצם השבת',
        'הפטרה ראשונה משלוש דפורענותא',
        'לפי המנהג נהוג ללבוש בגדי שבת אך לא בגדים חדשים'
      ],
      links: _links('שבת חזון תשעה באב')
    },
    {
      key: 'nachamu',
      name: 'שבת נחמו',
      matches: function(info) {
        if (!info.is_shabbat) return false;
        try {
          const hd = info.hebrew;
          return hd.month_name === 'אב' && hd.day >= 10 && hd.day <= 16;
        } catch (e) { return false; }
      },
      summary: 'שבת אחרי תשעה באב. ראשונה משבע דנחמתא — "נחמו נחמו עמי".',
      customs: [
        'הפטרה: נחמו נחמו עמי (ישעיהו)',
        'נהוג ללבוש בגדי שבת חגיגיים יותר',
        'בחו"ל יש נופשים — שבע דנחמתא'
      ],
      links: _links('שבת נחמו')
    },
    {
      key: 'mevarchim',
      name: 'שבת מברכים',
      matches: function(info) {
        if (!info.is_shabbat) return false;
        // Shabbat before Rosh Chodesh — i.e. the next 7 days include Rosh Chodesh
        try {
          const today = new Date(info.date);
          for (let i = 1; i <= 7; i++) {
            const d = new Date(today); d.setDate(today.getDate() + i);
            const heb = CAL.gregorianToHebrew(d);
            if (heb.day === 1 || heb.day === 30) return true;
          }
        } catch (e) {}
        return false;
      },
      summary: 'שבת לפני ראש חודש. מברכים את החודש החדש.',
      customs: [
        'אומרים "יהי רצון" לפני ברכת החודש',
        'מכריזים מתי יחול ראש חודש',
        'אין מוסיפים ספר תורה אלא אם זה גם פרשייה מיוחדת'
      ],
      links: _links('שבת מברכים ברכת החודש')
    },
    {
      key: 'rosh_chodesh_shabbat',
      name: 'שבת ראש חודש',
      matches: function(info) { return info.is_shabbat && info.is_rosh_chodesh; },
      summary: 'שבת שחלה בה ראש חודש. קריאה כפולה.',
      customs: [
        'מוציאים 2 ספרי תורה (פרשת השבוע + ראש חודש)',
        'הפטרה: השמים כסאי (ישעיה ס"ו)',
        'תפילה: תוספת יעלה ויבוא במוסף ובברכת המזון'
      ],
      links: _links('שבת ראש חודש השמים כסאי')
    },
    {
      key: 'chanukah',
      name: 'שבת חנוכה',
      matches: function(info) { return info.is_shabbat && info.is_chanukah; },
      summary: 'שבת בחנוכה. מדליקים נרות חנוכה לפני נרות שבת.',
      customs: [
        'מוציאים 2 ספרי תורה (פרשת השבוע + קרבן הנשיא של היום)',
        'הפטרה: רני ושמחי (זכריה) — שבת חנוכה הראשונה',
        'במוצש: הבדלה לפני הדלקת נרות חנוכה'
      ],
      links: _links('שבת חנוכה רני ושמחי')
    },
    {
      key: 'chol_hamoed_pesach',
      name: 'חול המועד פסח',
      matches: function(info) { return info.is_chol_hamoed && info.hebrew && info.hebrew.month_name === 'ניסן'; },
      summary: 'חול המועד פסח. הלל חצי, מוסף, ביעור חמץ.',
      customs: [
        'קוראים בכל יום מחומש שונה לפי סדר הימים',
        'הלל חצי בכל יום',
        'בשבת חוה"מ פסח קוראים שיר השירים',
        'במנחה לא קוראים בתורה (כמו חול)'
      ],
      links: _links('חול המועד פסח')
    },
    {
      key: 'chol_hamoed_sukkot',
      name: 'חול המועד סוכות',
      matches: function(info) { return info.is_chol_hamoed && info.hebrew && info.hebrew.month_name === 'תשרי'; },
      summary: 'חול המועד סוכות. אכילה+שינה בסוכה, נטילת ארבעת המינים, הושענות.',
      customs: [
        'נטילת ד\' המינים בכל יום (מלבד שבת)',
        'הלל שלם בכל יום',
        'הושענא רבה ביום השביעי',
        'בשבת חוה"מ סוכות קוראים קהלת'
      ],
      links: _links('חול המועד סוכות הושענות')
    }
  ];

  function forDayInfo(info) {
    if (!info) return [];
    return ENTRIES.filter(function(e) {
      try { return e.matches(info); } catch (err) { return false; }
    });
  }

  return { forDayInfo: forDayInfo, ENTRIES: ENTRIES };
})();
