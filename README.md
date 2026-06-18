# גבאים — מעלה עמוס

מערכת ניהול עליות לתורה וגבאים, עבור שני בתי כנסת בישוב מעלה עמוס.

## פיצ'רים

- **דשבורד** — סקירת מצב עם חיובי השבת, סטטיסטיקות, ועליות אחרונות.
- **מצב חי** — מסך שמונה העליות עם הצעות חכמות (סינון לפי שבט + רוטציה).
- **מתפללים** — הוספה / עריכה / חיפוש / סטטיסטיקות פר מתפלל.
- **אירועים** — יארצייטים חוזרים בתאריך עברי, חתן, בר מצווה, אבל וכו'.
- **דוחות** — רוטציה, חלוקה הוגנת, רחוקים, חלוקה לשבטים, חיובים פתוחים.
- **שלוחת ימות המשיח** — תפריט קולי לרישום עליות בקו 0772251404.
- **PWA** — התקנה כאפליקציה, עבודה אופליין עם cache מקומי.
- **Multi-tenant** — 2 בתי כנסת (ניתן להוסיף עוד).

## ארכיטקטורה

- **Frontend (GitHub Pages):** HTML/CSS/JS סטטי. Bootstrap 5 RTL + Heebo + Bootstrap Icons.
- **Backend:** Google Apps Script Web App, מאחסן את הנתונים ב־Google Sheet.
- **API:** קריאות `fetch` ל־Apps Script (GET ל־reads, POST form-urlencoded ל־writes).
- **Cache:** localStorage עם TTL לקריאות שגרתיות, נופל ל־stale cache במצב אופליין.

```
┌──────────────┐    GET ?action=X        ┌──────────────┐
│ GitHub Pages │ ─────────────────────▶  │ Apps Script  │
│ (Static UI)  │                          │   Web App    │
│              │  POST x-www-form-...     │              │
│  fetch+cache │ ─────────────────────▶  │ doGet/doPost │
└──────────────┘                          └──────┬───────┘
                                                 │
                                                 ▼
                                          ┌──────────────┐
                                          │ Google Sheet │
                                          │  (7 tables)  │
                                          └──────────────┘
```

## מבנה תיקיות

```
site/
├── index.html         # SPA shell
├── manifest.json      # PWA manifest
├── sw.js              # Service Worker
├── css/style.css      # All styles
├── icons/             # PWA icons
└── js/
    ├── config.js      # API URL, cache TTL
    ├── util.js        # Pure helpers (escape, dates, avatars)
    ├── api.js         # Apps Script bridge (fetch + cache + retry)
    ├── state.js       # Global state (synagogues, current)
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

## Apps Script Backend

קוד הצד־שרת ב־`apps-script/` (mirror לפיתוח). פריסה: `clasp push` חסום בגלל NetFree, ולכן עושים זאת ב־`curl` עם `Content-Encoding: gzip` ישירות ל־`script.googleapis.com/v1/projects/<id>/content`.

**פרטים:**
- Script ID: `1rBy3Ak1sXBkvSkQLgPOlVQbqApsB1mZO5fExhOQgEe_06CbH_mFGg6vw`
- Live URL: `https://script.google.com/macros/s/AKfycbywnCURd-UcTzwTQMhSNCeixib64kX8ACItjs97YdFWkID3cOuTGGJnORYpYWGE539l/exec`

## הפעלה מקומית

```bash
cd site
python -m http.server 8000
# http://localhost:8000
```

## רישיון

פנימי — שימוש קהילתי בלבד.
