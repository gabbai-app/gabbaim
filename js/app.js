// Application bootstrap

(function() {
  function setHint(s) {
    const el = document.getElementById('bootHint');
    if (el) el.textContent = s;
  }

  async function boot() {
    try {
      setHint('בודק חיבור לשרת…');
      // Ensure backend Sheet is initialized
      try {
        await API.read('ensureInit', {}, { forceFresh: true, cacheTtl: 60 * 1000 });
      } catch (e) {
        // continue — might still work with cache from a previous session
        console.warn('ensureInit failed', e);
      }

      setHint('טוען בתי כנסת…');
      await STATE.initSynagogues();

      // Wire up reactive UI
      STATE.onChange(function(key) {
        if (key === 'synagogues' || key === 'currentSynagogueId') UI.renderSynSelector();
      });
      API.onConnectivityChange(function() { UI.updateOnlineBadge(); });

      UI.renderSynSelector();
      UI.updateOnlineBadge();

      // Wire route nav clicks (besides hash navigation)
      document.querySelectorAll('#navLinks .nav-link').forEach(function(a) {
        a.addEventListener('click', function() {
          // collapse navbar on mobile
          const collapse = document.getElementById('mainNav');
          if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
          }
        });
      });

      ROUTER.init();

      // Register service worker for PWA (best effort, ignore errors)
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch(function() {});
      }

      // Periodically ping to detect online state
      setInterval(function() {
        API.ping().catch(function() {});
      }, 60000);
    } catch (e) {
      console.error('Boot failed', e);
      const app = document.getElementById('app');
      app.innerHTML = UI.errorState(
        'לא הצלחנו לטעון את המערכת: ' + e.message + '. ייתכן שה־URL חסום בנטפרי או שה־Apps Script לא מאושר עדיין.',
        function() { window.location.reload(); }
      );
    }
  }

  document.addEventListener('DOMContentLoaded', boot);
})();
