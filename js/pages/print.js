// Print / Share Shabbat Assignment
// Generates a clean printable sheet for a given date.

const PAGE_PRINT = (function() {
  async function render(el, dateParam) {
    const date = dateParam || UTIL.nextSaturdayISO();
    const synId = STATE.get('currentSynagogueId');
    if (!synId) {
      el.innerHTML = UI.errorState('בחר בית כנסת תחילה');
      return;
    }
    el.innerHTML = UI.skeleton(300);
    try {
      const [info, filled, events, syn] = await Promise.all([
        Promise.resolve(CAL.dayInfo(date)),
        API.read('reportShabbatRecap', { date: date, synagogue_id: synId }),
        API.read('eventsForShabbat', { date: date, synagogue_id: synId }),
        Promise.resolve((STATE.get('synagogues') || []).find(function(s) { return s.id === synId; }) || {})
      ]);
      el.innerHTML = _build(info, filled, events, syn, date);
      _wire(info, filled, events, syn);
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el, dateParam); });
    }
  }

  function _build(info, filled, events, syn, date) {
    const filledMap = {};
    filled.forEach(function(a) { filledMap[a.aliyah_name] = a; });
    const filledMemberMap = {};
    filled.forEach(function(a) { if (a._member) filledMemberMap[a.member_id] = a._member; });

    const dayLabels = {
      shabbat: 'שבת', shabbat_special: 'שבת מיוחדת', sheni_chamishi: 'שני / חמישי',
      rosh_chodesh: 'ראש חודש', chol_hamoed: 'חול המועד', chanukah: 'חנוכה',
      fast: 'תענית', purim: 'פורים', yom_tov: 'יום טוב', yom_kippur: 'יום הכיפורים'
    };

    let html =
      '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2 no-print">' +
      '<h3 class="mb-0"><i class="bi bi-printer"></i> הדפסת סידור</h3>' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<button class="btn btn-primary" id="prnBtn"><i class="bi bi-printer"></i> הדפס</button>' +
      '<button class="btn btn-outline-success" id="waBtn"><i class="bi bi-whatsapp"></i> שלח בוואטסאפ</button>' +
      '<button class="btn btn-outline-secondary" id="copyBtn"><i class="bi bi-clipboard"></i> העתק טקסט</button>' +
      '<input type="date" id="dpPick" class="form-control" style="width:auto;" value="' + UTIL.escAttr(info.date) + '">' +
      '</div></div>' +
      '<div class="card print-card"><div class="card-body p-4" id="printableArea">' +
      '<div class="text-center mb-3 print-header">' +
      '<h2 class="mb-1">' + UTIL.escHtml(syn.name || '') + '</h2>' +
      '<div class="text-muted">' + UTIL.escHtml(syn.address || '') + '</div>' +
      '<hr>' +
      '<h3 class="mb-0">' + (info.parsha ? 'פרשת ' + UTIL.escHtml(info.parsha) : UTIL.escHtml(dayLabels[info.type] || '')) + '</h3>' +
      '<div class="fs-5">' + UTIL.escHtml(info.hebrew.display) + '</div>' +
      '<div class="text-muted">' + UTIL.fmtDate(info.date) + ' · ' + UTIL.escHtml(info.day_of_week_name) + '</div>' +
      (info.is_special_shabbat ? '<div class="mt-1"><b>' + UTIL.escHtml(info.special_shabbat_name) + '</b></div>' : '') +
      '</div>';

    if (events.length) {
      html += '<div class="alert alert-warning"><b>חיובים השבת:</b><ul class="mb-0 mt-1">';
      events.forEach(function(e) {
        const m = e._member || {};
        html += '<li>' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + ' — ' + UTIL.escHtml(e.type) + '</li>';
      });
      html += '</ul></div>';
    }

    const kavodGroups = KAVODOT.grouped(info.type);
    kavodGroups.forEach(function(group) {
      html += '<div class="mb-3"><h5 style="color:' + group.info.color + ';border-bottom:2px solid ' + group.info.color + ';padding-bottom:4px;">' +
        UTIL.escHtml(group.info.label) + '</h5>' +
        '<table class="table table-bordered table-sm mb-0"><tbody>';
      group.items.forEach(function(k) {
        const f = filledMap[k.id];
        const m = f && filledMemberMap[f.member_id] ? filledMemberMap[f.member_id] : null;
        const nameStr = m ? (m.first_name || '') + ' ' + (m.last_name || '') : '________________';
        const tribeStr = k.tribe ? '<span class="text-muted small">(' + k.tribe + ')</span>' : '';
        html += '<tr>' +
          '<td style="width:35%;"><b>' + UTIL.escHtml(k.id) + '</b> ' + tribeStr + '</td>' +
          '<td>' + UTIL.escHtml(nameStr) + (m && m.father_name ? ' <small class="text-muted">בן ' + UTIL.escHtml(m.father_name) + '</small>' : '') + '</td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';
    });

    html += '<div class="text-center text-muted small mt-4 pt-2 border-top">' +
      'הוכן ב-' + UTIL.fmtDate(new Date().toISOString().substring(0, 10)) +
      (AUTH.actorName() ? ' · ' + UTIL.escHtml(AUTH.actorName()) : '') +
      '</div>';
    html += '</div></div>';
    return html;
  }

  function _buildText(info, filled, events, syn) {
    const filledMap = {};
    filled.forEach(function(a) { filledMap[a.aliyah_name] = a; });
    const filledMemberMap = {};
    filled.forEach(function(a) { if (a._member) filledMemberMap[a.member_id] = a._member; });

    let txt = '*' + (syn.name || '') + '*\n';
    txt += (info.parsha ? 'פרשת ' + info.parsha : info.day_of_week_name) + ' · ' + info.hebrew.display + '\n';
    txt += UTIL.fmtDate(info.date) + '\n\n';
    if (events.length) {
      txt += '*חיובים:*\n';
      events.forEach(function(e) {
        const m = e._member || {};
        txt += '• ' + (m.first_name || '') + ' ' + (m.last_name || '') + ' — ' + e.type + '\n';
      });
      txt += '\n';
    }
    const aliyot = (KAVODOT.forDayType(info.type) || []).filter(function(k) { return k.cat === 'aliyah'; });
    if (aliyot.length) {
      txt += '*עליות:*\n';
      aliyot.forEach(function(k) {
        const f = filledMap[k.id];
        const m = f && filledMemberMap[f.member_id] ? filledMemberMap[f.member_id] : null;
        txt += k.id + ': ' + (m ? (m.first_name || '') + ' ' + (m.last_name || '') : '______') + '\n';
      });
    }
    return txt;
  }

  function _wire(info, filled, events, syn) {
    document.getElementById('prnBtn')?.addEventListener('click', function() { window.print(); });
    document.getElementById('dpPick')?.addEventListener('change', function(ev) {
      ROUTER.navigate('/print/' + ev.target.value);
    });
    document.getElementById('waBtn')?.addEventListener('click', function() {
      const text = _buildText(info, filled, events, syn);
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    });
    document.getElementById('copyBtn')?.addEventListener('click', async function() {
      const text = _buildText(info, filled, events, syn);
      try { await navigator.clipboard.writeText(text); UI.toast('הועתק', 'success'); }
      catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  return { render: render };
})();
