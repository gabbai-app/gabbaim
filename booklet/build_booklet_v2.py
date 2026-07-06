"""
Build the גבאים printable booklet v2:
- A4 PORTRAIT
- All kavodot (not just aliyot) as columns
- 40 empty numbered rows (user will fill names later)
- No pre-populated names
"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
PAGES = json.load(open(os.path.join(SITE, '_pages.json'), encoding='utf-8'))
DB = json.load(open(os.path.join(SITE, 'data', 'db.json'), encoding='utf-8'))

# === Kavodot definitions (mirroring js/kavodot.js) ===
# Shabbat regular
SHABBAT_KAVODOT = [
    ('אנעים זמירות', 'special'),
    ('פתיחה + הכנסה', 'opening'),
    ('כהן', 'aliyah'),
    ('לוי', 'aliyah'),
    ('שלישי', 'aliyah'),
    ('רביעי', 'aliyah'),
    ('חמישי', 'aliyah'),
    ('שישי', 'aliyah'),
    ('שביעי', 'aliyah'),
    ('מפטיר', 'aliyah'),
    ('הגבהה', 'lift'),
    ('גלילה', 'wrap'),
    ('הפטרה', 'reading'),
    ('פתיחת ארון (מוסף)', 'opening'),
    ('פת׳ + הכ׳ (מנחה)', 'opening'),
    ('כהן (מנחה)', 'aliyah'),
    ('לוי (מנחה)', 'aliyah'),
    ('שלישי (מנחה)', 'aliyah'),
    ('הגב׳ (מנחה)', 'lift'),
    ('גל׳ (מנחה)', 'wrap'),
]

# Yom Tov (Israel)
YOM_TOV_KAVODOT = [
    ('פתיחה + הכנסה', 'opening'),
    ('הוצאת ס״ת ב', 'opening'),
    ('כהן', 'aliyah'),
    ('לוי', 'aliyah'),
    ('שלישי', 'aliyah'),
    ('רביעי', 'aliyah'),
    ('חמישי', 'aliyah'),
    ('מפטיר', 'aliyah'),
    ('הגבהה א', 'lift'),
    ('גלילה א', 'wrap'),
    ('הגבהה ב', 'lift'),
    ('גלילה ב', 'wrap'),
    ('הפטרה', 'reading'),
]

YOM_KIPPUR_KAVODOT = [
    ('פת׳ ארון — כל נדרי', 'opening'),
    ('כל נדרי', 'special'),
    ('פת׳ + הכ׳ (שחרית)', 'opening'),
    ('כהן', 'aliyah'),
    ('לוי', 'aliyah'),
    ('שלישי', 'aliyah'),
    ('רביעי', 'aliyah'),
    ('חמישי', 'aliyah'),
    ('שישי', 'aliyah'),
    ('מפטיר', 'aliyah'),
    ('הגבהה', 'lift'),
    ('גלילה', 'wrap'),
    ('הפטרה (יונה)', 'reading'),
    ('פת׳ ארון — נעילה', 'opening'),
]

def kavodot_for_page(p):
    """Return list of (name, cat) for the day type."""
    if p['kind'] == 'shabbat':
        return SHABBAT_KAVODOT
    hol = p.get('holiday') or p.get('title', '')
    if 'יום הכיפורים' in hol:
        return YOM_KIPPUR_KAVODOT
    return YOM_TOV_KAVODOT

N_ROWS = 40  # 40 empty numbered rows

def esc(s):
    return (s or '').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def build_booklet(synagogue, out_file):
    sg_name = synagogue['name']
    header_color = '#0d3b2e'
    body_color = '#faf5e8'
    accent = '#c99700'

    pages_html = []

    # 1) Cover
    pages_html.append(f'''
<section class="page cover">
  <div class="cover-frame">
    <div class="cover-brand">מעלה עמוס</div>
    <h1 class="cover-title">חוברת גבאים</h1>
    <div class="cover-sub">עליות וכיבודים</div>
    <div class="cover-sg">{esc(sg_name)}</div>
    <div class="cover-year">תשפ״ו – תשפ״ז</div>
    <div class="cover-range">מהשבת הקרובה עד כ״ט אלול תשפ״ז</div>
    <div class="cover-note">לוח ארץ ישראל · יום טוב אחד</div>
    <div class="cover-footer">{esc(sg_name)} · מעלה עמוס</div>
  </div>
</section>''')

    # 2) TOC — multiple pages
    toc_rows = []
    for i, p in enumerate(PAGES, start=1):
        sp = ' · '.join(p.get('specials', []))
        sp_html = f' <span class="toc-special">{esc(sp)}</span>' if sp else ''
        toc_rows.append(
            f'<tr><td class="toc-num">{i}</td>'
            f'<td class="toc-title">{esc(p["title"])}{sp_html}</td>'
            f'<td class="toc-hebdate">{esc(p["hebdate"])}</td>'
            f'<td class="toc-date">{p["date"]}</td></tr>'
        )
    # A4 portrait fits ~30 TOC rows
    per_page = 30
    for chunk_start in range(0, len(toc_rows), per_page):
        chunk = toc_rows[chunk_start:chunk_start+per_page]
        head_extra = ' (המשך)' if chunk_start > 0 else ''
        pages_html.append(f'''
<section class="page toc-page">
  <h2 class="page-title">תוכן העניינים{head_extra}</h2>
  <table class="toc-table">
    <thead><tr><th>#</th><th>הכותרת</th><th>תאריך עברי</th><th>לועזי</th></tr></thead>
    <tbody>{"".join(chunk)}</tbody>
  </table>
</section>''')

    # 3) Per-day page
    wd_map = {0:'שני', 1:'שלישי', 2:'רביעי', 3:'חמישי', 4:'שישי', 5:'שבת', 6:'ראשון'}
    for idx, p in enumerate(PAGES, start=1):
        kavodot = kavodot_for_page(p)
        n_cols = len(kavodot)

        specials_str = ' · '.join(p.get('specials', []))
        specials_html = f'<div class="page-specials">{esc(specials_str)}</div>' if specials_str else ''
        dt = datetime.strptime(p['date'], '%Y-%m-%d')
        greg = dt.strftime('%d/%m/%Y')
        weekday = wd_map[dt.weekday()]

        # Kavodot header row - rotated text for narrow columns
        headers_html = ''.join([
            f'<th class="cat-{cat}"><div class="col-h">{esc(name)}</div></th>'
            for name, cat in kavodot
        ])

        rows_html = []
        for i in range(1, N_ROWS + 1):
            zc = 'zebra-a' if i % 2 == 1 else 'zebra-b'
            cells = ''.join(['<td></td>'] * n_cols)
            rows_html.append(
                f'<tr class="{zc}"><td class="row-num">{i}</td><td class="row-name"></td>{cells}</tr>'
            )

        page_html = f'''
<section class="page daily-page">
  <div class="page-header">
    <div class="ph-num">עמ׳ {idx}</div>
    <h2 class="page-title">{esc(p["title"])}</h2>
    {specials_html}
    <div class="page-date">
      <span class="hebdate">{esc(p["hebdate"])}</span>
      <span class="sep">·</span>
      <span class="greg">יום {weekday} · {greg}</span>
    </div>
  </div>
  <div class="table-wrap">
    <table class="kavodot-table">
      <thead><tr><th class="col-num">#</th><th class="col-name">שם המתפלל</th>{headers_html}</tr></thead>
      <tbody>{"".join(rows_html)}</tbody>
    </table>
  </div>
  <div class="page-footer">{esc(sg_name)} · מעלה עמוס</div>
</section>'''
        pages_html.append(page_html)

    css = f'''
@page {{
  size: A4 portrait;
  margin: 7mm 6mm 7mm 6mm;
}}
* {{ box-sizing: border-box; }}
html, body {{ margin: 0; padding: 0; font-family: 'Heebo', sans-serif; color: #1a1a1a; background: #ddd; -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
body {{ direction: rtl; }}

.print-btn {{
  position: fixed; top: 12px; left: 12px; z-index: 999;
  background: {header_color}; color: #fff; border: 0; padding: 10px 22px;
  border-radius: 999px; font-weight: 700; cursor: pointer; font-size: 15px;
  box-shadow: 0 4px 12px rgba(0,0,0,.2);
}}
@media print {{ .print-btn {{ display: none; }} }}

.page {{
  width: 210mm; height: 297mm; padding: 8mm 7mm;
  page-break-after: always;
  background: {body_color};
  position: relative;
  overflow: hidden;
  margin: 0 auto 8mm;
  box-shadow: 0 6px 24px rgba(0,0,0,.15);
}}
@media print {{
  .page {{ margin: 0; box-shadow: none; }}
}}

/* Cover */
.cover {{ background: {header_color}; color: {body_color}; padding: 0; }}
.cover-frame {{
  width: 100%; height: 100%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 3px double {accent}; padding: 30mm 20mm;
}}
.cover-brand {{ font-size: 20px; letter-spacing: 6px; color: {accent}; margin-bottom: 12mm; }}
.cover-title {{ font-size: 48px; font-weight: 900; margin: 0 0 6mm; text-align: center; }}
.cover-sub {{ font-size: 28px; color: {accent}; margin-bottom: 20mm; }}
.cover-sg {{ font-size: 30px; font-weight: 800; margin-bottom: 12mm; }}
.cover-year {{ font-size: 42px; font-weight: 900; letter-spacing: 3px; margin-bottom: 8mm; }}
.cover-range {{ font-size: 16px; opacity: .9; margin-bottom: 4mm; }}
.cover-note {{ font-size: 14px; opacity: .8; margin-bottom: 20mm; }}
.cover-footer {{ font-size: 13px; opacity: .7; position: absolute; bottom: 15mm; }}

/* TOC */
.toc-page .page-title {{ font-size: 22px; font-weight: 800; color: {header_color}; border-bottom: 3px solid {header_color}; padding-bottom: 6px; margin: 0 0 8px; }}
.toc-table {{ width: 100%; border-collapse: collapse; font-size: 11px; }}
.toc-table th {{ background: {header_color}; color: {body_color}; padding: 6px; text-align: right; font-weight: 700; }}
.toc-table td {{ padding: 5px 6px; border-bottom: 1px solid #d4c690; }}
.toc-table tbody tr:nth-child(odd) td {{ background: #f0e6c9; }}
.toc-num {{ width: 30px; color: {accent}; font-weight: 700; text-align: center; }}
.toc-date {{ width: 70px; direction: ltr; color: #555; font-size: 10px; }}
.toc-hebdate {{ width: 100px; font-size: 10px; }}
.toc-special {{ display: inline-block; margin-right: 6px; font-size: 9.5px; color: {accent}; font-weight: 600; }}

/* Daily page */
.daily-page {{ display: flex; flex-direction: column; }}
.page-header {{
  background: {header_color}; color: {body_color};
  padding: 6px 12px; border-radius: 6px 6px 0 0;
  margin: 0 0 3px; position: relative;
}}
.ph-num {{ position: absolute; top: 5px; left: 10px; font-size: 10px; opacity: .7; }}
.page-title {{ font-size: 22px; font-weight: 900; margin: 0; letter-spacing: 0.5px; }}
.page-specials {{ display: inline-block; background: {accent}; color: #fff; padding: 1px 8px; border-radius: 3px; font-size: 10.5px; font-weight: 700; margin-top: 2px; }}
.page-date {{ margin-top: 2px; font-size: 11.5px; opacity: .92; }}
.page-date .sep {{ margin: 0 6px; opacity: .6; }}
.page-date .greg {{ direction: ltr; display: inline-block; }}

.table-wrap {{ flex: 1; overflow: hidden; }}
.kavodot-table {{ width: 100%; border-collapse: collapse; font-size: 8.5px; margin: 0; table-layout: fixed; }}
.kavodot-table th {{
  background: #24594a; color: {body_color};
  padding: 4px 1px; font-weight: 700; border: 1px solid #17372c;
  text-align: center;
  height: 90px;
  vertical-align: bottom;
}}
.kavodot-table th.col-num, .kavodot-table th.col-name {{ height: 24px; vertical-align: middle; }}
.col-h {{
  writing-mode: vertical-lr;
  transform: rotate(180deg);
  text-orientation: mixed;
  white-space: nowrap;
  font-size: 8px;
  font-weight: 600;
  padding: 2px 0;
}}
.kavodot-table th.cat-aliyah {{ background: #1e5136; }}
.kavodot-table th.cat-opening, .kavodot-table th.cat-closing {{ background: #0c3d47; }}
.kavodot-table th.cat-lift, .kavodot-table th.cat-wrap {{ background: #4a1e4d; }}
.kavodot-table th.cat-reading {{ background: #204d29; }}
.kavodot-table th.cat-special {{ background: #6b4c00; }}
.kavodot-table td {{
  padding: 2px 3px; border: 1px solid #b8a970; text-align: center;
  height: 14px; font-size: 8px;
}}
.col-num {{ width: 18px; }}
.col-name {{ width: 22%; }}
.kavodot-table .row-num {{ color: {accent}; font-weight: 700; font-size: 9px; }}
.kavodot-table .row-name {{ text-align: right; padding-right: 4px; font-weight: 600; }}
.kavodot-table tbody tr.zebra-a td {{ background: #f0e6c9; }}
.kavodot-table tbody tr.zebra-b td {{ background: {body_color}; }}

.page-footer {{
  position: absolute; bottom: 3mm; right: 8mm;
  font-size: 9px; color: #7a6a3d;
}}
'''

    html = f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>חוברת גבאים — {esc(sg_name)} — תשפ״ו-תשפ״ז</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>{css}</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨 הדפס / שמור PDF</button>
{"".join(pages_html)}
</body>
</html>'''

    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'  → {out_file} ({len(pages_html)} sections)')

# Build for each synagogue
for sg in DB['synagogues']:
    sg_id = sg['id']
    out = os.path.join(ROOT, f'booklet_{sg_id}.html')
    print(f'\nBuilding {sg["name"]} ({sg_id}):')
    build_booklet(sg, out)

print('\nDONE')
