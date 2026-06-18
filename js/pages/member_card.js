// Member card — profile + history

const PAGE_MEMBER_CARD = (function() {
  let _memberId = null;
  let _member = null;

  async function render(el, id) {
    if (!id) { el.innerHTML = '<a href="#/members" class="btn btn-link">← מתפללים</a>'; return; }
    _memberId = id;
    el.innerHTML = UI.skeleton(200);
    try {
      const [m, stats] = await Promise.all([
        API.read('getMember', { id: id }, { forceFresh: true }),
        API.read('memberStats', { id: id }, { forceFresh: true })
      ]);
      if (!m) { el.innerHTML = '<p>מתפלל לא נמצא</p><a href="#/members" class="btn btn-link">← חזרה</a>'; return; }
      _member = m;
      el.innerHTML = _build(m, stats);
      _wire();
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el, id); });
    }
  }

  function _build(m, stats) {
    const name = (m.first_name || '') + ' ' + (m.last_name || '');
    let html = '';
    html += '<a href="#/members" class="btn btn-link mb-2"><i class="bi bi-arrow-right"></i> חזרה</a>';
    html += '<div class="card mb-3"><div class="card-body">';
    html += '<div class="d-flex align-items-center gap-3 flex-wrap">';
    html += UTIL.avatarHtml(m, 'avatar-lg');
    html += '<div class="flex-grow-1">';
    html += '<h3 class="mb-1">' + UTIL.escHtml(name) + '</h3>';
    html += '<div class="text-muted">';
    if (m.father_name) html += 'בן ' + UTIL.escHtml(m.father_name) + ' · ';
    html += UTIL.tribeBadge(m.tribe);
    if (m.phone) html += ' · <i class="bi bi-telephone"></i> <a href="tel:' + UTIL.escAttr(m.phone) + '">' + UTIL.escHtml(m.phone) + '</a>';
    html += '</div></div>';
    html += '<div class="btn-group">';
    html += '<button class="btn btn-outline-primary" id="editBtn"><i class="bi bi-pencil"></i> ערוך</button>';
    html += '<button class="btn btn-outline-success" id="addEvtBtn"><i class="bi bi-calendar-plus"></i> אירוע</button>';
    html += '</div></div></div></div>';

    html += '<div class="row g-3 mb-3">';
    html += UI.statCard('סך עליות', stats.total || 0, 'bi-book', 'stat-card');
    html += UI.statCard('30 יום', stats.last_30 || 0, 'bi-calendar-week', 'stat-card-green');
    html += UI.statCard('90 יום', stats.last_90 || 0, 'bi-calendar-month', 'stat-card-purple');
    html += UI.statCard('שנה', stats.last_year || 0, 'bi-calendar', 'stat-card-orange');
    html += '</div>';

    html += '<div class="card"><div class="card-header">היסטוריית עליות</div><div class="card-body">';
    if (stats.recent && stats.recent.length) {
      html += '<div class="table-responsive"><table class="table table-hover mb-0">';
      html += '<thead><tr><th>תאריך</th><th>עלייה</th><th>סיבה</th><th>הערה</th></tr></thead><tbody>';
      stats.recent.forEach(function(a) {
        html += '<tr>' +
          '<td>' + UTIL.fmtDate(a.date) + '</td>' +
          '<td><b>' + UTIL.escHtml(a.aliyah_name || '') + '</b></td>' +
          '<td>' + UTIL.escHtml(a.reason || '') + '</td>' +
          '<td><small>' + UTIL.escHtml(a.notes || '') + '</small></td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';
    } else {
      html += UI.emptyState('עוד לא הייתה עלייה');
    }
    html += '</div></div>';
    return html;
  }

  function _wire() {
    document.getElementById('editBtn')?.addEventListener('click', _openEdit);
    document.getElementById('addEvtBtn')?.addEventListener('click', function() {
      PAGE_EVENTS.openAdd(_memberId);
    });
  }

  function _openEdit() {
    const m = _member;
    const tribeOpts = ['ישראל', 'כהן', 'לוי'].map(function(t) {
      return '<option ' + (t === m.tribe ? 'selected' : '') + '>' + t + '</option>';
    }).join('');
    const statusOpts = ['active', 'inactive', 'deceased'].map(function(s) {
      const labels = { active: 'פעיל', inactive: 'לא פעיל', deceased: 'נפטר' };
      return '<option value="' + s + '" ' + (s === m.status ? 'selected' : '') + '>' + labels[s] + '</option>';
    }).join('');
    const body = '<form id="memEdit"><input type="hidden" name="id" value="' + UTIL.escAttr(m.id) + '"><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם פרטי</label><input class="form-control" name="first_name" value="' + UTIL.escAttr(m.first_name) + '"></div>' +
      '<div class="col-md-6"><label class="form-label">שם משפחה</label><input class="form-control" name="last_name" value="' + UTIL.escAttr(m.last_name || '') + '"></div>' +
      '<div class="col-md-6"><label class="form-label">שם האב</label><input class="form-control" name="father_name" value="' + UTIL.escAttr(m.father_name || '') + '"></div>' +
      '<div class="col-md-6"><label class="form-label">שבט</label><select class="form-select" name="tribe">' + tribeOpts + '</select></div>' +
      '<div class="col-md-6"><label class="form-label">טלפון</label><input class="form-control" name="phone" type="tel" value="' + UTIL.escAttr(m.phone || '') + '"></div>' +
      '<div class="col-md-6"><label class="form-label">סטטוס</label><select class="form-select" name="status">' + statusOpts + '</select></div>' +
      '<div class="col-12"><label class="form-label">הערות</label><textarea class="form-control" name="notes" rows="2">' + UTIL.escHtml(m.notes || '') + '</textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-danger me-auto" id="delBtn">מחק</button>' +
      '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
      '<button class="btn btn-primary" id="saveBtn">שמור</button>';
    UI.modal('ערוך מתפלל', body, footer);
    document.getElementById('saveBtn').addEventListener('click', _save);
    document.getElementById('delBtn').addEventListener('click', _delete);
  }

  async function _save() {
    const data = UTIL.formData(document.getElementById('memEdit'));
    try {
      await API.write('updateMember', data);
      UI.toast('עודכן', 'success');
      UI.closeModal();
      render(document.getElementById('app'), _memberId);
    } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
  }

  async function _delete() {
    const ok = await UI.confirm('למחוק מתפלל זה לצמיתות? היסטוריית עליותיו תישאר.');
    if (!ok) return;
    try {
      await API.write('deleteMember', { id: _memberId });
      UI.toast('נמחק', 'info');
      ROUTER.navigate('/members');
    } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
  }

  return { render: render };
})();
