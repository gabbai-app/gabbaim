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
        const color = s.color || '#1e40af';
        html += '<li class="list-group-item d-flex justify-content-between align-items-center">' +
          '<div class="d-flex align-items-center gap-3">' +
          '<span style="display:inline-block;width:24px;height:24px;border-radius:50%;background:' + UTIL.escAttr(color) + ';border:2px solid #fff;box-shadow:0 0 0 1px #ccc;"></span>' +
          '<div><b>' + UTIL.escHtml(s.name) + '</b> <small class="text-muted">' + UTIL.escHtml(s.address || '') + ' · ' + UTIL.escHtml(s.nusach || '') + '</small></div>' +
          '</div>' +
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

    // Online sync (GitHub-as-DB)
    const syncStatus = SYNC.getStatus();
    const lastSync = syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString('he-IL') : 'מעולם';
    const hasPat = !!SYNC.getPat();
    const statusBadge = {
      idle:    '<span class="badge bg-success">מסונכרן</span>',
      syncing: '<span class="badge bg-info">מסנכרן…</span>',
      offline: '<span class="badge bg-warning text-dark">אופליין</span>',
      error:   '<span class="badge bg-danger">שגיאה: ' + UTIL.escHtml(syncStatus.error || '') + '</span>',
      no_pat:  '<span class="badge bg-secondary">לא מסונכרן</span>'
    }[syncStatus.status] || '<span class="badge bg-secondary">—</span>';

    html += '<div class="card mb-3"><div class="card-header"><i class="bi bi-cloud-arrow-up"></i> סנכרון מקוון</div><div class="card-body">' +
      '<p class="text-muted small mb-2">הנתונים מסונכרנים אוטומטית עם GitHub. כל גבאי מתחבר עם <b>טוקן GitHub אישי</b> שלו. אם אין טוקן — האפליקציה עובדת רק מקומית.</p>' +
      '<div class="mb-2"><b>סטטוס:</b> ' + statusBadge + ' · <small class="text-muted">סנכרון אחרון: ' + lastSync + '</small></div>' +
      '<label class="form-label">GitHub PAT (Personal Access Token)</label>' +
      '<div class="input-group mb-2">' +
      '<input type="password" class="form-control" id="patInput" placeholder="ghp_..." value="' + UTIL.escAttr(hasPat ? '••••••••••••••••' : '') + '" autocomplete="off">' +
      '<button class="btn btn-primary" id="savePatBtn">שמור</button>' +
      (hasPat ? '<button class="btn btn-outline-danger" id="clearPatBtn">מחק</button>' : '') +
      '</div>' +
      '<details><summary class="small text-muted">איך מייצרים PAT?</summary>' +
      '<ol class="small text-muted mt-2">' +
      '<li>היכנס ל-<a href="https://github.com/settings/tokens/new?description=Gabbai&scopes=repo" target="_blank">github.com/settings/tokens/new</a></li>' +
      '<li>תיאור: "Gabbai". בחר scope: <code>repo</code>. תוקף: ללא הגבלה (או שנה).</li>' +
      '<li>לחץ Generate. העתק את הטוקן <b>מיד</b> (נראה רק פעם אחת).</li>' +
      '<li>חזור לכאן והדבק.</li>' +
      '<li>וודא שיש לך הרשאות כתיבה ל-<code>' + SYNC.OWNER + '/' + SYNC.REPO + '</code></li>' +
      '</ol></details>' +
      '<div class="mt-3 d-flex flex-wrap gap-2">' +
      '<button class="btn btn-primary" id="syncNowBtn" ' + (hasPat ? '' : 'disabled') + '><i class="bi bi-arrow-repeat"></i> סנכרן עכשיו</button>' +
      '<button class="btn btn-outline-secondary" id="pullOnlyBtn"><i class="bi bi-cloud-download"></i> משוך מ-GitHub</button>' +
      '</div>' +
      '</div></div>';

    // Backup / Restore
    html += '<div class="card mb-3"><div class="card-header"><i class="bi bi-cloud-arrow-down"></i> גיבוי קובץ (אופציונלי)</div><div class="card-body">' +
      '<p class="text-muted small mb-3">בנוסף לסנכרון GitHub, אפשר לייצא/לייבא קובץ JSON ידנית.</p>' +
      '<div class="d-flex flex-wrap gap-2">' +
      '<button class="btn btn-outline-primary" id="exportBtn"><i class="bi bi-download"></i> ייצוא לקובץ</button>' +
      '<button class="btn btn-outline-primary" id="importBtn"><i class="bi bi-upload"></i> ייבוא מקובץ</button>' +
      '<button class="btn btn-outline-secondary" id="copyJsonBtn"><i class="bi bi-clipboard"></i> העתק JSON</button>' +
      '<input type="file" id="importFile" accept="application/json,.json" style="display:none">' +
      '</div>' +
      '</div></div>';

    // Reminders
    const perm = (typeof REMINDERS !== 'undefined') ? REMINDERS.permission() : 'unsupported';
    const permBadge = {
      granted:     '<span class="badge bg-success">מופעל</span>',
      denied:      '<span class="badge bg-danger">חסום בדפדפן</span>',
      default:     '<span class="badge bg-secondary">לא מופעל</span>',
      unsupported: '<span class="badge bg-warning text-dark">לא נתמך</span>'
    }[perm] || '<span class="badge bg-secondary">לא מופעל</span>';
    html += '<div class="card mb-3"><div class="card-header"><i class="bi bi-bell"></i> תזכורות</div><div class="card-body">' +
      '<p class="text-muted small mb-2">קבל התראות בדפדפן ביום חמישי / ערב שבת על חיובים השבת ומנהגי שבת מיוחדת.</p>' +
      '<div class="mb-2"><b>סטטוס:</b> ' + permBadge + '</div>' +
      (perm === 'default' ? '<button class="btn btn-primary" id="enaNotifBtn"><i class="bi bi-bell"></i> הפעל תזכורות</button>' : '') +
      (perm === 'granted' ? '<button class="btn btn-outline-primary" id="testNotifBtn"><i class="bi bi-bell-fill"></i> שלח התראת בדיקה</button>' : '') +
      (perm === 'denied' ? '<p class="small text-danger mb-0">נחסם בהגדרות הדפדפן. כדי להפעיל: לחץ על המנעול ליד ה-URL → "הרשאות" → התראות</p>' : '') +
      '</div></div>';

    // Email notifications
    const savedEmail = localStorage.getItem('gabbai_notif_email') || '';
    const savedFreq = localStorage.getItem('gabbai_notif_freq') || 'weekly';
    html += '<div class="card mb-3"><div class="card-header"><i class="bi bi-envelope"></i> עדכונים במייל</div><div class="card-body">' +
      '<p class="text-muted small mb-2">קבל סיכום של חיובי השבת, מנהגים מיוחדים, ועליות שטרם הוקצו.</p>' +
      '<div class="mb-2"><label class="form-label">כתובת מייל</label>' +
      '<input id="notifEmail" type="email" class="form-control" placeholder="name@example.com" value="' + UTIL.escAttr(savedEmail) + '"></div>' +
      '<div class="mb-2"><label class="form-label">תדירות</label>' +
      '<select id="notifFreq" class="form-select">' +
        '<option value="off"' + (savedFreq === 'off' ? ' selected' : '') + '>כבוי</option>' +
        '<option value="weekly"' + (savedFreq === 'weekly' ? ' selected' : '') + '>שבועי (יום חמישי)</option>' +
        '<option value="daily"' + (savedFreq === 'daily' ? ' selected' : '') + '>יומי</option>' +
      '</select></div>' +
      '<button class="btn btn-primary" id="saveEmailBtn"><i class="bi bi-save"></i> שמור</button> ' +
      '<button class="btn btn-outline-primary" id="testEmailBtn"><i class="bi bi-send"></i> שלח עכשיו (בדיקה)</button>' +
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

    document.getElementById('saveEmailBtn')?.addEventListener('click', function() {
      const e = document.getElementById('notifEmail').value.trim();
      const f = document.getElementById('notifFreq').value;
      if (e && !/.+@.+\..+/.test(e)) { UI.toast('כתובת מייל לא תקינה', 'warning'); return; }
      localStorage.setItem('gabbai_notif_email', e);
      localStorage.setItem('gabbai_notif_freq', f);
      UI.toast('הגדרות נשמרו', 'success');
    });

    document.getElementById('testEmailBtn')?.addEventListener('click', async function() {
      const email = document.getElementById('notifEmail').value.trim();
      if (!email) { UI.toast('הזן כתובת מייל', 'warning'); return; }
      // Build summary content via mailto
      const info = (typeof CAL !== 'undefined') ? CAL.dayInfo(new Date()) : null;
      const subject = 'גבאים — סיכום ' + (info ? info.dateHe : new Date().toLocaleDateString('he-IL'));
      const lines = [
        'בס"ד',
        '',
        'סיכום מהמערכת גבאים מעלה עמוס',
        '',
        info ? 'יום: ' + info.dateHe : '',
        info && info.parsha ? 'פרשת ' + info.parsha : '',
        '',
        'לפתיחת המערכת: https://gabbai-app.github.io/gabbaim/',
        '',
        'בברכה'
      ].filter(Boolean).join('\n');
      const url = 'mailto:' + encodeURIComponent(email) +
                  '?subject=' + encodeURIComponent(subject) +
                  '&body=' + encodeURIComponent(lines);
      window.location.href = url;
      UI.toast('נפתח דוא"ל - בדוק את התיבה', 'info');
    });

    document.getElementById('savePatBtn')?.addEventListener('click', async function() {
      const v = document.getElementById('patInput').value.trim();
      if (!v || v.indexOf('•') === 0) { UI.toast('הזן טוקן', 'warning'); return; }
      SYNC.setPat(v);
      UI.toast('טוקן נשמר. מסנכרן…', 'success');
      const ok = await SYNC.syncNow();
      if (ok) { UI.toast('סנכרון הצליח', 'success'); render(document.getElementById('app')); }
      else { UI.toast('סנכרון נכשל — בדוק את הטוקן', 'danger'); }
    });
    document.getElementById('clearPatBtn')?.addEventListener('click', async function() {
      const ok = await UI.confirm('למחוק את הטוקן? תפסיק להיות מסונכרן עם GitHub.');
      if (!ok) return;
      SYNC.setPat('');
      UI.toast('טוקן נמחק', 'info');
      render(document.getElementById('app'));
    });
    document.getElementById('syncNowBtn')?.addEventListener('click', async function() {
      const ok = await SYNC.syncNow();
      if (ok) UI.toast('סנכרון הצליח', 'success');
      else UI.toast('סנכרון נכשל', 'danger');
      render(document.getElementById('app'));
    });
    document.getElementById('pullOnlyBtn')?.addEventListener('click', async function() {
      const res = await SYNC.pullOnly();
      if (res.ok) { UI.toast('נמשך מ-GitHub', 'success'); render(document.getElementById('app')); }
      else { UI.toast('שגיאה: ' + res.error, 'danger'); }
    });
    document.getElementById('enaNotifBtn')?.addEventListener('click', async function() {
      const r = await REMINDERS.request();
      if (r === 'granted') { UI.toast('תזכורות הופעלו', 'success'); render(document.getElementById('app')); }
      else if (r === 'denied') UI.toast('הרשאה נדחתה', 'danger');
      else if (r === 'unsupported') UI.toast('הדפדפן לא תומך', 'warning');
    });
    document.getElementById('testNotifBtn')?.addEventListener('click', function() {
      REMINDERS.notify('שלום ' + (AUTH.actorName() || ''), 'התראות מסונכרנות ועובדות', 'test_' + Date.now());
      UI.toast('נשלח', 'success');
    });

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
    const presets = ['#1e40af', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#ea580c', '#0ea5e9'];
    const swatchHtml = presets.map(function(c, i) {
      const sel = i === 0 ? 'border:3px solid #000;' : 'border:2px solid #ddd;';
      return '<button type="button" class="preset-swatch" data-color="' + UTIL.escAttr(c) + '" style="width:36px;height:36px;border-radius:50%;background:' + UTIL.escAttr(c) + ';' + sel + ';margin:2px;cursor:pointer;"></button>';
    }).join('');
    const body = '<form id="synForm"><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם *</label><input class="form-control" name="name" required></div>' +
      '<div class="col-md-6"><label class="form-label">כתובת</label><input class="form-control" name="address"></div>' +
      '<div class="col-md-6"><label class="form-label">נוסח</label><select class="form-select" name="nusach"><option>ספרד</option><option>אשכנז</option><option>ספרדי</option><option>חב"ד</option><option>אחר</option></select></div>' +
      '<div class="col-md-6"><label class="form-label">צבע מזהה</label>' +
      '<div class="d-flex align-items-center gap-2">' +
      '<input type="color" class="form-control form-control-color" name="color" value="#1e40af" style="width:60px;height:38px;">' +
      '<div class="flex-grow-1">' + swatchHtml + '</div>' +
      '</div></div>' +
      '<div class="col-12"><label class="form-label">הערות</label><textarea class="form-control" name="notes"></textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button><button class="btn btn-primary" id="sv">שמור</button>';
    UI.modal('הוסף בית כנסת', body, footer);
    document.querySelectorAll('.preset-swatch').forEach(function(b) {
      b.addEventListener('click', function() {
        document.querySelector('#synForm [name=color]').value = b.dataset.color;
        document.querySelectorAll('.preset-swatch').forEach(function(x) { x.style.border = '2px solid #ddd'; });
        b.style.border = '3px solid #000';
      });
    });
    document.getElementById('sv').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('synForm'));
      if (!data.name) { UI.toast('שם חובה', 'warning'); return; }
      try {
        await API.write('addSynagogue', data);
        await STATE.initSynagogues();
        UI.applySynagogueTheme();
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
    const presets = ['#1e40af', '#059669', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#ea580c', '#0ea5e9'];
    const swatchHtml = presets.map(function(c) {
      const sel = c === (syn.color || '') ? 'border:3px solid #000;' : 'border:2px solid #ddd;';
      return '<button type="button" class="preset-swatch" data-color="' + UTIL.escAttr(c) + '" style="width:36px;height:36px;border-radius:50%;background:' + UTIL.escAttr(c) + ';' + sel + ';margin:2px;cursor:pointer;"></button>';
    }).join('');
    const body = '<form id="synForm"><input type="hidden" name="id" value="' + UTIL.escAttr(syn.id) + '"><div class="row g-3">' +
      '<div class="col-md-6"><label class="form-label">שם *</label><input class="form-control" name="name" value="' + UTIL.escAttr(syn.name) + '" required></div>' +
      '<div class="col-md-6"><label class="form-label">כתובת</label><input class="form-control" name="address" value="' + UTIL.escAttr(syn.address || '') + '"></div>' +
      '<div class="col-md-6"><label class="form-label">נוסח</label><input class="form-control" name="nusach" value="' + UTIL.escAttr(syn.nusach || '') + '"></div>' +
      '<div class="col-md-6"><label class="form-label">צבע מזהה</label>' +
      '<div class="d-flex align-items-center gap-2">' +
      '<input type="color" class="form-control form-control-color" name="color" value="' + UTIL.escAttr(syn.color || '#1e40af') + '" style="width:60px;height:38px;">' +
      '<div class="flex-grow-1">' + swatchHtml + '</div>' +
      '</div></div>' +
      '<div class="col-12"><label class="form-label">הערות</label><textarea class="form-control" name="notes">' + UTIL.escHtml(syn.notes || '') + '</textarea></div>' +
      '</div></form>';
    const footer = '<button class="btn btn-secondary" data-bs-dismiss="modal">ביטול</button><button class="btn btn-primary" id="sv">שמור</button>';
    UI.modal('ערוך בית כנסת', body, footer);

    document.querySelectorAll('.preset-swatch').forEach(function(b) {
      b.addEventListener('click', function() {
        document.querySelector('#synForm [name=color]').value = b.dataset.color;
        document.querySelectorAll('.preset-swatch').forEach(function(x) { x.style.border = '2px solid #ddd'; });
        b.style.border = '3px solid #000';
      });
    });

    document.getElementById('sv').addEventListener('click', async function() {
      const data = UTIL.formData(document.getElementById('synForm'));
      try {
        await API.write('updateSynagogue', data);
        await STATE.initSynagogues();
        UI.applySynagogueTheme();
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
