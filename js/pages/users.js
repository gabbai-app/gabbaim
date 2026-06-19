// Users management page — super_admin only
// Add / edit / disable / reset password for gabbaim

const PAGE_USERS = (function() {
  let _users = [];

  async function render(el) {
    if (!AUTH.isSuperAdmin()) {
      el.innerHTML = UI.errorState('הדף זמין למנהל על בלבד.');
      return;
    }
    el.innerHTML = '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
      '<div><h3 class="mb-0"><i class="bi bi-shield-check"></i> ניהול משתמשים</h3>' +
      '<small class="text-muted">רק משתמשים שמופיעים כאן יכולים להיכנס לאתר.</small></div>' +
      '<button class="btn btn-primary" id="addUserBtn"><i class="bi bi-person-plus"></i> הוסף משתמש</button>' +
      '</div>' +
      '<div class="card"><div class="card-body p-0" id="usersList">' + UI.skeleton(300) + '</div></div>';
    document.getElementById('addUserBtn').addEventListener('click', _openAdd);
    await _load();
  }

  async function _load() {
    _users = await API.read('listGabbais', {}, { forceFresh: true });
    const syns = await API.read('listSynagogues', {});
    const synMap = {};
    syns.forEach(function(s) { synMap[s.id] = s.name; });
    const list = document.getElementById('usersList');
    if (!_users.length) { list.innerHTML = UI.emptyState('אין משתמשים — הוסף משתמש כדי שיוכלו להיכנס'); return; }
    list.innerHTML = '<div class="table-responsive"><table class="table table-hover align-middle mb-0">' +
      '<thead><tr><th>שם</th><th>תפקיד</th><th>בית כנסת</th><th>טלפון</th><th>סטטוס</th><th>כניסה אחרונה</th><th>סוג סיסמה</th><th></th></tr></thead><tbody>' +
      _users.map(function(g) { return _row(g, synMap); }).join('') +
      '</tbody></table></div>';
    _wire();
  }

  function _row(g, synMap) {
    const roleLabel = PERM.roleLabel(g.role);
    const statusBadge = g.status === 'inactive'
      ? '<span class="badge bg-secondary">חסום</span>'
      : '<span class="badge bg-success">פעיל</span>';
    const last = g.last_login ? UTIL.fmtDate(g.last_login) : '<span class="text-muted">מעולם</span>';
    const pwType = g.password_hash
      ? '<span class="badge bg-info">סיסמה</span>'
      : (g.pin_code ? '<span class="badge bg-secondary">PIN</span>' : '<span class="badge bg-warning text-dark">חסר</span>');
    const me = AUTH.actorId() === g.id;
    return '<tr>' +
      '<td><b>' + UTIL.escHtml(g.name) + '</b>' + (me ? ' <span class="badge bg-primary">אני</span>' : '') + '</td>' +
      '<td>' + UTIL.escHtml(roleLabel) + '</td>' +
      '<td><small>' + UTIL.escHtml(synMap[g.synagogue_id] || '') + '</small></td>' +
      '<td><small>' + UTIL.escHtml(g.phone || '') + '</small></td>' +
      '<td>' + statusBadge + '</td>' +
      '<td><small>' + last + '</small></td>' +
      '<td>' + pwType + '</td>' +
      '<td><div class="btn-group btn-group-sm">' +
      '<button class="btn btn-outline-primary" data-edit="' + UTIL.escAttr(g.id) + '" title="ערוך"><i class="bi bi-pencil"></i></button>' +
      '<button class="btn btn-outline-warning" data-reset="' + UTIL.escAttr(g.id) + '" title="אפס סיסמה"><i class="bi bi-key"></i></button>' +
      (g.status === 'inactive'
        ? '<button class="btn btn-outline-success" data-toggle="' + UTIL.escAttr(g.id) + '" title="הפעל"><i class="bi bi-check-lg"></i></button>'
        : '<button class="btn btn-outline-secondary" data-toggle="' + UTIL.escAttr(g.id) + '" title="חסום"><i class="bi bi-slash-circle"></i></button>') +
      (me ? '' : '<button class="btn btn-outline-danger" data-del="' + UTIL.escAttr(g.id) + '" title="מחק"><i class="bi bi-trash"></i></button>') +
      '</div></td></tr>';
  }

  function _wire() {
    document.querySelectorAll('[data-edit]').forEach(function(b) {
      b.addEventListener('click', function() { _openEdit(b.dataset.edit); });
    });
    document.querySelectorAll('[data-reset]').forEach(function(b) {
      b.addEventListener('click', function() { _openResetPassword(b.dataset.reset); });
    });
    document.querySelectorAll('[data-toggle]').forEach(function(b) {
      b.addEventListener('click', async function() {
        const g = _users.find(function(x) { return x.id === b.dataset.toggle; });
        if (!g) return;
        const newStatus = g.status === 'inactive' ? 'active' : 'inactive';
        const verb = newStatus === 'active' ? 'להפעיל' : 'לחסום';
        const ok = await UI.confirm(verb + ' את ' + g.name + '?');
        if (!ok) return;
        try {
          await DB.update('gabbais', g.id, { status: newStatus });
          DB.audit({ actor: AUTH.actorName(), actor_id: AUTH.actorId(), action: 'updateGabbai',
                     entity: 'gabbais', entity_id: g.id, summary: 'סטטוס → ' + newStatus });
          if (window.SYNC) SYNC.scheduleSync();
          UI.toast('עודכן', 'success');
          await _load();
        } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
      });
    });
    document.querySelectorAll('[data-del]').forEach(function(b) {
      b.addEventListener('click', async function() {
        const g = _users.find(function(x) { return x.id === b.dataset.del; });
        if (!g) return;
        const ok = await UI.confirm('למחוק את ' + g.name + ' לצמיתות?');
        if (!ok) return;
        try {
          await API.write('deleteGabbai', { id: g.id });
          UI.toast('נמחק', 'info');
          await _load();
        } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
      });
    });
  }

  function _openAdd() {
    const synOpts = (STATE.get('synagogues') || []).map(function(s) {
      return '<option value="' + UTIL.escAttr(s.id) + '">' + UTIL.escHtml(s.name) + '</option>';
    }).join('');
    const body = '<form id="userForm" novalidate><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם מלא *</label><input class="form-control" name="name" required></div>' +
      '<div class="col-md-6"><label class="form-label">טלפון</label><input class="form-control" name="phone" type="tel"></div>' +
      '<div class="col-md-6"><label class="form-label">סיסמה *</label><input class="form-control" type="password" name="password" required minlength="4" autocomplete="new-password"><small class="text-muted">לפחות 4 תווים</small></div>' +
      '<div class="col-md-6"><label class="form-label">בית כנסת</label><select class="form-select" name="synagogue_id">' + synOpts + '</select></div>' +
      '<div class="col-12"><label class="form-label">תפקיד</label><select class="form-select" name="role">' +
      '<option value="secondary">גבאי משני (רישום עליות בלבד)</option>' +
      '<option value="chief">גבאי ראשי (עורך מתפללים+אירועים)</option>' +
      '<option value="super_admin">מנהל על (הכל)</option>' +
      '</select></div></div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
      '<button class="btn btn-primary" id="svUserBtn">שמור</button>';
    UI.modal('הוסף משתמש', body, footer);
    document.getElementById('svUserBtn').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('userForm'));
      if (!data.name) { UI.toast('שם חובה', 'warning'); return; }
      if (!data.password || data.password.length < 4) { UI.toast('סיסמה של לפחות 4 תווים', 'warning'); return; }
      try {
        const password_hash = await AUTH.hashPassword(data.password);
        await API.write('addGabbai', {
          name: data.name,
          phone: data.phone || '',
          synagogue_id: data.synagogue_id,
          role: data.role,
          status: 'active',
          password_hash: password_hash,
          pin_code: ''
        });
        UI.toast('נוסף — הוא יכול עכשיו להיכנס', 'success');
        UI.closeModal();
        await _load();
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  function _openEdit(id) {
    const g = _users.find(function(x) { return x.id === id; });
    if (!g) return;
    const synOpts = (STATE.get('synagogues') || []).map(function(s) {
      const sel = s.id === g.synagogue_id ? 'selected' : '';
      return '<option value="' + UTIL.escAttr(s.id) + '" ' + sel + '>' + UTIL.escHtml(s.name) + '</option>';
    }).join('');
    const roleOpts = ['secondary', 'chief', 'super_admin'].map(function(r) {
      const sel = r === g.role ? 'selected' : '';
      return '<option value="' + r + '" ' + sel + '>' + PERM.roleLabel(r) + '</option>';
    }).join('');
    const body = '<form id="userForm"><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם</label><input class="form-control" name="name" value="' + UTIL.escAttr(g.name) + '"></div>' +
      '<div class="col-md-6"><label class="form-label">טלפון</label><input class="form-control" name="phone" value="' + UTIL.escAttr(g.phone || '') + '" type="tel"></div>' +
      '<div class="col-md-6"><label class="form-label">בית כנסת</label><select class="form-select" name="synagogue_id">' + synOpts + '</select></div>' +
      '<div class="col-md-6"><label class="form-label">תפקיד</label><select class="form-select" name="role">' + roleOpts + '</select></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
      '<button class="btn btn-primary" id="svBtn">שמור</button>';
    UI.modal('ערוך משתמש', body, footer);
    document.getElementById('svBtn').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('userForm'));
      try {
        await DB.update('gabbais', g.id, data);
        DB.audit({ actor: AUTH.actorName(), actor_id: AUTH.actorId(), action: 'updateGabbai',
                   entity: 'gabbais', entity_id: g.id, summary: 'עודכן: ' + data.name });
        if (window.SYNC) SYNC.scheduleSync();
        UI.toast('עודכן', 'success');
        UI.closeModal();
        await _load();
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  function _openResetPassword(id) {
    const g = _users.find(function(x) { return x.id === id; });
    if (!g) return;
    const body = '<form id="rpForm"><p class="text-muted small">אפס סיסמה ל-<b>' + UTIL.escHtml(g.name) + '</b></p>' +
      '<div class="mb-3"><label class="form-label">סיסמה חדשה *</label>' +
      '<input class="form-control" type="password" name="password" required minlength="4" autocomplete="new-password" autofocus></div>' +
      '<div class="mb-2"><label class="form-label">אישור סיסמה</label>' +
      '<input class="form-control" type="password" name="password2" required></div>' +
      '</form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button>' +
      '<button class="btn btn-warning" id="rpSave">אפס</button>';
    UI.modal('איפוס סיסמה', body, footer);
    document.getElementById('rpSave').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('rpForm'));
      if (!data.password || data.password.length < 4) { UI.toast('סיסמה של לפחות 4 תווים', 'warning'); return; }
      if (data.password !== data.password2) { UI.toast('הסיסמאות לא תואמות', 'warning'); return; }
      try {
        const password_hash = await AUTH.hashPassword(data.password);
        await DB.update('gabbais', g.id, { password_hash: password_hash, pin_code: '' });
        DB.audit({ actor: AUTH.actorName(), actor_id: AUTH.actorId(), action: 'resetPassword',
                   entity: 'gabbais', entity_id: g.id, summary: 'איפוס סיסמה: ' + g.name });
        if (window.SYNC) SYNC.scheduleSync();
        UI.toast('הסיסמה אופסה', 'success');
        UI.closeModal();
        await _load();
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  return { render: render };
})();
