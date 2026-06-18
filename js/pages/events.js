// Events / obligations page

const PAGE_EVENTS = (function() {
  const MONTHS = ['ניסן','אייר','סיון','תמוז','אב','אלול','תשרי','חשוון','כסלו','טבת','שבט','אדר','אדר_א','אדר_ב'];

  async function render(el) {
    el.innerHTML = '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
      '<h3 class="mb-0"><i class="bi bi-calendar-event"></i> אירועים וחיובים</h3>' +
      '<button class="btn btn-primary" id="addEvBtn"><i class="bi bi-plus-lg"></i> הוסף אירוע</button>' +
      '</div>' +
      '<div class="card"><div class="card-body"><div id="evList">' + UI.skeleton(200) + '</div></div></div>';
    document.getElementById('addEvBtn').addEventListener('click', function() { openAdd(); });
    await _load();
  }

  async function _load() {
    const synId = STATE.get('currentSynagogueId');
    try {
      const [events, members] = await Promise.all([
        API.read('listEvents', { synagogue_id: synId }, { forceFresh: true }),
        API.read('listMembers', { synagogue_id: synId })
      ]);
      const memMap = {};
      (members || []).forEach(function(m) { memMap[m.id] = m; });
      const listEl = document.getElementById('evList');
      if (!events || !events.length) { listEl.innerHTML = UI.emptyState('אין אירועים. הוסף את הראשון!'); return; }
      listEl.innerHTML = '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
        '<thead><tr><th>מתפלל</th><th>סוג</th><th>תאריך עברי</th><th>שבת רלוונטית</th><th>סטטוס</th><th></th></tr></thead><tbody>' +
        events.map(function(e) {
          const m = memMap[e.member_id] || {};
          const statusBadge = e.status === 'done' ? 'bg-success' : e.status === 'cancelled' ? 'bg-secondary' : 'bg-warning text-dark';
          const statusLabel = { done: 'טופל', cancelled: 'בוטל', pending: 'ממתין' }[e.status] || e.status;
          return '<tr>' +
            '<td>' + UTIL.avatarHtml(m, 'avatar-sm') + ' ' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</td>' +
            '<td><b>' + UTIL.escHtml(e.type) + '</b></td>' +
            '<td>' + UTIL.escHtml(e.hebrew_day || '') + ' ב' + UTIL.escHtml(e.hebrew_month || '') + (e.recurring ? ' <small class="text-muted">(חוזר)</small>' : '') + '</td>' +
            '<td>' + (e.relevant_shabbat ? UTIL.fmtDate(e.relevant_shabbat) : '—') + '</td>' +
            '<td><span class="badge ' + statusBadge + '">' + statusLabel + '</span></td>' +
            '<td><button class="btn btn-sm btn-outline-danger" data-del="' + UTIL.escAttr(e.id) + '"><i class="bi bi-trash"></i></button></td>' +
            '</tr>';
        }).join('') + '</tbody></table></div>';
      listEl.querySelectorAll('[data-del]').forEach(function(b) {
        b.addEventListener('click', async function() {
          const ok = await UI.confirm('למחוק אירוע?');
          if (!ok) return;
          try {
            await API.write('deleteEvent', { id: b.dataset.del });
            UI.toast('נמחק', 'info');
            await _load();
          } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
        });
      });
    } catch (e) {
      document.getElementById('evList').innerHTML = UI.errorState('שגיאה: ' + e.message, _load);
    }
  }

  async function openAdd(memberId) {
    let types = [];
    let members = [];
    try {
      [types, members] = await Promise.all([
        API.read('eventTypes', {}),
        API.read('listMembers', { synagogue_id: STATE.get('currentSynagogueId') })
      ]);
    } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); return; }

    const memOpts = (members || []).map(function(m) {
      const sel = m.id === memberId ? 'selected' : '';
      return '<option value="' + UTIL.escAttr(m.id) + '" ' + sel + '>' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</option>';
    }).join('');
    const typeOpts = (types || []).map(function(t) { return '<option value="' + UTIL.escAttr(t) + '">' + UTIL.escHtml(t.replace(/_/g, ' ')) + '</option>'; }).join('');
    const monthOpts = MONTHS.map(function(m) { return '<option value="' + UTIL.escAttr(m) + '">' + UTIL.escHtml(m.replace('_', ' ')) + '</option>'; }).join('');

    const body = '<form id="evForm" novalidate><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">מתפלל *</label><select class="form-select" name="member_id" required>' + memOpts + '</select></div>' +
      '<div class="col-md-6"><label class="form-label">סוג אירוע *</label><select class="form-select" name="type" required>' + typeOpts + '</select></div>' +
      '<div class="col-md-3"><label class="form-label">יום בחודש</label><input class="form-control" type="number" min="1" max="30" name="hebrew_day"></div>' +
      '<div class="col-md-5"><label class="form-label">חודש עברי</label><select class="form-select" name="hebrew_month">' + monthOpts + '</select></div>' +
      '<div class="col-md-4"><label class="form-label">חוזר כל שנה</label><select class="form-select" name="recurring">' +
      '<option value="true">כן</option><option value="false">לא</option></select></div>' +
      '<div class="col-12"><label class="form-label">הערה</label><input class="form-control" name="notes" placeholder="לדוגמה: יארצייט אבא"></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
      '<button class="btn btn-primary" id="saveEvBtn">שמור</button>';
    UI.modal('הוסף אירוע / חיוב', body, footer);
    document.getElementById('saveEvBtn').addEventListener('click', _save);
  }

  async function _save() {
    const data = UTIL.formData(document.getElementById('evForm'));
    data.synagogue_id = STATE.get('currentSynagogueId');
    data.recurring = data.recurring === 'true' || data.recurring === true;
    if (!data.member_id) { UI.toast('בחר מתפלל', 'warning'); return; }
    try {
      await API.write('addEvent', data);
      UI.toast('נוסף', 'success');
      UI.closeModal();
      if (STATE.get('page') === 'events') await _load();
    } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
  }

  return { render: render, openAdd: openAdd };
})();
