/* Margin — Home dashboard. */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, UI = M.ui, icon = M.icon;
  M.screens = M.screens || {};
  M.actions = M.actions || {};

  function caption(remaining, allowance, locked) {
    if (!S.trackedIds().length) return 'Choose the apps that should count toward your allowance.';
    if (S.emergencyActive()) return 'Emergency access is on. Your apps close again when the timer ends.';
    if (locked) return 'That’s today’s allowance. Enjoy the rest of your day.';
    var r = remaining / allowance;
    if (r > 0.6) return 'Plenty of room today. Spend it on what matters.';
    if (r > 0.3) return 'You’re pacing well. Keep it intentional.';
    if (r > 0.12) return 'Under ' + U.fmt(Math.ceil(remaining / 5) * 5) + ' left. Make it count.';
    return 'Almost there. A good moment to put the phone down.';
  }

  /** On the phone, missing permissions come first: without them nothing is measured or blocked. */
  function permissionBanner() {
    var p = M.app.permissions();
    if (!p) return '';
    if (!p.usage && M.native.ios) {
      return '<button class="banner warn" data-action="perm" data-which="usage">' + icon('eye', 20) +
        '<span class="banner-main"><span class="banner-title">Allow Screen Time access</span>' +
        '<span class="banner-sub">Margin can’t measure or limit apps until you do.</span></span>' + icon('chevron', 18) + '</button>';
    }
    if (!p.usage) {
      return '<button class="banner warn" data-action="perm" data-which="usage">' + icon('eye', 20) +
        '<span class="banner-main"><span class="banner-title">Allow usage access</span>' +
        '<span class="banner-sub">Margin can’t see your app time until you do.</span></span>' + icon('chevron', 18) + '</button>';
    }
    if (p.overlayNeeded && !p.overlay) {
      return '<button class="banner warn" data-action="perm" data-which="overlay">' + icon('layers', 20) +
        '<span class="banner-main"><span class="banner-title">Let Margin close apps</span>' +
        '<span class="banner-sub">Needed to show the lock screen when time’s up.</span></span>' + icon('chevron', 18) + '</button>';
    }
    return '';
  }

  function statusBanner(s) {
    var reset = U.nextAt(s.resetTime);
    if (S.emergencyActive()) {
      return '<div class="banner">' + icon('shield', 20) +
        '<span class="banner-main"><span class="banner-title">Emergency access</span>' +
        '<span class="banner-sub">Apps are briefly available.</span></span>' +
        '<span class="tnum banner-count" data-emergency-left>' + U.fmtClock((s.emergencyUntil - Date.now()) / 1000) + '</span></div>';
    }
    if (S.isLocked()) {
      return '<button class="banner warn" data-action="show-lockout">' + icon('lock', 20) +
        '<span class="banner-main"><span class="banner-title">Allowance used</span>' +
        '<span class="banner-sub">Available again ' + U.relativeDay(reset).toLowerCase() + ' at ' + U.clockLabel(s.resetTime) + '</span></span>' +
        icon('chevron', 18) + '</button>';
    }
    var f = S.activeFocus();
    if (f) {
      return '<div class="banner neutral">' + icon('moon', 20) +
        '<span class="banner-main"><span class="banner-title">' + U.esc(f.name) + '</span>' +
        '<span class="banner-sub">Focus schedule until ' + U.clockLabel(f.end) + '</span></span></div>';
    }
    return '';
  }

  function themeToggle() {
    var dark = M.app.isDark();
    return '<button class="icon-btn theme-toggle" data-action="toggle-theme" aria-label="' +
      (dark ? 'Switch to light mode' : 'Switch to dark mode') + '">' + icon(dark ? 'sun' : 'moon', 20) + '</button>';
  }

  function render(s) {
    var now = new Date();
    var used = S.usedToday();
    var remaining = S.remaining();
    var locked = S.isLocked();
    var ratio = s.allowance ? remaining / s.allowance : 0;
    var apps = S.trackedIds().map(S.app).sort(function (a, b) { return b.used - a.used; });
    var maxUsed = apps.length ? Math.max(1, apps[0].used) : 1;

    var center = locked
      ? '<span class="ring-value tnum">0m</span><span class="ring-label">Allowance used</span>'
      : '<span class="ring-value tnum">' + U.fmt(remaining) + '</span><span class="ring-label">remaining</span>';

    var appRows = apps.map(function (a, i) {
      var over = S.appOverLimit(a.id);
      var tag = over ? '<span class="pill warn">Limit reached</span>'
        : (i === 0 && a.used > 0 ? '<span class="pill">Most used</span>' : '');
      return '<button class="row app-row" data-action="open-app-detail" data-id="' + U.esc(a.id) + '">' +
        '<span class="row-lead">' + UI.appIcon(a, 40) + '</span>' +
        '<span class="row-main">' +
        '<span class="row-title">' + U.esc(a.name) + tag + '</span>' +
        '<span class="usage-line">' + UI.progress(a.used, maxUsed, i === 0 ? 'accent' : '') + '</span>' +
        '</span>' +
        '<span class="row-value strong tnum">' + U.fmt(a.used) + '</span>' +
        '</button>';
    }).join('');

    if (!apps.length) {
      appRows = '<div class="empty">No apps are counted yet.<br><button class="link" data-action="go" data-to="apps">Choose apps</button></div>';
    }

    // iPhone: Screen Time keeps app names private, so per-app details live on the native tabs.
    var appsTitle = 'Today’s apps';
    if (S.ios && apps.length) {
      appsTitle = 'Counted apps';
      appRows =
        UI.row({ lead: UI.tileIcon('grid'), title: apps.length + (apps.length === 1 ? ' app counted' : ' apps counted'),
          sub: 'Limited with Apple’s Screen Time', chevron: true, action: 'go', attrs: 'data-to="apps"' }) +
        UI.row({ lead: UI.tileIcon('stats'), title: 'Today’s breakdown', sub: 'Time per app, hour by hour',
          chevron: true, action: 'go', attrs: 'data-to="stats"' });
    }

    var demoControls = S.mode === 'demo'
      ? '<section class="block proto">' +
        '<div class="block-head"><h2 class="overline">Demo controls</h2></div>' +
        '<div class="proto-grid">' +
        '<button class="btn btn-secondary btn-sm" data-action="sim-usage">' + icon('play', 15) + '+15 min</button>' +
        '<button class="btn btn-secondary btn-sm" data-action="sim-limit">' + icon('lock', 15) + 'Reach limit</button>' +
        '<button class="btn btn-secondary btn-sm" data-action="sim-reset">' + icon('refresh', 15) + 'Reset day</button>' +
        '</div>' +
        '<p class="footnote">You’re viewing the browser demo, so usage is simulated. Install the Android app to track real screen time.</p>' +
        '</section>'
      : '';

    return '<section class="screen home"><div class="stagger">' +
      '<header class="screen-head">' +
      '<div><p class="eyebrow">' + U.dateLabel(now) + '</p><h1 class="title">' + U.greeting(now) +
      (s.name ? ', ' + U.esc(s.name) : '') + '</h1></div>' +
      themeToggle() +
      '</header>' +
      (permissionBanner() || statusBanner(s)) +
      '<div class="hero">' +
      UI.ring({
        key: 'home', value: locked || !apps.length ? 0 : ratio, size: 236, stroke: 13,
        tone: ratio < 0.15 ? 'warn' : '', center: center,
        label: U.fmtLong(remaining) + ' remaining of ' + U.fmtLong(s.allowance)
      }) +
      '<p class="hero-caption">' + caption(remaining, s.allowance, locked) + '</p>' +
      '</div>' +
      '<div class="metrics">' +
      '<button class="metric" data-action="edit-allowance"><span class="metric-label">Daily allowance</span><span class="metric-value tnum">' + U.fmt(s.allowance) + '</span></button>' +
      '<div class="metric"><span class="metric-label">Used today</span><span class="metric-value tnum">' + U.fmt(used) + '</span></div>' +
      '<div class="metric"><span class="metric-label">Remaining</span><span class="metric-value tnum' + (locked ? ' is-warn' : '') + '">' + U.fmt(remaining) + '</span></div>' +
      '</div>' +
      '<section class="block">' +
      '<div class="block-head"><h2 class="h2">' + appsTitle + '</h2><button class="link" data-action="go" data-to="apps">Manage</button></div>' +
      '<div class="list ' + (S.ios && apps.length ? 'inset-icon' : 'inset-app') + '">' + appRows + '</div>' +
      '</section>' +
      demoControls +
      '</div></section>';
  }

  M.screens.home = { render: render };

  // ---------- actions ----------

  M.actions['toggle-theme'] = function () {
    var next = M.app.isDark() ? 'light' : 'dark';
    M.app.applyTheme(true, next);
    S.update(function (s) { s.theme = next; });
    UI.toast(next === 'dark' ? 'Dark mode on' : 'Light mode on');
  };
  M.actions.perm = function (el) { M.app.openPermission(el.getAttribute('data-which')); };
  M.actions['sim-usage'] = function () {
    if (S.isLocked()) { M.app.showLockout({ type: 'daily' }); return; }
    S.simulate(15);
    if (!S.isLocked() && !M.app.lockoutVisible()) UI.toast('Added 15 minutes of usage');
  };
  M.actions['sim-limit'] = function () {
    if (S.isLocked()) { M.app.showLockout({ type: 'daily' }); return; }
    if (S.emergencyActive()) S.update(function (s) { s.emergencyUntil = 0; });
    S.simulate(S.remaining());
  };
  M.actions['sim-reset'] = function () {
    S.resetDay();
    UI.toast('Day reset to sample data');
  };
  M.actions['show-lockout'] = function () { M.app.showLockout({ type: 'daily' }); };
})(window.M);
