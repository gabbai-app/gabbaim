// Audit log viewer — admin oversight
// Shows: timeline of every write operation with actor + summary
// Filters by gabbai, entity type, date range
// Plus per-gabbai activity stats

const PAGE_AUDIT = (function() {
  let _filters = { actor: '', entity: '', from: '', to: '' };

  async function render(el) {
    if (!AUTH.isSuperAdmin()) {
      el.innerHTML = UI.errorState('הדף זמין למנהל על בלבד.');
      return;
    }
    const entries = (DB.list('audit') || []).slice().reverse();   // newest first
    const gabs = DB.list('gabbais');
    el.innerHTML = _shell(entries, gabs);
    _wire(entries);
  }

  function _shell(entries, gabs) {
    let html = '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
      '<h3 class="mb-0"><i class="bi bi-shield-lock"></i> יומן פעילות</h3>' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<button class="btn btn-outline-secondary" id="auExport"><i class="bi bi-download"></i> ייצוא</button>' +
      '<button class="btn btn-outline-danger" id="auClear"><i class="bi bi-trash"></i> נקה היסטוריה</button>' +
      '</div></div>';

    // Stats by gabbai
    const byActor = {};
    entries.forEach(function(e) { byActor[e.actor || 'anon'] = (byActor[e.actor || 'anon'] || 0) + 1; });
    const top = Object.entries(byActor).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 4);
    html += '<div class="row g-3 mb-3">';
    top.forEach(function(t, i) {
      const colors = ['stat-card', 'stat-card-green', 'stat-card-purple', 'stat-card-orange'];
      html += UI.statCard(t[0], t[1], 'bi-person', colors[i] || 'stat-card');
    });
    if (!top.length) html += UI.statCard('סך פעולות', 0, 'bi-clipboard-check', 'stat-card');
    html += '</div>';

    // Filters
    const entities = Array.from(new Set(entries.map(function(e) { return e.entity || ''; }))).filter(Boolean);
    const actors = Array.from(new Set(entries.map(function(e) { return e.actor || ''; }))).filter(Boolean);
    html += '<div class="card mb-3"><div class="card-body"><div class="row g-2">' +
      '<div class="col-md-3"><select class="form-select" id="flActor"><option value="">כל הגבאים</option>' +
      actors.map(function(a) { return '<option value="' + UTIL.escAttr(a) + '">' + UTIL.escHtml(a) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="col-md-3"><select class="form-select" id="flEntity"><option value="">כל הסוגים</option>' +
      entities.map(function(e) { return '<option value="' + UTIL.escAttr(e) + '">' + UTIL.escHtml(e) + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="col-md-3"><input type="date" id="flFrom" class="form-control" placeholder="מתאריך"></div>' +
      '<div class="col-md-3"><input type="date" id="flTo" class="form-control" placeholder="עד תאריך"></div>' +
      '</div></div></div>';

    html += '<div class="card"><div class="card-body p-2" id="auList">' + _list(entries) + '</div></div>';
    return html;
  }

  function _list(entries) {
    if (!entries.length) return UI.emptyState('אין פעולות עדיין');
    return '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
      '<thead><tr><th>זמן</th><th>גבאי</th><th>פעולה</th><th>סוג</th><th>פירוט</th></tr></thead><tbody>' +
      entries.slice(0, 500).map(function(e) {
        const d = e.ts ? new Date(e.ts) : null;
        const timeStr = d ? d.toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '—';
        return '<tr>' +
          '<td><small class="text-muted">' + UTIL.escHtml(timeStr) + '</small></td>' +
          '<td><b>' + UTIL.escHtml(e.actor || '—') + '</b></td>' +
          '<td><code class="small">' + UTIL.escHtml(e.action || '') + '</code></td>' +
          '<td><span class="badge bg-light text-dark">' + UTIL.escHtml(e.entity || '') + '</span></td>' +
          '<td>' + UTIL.escHtml(e.summary || '') + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table></div>' +
      (entries.length > 500 ? '<div class="text-muted small p-2">מציג 500 אחרונים מתוך ' + entries.length + '</div>' : '');
  }

  function _applyFilters(entries) {
    return entries.filter(function(e) {
      if (_filters.actor && e.actor !== _filters.actor) return false;
      if (_filters.entity && e.entity !== _filters.entity) return false;
      if (_filters.from && (e.ts || '') < _filters.from) return false;
      if (_filters.to && (e.ts || '') > (_filters.to + 'T23:59:59')) return false;
      return true;
    });
  }

  function _wire(entries) {
    function refilter() {
      document.getElementById('auList').innerHTML = _list(_applyFilters(entries));
    }
    ['flActor', 'flEntity', 'flFrom', 'flTo'].forEach(function(id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function() {
        _filters = {
          actor: document.getElementById('flActor').value,
          entity: document.getElementById('flEntity').value,
          from: document.getElementById('flFrom').value,
          to: document.getElementById('flTo').value
        };
        refilter();
      });
    });

    document.getElementById('auExport')?.addEventListener('click', function() {
      try {
        const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_' + new Date().toISOString().substring(0, 10) + '.json';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        UI.toast('יצא', 'success');
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });

    document.getElementById('auClear')?.addEventListener('click', async function() {
      const ok = await UI.confirm('למחוק את כל יומן הפעילות? פעולה זו לא הפיכה.');
      if (!ok) return;
      const ok2 = await UI.confirm('בטוח? כל ההיסטוריה תאבד.');
      if (!ok2) return;
      const raw = DB.getRaw();
      raw.audit = [];
      DB.setRaw(raw);
      UI.toast('נמחק', 'info');
      render(document.getElementById('app'));
    });
  }

  return { render: render };
})();
