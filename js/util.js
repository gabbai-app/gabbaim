// Utility helpers — pure functions, no side effects

const UTIL = (function() {
  function escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escAttr(s) {
    return escHtml(s);
  }

  function initials(first, last) {
    const a = String(first || '').trim();
    const b = String(last || '').trim();
    return (a.charAt(0) + b.charAt(0)) || '?';
  }

  function avatarColor(seed) {
    const palette = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
      '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
      '#a855f7', '#14b8a6', '#f97316', '#0ea5e9'
    ];
    let sum = 0;
    const s = String(seed || '');
    for (let i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) & 0xffffffff;
    return palette[Math.abs(sum) % palette.length];
  }

  function avatarHtml(m, sizeClass) {
    if (!m) return '';
    const seed = m.id || ((m.first_name || '') + (m.last_name || ''));
    const color = avatarColor(seed);
    const txt = initials(m.first_name, m.last_name);
    return '<span class="avatar ' + (sizeClass || '') + '" style="background:' + color + '" aria-hidden="true">' + escHtml(txt) + '</span>';
  }

  function tribeBadge(t) {
    const tribe = t || 'ישראל';
    return '<span class="tribe-badge tribe-' + escAttr(tribe) + '">' + escHtml(tribe) + '</span>';
  }

  function fmtDate(s) {
    if (!s) return '—';
    const str = String(s).substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const [y, m, d] = str.split('-');
    return d + '/' + m + '/' + y;
  }

  function fmtShortDate(s) {
    if (!s) return '—';
    const str = String(s).substring(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const [y, m, d] = str.split('-');
    return d + '/' + m;
  }

  function daysSince(s) {
    if (!s || s === '—') return '—';
    try {
      const dt = new Date(s);
      if (isNaN(dt.getTime())) return '—';
      const ms = Date.now() - dt.getTime();
      const d = Math.floor(ms / 86400000);
      if (d < 0) return 'בעתיד';
      if (d === 0) return 'היום';
      if (d === 1) return 'אתמול';
      if (d < 30) return d + ' ימים';
      if (d < 365) return Math.floor(d / 30) + ' חודשים';
      return Math.floor(d / 365) + ' שנים';
    } catch (e) { return '—'; }
  }

  function todayISO() {
    return new Date().toISOString().substring(0, 10);
  }

  function nextSaturdayISO(from) {
    const d = from ? new Date(from) : new Date();
    while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
    return d.toISOString().substring(0, 10);
  }

  function debounce(fn, ms) {
    let t = null;
    return function() {
      const args = arguments;
      const ctx = this;
      clearTimeout(t);
      t = setTimeout(function() { fn.apply(ctx, args); }, ms);
    };
  }

  function highlightSearch(text, query) {
    if (!query) return escHtml(text);
    const safe = escHtml(text);
    const q = escHtml(query).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!q) return safe;
    return safe.replace(new RegExp('(' + q + ')', 'gi'), '<mark>$1</mark>');
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function formData(formEl) {
    const data = {};
    Array.from(formEl.elements).forEach(function(el) {
      if (!el.name) return;
      if (el.type === 'checkbox') data[el.name] = el.checked;
      else if (el.type === 'number') data[el.name] = el.value === '' ? null : Number(el.value);
      else data[el.name] = el.value;
    });
    return data;
  }

  return {
    escHtml: escHtml,
    escAttr: escAttr,
    initials: initials,
    avatarColor: avatarColor,
    avatarHtml: avatarHtml,
    tribeBadge: tribeBadge,
    fmtDate: fmtDate,
    fmtShortDate: fmtShortDate,
    daysSince: daysSince,
    todayISO: todayISO,
    nextSaturdayISO: nextSaturdayISO,
    debounce: debounce,
    highlightSearch: highlightSearch,
    deepClone: deepClone,
    uuid: uuid,
    formData: formData
  };
})();
