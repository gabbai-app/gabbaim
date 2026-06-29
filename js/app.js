// Application bootstrap

(function() {
  function _setBootHint(s) {
    const el = document.getElementById('bootLoader');
    if (el) {
      const p = el.querySelector('p');
      if (p) p.textContent = s;
    }
  }

  function _updateSyncBadge(status, error) {
    const badge = document.getElementById('syncBadge');
    if (!badge) return;
    const lastSync = localStorage.getItem('gabbai_last_sync_at');
    const lastSyncStr = lastSync ? new Date(lastSync).toLocaleTimeString('he-IL') : '?';
    const map = {
      idle:    { cls: 'bg-success', icon: 'bi-cloud-check', title: 'מסונכרן · אחרון: ' + lastSyncStr },
      syncing: { cls: 'bg-info', icon: 'bi-arrow-repeat', title: 'מסנכרן…' },
      offline: { cls: 'bg-warning', icon: 'bi-wifi-off', title: 'אופליין — שמור מקומית' },
      error:   { cls: 'bg-danger', icon: 'bi-exclamation-circle', title: 'שגיאת סנכרון: ' + (error || '') },
      no_pat:  { cls: 'bg-secondary', icon: 'bi-cloud-slash', title: 'לא מסונכרן — הזן GitHub PAT בהגדרות' }
    };
    const conf = map[status] || map.no_pat;
    badge.className = 'badge ms-2 ' + conf.cls;
    badge.innerHTML = '<i class="bi ' + conf.icon + '"></i>';
    badge.title = conf.title;
    badge.style.cursor = 'pointer';
    badge.onclick = function() { window.location.hash = '#/settings'; };
  }

  async function boot() {
    try {
      _setBootHint('טוען מסד נתונים מקומי…');
      DB.init();

      _setBootHint('מושך נתונים מ-GitHub…');
      try { await SYNC.pullOnly(); } catch (e) { console.warn('initial pull failed', e); }

      _setBootHint('מעלה ממשק…');
      await STATE.initSynagogues();

      STATE.onChange(function(key) {
        if (key === 'synagogues' || key === 'currentSynagogueId') UI.renderSynSelector();
      });
      AUTH.onChange(function() { UI.renderUserMenu(); });

      UI.renderSynSelector();
      UI.renderUserMenu();
      SYNC.onStatusChange(_updateSyncBadge);
      _updateSyncBadge(SYNC.getStatus().status, SYNC.getStatus().error);

      document.querySelectorAll('#navLinks .nav-link').forEach(function(a) {
        a.addEventListener('click', function() {
          const collapse = document.getElementById('mainNav');
          if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
          }
        });
      });

      ROUTER.init();
      SYNC.start();

      // Auto-sync when window regains focus / network returns
      window.addEventListener('online', function() { SYNC.syncNow(); REMINDERS.checkAndRemind(); });
      window.addEventListener('focus', function() { SYNC.syncNow(); REMINDERS.checkAndRemind(); });

      // First reminder check after boot (gives sync a moment to finish)
      setTimeout(function() { REMINDERS.checkAndRemind(); }, 8000);

      // Global error boundary — catch any uncaught error and show a friendly toast
      window.addEventListener('error', function(ev) {
        try { UI.toast('שגיאה: ' + (ev.message || 'לא ידוע'), 'danger'); } catch (e) {}
      });
      window.addEventListener('unhandledrejection', function(ev) {
        const msg = ev.reason && (ev.reason.message || ev.reason);
        if (String(msg).indexOf('PERMISSION_DENIED') >= 0) return; // we already toasted
        try { UI.toast('שגיאה: ' + msg, 'danger'); } catch (e) {}
      });

      // PWA install prompt — capture event, show our own button
      let _deferredInstall = null;
      window.addEventListener('beforeinstallprompt', function(ev) {
        ev.preventDefault();
        _deferredInstall = ev;
        _showInstallPrompt(_deferredInstall);
      });

      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
      }
    } catch (e) {
      console.error('Boot failed', e);
      document.getElementById('app').innerHTML = UI.errorState(
        'שגיאת אתחול: ' + e.message,
        function() { window.location.reload(); }
      );
    }
  }

  function _showInstallPrompt(promptEvent) {
    if (localStorage.getItem('gabbai_install_dismissed')) return;
    const html =
      '<div id="installBar" class="alert alert-primary alert-dismissible m-2 d-flex justify-content-between align-items-center" role="alert">' +
      '<div><i class="bi bi-download"></i> התקן את האפליקציה למסך הבית לעבודה מהירה יותר</div>' +
      '<div class="d-flex gap-2 align-items-center">' +
      '<button class="btn btn-sm btn-primary" id="instOk">התקן</button>' +
      '<button class="btn-close" id="instNo" aria-label="סגור"></button>' +
      '</div></div>';
    const main = document.getElementById('app');
    main.insertAdjacentHTML('afterbegin', html);
    document.getElementById('instOk').addEventListener('click', async function() {
      try {
        promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice.outcome === 'accepted') UI.toast('הותקן', 'success');
      } catch (e) {}
      document.getElementById('installBar')?.remove();
    });
    document.getElementById('instNo').addEventListener('click', function() {
      localStorage.setItem('gabbai_install_dismissed', '1');
      document.getElementById('installBar')?.remove();
    });
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
