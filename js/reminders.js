// Reminders — opt-in Browser Notification API
//
// When user enables reminders, we register a periodic "check" that fires:
//   1. Pre-shabbat reminder (Thursday evening) — listing obligations.
//   2. Special-shabbat alert — if a minhag applies and we haven't told yet.
//
// Schedule is checked on every page focus/load (no background timer needed
// since the SW can't run reliably without Push API which requires a server).
//
// Tracking: which reminders were already shown — localStorage gabbai_reminded.

const REMINDERS = (function() {
  const SHOWN_KEY = 'gabbai_reminded_v1';

  function _shown() {
    try { return JSON.parse(localStorage.getItem(SHOWN_KEY) || '{}'); }
    catch (e) { return {}; }
  }
  function _markShown(key) {
    try {
      const s = _shown(); s[key] = Date.now();
      localStorage.setItem(SHOWN_KEY, JSON.stringify(s));
    } catch (e) {}
  }
  function _wasShown(key, withinMs) {
    const s = _shown();
    if (!s[key]) return false;
    if (!withinMs) return true;
    return (Date.now() - s[key]) < withinMs;
  }

  function permission() {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission; // 'default' | 'granted' | 'denied'
  }

  async function request() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    try { return await Notification.requestPermission(); }
    catch (e) { return 'denied'; }
  }

  function notify(title, body, tag) {
    if (Notification.permission !== 'granted') return null;
    try {
      return new Notification(title, {
        body: body,
        tag: tag || 'gabbai',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        dir: 'rtl',
        lang: 'he',
        renotify: false
      });
    } catch (e) { return null; }
  }

  // Called from app.js after boot and on focus
  async function checkAndRemind() {
    if (Notification.permission !== 'granted') return;
    const synId = STATE.get('currentSynagogueId');
    if (!synId) return;

    const today = new Date();
    const dow = today.getDay();
    const upcomingShabbatISO = UTIL.nextSaturdayISO(today.toISOString());
    const info = CAL.dayInfo(upcomingShabbatISO);
    const todayKey = today.toISOString().substring(0, 10);

    // 1. Special-shabbat alert (Thursday or Friday morning of a special week)
    if (dow === 4 || dow === 5) {
      const minhagim = (window.MINHAGIM && MINHAGIM.forDayInfo(info)) || [];
      for (const m of minhagim) {
        const k = 'minhag:' + m.key + ':' + upcomingShabbatISO;
        if (!_wasShown(k, 6 * 86400000)) {
          notify(
            'השבת: ' + m.name,
            m.summary.substring(0, 100),
            k
          );
          _markShown(k);
        }
      }
    }

    // 2. Obligations reminder (Thursday night → Friday morning)
    if (dow === 4 || dow === 5) {
      try {
        const events = await API.read('eventsForShabbat', { synagogue_id: synId, date: upcomingShabbatISO });
        if (events && events.length) {
          const k = 'obs:' + upcomingShabbatISO;
          if (!_wasShown(k, 4 * 86400000)) {
            const names = events.map(function(e) {
              const m = e._member || {};
              return (m.first_name || '') + ' ' + (m.last_name || '');
            }).join(', ');
            notify(
              'חיובים השבת (' + events.length + ')',
              'יש לזכור: ' + names.substring(0, 120),
              k
            );
            _markShown(k);
          }
        }
      } catch (e) { console.warn('obligation reminder failed', e); }
    }
  }

  return { permission: permission, request: request, notify: notify, checkAndRemind: checkAndRemind };
})();
