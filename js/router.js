// Hash-based SPA router with auth + permission guard

const ROUTER = (function() {
  const PUBLIC_ROUTES = { '/login': true };

  const ROUTES = {
    '/':          { perm: 'page:dashboard',   handler: function(p, el) { PAGE_DASHBOARD.render(el);            UI.setActiveNav('dashboard'); STATE.set('page', 'dashboard'); } },
    '/live':      { perm: 'page:live',        handler: function(p, el) { PAGE_LIVE.render(el, p[0]);           UI.setActiveNav('live');      STATE.set('page', 'live'); } },
    '/members':   { perm: 'page:members',     handler: function(p, el) { PAGE_MEMBERS.render(el);              UI.setActiveNav('members');   STATE.set('page', 'members'); } },
    '/member':    { perm: 'page:member_card', handler: function(p, el) { PAGE_MEMBER_CARD.render(el, p[0]);    UI.setActiveNav('members');   STATE.set('page', 'member_card'); } },
    '/tribes':    { perm: 'page:tribes',      handler: function(p, el) { PAGE_TRIBES.render(el);               UI.setActiveNav('members');   STATE.set('page', 'tribes'); } },
    '/events':    { perm: 'page:events',      handler: function(p, el) { PAGE_EVENTS.render(el);               UI.setActiveNav('events');    STATE.set('page', 'events'); } },
    '/reports':   { perm: 'page:reports',     handler: function(p, el) { PAGE_REPORTS.render(el);              UI.setActiveNav('reports');   STATE.set('page', 'reports'); } },
    '/print':     { perm: 'page:print',       handler: function(p, el) { PAGE_PRINT.render(el, p[0]);          UI.setActiveNav('live');      STATE.set('page', 'print'); } },
    '/audit':     { perm: 'page:audit',       handler: function(p, el) { PAGE_AUDIT.render(el);                UI.setActiveNav('');          STATE.set('page', 'audit'); } },
    '/settings':  { perm: 'page:settings',    handler: function(p, el) { PAGE_SETTINGS.render(el);             UI.setActiveNav('settings');  STATE.set('page', 'settings'); } },
    '/login':     { perm: null,               handler: function(p, el) { PAGE_LOGIN.render(el);                UI.setActiveNav('');          STATE.set('page', 'login'); } }
  };

  function parse() {
    const hash = (window.location.hash || '#/').substring(1);
    const segments = hash.split('/').filter(function(s) { return s.length > 0; });
    if (segments.length === 0) return { route: '/', params: [] };
    return { route: '/' + segments[0], params: segments.slice(1) };
  }

  function render() {
    const parsed = parse();
    const route = ROUTES[parsed.route];
    // Auth guard
    if (!AUTH.isLoggedIn() && !PUBLIC_ROUTES[parsed.route]) {
      window.location.hash = '#/login';
      return;
    }
    if (AUTH.isLoggedIn() && parsed.route === '/login') {
      window.location.hash = '#/';
      return;
    }
    // Permission guard
    if (route && route.perm && !PERM.can(route.perm)) {
      const el = document.getElementById('app');
      el.innerHTML = UI.errorState('אין לך הרשאה לדף זה. נדרש: ' + PERM.roleLabel(_minRoleFor(route.perm)), function() { window.location.hash = '#/'; });
      return;
    }
    const handler = (route || ROUTES['/']).handler;
    const el = document.getElementById('app');
    try {
      handler(parsed.params, el);
    } catch (e) {
      console.error('Router error', e);
      el.innerHTML = UI.errorState('שגיאה בטעינת הדף: ' + e.message, function() { render(); });
    }
  }

  function _minRoleFor(perm) {
    // Mirror of PERM.MATRIX lookup — used for nicer error messaging
    const m = { 'page:tribes': 'chief', 'page:settings': 'chief', 'page:audit': 'super_admin' };
    return m[perm] || 'chief';
  }

  function refresh() { render(); }
  function navigate(path) { window.location.hash = '#' + path; }
  function init() {
    window.addEventListener('hashchange', render);
    render();
  }

  return { init: init, render: render, refresh: refresh, navigate: navigate };
})();
