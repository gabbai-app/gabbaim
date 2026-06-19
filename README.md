# גבאים — מעלה עמוס

מערכת ניהול עליות לתורה וגבאים, עבור שני בתי כנסת בישוב מעלה עמוס.

**עובדת מקומית עם סנכרון GitHub אופציונלי.** הנתונים נשמרים במכשיר (localStorage) ומסונכרנים אוטומטית עם קובץ JSON ב־GitHub repo. אין שרת אמצעי — GitHub עצמו הוא הענן. ללא טוקן GitHub האפליקציה עובדת מקומית בלבד.

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
│   GitHub Pages (Frontend)    │
│ ─ HTML / CSS / JS סטטי       │
│ ─ Bootstrap 5 RTL + Heebo    │
│ ─ Service Worker (offline)   │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│      localStorage            │ ← מקור אמת מקומי, instant UX
│  (כל הנתונים — JSON אחד)     │
└────────────┬─────────────────┘
             │ debounced sync
             │ + poll כל 30s
             ▼
┌──────────────────────────────┐
│ GitHub repo: data/db.json    │ ← מקור אמת מרוחק (מסונכרן)
│   raw.githubusercontent.com  │   קריאה ללא auth
│   api.github.com (PUT, PAT)  │   כתיבה עם טוקן אישי
└──────────────────────────────┘
```

**מודל סנכרון:**
- כל שינוי נשמר מיידית ב-localStorage
- ב-1.5 שנייה אחר כך → push ל-GitHub (אם יש PAT)
- כל 30 שניות → pull merge push (last-write-wins לפי `updated_at`)
- אם רשת נופלת — המשך לעבוד מקומית, סנכרון יחזור אוטומטית

**הגדרה ראשונית של PAT:**
1. `github.com/settings/tokens/new` → scope: `repo`
2. הדבק בהגדרות → סנכרון מקוון

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
