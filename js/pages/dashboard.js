// Dashboard page

const PAGE_DASHBOARD = (function() {
  async function render(el) {
    el.innerHTML = UI.skeleton(200);
    const synId = STATE.get('currentSynagogueId');
    if (!synId) {
      el.innerHTML = UI.emptyState('יש להגדיר תחילה בית כנסת בהגדרות.');
      return;
    }
    try {
      const d = await API.read('dashboardSummary', { synagogue_id: synId });
      el.innerHTML = _build(d);
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el); });
    }
  }

  function _build(d) {
    const hb = d.shabbat;
    const obs = d.obligations || [];
    const absent = d.long_absent_top || [];
    const recent = d.recent_aliyot || [];

    // Shabbat zmanim
    let zmanim = '';
    try {
      const t = CAL.shabbatTimes(hb.date);
      if (t.candleLighting || t.havdalah) {
        zmanim = '<div class="zmanim-bar mt-2 d-flex gap-3 flex-wrap">' +
          (t.candleLighting ? '<span><i class="bi bi-fire"></i> הדלקת נרות: <b>' + UTIL.escHtml(t.candleLighting) + '</b></span>' : '') +
          (t.havdalah ? '<span><i class="bi bi-stars"></i> צאת השבת: <b>' + UTIL.escHtml(t.havdalah) + '</b></span>' : '') +
          '<span class="text-white-50 small">· ' + UTIL.escHtml(CAL.MAALE_AMOS.name) + '</span>' +
          '</div>';
      }
    } catch (e) {}

    let html = '';
    html += '<div class="day-banner">';
    html += '<div class="d-flex align-items-center justify-content-between flex-wrap gap-3">';
    html += '<div>';
    html += '<div class="parsha-name">פרשת ' + UTIL.escHtml(hb.parsha || '—') + '</div>';
    html += '<div class="hebrew-date">' + UTIL.escHtml(hb.hebrew.display) + '</div>';
    html += '<div class="greg-date">' + UTIL.fmtDate(hb.date) + ' · ' + UTIL.escHtml(hb.day_of_week_name) + ' · ' + UTIL.escHtml(hb.aliyot_count) + ' עליות</div>';
    html += zmanim;
    html += '</div>';
    html += '<a href="#/live" class="btn btn-light btn-lg fw-bold"><i class="bi bi-lightning-fill"></i> פתח מצב חי</a>';
    html += '</div></div>';

    html += '<div class="row g-3 mb-3">';
    html += UI.statCard('חיובים השבת', obs.length, 'bi-calendar-event', 'stat-card');
    html += UI.statCard('מתפללים פעילים', d.members_total || 0, 'bi-people-fill', 'stat-card-green');
    html += UI.statCard('עליות 30 יום', d.aliyot_last_30 || 0, 'bi-book', 'stat-card-purple');
    html += UI.statCard('לא עלו 90+ יום', absent.length, 'bi-clock-history', 'stat-card-orange');
    html += '</div>';

    // Minhagim panel for the upcoming shabbat
    const minhagimList = (window.MINHAGIM && MINHAGIM.forDayInfo(hb)) || [];
    if (minhagimList.length) {
      html += '<div class="card mb-3"><div class="card-header bg-info text-white">' +
        '<i class="bi bi-info-circle"></i> מנהגי השבת הקרובה</div><div class="card-body">';
      minhagimList.forEach(function(m) {
        html += '<div class="mb-2"><b>' + UTIL.escHtml(m.name) + ':</b> ' + UTIL.escHtml(m.summary);
        if (m.links && m.links.length) {
          html += ' <span class="ms-2">';
          m.links.forEach(function(l) {
            html += '<a href="' + UTIL.escAttr(l.url) + '" target="_blank" class="badge bg-light text-info text-decoration-none me-1">' + UTIL.escHtml(l.label) + '</a>';
          });
          html += '</span>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    }

    html += '<div class="row g-3">';
    html += '<div class="col-lg-6"><div class="card"><div class="card-header"><i class="bi bi-exclamation-circle text-warning"></i> חיובים השבת (' + obs.length + ')</div><div class="card-body">';
    html += obs.length ? obs.map(_obsRow).join('') : UI.emptyState('אין חיובים השבוע');
    html += '</div></div></div>';

    html += '<div class="col-lg-6"><div class="card"><div class="card-header"><i class="bi bi-clock-history text-danger"></i> לא עלו זמן רב</div><div class="card-body">';
    html += absent.length ? absent.map(_absentRow).join('') : UI.emptyState('כולם עלו לאחרונה');
    html += '</div></div></div>';
    html += '</div>';

    html += '<div class="row g-3 mt-1"><div class="col-12"><div class="card"><div class="card-header"><i class="bi bi-list"></i> עליות אחרונות</div><div class="card-body">';
    if (recent.length) {
      html += '<div class="table-responsive"><table class="table table-hover align-middle mb-0">';
      html += '<thead><tr><th>תאריך</th><th>עלייה</th><th>מתפלל</th><th>סיבה</th></tr></thead><tbody>';
      html += recent.map(function(a) {
        const m = a._member || {};
        return '<tr>' +
          '<td>' + UTIL.fmtDate(a.date) + '</td>' +
          '<td><b>' + UTIL.escHtml(a.aliyah_name || '') + '</b></td>' +
          '<td>' + UTIL.avatarHtml(m, 'avatar-sm') + ' ' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</td>' +
          '<td><small class="text-muted">' + UTIL.escHtml(a.reason || '—') + '</small></td>' +
          '</tr>';
      }).join('');
      html += '</tbody></table></div>';
    } else {
      html += UI.emptyState('אין עליות רשומות עדיין');
    }
    html += '</div></div></div>';

    return html;
  }

  function _obsRow(e) {
    const m = e._member || {};
    return '<div class="member-row" style="background:#fffbe6;">' +
      UTIL.avatarHtml(m) +
      '<div class="info"><div class="name">' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</div>' +
      '<div class="meta">' + UTIL.escHtml(e.type) + ' · ' + UTIL.fmtDate(e._upcoming || e.relevant_shabbat || '') + '</div></div>' +
      UTIL.tribeBadge(m.tribe) + '</div>';
  }

  function _absentRow(m) {
    const lastDate = m.last_aliyah_date;
    const lastDisplay = (lastDate && lastDate !== 'מעולם לא') ? UTIL.fmtDate(lastDate) : 'מעולם לא';
    return '<div class="member-row" onclick="ROUTER.navigate(\'/member/' + UTIL.escAttr(m.id) + '\')">' +
      UTIL.avatarHtml(m) +
      '<div class="info"><div class="name">' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</div>' +
      '<div class="meta">עלייה אחרונה: ' + lastDisplay + '</div></div>' +
      UTIL.tribeBadge(m.tribe) + '</div>';
  }

  return { render: render };
})();
