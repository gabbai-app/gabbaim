// Authentication — gabbai login by name + password/PIN
// Session stored in localStorage; per device. No expiry by default.
// Passwords are stored as SHA-256 of (salt + ':' + password). Legacy PIN
// (pin_code) still works for accounts that haven't migrated.

const AUTH = (function() {
  const KEY = 'gabbai_session_v1';
  const SALT = 'gabbaim_maale_amos_2026';
  const HASH_PREFIX = 'sha256:';
  const _listeners = [];

  async function hashPassword(pw) {
    if (!pw) return '';
    if (!('crypto' in window) || !window.crypto.subtle) {
      // Fallback (insecure) — only happens on ancient browsers
      return 'plain:' + String(pw);
    }
    const buf = new TextEncoder().encode(SALT + ':' + pw);
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const hex = Array.from(new Uint8Array(digest))
      .map(function(b) { return b.toString(16).padStart(2, '0'); }).join('');
    return HASH_PREFIX + hex;
  }

  async function verifyPassword(stored, attempt) {
    if (!stored || !attempt) return false;
    if (String(stored).indexOf(HASH_PREFIX) === 0) {
      return (await hashPassword(attempt)) === stored;
    }
    if (String(stored).indexOf('plain:') === 0) {
      return String(stored).substring(6) === String(attempt);
    }
    return String(stored) === String(attempt);
  }

  function _load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function _save(s) {
    try {
      if (s) localStorage.setItem(KEY, JSON.stringify(s));
      else localStorage.removeItem(KEY);
    } catch (e) {}
    _emit();
  }
  function _emit() {
    _listeners.forEach(function(fn) { try { fn(currentGabbai()); } catch (e) {} });
  }

  function currentGabbai() { return _load(); }
  function isLoggedIn() { return !!_load(); }

  function onChange(fn) { _listeners.push(fn); }

  // Verify a gabbai exists and password OR PIN matches.
  async function _verify(gabbaiId, secret) {
    const gabs = DB.list('gabbais');
    const g = gabs.find(function(x) { return x.id === gabbaiId; });
    if (!g) return null;
    if (g.status === 'inactive') return null;
    // Try password_hash (preferred), then pin_code
    if (g.password_hash) {
      const ok = await verifyPassword(g.password_hash, secret);
      if (ok) return g;
    }
    if (g.pin_code && String(g.pin_code) === String(secret)) return g;
    return null;
  }

  async function login(gabbaiId, secret) {
    const g = await _verify(gabbaiId, secret);
    if (!g) return { ok: false, error: 'שם משתמש או סיסמה שגויים' };
    const session = {
      gabbai_id: g.id,
      name: g.name,
      role: g.role,
      synagogue_id: g.synagogue_id,
      logged_in_at: new Date().toISOString()
    };
    _save(session);
    // Record last_login on the gabbai row (best-effort, not awaited)
    try { DB.update('gabbais', g.id, { last_login: session.logged_in_at }); } catch (e) {}
    return { ok: true, session: session };
  }

  function logout() { _save(null); }

  // Returns the active gabbai_id for audit logging, or null
  function actorId() {
    const s = _load();
    return s ? s.gabbai_id : null;
  }

  function actorName() {
    const s = _load();
    return s ? s.name : null;
  }

  function isSuperAdmin() {
    const s = _load();
    return s && s.role === 'super_admin';
  }

  return {
    currentGabbai: currentGabbai,
    isLoggedIn: isLoggedIn,
    isSuperAdmin: isSuperAdmin,
    login: login,
    logout: logout,
    onChange: onChange,
    actorId: actorId,
    actorName: actorName,
    hashPassword: hashPassword,
    verifyPassword: verifyPassword
  };
})();
