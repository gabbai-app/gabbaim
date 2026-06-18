// Reports page

const PAGE_REPORTS = (function() {
  const TABS = [
    { id: 'rotation', label: 'רוטציה' },
    { id: 'fairness', label: 'חלוקה' },
    { id: 'absent',   label: 'לא עלו 90+ יום' },
    { id: 'tribes',   label: 'שבטים' },
    { id: 'obligations', label: 'חיובים פתוחים' }
  ];
  let _activeTab = 'rotation';

  async function render(el) {
    let html = '<h3 class="mb-3"><i class="bi bi-graph-up"></i> דוחות</h3>';
    html += '<ul class="nav nav-pills mb-3 flex-wrap" id="reportTabs">';
    TABS.forEach(function(t) {
      html += '<li class="nav-item"><a class="nav-link ' + (t.id === _activeTab ? 'active' : '') + '" href="#" data-tab="' + t.id + '">' + UTIL.escHtml(t.label) + '</a></li>';
    });
    html += '</ul><div class="card"><div class="card-body" id="reportBody">' + UI.skeleton(300) + '</div></div>';
    el.innerHTML = html;
    document.querySelectorAll('#reportTabs [data-tab]').forEach(function(a) {
      a.addEventListener('click', function(ev) {
        ev.preventDefault();
        _activeTab = a.dataset.tab;
        document.querySelectorAll('#reportTabs .nav-link').forEach(function(x) { x.classList.remove('active'); });
        a.classList.add('active');
        _loadActive();
      });
    });
    await _loadActive();
  }

  async function _loadActive() {
    const body = document.getElementById('reportBody');
    body.innerHTML = UI.skeleton(250);
    const synId = STATE.get('currentSynagogueId');
    try {
      if (_activeTab === 'rotation') {
        const rows = await API.read('reportRotation', { synagogue_id: synId }, { forceFresh: true });
        body.innerHTML = _tableRotation(rows);
      } else if (_activeTab === 'fairness') {
        const d = await API.read('reportFairness', { synagogue_id: synId, months: 6 }, { forceFresh: true });
        body.innerHTML = _tableFairness(d.members || []);
      } else if (_activeTab === 'absent') {
        const rows = await API.read('reportLongAbsent', { synagogue_id: synId, days: 90 }, { forceFresh: true });
        body.innerHTML = _tableAbsent(rows);
      } else if (_activeTab === 'tribes') {
        const d = await API.read('reportTribes', { synagogue_id: synId });
        body.innerHTML = _tribesView(d);
      } else if (_activeTab === 'obligations') {
        const [rows, members] = await Promise.all([
          API.read('reportOpenObligations', { synagogue_id: synId }, { forceFresh: true }),
          API.read('listMembers', { synagogue_id: synId })
        ]);
        body.innerHTML = _tableObligations(rows, members || []);
      }
    } catch (e) {
      body.innerHTML = UI.errorState('שגיאה: ' + e.message, _loadActive);
    }
  }

  function _tableRotation(rows) {
    if (!rows || !rows.length) return UI.emptyState('אין נתונים');
    return '<p class="text-muted">ממוין לפי הזמן הארוך ביותר מאז העלייה האחרונה</p>' +
      '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
      '<thead><tr><th>#</th><th>מתפלל</th><th>שבט</th><th>עלייה אחרונה</th><th>זמן שעבר</th></tr></thead><tbody>' +
      rows.slice(0, 100).map(function(m, i) {
        return '<tr onclick="ROUTER.navigate(\'/member/' + UTIL.escAttr(m.id) + '\')" style="cursor:pointer;">' +
          '<td>' + (i + 1) + '</td>' +
          '<td>' + UTIL.avatarHtml(m, 'avatar-sm') + ' ' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</td>' +
          '<td>' + UTIL.tribeBadge(m.tribe) + '</td>' +
          '<td>' + (m.last_aliyah_date && m.last_aliyah_date !== '—' ? UTIL.fmtDate(m.last_aliyah_date) : '<span class="text-danger">מעולם לא</span>') + '</td>' +
          '<td><b>' + UTIL.daysSince(m.last_aliyah_date) + '</b></td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function _tableFairness(rows) {
    if (!rows.length) return UI.emptyState('אין נתונים');
    return '<p class="text-muted">חצי שנה אחורה</p>' +
      '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
      '<thead><tr><th>#</th><th>מתפלל</th><th>שבט</th><th>עליות</th></tr></thead><tbody>' +
      rows.slice(0, 100).map(function(m, i) {
        return '<tr onclick="ROUTER.navigate(\'/member/' + UTIL.escAttr(m.id) + '\')" style="cursor:pointer;">' +
          '<td>' + (i + 1) + '</td>' +
          '<td>' + UTIL.avatarHtml(m, 'avatar-sm') + ' ' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</td>' +
          '<td>' + UTIL.tribeBadge(m.tribe) + '</td>' +
          '<td><b>' + (m.count || 0) + '</b></td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function _tableAbsent(rows) {
    if (!rows.length) return UI.emptyState('אין מתפללים שלא עלו 90+ יום');
    return '<p class="text-muted">' + rows.length + ' מתפללים</p>' +
      '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
      '<thead><tr><th>#</th><th>מתפלל</th><th>שבט</th><th>עלייה אחרונה</th></tr></thead><tbody>' +
      rows.map(function(m, i) {
        return '<tr onclick="ROUTER.navigate(\'/member/' + UTIL.escAttr(m.id) + '\')" style="cursor:pointer;">' +
          '<td>' + (i + 1) + '</td>' +
          '<td>' + UTIL.avatarHtml(m, 'avatar-sm') + ' ' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</td>' +
          '<td>' + UTIL.tribeBadge(m.tribe) + '</td>' +
          '<td>' + (m.last_aliyah_date === 'מעולם לא' ? '<b class="text-danger">מעולם לא</b>' : UTIL.fmtDate(m.last_aliyah_date)) + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function _tribesView(d) {
    let html = '<div class="row g-3 mb-3">';
    html += UI.statCard('כהנים', d.counts.cohen, 'bi-star', 'stat-card');
    html += UI.statCard('לויים', d.counts.levi, 'bi-star-half', 'stat-card-purple');
    html += UI.statCard('ישראל', d.counts.israel, 'bi-people', 'stat-card-green');
    html += '</div>';
    [['cohen', 'כהנים', d.cohen], ['levi', 'לויים', d.levi], ['israel', 'ישראל', d.israel]].forEach(function(g) {
      const arr = g[2] || [];
      html += '<h6 class="mt-3">' + g[1] + ' (' + arr.length + ')</h6>';
      html += '<div class="d-flex flex-wrap gap-1">';
      html += arr.map(function(m) {
        return '<a href="#/member/' + UTIL.escAttr(m.id) + '" class="badge bg-light text-dark text-decoration-none p-2">' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</a>';
      }).join('');
      html += '</div>';
    });
    return html;
  }

  function _tableObligations(rows, members) {
    if (!rows.length) return UI.emptyState('אין חיובים פתוחים');
    const memMap = {};
    members.forEach(function(m) { memMap[m.id] = m; });
    return '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
      '<thead><tr><th>מתפלל</th><th>סוג</th><th>תאריך</th><th>סטטוס</th></tr></thead><tbody>' +
      rows.map(function(e) {
        const m = memMap[e.member_id] || {};
        return '<tr>' +
          '<td>' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</td>' +
          '<td><b>' + UTIL.escHtml(e.type) + '</b></td>' +
          '<td>' + UTIL.escHtml(e.hebrew_day || '') + ' ב' + UTIL.escHtml(e.hebrew_month || '') + '</td>' +
          '<td><span class="badge bg-warning text-dark">' + e.status + '</span></td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  return { render: render };
})();
