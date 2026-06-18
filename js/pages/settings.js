// Settings page — local-only data management + export/import

const PAGE_SETTINGS = (function() {
  async function render(el) {
    el.innerHTML = UI.skeleton(300);
    try {
      const [syns, gabs] = await Promise.all([
        API.read('listSynagogues', {}),
        API.read('listGabbais', {})
      ]);
      el.innerHTML = _build(syns, gabs, DB.stats());
      _wire();
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el); });
    }
  }

  function _build(syns, gabs, stats) {
    let html = '<h3 class="mb-3"><i class="bi bi-gear"></i> הגדרות</h3>';

    // Synagogues
    html += '<div class="card mb-3"><div class="card-header d-flex justify-content-between align-items-center">' +
      '<span><i class="bi bi-buildings"></i> בתי כנסת</span>' +
      '<button class="btn btn-sm btn-primary" id="addSynBtn"><i class="bi bi-plus-lg"></i> הוסף</button>' +
      '</div><div class="card-body">';
    if (syns.length) {
      html += '<ul class="list-group">';
      syns.forEach(function(s) {
        html += '<li class="list-group-item d-flex justify-content-between align-items-center">' +
          '<div><b>' + UTIL.escHtml(s.name) + '</b> <small class="text-muted">' + UTIL.escHtml(s.address || '') + ' · ' + UTIL.escHtml(s.nusach || '') + '</small></div>' +
          '<div class="btn-group btn-group-sm">' +
          '<button class="btn btn-outline-secondary" data-edit-syn="' + UTIL.escAttr(s.id) + '"><i class="bi bi-pencil"></i></button>' +
          '<button class="btn btn-outline-danger" data-del-syn="' + UTIL.escAttr(s.id) + '"><i class="bi bi-trash"></i></button>' +
          '</div></li>';
      });
      html += '</ul>';
    } else { html += UI.emptyState('אין בתי כנסת'); }
    html += '</div></div>';

    // Gabbais
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
          '<button class="btn btn-sm btn-outline-danger" data-del-gab="' + UTIL.escAttr(g.id) + '"><i class="bi bi-trash"></i></button>' +
          '</li>';
      });
      html += '</ul>';
    } else { html += UI.emptyState('אין גבאים'); }
    html += '</div></div>';

    // Backup / Restore
    html += '<div class="card mb-3"><div class="card-header"><i class="bi bi-cloud-arrow-down"></i> גיבוי והעברת נתונים</div><div class="card-body">' +
      '<p class="text-muted small mb-3">הנתונים שמורים במכשיר הזה בלבד. כדי להעביר למכשיר אחר או לגבות — ייצא קובץ JSON, ובמכשיר השני ייבא אותו.</p>' +
      '<div class="d-flex flex-wrap gap-2">' +
      '<button class="btn btn-primary" id="exportBtn"><i class="bi bi-download"></i> ייצוא לקובץ</button>' +
      '<button class="btn btn-outline-primary" id="importBtn"><i class="bi bi-upload"></i> ייבוא מקובץ</button>' +
      '<button class="btn btn-outline-secondary" id="copyJsonBtn"><i class="bi bi-clipboard"></i> העתק JSON</button>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '</div>' +
      '</div></div>';

    // Stats / Danger zone
    html += '<div class="card mb-3"><div class="card-header"><i class="bi bi-info-circle"></i> מידע</div><div class="card-body">' +
      '<div class="row g-2 text-center small">' +
      '<div class="col"><div class="bg-light p-2 rounded"><b>' + stats.members + '</b><br>מתפללים</div></div>' +
      '<div class="col"><div class="bg-light p-2 rounded"><b>' + stats.aliyot + '</b><br>עליות</div></div>' +
      '<div class="col"><div class="bg-light p-2 rounded"><b>' + stats.events + '</b><br>אירועים</div></div>' +
      '<div class="col"><div class="bg-light p-2 rounded"><b>' + Math.round(stats.bytes / 1024) + 'KB</b><br>נפח</div></div>' +
      '</div>' +
      '<p class="mb-1 mt-3"><b>גרסה:</b> ' + CONFIG.VERSION + ' · עובד מקומי, ללא שרת</p>' +
      '</div></div>';

    // Danger zone
    html += '<div class="card border-danger"><div class="card-header bg-danger text-white"><i class="bi bi-exclamation-triangle"></i> אזור מסוכן</div><div class="card-body">' +
      '<p class="text-muted small">פעולות אלה לא הפיכות. ייצא תחילה גיבוי.</p>' +
      '<button class="btn btn-outline-danger" id="resetBtn"><i class="bi bi-trash3"></i> אפס הכל</button>' +
      '</div></div>';
    return html;
  }

  function _wire() {
    document.getElementById('addSynBtn')?.addEventListener('click', _openAddSyn);
    document.getElementById('addGabBtn')?.addEventListener('click', _openAddGabbai);
    document.getElementById('exportBtn')?.addEventListener('click', _exportFile);
    document.getElementById('copyJsonBtn')?.addEventListener('click', _copyJson);
    document.getElementById('importBtn')?.addEventListener('click', function() {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile')?.addEventListener('change', _importFile);
    document.getElementById('resetBtn')?.addEventListener('click', _resetAll);

    document.querySelectorAll('[data-edit-syn]').forEach(function(b) {
      b.addEventListener('click', function() { _openEditSyn(b.dataset.editSyn); });
    });
    document.querySelectorAll('[data-del-syn]').forEach(function(b) {
      b.addEventListener('click', async function() {
        const ok = await UI.confirm('למחוק בית כנסת זה? כל הנתונים המשויכים אליו יישארו אך לא יהיה אפשר לבחור בו.');
        if (!ok) return;
        try {
          await API.write('deleteSynagogue', { id: b.dataset.delSyn });
          await STATE.initSynagogues();
          UI.toast('נמחק', 'info');
          render(document.getElementById('app'));
        } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
      });
    });
    document.querySelectorAll('[data-del-gab]').forEach(function(b) {
      b.addEventListener('click', async function() {
        const ok = await UI.confirm('למחוק גבאי זה?');
        if (!ok) return;
        try {
          await API.write('deleteGabbai', { id: b.dataset.delGab });
          UI.toast('נמחק', 'info');
          render(document.getElementById('app'));
        } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
      });
    });
  }

  function _exportFile() {
    try {
      const json = DB.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const today = new Date().toISOString().substring(0, 10);
      a.href = url;
      a.download = 'גבאים_גיבוי_' + today + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      UI.toast('הגיבוי הורד', 'success');
    } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
  }

  async function _copyJson() {
    try {
      const json = DB.exportJSON();
      await navigator.clipboard.writeText(json);
      UI.toast('הועתק ללוח. הדבק במכשיר השני', 'success');
    } catch (e) {
      // fallback: show in modal
      const body = '<p>העתק את הטקסט הזה ידנית:</p>' +
        '<textarea class="form-control" rows="10" readonly>' + UTIL.escHtml(DB.exportJSON()) + '</textarea>';
      UI.modal('JSON לגיבוי', body, '<button class="btn btn-secondary" data-bs-dismiss="modal">סגור</button>');
    }
  }

  async function _importFile(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    const ok = await UI.confirm('הייבוא ידרוס את כל הנתונים הקיימים במכשיר. להמשיך?');
    if (!ok) { ev.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = async function() {
      try {
        DB.importJSON(reader.result);
        await STATE.initSynagogues();
        UI.toast('הייבוא הצליח', 'success');
        render(document.getElementById('app'));
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    };
    reader.readAsText(f);
    ev.target.value = '';
  }

  async function _resetAll() {
    const ok = await UI.confirm('להוריד את כל הנתונים ולחזור להגדרות ברירת מחדל? פעולה זו לא הפיכה.');
    if (!ok) return;
    const ok2 = await UI.confirm('בטוח? כל המתפללים והעליות יימחקו לצמיתות.');
    if (!ok2) return;
    DB.resetAll();
    await STATE.initSynagogues();
    UI.toast('נאופס', 'info');
    render(document.getElementById('app'));
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
        await API.write('addSynagogue', data);
        await STATE.initSynagogues();
        UI.toast('נוסף', 'success');
        UI.closeModal();
        render(document.getElementById('app'));
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  async function _openEditSyn(id) {
    const s = await API.read('listSynagogues', {});
    const syn = s.find(function(x) { return x.id === id; });
    if (!syn) return;
    const body = '<form id="synForm"><input type="hidden" name="id" value="' + UTIL.escAttr(syn.id) + '"><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם *</label><input class="form-control" name="name" value="' + UTIL.escAttr(syn.name) + '" required></div>' +
      '<div class="col-md-6"><label class="form-label">כתובת</label><input class="form-control" name="address" value="' + UTIL.escAttr(syn.address || '') + '"></div>' +
      '<div class="col-md-6"><label class="form-label">נוסח</label><input class="form-control" name="nusach" value="' + UTIL.escAttr(syn.nusach || '') + '"></div>' +
      '<div class="col-12"><label class="form-label">הערות</label><textarea class="form-control" name="notes">' + UTIL.escHtml(syn.notes || '') + '</textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button><button class="btn btn-primary" id="sv">שמור</button>';
    UI.modal('ערוך בית כנסת', body, footer);
    document.getElementById('sv').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('synForm'));
      try {
        await API.write('updateSynagogue', data);
        await STATE.initSynagogues();
        UI.toast('עודכן', 'success');
        UI.closeModal();
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
        await API.write('addGabbai', data);
        UI.toast('נוסף', 'success');
        UI.closeModal();
        render(document.getElementById('app'));
      } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
    });
  }

  return { render: render };
})();
