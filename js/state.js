// Global application state — minimal, single source of truth

const STATE = (function() {
  const KEY_SYN = CONFIG.CACHE_PREFIX + 'currentSyn';
  const _state = {
    synagogues: [],
    currentSynagogueId: null,
    gabbais: [],
    page: CONFIG.DEFAULT_PAGE
  };
  const _listeners = [];

  function get(key) { return _state[key]; }
  function set(key, value) {
    _state[key] = value;
    _emit(key, value);
  }
  function getAll() { return Object.assign({}, _state); }

  function onChange(fn) { _listeners.push(fn); }
  function _emit(key, value) {
    _listeners.forEach(function(fn) { try { fn(key, value); } catch(e) {} });
  }

  function loadCurrentSynagogue() {
    try { return localStorage.getItem(KEY_SYN); }
    catch (e) { return null; }
  }
  function saveCurrentSynagogue(id) {
    try { localStorage.setItem(KEY_SYN, id); } catch (e) {}
  }

  async function initSynagogues() {
    const syns = await API.read('listSynagogues', {});
    _state.synagogues = syns || [];
    const saved = loadCurrentSynagogue();
    if (saved && (syns || []).some(function(s){ return s.id === saved; })) {
      _state.currentSynagogueId = saved;
    } else if (syns && syns[0]) {
      _state.currentSynagogueId = syns[0].id;
    }
    _emit('synagogues', _state.synagogues);
    _emit('currentSynagogueId', _state.currentSynagogueId);
  }

  function setCurrentSynagogue(id) {
    _state.currentSynagogueId = id;
    saveCurrentSynagogue(id);
    _emit('currentSynagogueId', id);
  }

  return {
    get: get, set: set, getAll: getAll, onChange: onChange,
    initSynagogues: initSynagogues,
    setCurrentSynagogue: setCurrentSynagogue
  };
})();
