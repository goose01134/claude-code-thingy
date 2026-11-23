/* Margin — Applications: tracked apps, limits, add/remove, per-app stats. */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, UI = M.ui, C = M.charts, icon = M.icon;
  var LIMIT_STEP = 5, LIMIT_MIN = 5;
  var view = { showAll: false, query: '' };
  var INITIAL = 12;

  function trackedRow(a) {
    var over = a.used >= a.limit;
    var left = Math.max(0, a.limit - a.used);
    return '<button class="row app-row tall" data-action="open-app-detail" data-id="' + U.esc(a.id) + '">' +
      '<span class="row-lead">' + UI.appIcon(a, 44) + '</span>' +
      '<span class="row-main">' +
      '<span class="row-title">' + U.esc(a.name) + (over && a.strict ? '<span class="pill warn">Limit reached</span>' : '') + '</span>' +
      '<span class="row-sub tnum">' + U.fmt(a.used) + ' of ' + U.fmt(a.limit) + (over ? '' : ' · ' + U.fmt(left) + ' left') + '</span>' +
      '<span class="usage-line">' + UI.progress(a.used, a.limit, over ? 'warn' : 'accent') + '</span>' +
      '</span>' +
      '<span class="row-chev">' + icon('chevron', 18) + '</span>' +
      '</button>';
  }

  function otherRow(a) {
    var sub = a.week > 0 ? U.fmt(a.week / 7) + ' a day this week' : (a.category || 'Not used this week');
    return '<div class="row" data-search="' + U.esc(a.name.toLowerCase()) + '">' +
      '<span class="row-lead">' + UI.appIcon(a, 36) + '</span>' +
      '<span class="row-main"><span class="row-title">' + U.esc(a.name) + '</span><span class="row-sub">' + U.esc(sub) + '</span></span>' +
      '<button class="btn btn-secondary btn-sm add-btn" data-action="track-app" data-id="' + U.esc(a.id) + '">Add</button>' +
      '</div>';
  }

  function render(s) {
    if (S.ios) return '<section class="screen apps"></section>'; // drawn natively on iPhone (AppsScreen.swift)
    var tracked = S.trackedIds().map(S.app);
    var others = S.untrackedIds().map(S.app);
    var limitsTotal = U.sum(tracked.map(function (a) { return a.limit; }));
    var long = others.length > INITIAL;
    var visible = long && !view.showAll && !view.query ? others.slice(0, INITIAL) : others;

    var otherList = others.length
      ? '<div class="group" data-search-scope>' +
        '<p class="group-label">Other apps on this device</p>' +
        (long ? '<div class="search-wrap">' + UI.search(view.query, 'Search ' + others.length + ' apps') + '</div>' : '') +
        '<div class="list inset-app sm">' + visible.map(otherRow).join('') +
        '<p class="empty" data-search-empty style="display:none">No apps match.</p></div>' +
        (long && !view.showAll && !view.query
          ? '<button class="btn btn-quiet btn-block" data-action="apps-show-all">Show all ' + others.length + ' apps</button>'
          : '') +
        '</div>'
      : '';

    return '<section class="screen apps"><div class="stagger">' +
      '<header class="screen-head">' +
      '<div><p class="eyebrow">' + tracked.length + (tracked.length === 1 ? ' app counts' : ' apps count') + ' toward your allowance</p><h1 class="title">Applications</h1></div>' +
      '<button class="icon-btn" aria-label="Add application" data-action="add-app-sheet">' + icon('plus', 20) + '</button>' +
      '</header>' +
      '<div class="summary-strip">' +
      '<div><span class="metric-label">Daily allowance</span><span class="metric-value tnum">' + U.fmt(s.allowance) + '</span></div>' +
      '<div><span class="metric-label">Used today</span><span class="metric-value tnum">' + U.fmt(S.usedToday()) + '</span></div>' +
      '<div><span class="metric-label">Apps counted</span><span class="metric-value tnum">' + tracked.length + '</span></div>' +
      '</div>' +
      (tracked.length
        ? UI.group('Counted', tracked.map(trackedRow).join(''),
          'Counted apps share your ' + U.fmt(s.allowance) + ' daily allowance. Tap one to give it a tighter limit of its own.', 'inset-app')
        : '<div class="empty card">No apps are counted yet. Add the ones that take up your time.</div>') +
      otherList +
      '</div></section>';
  }

  function after(root) {
    var scope = root.querySelector('[data-search-scope]');
    if (scope && view.query) UI.applySearch(scope, view.query);
  }

  M.screens.apps = { render: render, after: after };

  // ---------- detail sheet ----------

  function detailSheet(id) {
    return function (s) {
      var a = S.app(id);
      var tracked = S.isTracked(id);
      var week = a.history.concat([a.used]);
      var avg = Math.round(U.sum(a.history) / a.history.length);
      var labels = U.lastDays(7).map(function (d, i) { return i === 6 ? 'Today' : U.DAYS_SHORT[d.getDay()]; });
      var limitSub = a.customLimit
        ? (a.used >= a.limit ? 'Reached for today' : U.fmt(a.limit - a.used) + ' left today')
        : 'Same as your daily allowance';

      return '<div class="sheet-head">' +
        '<div class="detail-id">' + UI.appIcon(a, 52) +
        '<div><h2 class="sheet-title">' + U.esc(a.name) + '</h2><p class="row-sub">' + U.esc(a.category || (tracked ? 'Counted app' : 'Not counted')) + '</p></div></div>' +
        '<button class="icon-btn plain" aria-label="Close" data-action="sheet-close">' + icon('close', 16) + '</button>' +
        '</div>' +
        '<div class="tiles">' +
        '<div class="tile"><p class="tile-label">Today</p><p class="tile-value">' + U.fmt(a.used) + '</p></div>' +
        '<div class="tile"><p class="tile-label">Daily average</p><p class="tile-value">' + U.fmt(avg) + '</p></div>' +
        '<div class="tile"><p class="tile-label">Opens today</p><p class="tile-value">' + a.opens + '</p></div>' +
        '</div>' +
        '<div class="card chart-card">' +
        '<p class="overline">Last 7 days</p>' +
        C.weekBars({ values: week, labels: labels, limit: tracked ? a.limit : 0, limitLabel: 'limit', selected: 6, action: 'noop' }) +
        '</div>' +
        (tracked
          ? UI.group('Daily limit',
            '<div class="row"><span class="row-main"><span class="row-title">Limit</span><span class="row-sub">' + limitSub + '</span></span>' +
            UI.stepper(U.fmt(a.limit), 'limit-dec', 'limit-inc', {
              attrs: 'data-id="' + U.esc(id) + '"', minReached: a.limit <= LIMIT_MIN, maxReached: !a.customLimit
            }) + '</div>' +
            '<div class="row"><span class="row-main"><span class="row-title">Lock when limit is reached</span>' +
            '<span class="row-sub">Otherwise you’ll just get a reminder</span></span>' +
            UI.toggle(a.strict, 'toggle-strict', 'data-id="' + U.esc(id) + '"') + '</div>')
          : '') +
        '<div class="sheet-actions">' +
        (S.mode === 'native'
          ? '<button class="btn btn-secondary btn-block" data-action="launch-app" data-id="' + U.esc(id) + '">' + icon('play', 16) + 'Open ' + U.esc(a.name) + '</button>'
          : '<button class="btn btn-secondary btn-block" data-action="sim-session" data-id="' + U.esc(id) + '">' + icon('play', 16) + 'Simulate opening ' + U.esc(a.name) + '</button>') +
        (tracked
          ? '<button class="btn btn-quiet btn-block danger-text" data-action="untrack-app" data-id="' + U.esc(id) + '">Stop counting this app</button>'
          : '<button class="btn btn-primary btn-block" data-action="track-app" data-id="' + U.esc(id) + '">Count toward allowance</button>') +
        '</div>';
    };
  }

  var addQuery = '';

  function addSheet() {
    var others = S.untrackedIds().map(S.app);
    return '<div class="sheet-head"><h2 class="sheet-title">Add an app</h2>' +
      '<button class="icon-btn plain" aria-label="Close" data-action="sheet-close">' + icon('close', 16) + '</button></div>' +
      (others.length
        ? '<div data-search-scope>' +
          (others.length > 6 ? '<div class="search-wrap">' + UI.search(addQuery, 'Search apps') + '</div>' : '') +
          '<div class="list inset-app sm">' + others.map(otherRow).join('') +
          '<p class="empty" data-search-empty style="display:none">No apps match.</p></div></div>'
        : '<p class="empty">Every app on this device is already counted.</p>') +
      '<p class="group-foot">Added apps share your daily allowance. You can give any app a tighter limit afterwards.</p>';
  }

  // ---------- actions ----------

  M.actions['open-app-detail'] = function (el) {
    UI.sheet.open(detailSheet(el.getAttribute('data-id')), { live: true });
  };
  M.actions['add-app-sheet'] = function () {
    addQuery = '';
    UI.sheet.open(addSheet, { live: true });
  };
  M.actions['apps-show-all'] = function () {
    view.showAll = true;
    M.app.render(false);
  };
  M.actions['limit-dec'] = function (el) {
    var id = el.getAttribute('data-id');
    var current = S.app(id).limit;
    S.update(function (s) { s.limits[id] = Math.max(LIMIT_MIN, current - LIMIT_STEP); });
  };
  M.actions['limit-inc'] = function (el) {
    var id = el.getAttribute('data-id');
    var next = S.app(id).limit + LIMIT_STEP;
    S.update(function (s) {
      if (next >= s.allowance) delete s.limits[id]; // back to following the allowance
      else s.limits[id] = next;
    });
  };
  M.actions['toggle-strict'] = function (el) {
    var id = el.getAttribute('data-id');
    S.update(function (s) { s.strict[id] = s.strict[id] === false; });
  };
  M.actions['track-app'] = function (el) {
    var id = el.getAttribute('data-id');
    S.track(id);
    UI.toast(S.app(id).name + ' now counts toward your allowance');
  };
  M.actions['untrack-app'] = function (el) {
    var id = el.getAttribute('data-id');
    UI.sheet.close();
    S.untrack(id);
    UI.toast(S.app(id).name + ' no longer counts');
  };
  M.actions['launch-app'] = function (el) {
    UI.sheet.close();
    M.native.launchApp(el.getAttribute('data-id'));
  };
  M.actions['sim-session'] = function (el) {
    var id = el.getAttribute('data-id');
    var name = S.app(id).name;
    var tracked = S.isTracked(id);
    var focus = S.activeFocus();
    if (tracked && S.isLocked()) { UI.sheet.close(); M.app.showLockout({ type: 'daily', id: id }); return; }
    if (tracked && focus && !S.emergencyActive()) { UI.sheet.close(); M.app.showLockout({ type: 'focus', focusId: focus.id, id: id }); return; }
    if (S.appOverLimit(id)) { UI.sheet.close(); M.app.showLockout({ type: 'app', id: id }); return; }
    S.addSession(id, 5);
    if (!M.app.lockoutVisible()) UI.toast('Opened ' + name + ' · 5 minute session added');
  };
  M.actions.noop = function () {};

  M.inputs = M.inputs || {};
  M.inputs.search = function (el) {
    var scope = el.closest('[data-search-scope]');
    if (!scope) return;
    if (UI.sheet.isOpen() && el.closest('.sheet')) addQuery = el.value;
    else {
      var wasEmpty = !view.query;
      view.query = el.value;
      // The first keystroke needs the full list; render once, then keep filtering in place.
      if (wasEmpty && view.query && !view.showAll && scope.querySelectorAll('[data-search]').length < S.untrackedIds().length) {
        view.showAll = true;
        M.app.render(false);
        var input = document.querySelector('.screen .search-input');
        if (input) { input.focus(); try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { /* ignore */ } }
        return;
      }
    }
    UI.applySearch(scope, el.value);
  };
})(window.M);
