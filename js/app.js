// Application bootstrap — fully client-side, no network dependencies

(function() {
  async function boot() {
    try {
      // 1. Initialize the local database (seeds defaults on first run)
      DB.init();

      // 2. Load synagogues into application state
      await STATE.initSynagogues();

      // 3. React to state changes — update the synagogue selector in nav
      STATE.onChange(function(key) {
        if (key === 'synagogues' || key === 'currentSynagogueId') {
          UI.renderSynSelector();
        }
      });

      // 4. Render the initial selector and wire navbar collapse on mobile
      UI.renderSynSelector();

      document.querySelectorAll('#navLinks .nav-link').forEach(function(a) {
        a.addEventListener('click', function() {
          const collapse = document.getElementById('mainNav');
          if (collapse && collapse.classList.contains('show')) {
            bootstrap.Collapse.getInstance(collapse)?.hide();
          }
        });
      });

      // 5. Start router
      ROUTER.init();

      // 6. Register Service Worker for installable PWA
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

  document.addEventListener('DOMContentLoaded', boot);
})();
