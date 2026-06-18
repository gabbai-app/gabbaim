// Live Mode — the gabbai's primary screen during/before shabbat

const PAGE_LIVE = (function() {
  let _currentDate = null;
  let _currentInfo = null;

  async function render(el, dateParam) {
    el.innerHTML = UI.skeleton(400);
    const synId = STATE.get('currentSynagogueId');
    if (!synId) {
      el.innerHTML = UI.emptyState('יש לבחור בית כנסת');
      return;
    }
    _currentDate = dateParam || UTIL.nextSaturdayISO();
    try {
      const [info, filled, events] = await Promise.all([
        API.read('thisWeekShabbat', { date: _currentDate }),
        API.read('reportShabbatRecap', { date: _currentDate, synagogue_id: synId }, { cacheTtl: 30000 }),
        API.read('eventsForShabbat', { date: _currentDate, synagogue_id: synId }, { cacheTtl: 30000 })
      ]);
      _currentInfo = info;
      el.innerHTML = _build(info, filled || [], events || []);
      _wire();
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el, dateParam); });
    }
  }

  function _build(info, filled, events) {
    const filledMap = {};
    filled.forEach(function(a) { filledMap[a.aliyah_name] = a; });
    const filledMemberMap = {};
    filled.forEach(function(a) { if (a._member) filledMemberMap[a.member_id] = a._member; });

    let html = '';
    html += '<div class="day-banner">';
    html += '<div class="parsha-name"><i class="bi bi-lightning-fill"></i> מצב חי — פרשת ' + UTIL.escHtml(info.parsha || '') + '</div>';
    html += '<div class="hebrew-date">' + UTIL.escHtml(info.hebrew.display) + '</div>';
    html += '<div class="greg-date">' + UTIL.fmtDate(info.date) + ' · ' + UTIL.escHtml(info.day_of_week_name) + ' · ' + UTIL.escHtml(info.aliyot_count) + ' עליות</div>';
    html += '<div class="mt-2 d-flex gap-2 flex-wrap">';
    html += '<button id="prevWeek" class="btn btn-sm btn-light"><i class="bi bi-chevron-right"></i> שבת קודמת</button>';
    html += '<button id="nextWeek" class="btn btn-sm btn-light">שבת הבאה <i class="bi bi-chevron-left"></i></button>';
    html += '</div>';
    html += '</div>';

    if (events.length) {
      html += '<div class="card mb-3 obligation-card">';
      html += '<div class="card-header bg-warning text-dark"><i class="bi bi-exclamation-circle"></i> חיובים השבת (' + events.length + ')</div>';
      html += '<div class="card-body">';
      events.forEach(function(e) {
        const m = e._member || {};
        html += '<div class="member-row obligation-row">' +
          UTIL.avatarHtml(m) +
          '<div class="info"><div class="name">' + UTIL.escHtml((m.first_name || '') + ' ' + (m.last_name || '')) + '</div>' +
          '<div class="meta">' + UTIL.escHtml(e.type) + (e.notes ? ' · ' + UTIL.escHtml(e.notes) : '') + '</div></div>' +
          UTIL.tribeBadge(m.tribe) +
          '<button class="btn btn-sm btn-success ms-auto" data-action="assign-obs" data-event="' + UTIL.escAttr(e.id) + '" data-member="' + UTIL.escAttr(e.member_id) + '">' +
          '<i class="bi bi-check-lg"></i> שייך</button></div>';
      });
      html += '</div></div>';
    }

    html += '<div class="card"><div class="card-header"><i class="bi bi-book"></i> ' + info.aliyot_count + ' עליות</div><div class="card-body p-2">';
    info.aliyot_names.forEach(function(name, i) {
      const f = filledMap[name];
      html += '<div class="aliyah-slot ' + (f ? 'filled' : 'empty') + '" data-aliyah="' + UTIL.escAttr(name) + '" data-order="' + (i + 1) + '">';
      html += '<div class="d-flex align-items-center gap-3">';
      html += '<div class="slot-name">' + UTIL.escHtml(name) + '</div>';
      if (f) {
        const m = filledMemberMap[f.member_id] || {};
        html += UTIL.avatarHtml(m);
        html += '<div class="info flex-grow-1"><div class="member-name">' + UTIL.escHtml((m.first_name || '?') + ' ' + (m.last_name || '')) + '</div>';
        html += '<div class="meta">' + UTIL.escHtml(f.reason || 'רוטציה') + (f.channel === 'voice' ? ' · <i class="bi bi-telephone"></i>' : '') + '</div></div>';
        html += '<button class="btn btn-sm btn-outline-danger" data-action="remove-aliyah" data-id="' + UTIL.escAttr(f.id) + '"><i class="bi bi-x-lg"></i></button>';
      } else {
        html += '<div class="text-muted flex-grow-1"><i class="bi bi-plus-circle"></i> לחץ לבחור מתפלל</div>';
      }
      html += '</div></div>';
    });
    html += '</div></div>';

    return html;
  }

  function _wire() {
    const app = document.getElementById('app');

    app.querySelector('#prevWeek')?.addEventListener('click', function() {
      const d = new Date(_currentDate);
      d.setDate(d.getDate() - 7);
      ROUTER.navigate('/live/' + d.toISOString().substring(0, 10));
    });
    app.querySelector('#nextWeek')?.addEventListener('click', function() {
      const d = new Date(_currentDate);
      d.setDate(d.getDate() + 7);
      ROUTER.navigate('/live/' + d.toISOString().substring(0, 10));
    });

    app.querySelectorAll('.aliyah-slot').forEach(function(slot) {
      slot.addEventListener('click', function(ev) {
        if (ev.target.closest('button')) return;
        const name = slot.dataset.aliyah;
        const order = parseInt(slot.dataset.order);
        _openSlotPicker(name, order);
      });
    });

    app.querySelectorAll('[data-action="remove-aliyah"]').forEach(function(b) {
      b.addEventListener('click', async function(ev) {
        ev.stopPropagation();
        const id = b.dataset.id;
        const ok = await UI.confirm('להסיר עלייה זו?');
        if (!ok) return;
        try {
          await API.write('deleteAliyah', { id: id });
          UI.toast('הוסר', 'info');
          render(document.getElementById('app'), _currentDate);
        } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
      });
    });

    app.querySelectorAll('[data-action="assign-obs"]').forEach(function(b) {
      b.addEventListener('click', function() {
        _assignObligation(b.dataset.event, b.dataset.member);
      });
    });
  }

  async function _openSlotPicker(aliyahName, order) {
    const body = '<div class="search-bar mb-2">' +
      '<input type="text" id="slotSearch" class="form-control form-control-lg" placeholder="חיפוש מתפלל…" autocomplete="off" autofocus>' +
      '</div>' +
      '<h6 class="text-muted mt-2 mb-2">המלצות (לא עלו זמן רב):</h6>' +
      '<div id="suggList" class="pick-list">' + UI.skeleton(250) + '</div>';
    UI.modal('בחר מתפלל לעליית ' + aliyahName, body);

    const synId = STATE.get('currentSynagogueId');
    let allSuggestions = [];
    try {
      allSuggestions = await API.read('suggestForSlot', {
        date: _currentDate, synagogue_id: synId, aliyah_name: aliyahName
      }, { cacheTtl: 20000 });
    } catch (e) {
      document.getElementById('suggList').innerHTML = UI.errorState('שגיאה: ' + e.message);
      return;
    }
    _renderPickList(allSuggestions, aliyahName, order);

    const search = document.getElementById('slotSearch');
    const onSearch = UTIL.debounce(async function() {
      const q = search.value.trim();
      if (!q) { _renderPickList(allSuggestions, aliyahName, order); return; }
      try {
        const res = await API.read('searchMembersByName', { q: q }, { cacheTtl: 10000 });
        const filtered = (res || []).filter(function(m) {
          if (aliyahName === 'כהן') return m.tribe === 'כהן';
          if (aliyahName === 'לוי') return m.tribe === 'לוי';
          return m.tribe === 'ישראל' || !m.tribe;
        });
        _renderPickList(filtered, aliyahName, order, q);
      } catch (e) {
        document.getElementById('suggList').innerHTML = UI.errorState('שגיאה: ' + e.message);
      }
    }, 250);
    search.addEventListener('input', onSearch);
  }

  function _renderPickList(members, aliyahName, order, query) {
    const list = document.getElementById('suggList');
    if (!list) return;
    if (!members.length) {
      list.innerHTML = UI.emptyState('לא נמצאו מתפללים מתאימים');
      return;
    }
    list.innerHTML = members.slice(0, 50).map(function(m) {
      const last = m._lastDate && m._lastDate !== '0000-00-00' ? (UTIL.fmtDate(m._lastDate) + ' (' + UTIL.daysSince(m._lastDate) + ')') : 'מעולם לא';
      const name = (m.first_name || '') + ' ' + (m.last_name || '');
      return '<div class="member-row" data-pick="' + UTIL.escAttr(m.id) + '">' +
        UTIL.avatarHtml(m) +
        '<div class="info"><div class="name">' + (query ? UTIL.highlightSearch(name, query) : UTIL.escHtml(name)) + '</div>' +
        '<div class="meta">עלייה אחרונה: ' + last + '</div></div>' +
        UTIL.tribeBadge(m.tribe) + '</div>';
    }).join('');
    list.querySelectorAll('[data-pick]').forEach(function(row) {
      row.addEventListener('click', function() {
        _pickMember(row.dataset.pick, aliyahName, order);
      });
    });
  }

  async function _pickMember(memberId, aliyahName, order) {
    const synId = STATE.get('currentSynagogueId');
    try {
      await API.write('logAliyah', {
        member_id: memberId,
        synagogue_id: synId,
        aliyah_name: aliyahName,
        aliyah_order: order,
        date: _currentDate,
        channel: 'web',
        reason: 'רוטציה'
      });
      UI.toast('העלייה נרשמה', 'success');
      UI.closeModal();
      render(document.getElementById('app'), _currentDate);
    } catch (e) {
      UI.toast('שגיאה: ' + e.message, 'danger');
    }
  }

  function _assignObligation(eventId, memberId) {
    const info = _currentInfo;
    if (!info) return;
    let html = '<p>בחר עלייה לחיוב:</p><div class="d-flex flex-wrap gap-2" id="slotBtns">';
    info.aliyot_names.forEach(function(name, i) {
      html += '<button class="btn btn-outline-primary" data-slot="' + UTIL.escAttr(name) + '" data-order="' + (i + 1) + '">' + UTIL.escHtml(name) + '</button>';
    });
    html += '</div>';
    UI.modal('שייך חיוב לעלייה', html);
    document.querySelectorAll('#slotBtns button').forEach(function(b) {
      b.addEventListener('click', async function() {
        const synId = STATE.get('currentSynagogueId');
        try {
          await API.write('logAliyah', {
            member_id: memberId,
            synagogue_id: synId,
            aliyah_name: b.dataset.slot,
            aliyah_order: parseInt(b.dataset.order),
            date: _currentDate,
            channel: 'web',
            reason: 'חיוב',
            event_id: eventId
          });
          UI.toast('שובץ', 'success');
          UI.closeModal();
          render(document.getElementById('app'), _currentDate);
        } catch (e) {
          UI.toast('שגיאה: ' + e.message, 'danger');
        }
      });
    });
  }

  return { render: render };
})();
