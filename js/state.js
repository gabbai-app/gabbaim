// Global application state — minimal, single source of truth

const STATE = (function() {
  const KEY_SYN = CONFIG.STORAGE_PREFIX + 'currentSyn';
  const _state = {
    synagogues: [],
    currentSynagogueId: null,
    page: CONFIG.DEFAULT_PAGE
  };
  const _listeners = [];

  function get(key) { return _state[key]; }
  function set(key, value) {
    _state[key] = value;
    _emit(key, value);
  }
  function onChange(fn) { _listeners.push(fn); }
  function _emit(key, value) {
    _listeners.forEach(function(fn) { try { fn(key, value); } catch (e) {} });
  }

  function _loadCurrent() {
    try { return localStorage.getItem(KEY_SYN); } catch (e) { return null; }
  }
  function _saveCurrent(id) {
    try { localStorage.setItem(KEY_SYN, id); } catch (e) {}
  }

  async function initSynagogues() {
    const syns = await API.read('listSynagogues', {});
    _state.synagogues = syns || [];
    const saved = _loadCurrent();
    if (saved && _state.synagogues.some(function(s) { return s.id === saved; })) {
      _state.currentSynagogueId = saved;
    } else if (_state.synagogues[0]) {
      _state.currentSynagogueId = _state.synagogues[0].id;
    }
    _emit('synagogues', _state.synagogues);
    _emit('currentSynagogueId', _state.currentSynagogueId);
  }

  function setCurrentSynagogue(id) {
    _state.currentSynagogueId = id;
    _saveCurrent(id);
    _emit('currentSynagogueId', id);
  }

  return {
    get: get, set: set, onChange: onChange,
    initSynagogues: initSynagogues,
    setCurrentSynagogue: setCurrentSynagogue
  };
})();
