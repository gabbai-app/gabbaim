// Login page — choose gabbai + enter PIN

const PAGE_LOGIN = (function() {
  function render(el) {
    const gabs = DB.list('gabbais').filter(function(g) { return g.status === 'active'; });
    el.innerHTML =
      '<div class="login-wrap d-flex justify-content-center align-items-start py-3">' +
      '<div class="card shadow-lg login-card">' +
      '<div class="card-body p-4">' +
      '<div class="text-center mb-4">' +
      '<i class="bi bi-book" style="font-size:3rem;color:var(--bs-primary);"></i>' +
      '<h3 class="mt-2 mb-1">גבאים — מעלה עמוס</h3>' +
      '<p class="text-muted small mb-0">הזדהה כדי להמשיך</p>' +
      '</div>' +
      _formHtml(gabs) +
      '<details class="mt-3"><summary class="small text-muted">לא רשום? צור גבאי חדש</summary>' +
      '<p class="small mt-2 mb-2">היכנס כמנהל קיים → הגדרות → הוסף גבאי.</p>' +
      '<p class="small mb-0">פנייה ראשונה? ברירת מחדל: <b>יוסף שניידר</b> · קוד <code>1234</code></p>' +
      '</details>' +
      '</div></div></div>';
    _wire();
  }

  function _formHtml(gabs) {
    if (!gabs.length) {
      return '<div class="alert alert-warning"><i class="bi bi-exclamation-triangle"></i> אין גבאים רשומים. ' +
        'משוך נתונים מ-GitHub או צור גבאי בהגדרות.</div>' +
        '<button class="btn btn-outline-primary w-100" id="pullBtn"><i class="bi bi-cloud-download"></i> משוך מ-GitHub</button>';
    }
    return '<form id="loginForm"><div class="mb-3">' +
      '<label class="form-label">שם הגבאי</label>' +
      '<select class="form-select form-select-lg" name="gabbai_id" required autofocus>' +
      gabs.map(function(g) {
        return '<option value="' + UTIL.escAttr(g.id) + '">' + UTIL.escHtml(g.name) + '</option>';
      }).join('') +
      '</select></div>' +
      '<div class="mb-3"><label class="form-label">סיסמה / קוד אישי</label>' +
      '<input class="form-control form-control-lg" type="password" name="pin" placeholder="הזן סיסמה" required autocomplete="current-password"></div>' +
      '<button type="submit" class="btn btn-primary btn-lg w-100"><i class="bi bi-box-arrow-in-left"></i> כניסה</button>' +
      '</form>';
  }

  function _wire() {
    document.getElementById('pullBtn')?.addEventListener('click', async function() {
      const r = await SYNC.pullOnly();
      if (r.ok) { UI.toast('נמשך מ-GitHub', 'success'); render(document.getElementById('app')); }
      else { UI.toast('שגיאה: ' + (r.error || ''), 'danger'); }
    });

    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async function(ev) {
      ev.preventDefault();
      const data = UTIL.formData(form);
      const btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> בודק…';
      try {
        const result = await AUTH.login(data.gabbai_id, String(data.pin || '').trim());
        if (!result.ok) {
          UI.toast(result.error, 'danger');
          form.querySelector('[name=pin]').focus();
          form.querySelector('[name=pin]').value = '';
          return;
        }
        UI.toast('שלום ' + result.session.name + '!', 'success');
        ROUTER.navigate('/');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-left"></i> כניסה';
      }
    });

    // Autofocus PIN once gabbai chosen
    form.querySelector('[name=gabbai_id]')?.addEventListener('change', function() {
      form.querySelector('[name=pin]').focus();
    });
  }

  return { render: render };
})();
