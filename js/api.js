// API — bridge to Apps Script backend
// Strategy:
//   - reads: GET ?action=X&args=JSON, cached in localStorage with TTL
//   - writes: POST form-urlencoded (no preflight, large payload friendly)
//   - retry on transient network errors
//   - graceful fallback to cache when offline
//   - throws structured errors that callers handle

const API = (function() {
  let _online = true;
  let _onlineListeners = [];

  function setOnline(state) {
    if (_online === state) return;
    _online = state;
    _onlineListeners.forEach(function(fn) { try { fn(state); } catch(e) {} });
  }

  function onConnectivityChange(fn) { _onlineListeners.push(fn); }
  function isOnline() { return _online; }

  function _cacheKey(action, args) {
    return CONFIG.CACHE_PREFIX + 'r:' + action + ':' + JSON.stringify(args || {});
  }

  function _readCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed;
    } catch (e) { return null; }
  }

  function _writeCache(key, data, ttl) {
    try {
      localStorage.setItem(key, JSON.stringify({
        data: data,
        expires: Date.now() + (ttl || CONFIG.CACHE_TTL_MS),
        cachedAt: Date.now()
      }));
    } catch (e) {
      // localStorage full — purge old entries
      _purgeOldCache();
    }
  }

  function _purgeOldCache() {
    try {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(CONFIG.CACHE_PREFIX + 'r:') === 0) toRemove.push(k);
      }
      toRemove.slice(0, Math.floor(toRemove.length / 2)).forEach(function(k) {
        localStorage.removeItem(k);
      });
    } catch (e) {}
  }

  function _withTimeout(promise, ms) {
    return new Promise(function(resolve, reject) {
      const t = setTimeout(function() { reject(new Error('Network timeout')); }, ms);
      promise.then(function(v) { clearTimeout(t); resolve(v); },
                   function(e) { clearTimeout(t); reject(e); });
    });
  }

  async function _fetchGet(action, args) {
    const params = new URLSearchParams();
    params.set('action', action);
    params.set('args', JSON.stringify(args || {}));
    const url = CONFIG.API_URL + '?' + params.toString();
    const r = await _withTimeout(fetch(url, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      cache: 'no-store'
    }), CONFIG.NETWORK_TIMEOUT_MS);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  }

  async function _fetchPost(action, args) {
    const body = new URLSearchParams();
    body.set('action', action);
    body.set('args', JSON.stringify(args || {}));
    const r = await _withTimeout(fetch(CONFIG.API_URL, {
      method: 'POST',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString()
    }), CONFIG.NETWORK_TIMEOUT_MS);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  }

  async function _fetchWithRetry(fn, action, args) {
    let lastErr = null;
    for (let attempt = 0; attempt <= CONFIG.RETRY_COUNT; attempt++) {
      try {
        const result = await fn(action, args);
        setOnline(true);
        if (!result || result.ok === false) {
          const err = new Error(result && result.error ? result.error : 'שגיאת שרת לא ידועה');
          err.serverError = true;
          throw err;
        }
        return result.data;
      } catch (e) {
        lastErr = e;
        if (e.serverError) throw e;
        // network error — wait and retry
        if (attempt < CONFIG.RETRY_COUNT) {
          await new Promise(function(res) { setTimeout(res, 300 * (attempt + 1)); });
        }
      }
    }
    setOnline(false);
    throw lastErr || new Error('שגיאת תקשורת');
  }

  /**
   * Read from API with cache.
   * @param {string} action - server function name
   * @param {object} args
   * @param {object} [opts] - {forceFresh: false, cacheTtl: ms}
   */
  async function read(action, args, opts) {
    opts = opts || {};
    const key = _cacheKey(action, args);
    const cached = _readCache(key);
    const now = Date.now();

    // If fresh in cache and not forcing — return immediately
    if (!opts.forceFresh && cached && cached.expires > now) {
      return cached.data;
    }

    try {
      const data = await _fetchWithRetry(_fetchGet, action, args);
      _writeCache(key, data, opts.cacheTtl || CONFIG.CACHE_TTL_MS);
      return data;
    } catch (e) {
      // network failed — return stale cache if available
      if (cached) {
        console.warn('Using stale cache for', action, e.message);
        return cached.data;
      }
      throw e;
    }
  }

  /**
   * Write to API — POST. Invalidates relevant cache entries on success.
   */
  async function write(action, args, opts) {
    opts = opts || {};
    const data = await _fetchWithRetry(_fetchPost, action, args);
    if (opts.invalidate) {
      opts.invalidate.forEach(function(prefix) {
        _invalidatePrefix(prefix);
      });
    } else {
      // safe default: invalidate ALL reads (writes are rare relative to reads)
      _invalidatePrefix('');
    }
    return data;
  }

  function _invalidatePrefix(prefix) {
    try {
      const fullPrefix = CONFIG.CACHE_PREFIX + 'r:' + prefix;
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(fullPrefix) === 0) toRemove.push(k);
      }
      toRemove.forEach(function(k) { localStorage.removeItem(k); });
    } catch (e) {}
  }

  async function ping() {
    try {
      const r = await _fetchGet('ping', {});
      setOnline(true);
      return r;
    } catch (e) {
      setOnline(false);
      throw e;
    }
  }

  return {
    read: read,
    write: write,
    ping: ping,
    isOnline: isOnline,
    onConnectivityChange: onConnectivityChange,
    invalidatePrefix: _invalidatePrefix
  };
})();
