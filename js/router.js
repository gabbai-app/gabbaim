// Hash-based SPA router
// Routes:
//   #/                → dashboard
//   #/live            → live mode (this week's shabbat)
//   #/live/YYYY-MM-DD → live mode (specific date)
//   #/members         → members list
//   #/member/ID       → member card
//   #/events          → events list
//   #/reports         → reports
//   #/settings        → settings

const ROUTER = (function() {
  const ROUTES = {
    '/':           function(p, el) { PAGE_DASHBOARD.render(el); UI.setActiveNav('dashboard'); STATE.set('page', 'dashboard'); },
    '/live':       function(p, el) { PAGE_LIVE.render(el, p[0]);    UI.setActiveNav('live');      STATE.set('page', 'live'); },
    '/members':    function(p, el) { PAGE_MEMBERS.render(el);       UI.setActiveNav('members');   STATE.set('page', 'members'); },
    '/member':     function(p, el) { PAGE_MEMBER_CARD.render(el, p[0]); UI.setActiveNav('members'); STATE.set('page', 'member_card'); },
    '/events':     function(p, el) { PAGE_EVENTS.render(el);        UI.setActiveNav('events');    STATE.set('page', 'events'); },
    '/reports':    function(p, el) { PAGE_REPORTS.render(el);       UI.setActiveNav('reports');   STATE.set('page', 'reports'); },
    '/settings':   function(p, el) { PAGE_SETTINGS.render(el);      UI.setActiveNav('settings');  STATE.set('page', 'settings'); }
  };

  let _currentRoute = null;
  let _currentParams = [];

  function parse() {
    const hash = (window.location.hash || '#/').substring(1);
    const segments = hash.split('/').filter(function(s) { return s.length > 0; });
    if (segments.length === 0) return { route: '/', params: [] };
    return { route: '/' + segments[0], params: segments.slice(1) };
  }

  function render() {
    const parsed = parse();
    const handler = ROUTES[parsed.route] || ROUTES['/'];
    const el = document.getElementById('app');
    _currentRoute = parsed.route;
    _currentParams = parsed.params;
    try {
      handler(parsed.params, el);
    } catch (e) {
      console.error('Router error', e);
      el.innerHTML = UI.errorState('שגיאה בטעינת הדף: ' + e.message, function() { render(); });
    }
  }

  function refresh() { render(); }

  function navigate(path) {
    window.location.hash = '#' + path;
  }

  function init() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { init: init, render: render, refresh: refresh, navigate: navigate };
})();
