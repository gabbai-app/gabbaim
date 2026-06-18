# גבאים — מעלה עמוס

מערכת ניהול עליות לתורה וגבאים, עבור שני בתי כנסת בישוב מעלה עמוס.

**עובדת מקומית בלבד.** אין שרת, אין רישום משתמש, אין תלות בשירות חיצוני. הנתונים נשמרים במכשיר (localStorage), והעברה בין מכשירים נעשית בייצוא/ייבוא קובץ JSON.

## פיצ'רים

- **דשבורד** — סקירת מצב עם חיובי השבת, סטטיסטיקות, ועליות אחרונות.
- **מצב חי** — מסך שמונה העליות עם הצעות חכמות (סינון לפי שבט + רוטציה).
- **מתפללים** — הוספה / עריכה / חיפוש / סטטיסטיקות פר מתפלל.
- **אירועים** — יארצייטים חוזרים בתאריך עברי, חתן, בר מצווה, אבל וכו'.
- **דוחות** — רוטציה, חלוקה הוגנת, רחוקים, חלוקה לשבטים, חיובים פתוחים.
- **PWA** — התקנה כאפליקציה, עבודה אופליין מלאה.
- **גיבוי/ייבוא** — קובץ JSON להעברה בין מכשירים.
- **Multi-tenant** — 2 בתי כנסת מהיום הראשון (ניתן להוסיף עוד).

## ארכיטקטורה

```
┌──────────────────────────────┐
│      GitHub Pages (UI)       │
│ ─ HTML / CSS / JS סטטי       │
│ ─ Bootstrap 5 RTL + Heebo    │
│ ─ Service Worker (offline)   │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│      localStorage            │
│  (כל הנתונים — JSON אחד)     │
└──────────────────────────────┘

       ⬇ ייצוא / ייבוא ⬇

┌──────────────────────────────┐
│   קובץ JSON                  │
│  גבאים_גיבוי_YYYY-MM-DD.json │
└──────────────────────────────┘
```

## העברה למכשיר שני (לגבאי נוסף)

1. במכשיר שלך: **הגדרות → ייצוא לקובץ**.
2. שלח את הקובץ בוואטסאפ/מייל למכשיר השני.
3. במכשיר השני (פתח את האתר פעם ראשונה): **הגדרות → ייבוא מקובץ**.
4. עכשיו לשני המכשירים יש אותם נתונים. כל אחד יכול לערוך, אבל **אין סנכרון אוטומטי** — מי שעורך אצלו צריך לייצא ולהעביר שוב.

לגיבוי שוטף — ייצא פעם בשבוע ושמור בענן (Drive / וואטסאפ).

## מבנה תיקיות

```
site/
├── index.html         # SPA shell
├── manifest.json      # PWA manifest
├── sw.js              # Service Worker
├── css/style.css      # All styles
├── icons/             # PWA icons
└── js/
    ├── config.js      # App version
    ├── util.js        # Pure helpers (escape, dates, avatars)
    ├── calendar.js    # Hebrew calendar engine (gregorian↔hebrew, parsha, yahrzeit)
    ├── db.js          # localStorage CRUD + export/import
    ├── api.js         # Domain operations (members, aliyot, events, reports)
    ├── state.js       # Global app state (current synagogue)
    ├── ui.js          # Modals, toasts, skeletons
    ├── router.js      # Hash-based SPA routing
    ├── app.js         # Boot
    └── pages/
        ├── dashboard.js
        ├── live.js          # The Live Mode screen
        ├── members.js
        ├── member_card.js
        ├── events.js
        ├── reports.js
        └── settings.js
```

## הפעלה מקומית

```bash
cd site
python -m http.server 8000
# http://localhost:8000
```

## פיתוח

זה אתר סטטי — אין build step. ערוך קובץ → רענן.

לעדכון ב־production: commit + push → GitHub Pages בונה אוטומטית תוך דקה.

## רישיון

פנימי — שימוש קהילתי בלבד.
