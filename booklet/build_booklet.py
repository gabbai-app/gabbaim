"""
Build the גבאים printable booklet — HTML per synagogue.
"""
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from datetime import datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(ROOT)
PAGES = json.load(open(os.path.join(SITE, '_pages.json'), encoding='utf-8'))
DB = json.load(open(os.path.join(SITE, 'data', 'db.json'), encoding='utf-8'))

# Sort members alphabetically by last name then first name
members = sorted(
    [m for m in DB['members'] if m.get('status') != 'inactive'],
    key=lambda m: (m.get('last_name',''), m.get('first_name',''))
)
print(f"Members: {len(members)}")

def esc(s):
    return (s or '').replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def build_booklet(synagogue, members_list, out_file):
    sg_name = synagogue['name']
    header_color = '#0d3b2e'   # dark green
    body_color = '#faf5e8'     # cream
    accent = '#c99700'         # subtle gold

    pages_html = []
    # 1) Cover
    pages_html.append(f'''
<section class="page cover">
  <div class="cover-frame">
    <div class="cover-brand">מעלה עמוס</div>
    <h1 class="cover-title">חוברת גבאים · עליות וכיבודים</h1>
    <div class="cover-sub">{esc(sg_name)}</div>
    <div class="cover-year">תשפ״ו – תשפ״ז</div>
    <div class="cover-range">מהשבת הקרובה עד כ״ט אלול תשפ״ז</div>
    <div class="cover-note">לוח ארץ ישראל · יום טוב אחד</div>
    <div class="cover-footer">הודפס עבור {esc(sg_name)} · מעלה עמוס</div>
  </div>
</section>''')

    # 2) TOC
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

    # Split TOC to multi-page if needed (34 rows per page)
    per_page = 34
    for chunk_start in range(0, len(toc_rows), per_page):
        chunk = toc_rows[chunk_start:chunk_start+per_page]
        head_extra = ' (המשך)' if chunk_start > 0 else ''
        pages_html.append(f'''
<section class="page toc-page">
  <h2 class="page-title">תוכן העניינים{head_extra}</h2>
  <table class="toc-table">
    <thead><tr><th>#</th><th>הכותרת</th><th>תאריך עברי</th><th>תאריך לועזי</th></tr></thead>
    <tbody>{"".join(chunk)}</tbody>
  </table>
</section>''')

    # 3) One page per Shabbat/חג
    for idx, p in enumerate(PAGES, start=1):
        aliyot = p['aliyot']
        n_cols = len(aliyot) + 2  # + name/number columns

        # Header for the page
        specials_str = ' · '.join(p.get('specials', []))
        specials_html = f'<div class="page-specials">{esc(specials_str)}</div>' if specials_str else ''
        greg = datetime.strptime(p['date'], '%Y-%m-%d').strftime('%d/%m/%Y')
        weekday = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'][datetime.strptime(p['date'], '%Y-%m-%d').weekday()+1 if datetime.strptime(p['date'], '%Y-%m-%d').weekday() != 6 else 0]
        # Fix weekday index: Python's weekday() Mon=0..Sun=6. Hebrew: א=Sunday.
        wd_map = {0:'שני',1:'שלישי',2:'רביעי',3:'חמישי',4:'שישי',5:'שבת',6:'ראשון'}
        weekday = wd_map[datetime.strptime(p['date'], '%Y-%m-%d').weekday()]

        # Build table rows: members
        rows_html = []
        for i, m in enumerate(members_list, start=1):
            zebra_class = 'zebra-a' if i % 2 == 1 else 'zebra-b'
            name = f'{m.get("last_name","")} {m.get("first_name","")}'.strip()
            cells = ''.join(['<td></td>'] * len(aliyot))
            rows_html.append(
                f'<tr class="{zebra_class}"><td class="row-num">{i}</td>'
                f'<td class="row-name">{esc(name)}</td>'
                f'{cells}</tr>'
            )
        # 8 guest rows
        for i in range(1, 9):
            zebra_class = 'zebra-a' if (len(members_list)+i) % 2 == 1 else 'zebra-b'
            rows_html.append(
                f'<tr class="{zebra_class} guest-row"><td class="row-num">{len(members_list)+i}</td>'
                f'<td class="row-name guest-cell">אורח / _______________</td>'
                f'{"".join(["<td></td>"]*len(aliyot))}</tr>'
            )

        # Mincha block for Shabbat
        mincha_html = ''
        if p['kind'] == 'shabbat':
            mincha_cells = ''.join(['<td></td>'] * 3)
            mincha_rows = []
            for i in range(1, min(len(members_list), 15) + 1):
                m = members_list[i-1]
                nm = f'{m.get("last_name","")} {m.get("first_name","")}'
                zc = 'zebra-a' if i%2==1 else 'zebra-b'
                mincha_rows.append(f'<tr class="{zc}"><td class="row-num">{i}</td><td class="row-name">{esc(nm)}</td>{mincha_cells}</tr>')
            for i in range(1, 4):
                zc = 'zebra-a' if (15+i)%2==1 else 'zebra-b'
                mincha_rows.append(f'<tr class="{zc} guest-row"><td class="row-num">{15+i}</td><td class="row-name guest-cell">אורח / _______________</td>{mincha_cells}</tr>')
            mincha_html = f'''
<div class="mincha-block">
  <div class="mincha-title">מנחה</div>
  <table class="aliyot-table mincha-table">
    <thead><tr><th class="col-num">#</th><th class="col-name">שם</th><th>כהן</th><th>לוי</th><th>שלישי</th></tr></thead>
    <tbody>{"".join(mincha_rows)}</tbody>
  </table>
</div>'''

        aliyot_headers = ''.join([f'<th>{a}</th>' for a in aliyot])
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
  <table class="aliyot-table">
    <thead><tr><th class="col-num">#</th><th class="col-name">שם המתפלל</th>{aliyot_headers}</tr></thead>
    <tbody>{"".join(rows_html)}</tbody>
  </table>
  {mincha_html}
  <div class="page-footer">{esc(sg_name)} · מעלה עמוס</div>
</section>'''
        pages_html.append(page_html)

    # Full HTML
    css = f'''
@page {{
  size: A4 landscape;
  margin: 8mm 8mm 8mm 8mm;
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
.print-btn:hover {{ background: #082a20; }}
@media print {{ .print-btn {{ display: none; }} }}

.page {{
  width: 297mm; height: 210mm; padding: 10mm;
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
.cover {{ background: {header_color}; color: {body_color}; }}
.cover-frame {{
  height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center;
  border: 3px double {accent}; padding: 20mm;
}}
.cover-brand {{ font-size: 22px; letter-spacing: 8px; color: {accent}; margin-bottom: 12mm; }}
.cover-title {{ font-size: 60px; font-weight: 900; margin: 0 0 12mm; text-align: center; line-height: 1.2; }}
.cover-sub {{ font-size: 38px; font-weight: 700; color: {accent}; margin-bottom: 20mm; }}
.cover-year {{ font-size: 52px; font-weight: 900; letter-spacing: 4px; margin-bottom: 8mm; }}
.cover-range {{ font-size: 20px; margin-bottom: 4mm; opacity: .9; }}
.cover-note {{ font-size: 18px; opacity: .8; margin-bottom: 20mm; }}
.cover-footer {{ font-size: 14px; opacity: .7; position: absolute; bottom: 15mm; }}

/* TOC */
.toc-page .page-title {{ font-size: 26px; font-weight: 800; color: {header_color}; border-bottom: 3px solid {header_color}; padding-bottom: 8px; margin: 0 0 10px; }}
.toc-table {{ width: 100%; border-collapse: collapse; font-size: 12px; }}
.toc-table th {{ background: {header_color}; color: {body_color}; padding: 8px; text-align: right; font-weight: 700; }}
.toc-table td {{ padding: 6px 8px; border-bottom: 1px solid #d4c690; }}
.toc-table tbody tr:nth-child(odd) td {{ background: #f0e6c9; }}
.toc-num {{ width: 40px; color: {accent}; font-weight: 700; text-align: center; }}
.toc-date {{ width: 90px; direction: ltr; color: #555; }}
.toc-hebdate {{ width: 130px; }}
.toc-special {{ display: inline-block; margin-right: 10px; font-size: 11px; color: {accent}; font-weight: 600; }}

/* Daily page */
.daily-page {{ padding: 8mm 10mm; }}
.page-header {{ background: {header_color}; color: {body_color}; padding: 10px 16px; border-radius: 8px 8px 0 0; margin: 0 0 4px; position: relative; }}
.ph-num {{ position: absolute; top: 8px; left: 16px; font-size: 12px; opacity: .75; }}
.page-title {{ font-size: 32px; font-weight: 900; margin: 0; letter-spacing: 1px; }}
.page-specials {{ display: inline-block; background: {accent}; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 13px; font-weight: 700; margin-top: 4px; }}
.page-date {{ margin-top: 4px; font-size: 14px; opacity: .9; }}
.page-date .sep {{ margin: 0 8px; opacity: .6; }}
.page-date .greg {{ direction: ltr; display: inline-block; }}

.aliyot-table {{ width: 100%; border-collapse: collapse; font-size: 11px; margin: 0; }}
.aliyot-table th {{ background: #24594a; color: {body_color}; padding: 6px 4px; font-weight: 700; border: 1px solid #17372c; text-align: center; }}
.aliyot-table td {{ padding: 4px 6px; border: 1px solid #b8a970; text-align: center; height: 22px; }}
.col-num {{ width: 30px; }}
.col-name {{ width: 30%; }}
.aliyot-table .row-num {{ color: {accent}; font-weight: 700; }}
.aliyot-table .row-name {{ text-align: right; padding-right: 8px; font-weight: 600; font-size: 12px; }}
.aliyot-table tbody tr.zebra-a td {{ background: #f0e6c9; }}
.aliyot-table tbody tr.zebra-b td {{ background: {body_color}; }}
.aliyot-table tbody tr.guest-row .row-name {{ color: #7a6a3d; font-style: italic; }}

.mincha-block {{ margin-top: 8px; border-top: 2px dashed {accent}; padding-top: 6px; }}
.mincha-title {{ font-weight: 800; color: {header_color}; font-size: 14px; margin-bottom: 4px; text-align: center; }}
.mincha-table {{ width: 60%; margin: 0 auto; font-size: 10px; }}

.page-footer {{ position: absolute; bottom: 4mm; right: 10mm; font-size: 10px; color: #7a6a3d; }}
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
    sg_members = [m for m in members if m.get('primary_synagogue_id') == sg_id]
    if not sg_members:
        # If no members mapped, use all (for sg2 which has none)
        sg_members = members
    out = os.path.join(ROOT, f'booklet_{sg_id}.html')
    print(f'\nBuilding {sg["name"]} ({sg_id}) with {len(sg_members)} members:')
    build_booklet(sg, sg_members, out)

print('\nDONE')
