// Live Mode — the gabbai's primary screen
// Shows ALL kavodot (honors) for the day, grouped by category:
//   פתיחות → עליות → הגבהה → גלילה → הפטרה → הכנסה → מיוחדים
// Includes accurate parsha & special-day detection via hebcal.

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
      // If user navigated to a non-shabbat date, use it as-is (don't snap to shabbat)
      const actualInfo = dateParam ? CAL.dayInfo(dateParam) : info;
      _currentInfo = actualInfo;
      el.innerHTML = _build(actualInfo, filled || [], events || []);
      _wire();
    } catch (e) {
      el.innerHTML = UI.errorState('שגיאה: ' + e.message, function() { render(el, dateParam); });
    }
  }

  function _build(info, filled, events) {
    // Map of which kavod is filled
    const filledMap = {};
    filled.forEach(function(a) { filledMap[a.aliyah_name] = a; });
    const filledMemberMap = {};
    filled.forEach(function(a) { if (a._member) filledMemberMap[a.member_id] = a._member; });

    const kavodGroups = KAVODOT.grouped(info.type);

    let html = '';
    html += _renderBanner(info);
    html += _renderObligations(events);
    html += _renderDateNav(info);

    if (!kavodGroups.length) {
      html += UI.emptyState('אין קריאה בתורה ביום זה (יום חול ללא ס"ת).');
    } else {
      kavodGroups.forEach(function(group) {
        html += _renderGroup(group, filledMap, filledMemberMap, info);
      });
    }
    return html;
  }

  function _renderBanner(info) {
    const dayLabels = {
      shabbat: 'שבת',
      shabbat_special: 'שבת מיוחדת',
      sheni_chamishi: 'שני / חמישי',
      rosh_chodesh: 'ראש חודש',
      chol_hamoed: 'חול המועד',
      chanukah: 'חנוכה',
      fast: 'תענית',
      purim: 'פורים',
      yom_tov: 'יום טוב',
      yom_kippur: 'יום הכיפורים',
      weekday_no_torah: 'יום חול'
    };
    const dayLabel = dayLabels[info.type] || info.day_of_week_name;

    let chips = '';
    if (info.is_special_shabbat) chips += '<span class="badge bg-warning text-dark me-1">' + UTIL.escHtml(info.special_shabbat_name) + '</span>';
    if (info.is_rosh_chodesh) chips += '<span class="badge bg-info me-1">ראש חודש</span>';
    if (info.two_torahs) chips += '<span class="badge bg-secondary me-1">2 ספרי תורה</span>';
    if (info.is_yom_tov) chips += '<span class="badge bg-success me-1">יום טוב</span>';

    return '<div class="day-banner">' +
      '<div class="parsha-name"><i class="bi bi-lightning-fill"></i> ' +
      (info.parsha ? 'פרשת ' + UTIL.escHtml(info.parsha) : UTIL.escHtml(dayLabel)) +
      '</div>' +
      '<div class="hebrew-date">' + UTIL.escHtml(info.hebrew.display) + '</div>' +
      '<div class="greg-date">' + UTIL.fmtDate(info.date) + ' · ' + UTIL.escHtml(info.day_of_week_name) +
        ' · ' + UTIL.escHtml(dayLabel) + ' · ' + UTIL.escHtml(info.aliyot_count) + ' עליות</div>' +
      (chips ? '<div class="mt-2">' + chips + '</div>' : '') +
      '</div>';
  }

  function _renderObligations(events) {
    if (!events.length) return '';
    let html = '<div class="card mb-3"><div class="card-header bg-warning text-dark"><i class="bi bi-exclamation-circle"></i> חיובים השבת (' + events.length + ')</div><div class="card-body">';
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
    return html;
  }

  function _renderDateNav(info) {
    return '<div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">' +
      '<div class="btn-group flex-wrap">' +
        '<button id="prevDay" class="btn btn-sm btn-outline-secondary"><i class="bi bi-chevron-right"></i> יום קודם</button>' +
        '<button id="prevWeek" class="btn btn-sm btn-outline-secondary">שבת קודמת</button>' +
        '<button id="goToday" class="btn btn-sm btn-outline-primary">היום</button>' +
        '<button id="goShabbat" class="btn btn-sm btn-outline-primary">השבת הקרובה</button>' +
        '<button id="nextWeek" class="btn btn-sm btn-outline-secondary">שבת הבאה</button>' +
        '<button id="nextDay" class="btn btn-sm btn-outline-secondary">יום הבא <i class="bi bi-chevron-left"></i></button>' +
      '</div>' +
      '<div class="d-flex gap-2 flex-wrap">' +
      '<a href="#/print/' + UTIL.escAttr(info.date) + '" class="btn btn-sm btn-outline-success"><i class="bi bi-printer"></i> הדפס סידור</a>' +
      '<input type="date" id="datePick" class="form-control form-control-sm" style="width:auto;" value="' + UTIL.escAttr(info.date) + '">' +
      '</div></div>';
  }

  function _renderGroup(group, filledMap, filledMemberMap, info) {
    const cat = group.category;
    const meta = group.info;
    let html = '<div class="card mb-3">' +
      '<div class="card-header d-flex align-items-center" style="color:' + meta.color + ';">' +
      '<i class="bi ' + meta.icon + ' me-2"></i>' +
      '<b>' + UTIL.escHtml(meta.label) + '</b>' +
      '<span class="badge bg-light text-dark ms-auto">' + group.items.length + '</span>' +
      '</div><div class="card-body p-2">';
    group.items.forEach(function(k) {
      html += _renderSlot(k, filledMap[k.id], filledMemberMap, info, cat);
    });
    html += '</div></div>';
    return html;
  }

  function _renderSlot(kavod, filledEntry, filledMemberMap, info, category) {
    const isFilled = !!filledEntry;
    const tribeChip = kavod.tribe ? UTIL.tribeBadge(kavod.tribe) : '';
    let html = '<div class="aliyah-slot ' + (isFilled ? 'filled' : 'empty') + '" data-kavod="' + UTIL.escAttr(kavod.id) + '" data-tribe="' + UTIL.escAttr(kavod.tribe || '') + '" data-cat="' + UTIL.escAttr(category) + '">';
    html += '<div class="d-flex align-items-center gap-3 flex-wrap">';
    html += '<div class="slot-name">' + UTIL.escHtml(kavod.id) + '</div>';
    if (kavod.tribe) html += tribeChip;
    if (isFilled) {
      const m = filledMemberMap[filledEntry.member_id] || {};
      html += UTIL.avatarHtml(m);
      html += '<div class="info flex-grow-1"><div class="member-name">' + UTIL.escHtml((m.first_name || '?') + ' ' + (m.last_name || '')) + '</div>';
      html += '<div class="meta">' + UTIL.escHtml(filledEntry.reason || 'רוטציה') + (filledEntry.channel === 'voice' ? ' · <i class="bi bi-telephone"></i>' : '') + '</div></div>';
      html += '<button class="btn btn-sm btn-outline-danger" data-action="remove-aliyah" data-id="' + UTIL.escAttr(filledEntry.id) + '"><i class="bi bi-x-lg"></i></button>';
    } else {
      const hint = kavod.note ? '<small class="text-muted">' + UTIL.escHtml(kavod.note) + '</small>' : '';
      html += '<div class="text-muted flex-grow-1"><i class="bi bi-plus-circle"></i> לחץ לבחור מתפלל ' + hint + '</div>';
    }
    html += '</div></div>';
    return html;
  }

  function _wire() {
    const app = document.getElementById('app');

    app.querySelector('#prevDay')?.addEventListener('click', function() {
      const d = new Date(_currentDate); d.setDate(d.getDate() - 1);
      ROUTER.navigate('/live/' + d.toISOString().substring(0, 10));
    });
    app.querySelector('#nextDay')?.addEventListener('click', function() {
      const d = new Date(_currentDate); d.setDate(d.getDate() + 1);
      ROUTER.navigate('/live/' + d.toISOString().substring(0, 10));
    });
    app.querySelector('#prevWeek')?.addEventListener('click', function() {
      const d = new Date(_currentDate); d.setDate(d.getDate() - 7);
      ROUTER.navigate('/live/' + d.toISOString().substring(0, 10));
    });
    app.querySelector('#nextWeek')?.addEventListener('click', function() {
      const d = new Date(_currentDate); d.setDate(d.getDate() + 7);
      ROUTER.navigate('/live/' + d.toISOString().substring(0, 10));
    });
    app.querySelector('#goToday')?.addEventListener('click', function() {
      ROUTER.navigate('/live/' + new Date().toISOString().substring(0, 10));
    });
    app.querySelector('#goShabbat')?.addEventListener('click', function() {
      ROUTER.navigate('/live/' + UTIL.nextSaturdayISO());
    });
    app.querySelector('#datePick')?.addEventListener('change', function(ev) {
      ROUTER.navigate('/live/' + ev.target.value);
    });

    app.querySelectorAll('.aliyah-slot').forEach(function(slot) {
      slot.addEventListener('click', function(ev) {
        if (ev.target.closest('button')) return;
        const kavodName = slot.dataset.kavod;
        const tribe = slot.dataset.tribe || null;
        const cat = slot.dataset.cat;
        _openSlotPicker(kavodName, tribe, cat);
      });
    });

    app.querySelectorAll('[data-action="remove-aliyah"]').forEach(function(b) {
      b.addEventListener('click', async function(ev) {
        ev.stopPropagation();
        const id = b.dataset.id;
        const ok = await UI.confirm('להסיר?');
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

  async function _openSlotPicker(kavodName, tribe, category) {
    const body = '<div class="search-bar mb-2">' +
      '<input type="text" id="slotSearch" class="form-control form-control-lg" placeholder="חיפוש מתפלל…" autocomplete="off" autofocus>' +
      '</div>' +
      '<h6 class="text-muted mt-2 mb-2">' +
      (category === 'aliyah' ? 'המלצות (לא עלו זמן רב):' : 'מתפללים פעילים:') +
      '</h6>' +
      '<div id="suggList" class="pick-list">' + UI.skeleton(250) + '</div>';
    UI.modal('בחר מתפלל ל-' + UTIL.escHtml(kavodName), body);

    const synId = STATE.get('currentSynagogueId');
    let allSuggestions = [];
    try {
      if (category === 'aliyah') {
        allSuggestions = await API.read('suggestForSlot', {
          date: _currentDate, synagogue_id: synId, aliyah_name: tribe === 'כהן' ? 'כהן' : tribe === 'לוי' ? 'לוי' : 'שלישי'
        }, { cacheTtl: 20000 });
      } else {
        // For non-aliyah kavodot, show all active members sorted by least recent
        const members = await API.read('listMembers', { synagogue_id: synId, status: 'active' });
        const lastMap = await API.read('lastAliyahPerMember', { synagogue_id: synId });
        members.forEach(function(m) {
          m._lastDate = (lastMap[m.id] && lastMap[m.id].date) || '0000-00-00';
        });
        members.sort(function(a, b) { return String(a._lastDate).localeCompare(String(b._lastDate)); });
        allSuggestions = members.slice(0, 30);
      }
    } catch (e) {
      document.getElementById('suggList').innerHTML = UI.errorState('שגיאה: ' + e.message);
      return;
    }
    _renderPickList(allSuggestions, kavodName, tribe, category);

    const search = document.getElementById('slotSearch');
    const onSearch = UTIL.debounce(async function() {
      const q = search.value.trim();
      if (!q) { _renderPickList(allSuggestions, kavodName, tribe, category); return; }
      try {
        const res = await API.read('searchMembersByName', { q: q }, { cacheTtl: 10000 });
        let filtered = res || [];
        if (tribe === 'כהן') filtered = filtered.filter(function(m) { return m.tribe === 'כהן'; });
        else if (tribe === 'לוי') filtered = filtered.filter(function(m) { return m.tribe === 'לוי'; });
        else if (tribe === 'ישראל') filtered = filtered.filter(function(m) { return m.tribe === 'ישראל' || !m.tribe; });
        _renderPickList(filtered, kavodName, tribe, category, q);
      } catch (e) {
        document.getElementById('suggList').innerHTML = UI.errorState('שגיאה: ' + e.message);
      }
    }, 250);
    search.addEventListener('input', onSearch);
  }

  function _renderPickList(members, kavodName, tribe, category, query) {
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
        _pickMember(row.dataset.pick, kavodName, category);
      });
    });
  }

  async function _pickMember(memberId, kavodName, category) {
    const synId = STATE.get('currentSynagogueId');
    try {
      await API.write('logAliyah', {
        member_id: memberId,
        synagogue_id: synId,
        aliyah_name: kavodName,
        aliyah_order: 0,
        date: _currentDate,
        channel: 'web',
        reason: category === 'aliyah' ? 'רוטציה' : 'כיבוד'
      });
      UI.toast('נרשם', 'success');
      UI.closeModal();
      render(document.getElementById('app'), _currentDate);
    } catch (e) {
      UI.toast('שגיאה: ' + e.message, 'danger');
    }
  }

  function _assignObligation(eventId, memberId) {
    const info = _currentInfo;
    if (!info) return;
    const aliyot = (KAVODOT.forDayType(info.type) || []).filter(function(k) { return k.cat === 'aliyah'; });
    if (!aliyot.length) { UI.toast('אין עליות ביום זה', 'warning'); return; }
    let html = '<p>בחר עלייה לחיוב:</p><div class="d-flex flex-wrap gap-2" id="slotBtns">';
    aliyot.forEach(function(k) {
      html += '<button class="btn btn-outline-primary" data-slot="' + UTIL.escAttr(k.id) + '">' + UTIL.escHtml(k.id) + '</button>';
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
            aliyah_order: 0,
            date: _currentDate,
            channel: 'web',
            reason: 'חיוב',
            event_id: eventId
          });
          UI.toast('שובץ', 'success');
          UI.closeModal();
          render(document.getElementById('app'), _currentDate);
        } catch (e) { UI.toast('שגיאה: ' + e.message, 'danger'); }
      });
    });
  }

  return { render: render };
})();
