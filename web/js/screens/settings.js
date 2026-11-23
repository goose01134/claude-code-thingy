/* Margin — Settings and its sub-pages (notifications, focus schedules, emergency access). */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, UI = M.ui, icon = M.icon;
  var ALLOWANCE_PRESETS = [30, 60, 90, 120, 180];
  var RESET_OPTIONS = ['00:00', '03:00', '04:00', '05:00', '06:00'];

  function subHeader(title, eyebrow) {
    return '<button class="back" data-action="go" data-to="settings">' + icon('back', 22) + 'Settings</button>' +
      '<header class="screen-head sub"><div>' + (eyebrow ? '<p class="eyebrow">' + eyebrow + '</p>' : '') +
      '<h1 class="title">' + title + '</h1></div></header>';
  }

  // ---------- root ----------

  function permValue(ok, needed) {
    if (!needed) return 'Not needed';
    return ok ? '<span class="perm-ok">' + icon('check', 15) + 'On</span>' : '<span class="perm-off">Off</span>';
  }

  /** Android permissions with their live status (simulated in the browser demo). */
  function permissionsGroup() {
    var p = M.app.permissions();
    if (!p) return '';
    var demo = S.mode === 'demo';
    var rows =
      UI.row({ lead: UI.tileIcon('eye'), title: 'Usage access', sub: 'Measures time spent in apps',
        value: permValue(p.usage, true), chevron: !p.usage, action: p.usage ? null : 'perm', attrs: 'data-which="usage"' }) +
      UI.row({ lead: UI.tileIcon('layers'), title: 'Display over other apps', sub: 'Shows the lock screen when time’s up',
        value: permValue(p.overlay, p.overlayNeeded), chevron: p.overlayNeeded && !p.overlay,
        action: p.overlayNeeded && !p.overlay ? 'perm' : null, attrs: 'data-which="overlay"' }) +
      UI.row({ lead: UI.tileIcon('bell'), title: 'Notifications', sub: 'Reminders and summaries',
        value: permValue(p.notifications, true), chevron: !p.notifications, action: p.notifications ? null : 'perm', attrs: 'data-which="notifications"' }) +
      (p.batteryRelevant
        ? UI.row({ lead: UI.tileIcon('battery'), title: 'Battery optimisation', sub: p.battery ? 'Margin can run freely' : 'Optional: keeps the timer reliable',
          value: p.battery ? permValue(true, true) : 'Optimised', chevron: true, action: 'perm', attrs: 'data-which="battery"' })
        : '');
    var foot = p.blocking
      ? 'Margin is measuring your app time and will close counted apps when time’s up.'
      : 'Margin can’t close apps until the permissions above are on.';
    if (demo) foot += ' In the browser demo these are simulated.';
    return UI.group('Permissions', rows, foot, 'inset-icon');
  }

  function rootView(s) {
    var focusOn = s.focus.filter(function (f) { return f.enabled; }).length;
    var notifOn = [s.notifications.warnings, s.notifications.dailySummary, s.notifications.weeklyReport, s.notifications.streaks]
      .filter(Boolean).length;
    var tracked = S.trackedIds().length;

    return '<header class="screen-head"><div><p class="eyebrow">Margin</p><h1 class="title">Settings</h1></div></header>' +
      '<button class="profile card" data-action="edit-name">' +
      '<span class="avatar">' + (s.name ? U.esc(s.name.charAt(0).toUpperCase()) : icon('user', 22)) + '</span>' +
      '<span class="profile-main"><span class="profile-name">' + (s.name ? U.esc(s.name) : 'Add your name') + '</span><span class="row-sub">' +
      U.fmt(s.allowance) + ' a day · resets at ' + U.clockLabel(s.resetTime) + '</span></span>' +
      '<span class="row-chev">' + icon('chevron', 18) + '</span>' +
      '</button>' +
      UI.group('Allowance',
        UI.row({ lead: UI.tileIcon('hourglass'), title: 'Daily allowance', value: U.fmt(s.allowance), chevron: true, action: 'edit-allowance' }) +
        UI.row({ lead: UI.tileIcon('clock'), title: 'Reset time', value: U.clockLabel(s.resetTime), chevron: true, action: 'edit-reset' }) +
        UI.row({ lead: UI.tileIcon('grid'), title: 'Counted apps', value: tracked + (tracked === 1 ? ' app' : ' apps'), chevron: true, action: 'go', attrs: 'data-to="apps"' }),
        'Your allowance is shared by all counted apps and renews every day at your reset time.', 'inset-icon') +
      '<div class="group"><p class="group-label">Appearance</p>' + UI.themePicker(s.theme, 'set-theme') + '</div>' +
      UI.group('Wellbeing',
        UI.row({ lead: UI.tileIcon('bell'), title: 'Notifications', value: notifOn ? notifOn + ' on' : 'Off', chevron: true, action: 'go', attrs: 'data-to="settings" data-sub="notifications"' }) +
        UI.row({ lead: UI.tileIcon('moon'), title: 'Focus schedules', value: focusOn ? focusOn + ' active' : 'Off', chevron: true, action: 'go', attrs: 'data-to="settings" data-sub="focus"' }) +
        UI.row({ lead: UI.tileIcon('shield'), title: 'Emergency access', value: s.emergency.enabled ? s.emergency.minutes + ' min' : 'Off', chevron: true, action: 'go', attrs: 'data-to="settings" data-sub="emergency"' }),
        null, 'inset-icon') +
      permissionsGroup() +
      UI.group(null,
        UI.row({ lead: UI.tileIcon('sparkle'), title: 'Run setup again', chevron: true, action: 'restart-setup' }) +
        UI.row({ title: S.mode === 'demo' ? 'Reset demo data' : 'Reset all settings', action: 'reset-all', danger: true }),
        S.mode === 'demo'
          ? 'Margin 1.0 · Browser demo. Usage and app blocking are simulated.'
          : 'Margin 1.0 · Everything stays on this phone. Margin has no internet access.',
        'inset-icon');
  }

  // ---------- notifications ----------

  function notificationsView(s) {
    var n = s.notifications;
    var p = M.app.permissions();
    var blocked = p && !p.notifications;
    return subHeader('Notifications') +
      (blocked
        ? '<button class="banner warn" data-action="perm" data-which="notifications">' + icon('bell', 20) +
          '<span class="banner-main"><span class="banner-title">Notifications are off for Margin</span>' +
          '<span class="banner-sub">Turn them on to get these reminders.</span></span>' + icon('chevron', 18) + '</button>'
        : '') +
      UI.group(null,
        '<div class="row"><span class="row-main"><span class="row-title">Limit warnings</span><span class="row-sub">A gentle heads-up before time runs out</span></span>' +
        UI.toggle(n.warnings, 'toggle-notif', 'data-key="warnings"') + '</div>' +
        (n.warnings
          ? '<div class="row column"><span class="row-title small">Remind me when this much is left</span>' +
            UI.segmented([{ value: 5, label: '5 min' }, { value: 15, label: '15 min' }, { value: 30, label: '30 min' }], n.warnAt, 'set-warn-at') + '</div>'
          : ''),
        null) +
      UI.group('Summaries',
        '<div class="row"><span class="row-main"><span class="row-title">Daily summary</span><span class="row-sub">Each evening at 9:00 PM</span></span>' +
        UI.toggle(n.dailySummary, 'toggle-notif', 'data-key="dailySummary"') + '</div>' +
        '<div class="row"><span class="row-main"><span class="row-title">Weekly report</span><span class="row-sub">Sunday mornings</span></span>' +
        UI.toggle(n.weeklyReport, 'toggle-notif', 'data-key="weeklyReport"') + '</div>' +
        '<div class="row"><span class="row-main"><span class="row-title">Streaks</span><span class="row-sub">When you stay within your allowance</span></span>' +
        UI.toggle(n.streaks, 'toggle-notif', 'data-key="streaks"') + '</div>',
        'Margin never sends more than three notifications a day.');
  }

  // ---------- focus ----------

  function focusView(s) {
    var active = S.activeFocus();
    var rows = s.focus.map(function (f) {
      var isNow = active && active.id === f.id;
      return '<div class="row pressable" data-action="edit-focus" data-id="' + f.id + '">' +
        '<span class="row-main"><span class="row-title">' + U.esc(f.name) + (isNow ? '<span class="pill">Now</span>' : '') + '</span>' +
        '<span class="row-sub tnum">' + U.daysSummary(f.days) + ' · ' + U.clockLabel(f.start) + ' – ' + U.clockLabel(f.end) + '</span></span>' +
        UI.toggle(f.enabled, 'toggle-focus', 'data-id="' + f.id + '"') + '</div>';
    }).join('');
    return subHeader('Focus schedules') +
      '<p class="lede">During a focus schedule, tracked apps stay closed no matter how much allowance is left.</p>' +
      (s.focus.length ? UI.group('Schedules', rows, 'Tap a schedule to edit it.') : '<p class="empty card">No schedules yet.</p>') +
      '<button class="btn btn-secondary btn-block" data-action="new-focus">' + icon('plus', 18) + 'New schedule</button>';
  }

  var draft = null;

  function focusSheet() {
    var isNew = !draft.existing;
    var order = [1, 2, 3, 4, 5, 6, 0];
    return '<div class="sheet-head"><h2 class="sheet-title">' + (isNew ? 'New schedule' : 'Edit schedule') + '</h2>' +
      '<button class="icon-btn plain" aria-label="Close" data-action="sheet-close">' + icon('close', 16) + '</button></div>' +
      '<div class="field-group"><label class="field-label" for="focus-name">Name</label>' +
      '<input id="focus-name" class="field" type="text" maxlength="28" value="' + U.esc(draft.name) + '" data-input="focus-name" placeholder="e.g. Study"></div>' +
      '<div class="field-group"><span class="field-label">Repeat</span><div class="chips">' +
      order.map(function (d) {
        return '<button class="chip day' + (draft.days.indexOf(d) >= 0 ? ' on' : '') + '" data-action="focus-day" data-day="' + d + '" aria-label="' + U.DAYS_LONG[d] + '">' + U.DAYS_LETTER[d] + '</button>';
      }).join('') + '</div></div>' +
      '<div class="field-group time-pair">' +
      '<div><label class="field-label" for="focus-start">Starts</label><input id="focus-start" class="field" type="time" value="' + draft.start + '" data-input="focus-start"></div>' +
      '<div><label class="field-label" for="focus-end">Ends</label><input id="focus-end" class="field" type="time" value="' + draft.end + '" data-input="focus-end"></div>' +
      '</div>' +
      '<div class="sheet-actions">' +
      '<button class="btn btn-primary btn-block" data-action="save-focus"' + (draft.days.length ? '' : ' disabled') + '>Save schedule</button>' +
      (isNew ? '' : '<button class="btn btn-quiet btn-block danger-text" data-action="delete-focus">Delete schedule</button>') +
      '</div>';
  }

  // ---------- emergency ----------

  function emergencyView(s) {
    var e = s.emergency;
    return subHeader('Emergency access') +
      '<p class="lede">For the moments you genuinely need an app — a message from family, a boarding pass. Unlocking takes a deliberate press and hold.</p>' +
      UI.group(null,
        '<div class="row"><span class="row-main"><span class="row-title">Allow emergency access</span><span class="row-sub">Available from the lockout screen</span></span>' +
        UI.toggle(e.enabled, 'toggle-emergency') + '</div>', null) +
      (e.enabled
        ? '<div class="group"><p class="group-label">Duration</p>' +
          UI.segmented([{ value: 1, label: '1 min' }, { value: 5, label: '5 min' }, { value: 10, label: '10 min' }, { value: 15, label: '15 min' }], e.minutes, 'set-emergency', 'lg') +
          '</div>' +
          '<div class="group"><p class="group-label">Uses per day</p>' +
          UI.segmented([{ value: 1, label: 'Once' }, { value: 2, label: 'Twice' }, { value: 3, label: '3 times' }], e.perDay, 'set-emergency-uses', 'lg') +
          '</div>' +
          '<div class="group"><p class="group-label">Hold to unlock</p>' +
          UI.segmented([{ value: 3, label: '3 sec' }, { value: 5, label: '5 sec' }, { value: 10, label: '10 sec' }], e.hold, 'set-emergency-hold', 'lg') +
          '<p class="group-foot">A short pause makes it a deliberate choice rather than a reflex.</p></div>' +
          UI.group('Today', UI.row({ title: 'Used', value: s.emergencyUsed + ' of ' + e.perDay }), null)
        : '');
  }

  function render(s, route) {
    var inner;
    if (route.sub === 'notifications') inner = notificationsView(s);
    else if (route.sub === 'focus') inner = focusView(s);
    else if (route.sub === 'emergency') inner = emergencyView(s);
    else inner = rootView(s);
    return '<section class="screen settings"><div class="stagger">' + inner + '</div></section>';
  }

  M.screens.settings = { render: render };

  // ---------- sheets ----------

  function allowanceSheet(s) {
    return '<div class="sheet-head"><h2 class="sheet-title">Daily allowance</h2>' +
      '<button class="icon-btn plain" aria-label="Close" data-action="sheet-close">' + icon('close', 16) + '</button></div>' +
      '<div class="allowance-picker">' +
      '<button class="stepper-btn lg" aria-label="Decrease" data-action="allowance-dec"' + (s.allowance <= 15 ? ' disabled' : '') + '>' + icon('minus', 22) + '</button>' +
      '<div class="allowance-value"><span class="tnum">' + U.fmt(s.allowance) + '</span><small>per day</small></div>' +
      '<button class="stepper-btn lg" aria-label="Increase" data-action="allowance-inc"' + (s.allowance >= 360 ? ' disabled' : '') + '>' + icon('plus', 22) + '</button>' +
      '</div>' +
      '<div class="chips centered">' + ALLOWANCE_PRESETS.map(function (m) {
        return '<button class="chip' + (s.allowance === m ? ' on' : '') + '" data-action="allowance-set" data-value="' + m + '">' + U.fmt(m) + '</button>';
      }).join('') + '</div>' +
      '<p class="group-foot center">Most people find 1–2 hours a comfortable place to start.</p>' +
      '<div class="sheet-actions"><button class="btn btn-primary btn-block" data-action="sheet-close">Done</button></div>';
  }

  function resetSheet(s) {
    return '<div class="sheet-head"><h2 class="sheet-title">Reset time</h2>' +
      '<button class="icon-btn plain" aria-label="Close" data-action="sheet-close">' + icon('close', 16) + '</button></div>' +
      '<div class="list">' + RESET_OPTIONS.map(function (t) {
        return UI.row({
          title: U.clockLabel(t), sub: t === '04:00' ? 'Recommended — your day won’t end at midnight' : null,
          action: 'reset-set', attrs: 'data-value="' + t + '"', cls: s.resetTime === t ? 'selected' : '',
          right: '<span class="option-check">' + icon('check', 20) + '</span>'
        });
      }).join('') + '</div>' +
      '<p class="group-foot">Your allowance, app limits and emergency access renew at this time.</p>';
  }

  // ---------- actions ----------

  var A = M.actions;

  A['edit-allowance'] = function () { UI.sheet.open(allowanceSheet, { live: true }); };
  A['allowance-dec'] = function () { S.update(function (s) { s.allowance = Math.max(15, s.allowance - 15); }); };
  A['allowance-inc'] = function () { S.update(function (s) { s.allowance = Math.min(360, s.allowance + 15); }); };
  A['allowance-set'] = function (el) {
    var v = parseInt(el.getAttribute('data-value'), 10);
    S.update(function (s) { s.allowance = v; });
  };

  A['edit-reset'] = function () { UI.sheet.open(resetSheet, { live: true }); };
  A['reset-set'] = function (el) {
    var v = el.getAttribute('data-value');
    S.update(function (s) { s.resetTime = v; });
    setTimeout(UI.sheet.close, 220);
  };

  A['set-theme'] = function (el) {
    var v = el.getAttribute('data-value');
    if (S.get().theme === v) return;
    M.app.applyTheme(true, v);
    S.update(function (s) { s.theme = v; });
  };

  A['edit-name'] = function () {
    UI.sheet.open(function (s) {
      return '<div class="sheet-head"><h2 class="sheet-title">Your name</h2>' +
        '<button class="icon-btn plain" aria-label="Close" data-action="sheet-close">' + icon('close', 16) + '</button></div>' +
        '<div class="field-group"><label class="field-label" for="name-field">Used for your greeting on Home</label>' +
        '<input id="name-field" class="field" type="text" maxlength="24" autocomplete="given-name" value="' + U.esc(s.name) +
        '" placeholder="First name" data-input="name-draft"></div>' +
        '<div class="sheet-actions"><button class="btn btn-primary btn-block" data-action="save-name">Save</button></div>';
    });
    nameDraft = S.get().name;
  };
  var nameDraft = '';
  M.inputs = M.inputs || {};
  M.inputs['name-draft'] = function (el) { nameDraft = el.value; };
  A['save-name'] = function () {
    var v = (nameDraft || '').replace(/^\s+|\s+$/g, '');
    S.update(function (s) { s.name = v; });
    UI.sheet.close();
  };

  A['restart-setup'] = function () {
    S.restartOnboarding();
    M.onboarding.start();
  };

  A['toggle-notif'] = function (el) {
    var k = el.getAttribute('data-key');
    S.update(function (s) { s.notifications[k] = !s.notifications[k]; });
  };
  A['set-warn-at'] = function (el) {
    var v = parseInt(el.getAttribute('data-value'), 10);
    S.update(function (s) { s.notifications.warnAt = v; });
  };

  A['toggle-focus'] = function (el, e) {
    if (e) e.stopPropagation();
    var id = el.getAttribute('data-id');
    S.update(function (s) { s.focus.forEach(function (f) { if (f.id === id) f.enabled = !f.enabled; }); });
  };
  A['edit-focus'] = function (el) {
    var id = el.getAttribute('data-id');
    var f = S.get().focus.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    draft = { existing: id, name: f.name, days: f.days.slice(), start: f.start, end: f.end };
    UI.sheet.open(focusSheet);
  };
  A['new-focus'] = function () {
    draft = { existing: null, name: '', days: [1, 2, 3, 4, 5], start: '18:00', end: '20:00' };
    UI.sheet.open(focusSheet);
  };
  A['focus-day'] = function (el) {
    var d = parseInt(el.getAttribute('data-day'), 10);
    var i = draft.days.indexOf(d);
    if (i >= 0) draft.days.splice(i, 1); else draft.days.push(d);
    UI.sheet.refresh();
  };
  A['save-focus'] = function () {
    var d = draft;
    var name = (d.name || '').trim() || 'Focus';
    S.update(function (s) {
      if (d.existing) {
        s.focus.forEach(function (f) {
          if (f.id === d.existing) { f.name = name; f.days = d.days; f.start = d.start; f.end = d.end; }
        });
      } else {
        s.focus.push({ id: 'f' + Date.now(), name: name, days: d.days, start: d.start, end: d.end, enabled: true });
      }
    });
    UI.sheet.close();
    UI.toast(d.existing ? 'Schedule updated' : 'Schedule created');
  };
  A['delete-focus'] = function () {
    var id = draft.existing;
    S.update(function (s) { s.focus = s.focus.filter(function (f) { return f.id !== id; }); });
    UI.sheet.close();
    UI.toast('Schedule deleted');
  };

  M.inputs = M.inputs || {};
  M.inputs['focus-name'] = function (el) { if (draft) draft.name = el.value; };
  M.inputs['focus-start'] = function (el) { if (draft && el.value) draft.start = el.value; };
  M.inputs['focus-end'] = function (el) { if (draft && el.value) draft.end = el.value; };

  A['toggle-emergency'] = function () { S.update(function (s) { s.emergency.enabled = !s.emergency.enabled; }); };
  A['set-emergency'] = function (el) {
    var v = parseInt(el.getAttribute('data-value'), 10);
    S.update(function (s) { s.emergency.minutes = v; });
  };
  A['set-emergency-uses'] = function (el) {
    var v = parseInt(el.getAttribute('data-value'), 10);
    S.update(function (s) { s.emergency.perDay = v; });
  };
  A['set-emergency-hold'] = function (el) {
    var v = parseInt(el.getAttribute('data-value'), 10);
    S.update(function (s) { s.emergency.hold = v; });
  };

  A['reset-all'] = function () {
    var demo = S.mode === 'demo';
    UI.sheet.open(function () {
      return '<div class="sheet-head"><h2 class="sheet-title">' + (demo ? 'Reset demo data?' : 'Reset all settings?') + '</h2></div>' +
        '<p class="lede">' + (demo
          ? 'This restores the sample usage and clears your choices, then runs setup again.'
          : 'This clears your allowance, counted apps, limits and schedules, then runs setup again. Your phone’s own usage history isn’t affected.') + '</p>' +
        '<div class="sheet-actions">' +
        '<button class="btn btn-danger btn-block" data-action="reset-all-confirm">Reset</button>' +
        '<button class="btn btn-quiet btn-block" data-action="sheet-close">Cancel</button></div>';
    });
  };
  A['reset-all-confirm'] = function () {
    UI.sheet.close();
    S.resetAll();
    M.onboarding.start();
  };
})(window.M);
