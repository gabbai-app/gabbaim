// Settings page

const PAGE_SETTINGS = (function() {
  async function render(el) {
    el.innerHTML = UI.skeleton(300);
    try {
      const [syns, gabs] = await Promise.all([
        API.read('listSynagogues', {}, { forceFresh: true }),
        API.read('listGabbais', {}, { forceFresh: true })
      ]);
      el.innerHTML = _build(syns, gabs);
      _wire();
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el); });
    }
  }

  function _build(syns, gabs) {
    let html = '<h3 class="mb-3"><i class="bi bi-gear"></i> הגדרות</h3>';

    html += '<div class="card mb-3"><div class="card-header d-flex justify-content-between align-items-center">' +
      '<span><i class="bi bi-buildings"></i> בתי כנסת</span>' +
      '<button class="btn btn-sm btn-primary" id="addSynBtn"><i class="bi bi-plus-lg"></i> הוסף</button>' +
      '</div><div class="card-body">';
    if (syns.length) {
      html += '<ul class="list-group">';
      syns.forEach(function(s) {
        html += '<li class="list-group-item d-flex justify-content-between align-items-center">' +
          '<div><b>' + UTIL.escHtml(s.name) + '</b> <small class="text-muted">' + UTIL.escHtml(s.address || '') + ' · ' + UTIL.escHtml(s.nusach || '') + '</small></div>' +
          '<button class="btn btn-sm btn-outline-secondary" data-edit-syn="' + UTIL.escAttr(s.id) + '"><i class="bi bi-pencil"></i></button>' +
          '</li>';
      });
      html += '</ul>';
    } else {
      html += UI.emptyState('אין בתי כנסת');
    }
    html += '</div></div>';

    html += '<div class="card mb-3"><div class="card-header d-flex justify-content-between align-items-center">' +
      '<span><i class="bi bi-person-badge"></i> גבאים</span>' +
      '<button class="btn btn-sm btn-primary" id="addGabBtn"><i class="bi bi-plus-lg"></i> הוסף גבאי</button>' +
      '</div><div class="card-body">';
    if (gabs.length) {
      html += '<ul class="list-group">';
      gabs.forEach(function(g) {
        const syn = (syns.find(function(s) { return s.id === g.synagogue_id; }) || {}).name || '';
        const roleLabels = { super_admin: 'מנהל על', chief: 'גבאי ראשי', secondary: 'גבאי משני' };
        html += '<li class="list-group-item d-flex justify-content-between align-items-center">' +
          '<div><b>' + UTIL.escHtml(g.name) + '</b><br>' +
          '<small class="text-muted">קוד: <code>' + UTIL.escHtml(g.pin_code) + '</code> · ' + UTIL.escHtml(roleLabels[g.role] || g.role) + ' · ' + UTIL.escHtml(syn) + '</small></div>' +
          '</li>';
      });
      html += '</ul>';
    } else {
      html += UI.emptyState('אין גבאים');
    }
    html += '</div></div>';

    html += '<div class="card"><div class="card-body">' +
      '<h6><i class="bi bi-info-circle"></i> אודות</h6>' +
      '<p class="mb-1"><b>גרסה:</b> ' + CONFIG.VERSION + '</p>' +
      '<p class="mb-1"><b>API:</b> <code style="word-break:break-all;">' + UTIL.escHtml(CONFIG.API_URL) + '</code></p>' +
      '<p class="mb-2"><b>סטטוס:</b> <span id="onlineStatus">' + (API.isOnline() ? '<span class="text-success">מחובר</span>' : '<span class="text-danger">אופליין</span>') + '</span></p>' +
      '<button class="btn btn-outline-secondary btn-sm" id="clearCacheBtn"><i class="bi bi-trash"></i> נקה מטמון מקומי</button> ' +
      '<button class="btn btn-outline-info btn-sm" id="pingBtn"><i class="bi bi-arrow-clockwise"></i> בדוק חיבור</button>' +
      '</div></div>';
    return html;
  }

  function _wire() {
    document.getElementById('addSynBtn')?.addEventListener('click', _openAddSyn);
    document.getElementById('addGabBtn')?.addEventListener('click', _openAddGabbai);
    document.getElementById('clearCacheBtn')?.addEventListener('click', async function() {
      const ok = await UI.confirm('לנקות את כל המטמון המקומי? לא ימחק שום נתון מהשרת.');
      if (!ok) return;
      try {
        Object.keys(localStorage).filter(function(k) { return k.indexOf(CONFIG.CACHE_PREFIX) === 0; })
          .forEach(function(k) { localStorage.removeItem(k); });
        UI.toast('המטמון נוקה', 'success');
        ROUTER.refresh();
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
    document.getElementById('pingBtn')?.addEventListener('click', async function() {
      try {
        const r = await API.ping();
        UI.toast('שרת מגיב — ' + (r.title || 'OK'), 'success');
      } catch (e) {
        UI.toast('שרת לא מגיב: ' + e.message, 'danger');
      }
    });
  }

  function _openAddSyn() {
    const body = '<form id="synForm"><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם *</label><input class="form-control" name="name" required></div>' +
      '<div class="col-md-6"><label class="form-label">כתובת</label><input class="form-control" name="address"></div>' +
      '<div class="col-md-6"><label class="form-label">נוסח</label><select class="form-select" name="nusach"><option>ספרד</option><option>אשכנז</option><option>ספרדי</option><option>חב"ד</option><option>אחר</option></select></div>' +
      '<div class="col-12"><label class="form-label">הערות</label><textarea class="form-control" name="notes"></textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button><button class="btn btn-primary" id="sv">שמור</button>';
    UI.modal('הוסף בית כנסת', body, footer);
    document.getElementById('sv').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('synForm'));
      if (!data.name) { UI.toast('שם חובה', 'warning'); return; }
      try {
        await API.write('addSynagogue', data, { invalidate: ['listSynagogues'] });
        UI.toast('נוסף', 'success');
        UI.closeModal();
        await STATE.initSynagogues();
        render(document.getElementById('app'));
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  function _openAddGabbai() {
    const synOpts = (STATE.get('synagogues') || []).map(function(s) {
      return '<option value="' + UTIL.escAttr(s.id) + '">' + UTIL.escHtml(s.name) + '</option>';
    }).join('');
    const body = '<form id="gabForm" novalidate><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם *</label><input class="form-control" name="name" required></div>' +
      '<div class="col-md-6"><label class="form-label">טלפון</label><input class="form-control" name="phone" type="tel"></div>' +
      '<div class="col-md-6"><label class="form-label">קוד 4 ספרות *</label><input class="form-control" name="pin_code" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" required></div>' +
      '<div class="col-md-6"><label class="form-label">בית כנסת</label><select class="form-select" name="synagogue_id">' + synOpts + '</select></div>' +
      '<div class="col-12"><label class="form-label">תפקיד</label><select class="form-select" name="role">' +
      '<option value="secondary">גבאי משני</option>' +
      '<option value="chief">גבאי ראשי</option>' +
      '<option value="super_admin">מנהל על</option>' +
      '</select></div></div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button><button class="btn btn-primary" id="svG">שמור</button>';
    UI.modal('הוסף גבאי', body, footer);
    document.getElementById('svG').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('gabForm'));
      if (!data.name || !/^\d{4}$/.test(data.pin_code)) { UI.toast('יש למלא שם וקוד 4 ספרות', 'warning'); return; }
      data.status = 'active';
      try {
        await API.write('addGabbai', data, { invalidate: ['listGabbais'] });
        UI.toast('נוסף', 'success');
        UI.closeModal();
        render(document.getElementById('app'));
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  return { render: render };
})();
