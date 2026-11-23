/* Margin — app shell: routing, tab bar, events, theme, permissions, lock screen and refresh. */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, UI = M.ui, icon = M.icon;
  var NATIVE = S.mode === 'native';
  var LOCK_MODE = U.flag('mode') === 'lockout';

  var TABS = [
    { id: 'home', label: 'Home', icon: 'home' },
    { id: 'apps', label: 'Apps', icon: 'apps' },
    { id: 'stats', label: 'Statistics', icon: 'stats' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ];

  var viewport, tabbar, lockLayer;
  var route = { name: 'home', sub: null };
  var lock = { visible: false, ctx: null, expanded: false };
  var lastSnap = null;
  var perms = null;
  var paused = false;
  var themeTimer = null;

  // ---------- polyfills for older Android WebViews ----------
  if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.webkitMatchesSelector || Element.prototype.msMatchesSelector;
  }
  if (!Element.prototype.closest) {
    Element.prototype.closest = function (sel) {
      var el = this;
      while (el && el.nodeType === 1) { if (el.matches(sel)) return el; el = el.parentNode; }
      return null;
    };
  }

  // ---------- rendering ----------

  function render(isNav, dir) {
    if (LOCK_MODE) return;
    var screen = M.screens[route.name];
    var state = S.get();
    var prevScroll = viewport.scrollTop;
    var focused = document.activeElement;
    var focusKey = focused && focused.getAttribute && viewport.contains(focused) ? focused.getAttribute('data-input') : null;
    var caret = focusKey && focused.selectionStart != null ? focused.selectionStart : null;

    UI.entering = !!isNav;
    viewport.innerHTML = '<div class="screen-wrap' + (isNav ? ' is-entering' + (dir ? ' from-' + dir : '') : '') + '">' +
      screen.render(state, route) + '</div>';
    UI.entering = false;
    viewport.scrollTop = isNav ? 0 : prevScroll;
    if (screen.after) screen.after(viewport, state, isNav);
    UI.hydrate(viewport);
    renderTabbar();

    // Keep typing uninterrupted when data refreshes underneath a search field.
    if (focusKey) {
      var again = viewport.querySelector('[data-input="' + focusKey + '"]');
      if (again) {
        again.focus();
        if (caret != null) { try { again.setSelectionRange(caret, caret); } catch (e) { /* ignore */ } }
      }
    }
  }

  function renderTabbar() {
    tabbar.innerHTML = TABS.map(function (t) {
      var active = route.name === t.id;
      return '<button class="tab' + (active ? ' active' : '') + '" data-action="go" data-to="' + t.id + '"' +
        (active ? ' aria-current="page"' : '') + '>' + icon(t.icon, 24) + '<span>' + t.label + '</span></button>';
    }).join('');
  }

  function navigate(name, sub, force) {
    sub = sub || null;
    if (!force && route.name === name && route.sub === sub) {
      if (viewport.scrollTo) viewport.scrollTo({ top: 0, behavior: 'smooth' }); else viewport.scrollTop = 0;
      return;
    }
    var dir = null;
    if (route.name === name && !force) dir = sub ? 'right' : 'left';
    UI.sheet.close();
    route = { name: name, sub: sub };
    render(true, dir);
  }

  // ---------- theme ----------

  function isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; }

  /** Older WebViews can't switch CSS variables, so the Android build ships a dark copy of the styles. */
  function swapStyles(dark) {
    var links = document.querySelectorAll('link[data-css]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute('href');
      var next = dark ? href.replace(/^css\//, 'css-dark/') : href.replace(/^css-dark\//, 'css/');
      if (next !== href) links[i].setAttribute('href', next);
    }
  }

  function applyTheme(animated, override) {
    var t = override || S.get().theme;
    var dark = t === 'dark' || (t === 'system' && U.systemPrefersDark());
    var root = document.documentElement;
    var next = dark ? 'dark' : 'light';
    var was = root.getAttribute('data-theme');
    if (animated && was && was !== next && U.supportsVars) {
      root.className += ' theme-anim';
      clearTimeout(themeTimer);
      themeTimer = setTimeout(function () { root.className = root.className.replace(/\s*theme-anim/g, ''); }, 520);
    }
    root.setAttribute('data-theme', next);
    if (!U.supportsVars && U.isNative()) swapStyles(dark);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#0F0F0E' : '#F5F4F0');
    M.native.setDarkBars(dark);
  }

  // ---------- permissions ----------

  function refreshPerms() {
    if (NATIVE) { perms = M.native.permissions(); return; }
    var d = S.demoPerms() || {};
    perms = {
      usage: !!d.usage, overlay: !!d.overlay, notifications: !!d.notifications,
      overlayNeeded: true, notificationsNeeded: true, batteryRelevant: false, battery: true,
      blocking: !!d.usage && !!d.overlay
    };
  }

  function openPermission(which) {
    if (NATIVE) { M.native.openPermission(which); return; }
    S.grantDemoPerm(which);
    refreshPerms();
    UI.toast('Permission granted (simulated in the browser)');
    if (!M.onboarding.isActive()) render(false);
  }

  // ---------- lockout ----------

  function showLockout(ctx) {
    UI.sheet.close();
    lock.ctx = ctx;
    lock.expanded = false;
    renderLockout();
    if (!lock.visible) {
      lock.visible = true;
      lockLayer.getBoundingClientRect();
      lockLayer.classList.add('open');
      lockLayer.setAttribute('aria-hidden', 'false');
    }
  }

  function renderLockout() {
    lockLayer.innerHTML = M.screens.lockout.render(lock.ctx, S.get(), lock.expanded, LOCK_MODE ? 'lock' : 'app');
  }

  function hideLockout() {
    if (!lock.visible) return;
    lock.visible = false;
    lockLayer.classList.remove('open');
    lockLayer.setAttribute('aria-hidden', 'true');
  }

  /** Demo only: present the lockout when usage crosses a limit, as if you were in the app. */
  function snapshot() { return { locked: S.isLocked(), over: S.overLimitIds() }; }

  function checkTransitions() {
    if (NATIVE || LOCK_MODE) return;
    var now = snapshot();
    if (lastSnap) {
      if (!lastSnap.locked && now.locked) {
        showLockout({ type: 'daily' });
      } else if (!now.locked) {
        var newly = now.over.filter(function (id) { return lastSnap.over.indexOf(id) < 0; });
        if (newly.length) showLockout({ type: 'app', id: newly[0] });
        else if (lock.visible && lock.ctx.type === 'daily') hideLockout();
      }
    }
    lastSnap = now;
  }

  // ---------- events ----------

  function onClick(e) {
    var el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    var name = el.getAttribute('data-action');
    var handler = M.actions[name];
    if (!handler) return;

    // Let toggles and segmented controls animate before the re-render.
    if (el.classList.contains('toggle')) {
      el.classList.toggle('on');
      el.setAttribute('aria-checked', el.classList.contains('on') ? 'true' : 'false');
      setTimeout(function () { handler(el, e); }, 200);
      return;
    }
    if (el.classList.contains('seg-item')) {
      var seg = el.parentNode;
      if (el.classList.contains('active')) return;
      var ind = seg.querySelector('.seg-ind');
      var items = seg.querySelectorAll('.seg-item');
      for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
      el.classList.add('active');
      ind.style.transform = 'translateX(' + (parseInt(el.getAttribute('data-i'), 10) * 100) + '%)';
      setTimeout(function () { handler(el, e); }, 230);
      return;
    }
    handler(el, e);
  }

  function onInput(e) {
    var el = e.target;
    var key = el.getAttribute && el.getAttribute('data-input');
    if (key && M.inputs && M.inputs[key]) M.inputs[key](el);
  }

  // Press-and-hold for emergency access.
  var holdTimer = null, holdEl = null;
  function holdStart(e) {
    var el = e.target.closest && e.target.closest('[data-hold]');
    if (!el) return;
    e.preventDefault();
    holdEl = el;
    var secs = S.get().emergency.hold;
    var fill = el.querySelector('.hold-fill');
    if (fill) fill.style.transitionDuration = secs + 's';
    el.classList.add('holding');
    holdTimer = setTimeout(function () {
      holdTimer = null;
      el.classList.remove('holding');
      el.classList.add('done');
      if (navigator.vibrate) { try { navigator.vibrate(18); } catch (err) { /* ignore */ } }
      if (!S.grantEmergency()) return;
      var m = S.get().emergency.minutes;
      setTimeout(function () {
        if (LOCK_MODE) { M.native.lockAction('resume'); return; }
        hideLockout();
        UI.toast('Unlocked for ' + m + (m === 1 ? ' minute' : ' minutes'));
      }, 260);
    }, secs * 1000);
  }
  function holdEnd() {
    if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
    if (holdEl) {
      var fill = holdEl.querySelector('.hold-fill');
      if (fill && !holdEl.classList.contains('done')) fill.style.transitionDuration = '';
      holdEl.classList.remove('holding');
      holdEl = null;
    }
  }

  // ---------- actions owned by the shell ----------

  M.actions.go = function (el) { navigate(el.getAttribute('data-to'), el.getAttribute('data-sub')); };
  M.actions['sheet-close'] = function () { UI.sheet.close(); };
  M.actions['lock-home'] = function () {
    if (LOCK_MODE) { M.native.lockAction('home'); return; }
    hideLockout();
    if (route.name !== 'home') navigate('home');
  };
  M.actions['lock-open'] = function () { M.native.lockAction('open'); };
  M.actions['lock-emergency'] = function () {
    lock.expanded = true;
    renderLockout();
  };

  // ---------- clock ----------

  var wasEmergency = false;
  function tick() {
    var s = S.get();
    var em = S.emergencyActive();
    if (em) {
      var el = viewport && viewport.querySelector('[data-emergency-left]');
      if (el) el.textContent = U.fmtClock((s.emergencyUntil - Date.now()) / 1000);
    }
    if (wasEmergency && !em) {
      render(false);
      checkTransitions();
    }
    wasEmergency = em;
    if (lock.visible) {
      var cd = lockLayer.querySelector('[data-lock-countdown]');
      if (cd) cd.textContent = M.screens.lockout.countdownText(lock.ctx, s);
    }
  }

  // ---------- public ----------

  M.app = {
    render: render,
    navigate: navigate,
    applyTheme: applyTheme,
    isDark: isDark,
    permissions: function () { if (!perms) refreshPerms(); return perms; },
    openPermission: openPermission,
    /** Called by the Android shell when the system light/dark mode changes. */
    setSystemDark: function (dark) {
      window.__marginSysDark = !!dark;
      applyTheme(true);
      if (!LOCK_MODE && !M.onboarding.isActive()) render(false);
    },
    showLockout: showLockout,
    hideLockout: hideLockout,
    lockoutVisible: function () { return lock.visible; },
    /** Android back button. Returns true if handled. */
    back: function () {
      if (M.onboarding.isActive()) return M.onboarding.back();
      if (UI.sheet.isOpen()) { UI.sheet.close(); return true; }
      if (lock.visible) { M.actions['lock-home'](); return true; }
      if (route.sub) { navigate(route.name, null); return true; }
      if (route.name !== 'home') { navigate('home'); return true; }
      return false;
    },
    /** The Android app came back to the foreground (e.g. from system settings). */
    onResume: function () {
      paused = false;
      refreshPerms();
      S.reload();
      S.refreshUsage();
      S.refreshApps();
      M.onboarding.onResume();
      if (!M.onboarding.isActive()) render(false);
    },
    onPause: function () { paused = true; }
  };

  function initLockMode() {
    document.documentElement.className += ' lock-mode';
    var pkg = U.flag('pkg');
    pkg = pkg ? decodeURIComponent(pkg) : '';
    var focusId = U.flag('focus');
    if (pkg) S.ensureCatalogEntry(pkg, M.native.appLabel(pkg));
    showLockout({ type: U.flag('ctx') || 'daily', id: pkg || null, focusId: focusId ? decodeURIComponent(focusId) : null });
  }

  function init() {
    viewport = document.getElementById('viewport');
    tabbar = document.getElementById('tabbar');
    lockLayer = document.getElementById('lockout-layer');
    UI.sheet.init(document.getElementById('sheet-layer'));
    refreshPerms();
    applyTheme(false);

    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (S.get().theme === 'system' && typeof window.__marginSysDark !== 'boolean') applyTheme(true); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    lockLayer.addEventListener('pointerdown', holdStart);
    ['pointerup', 'pointercancel'].forEach(function (t) { lockLayer.addEventListener(t, holdEnd); });
    lockLayer.addEventListener('pointerout', function (e) {
      if (holdEl && !holdEl.contains(e.relatedTarget)) holdEnd();
    });
    if (!window.PointerEvent) {
      lockLayer.addEventListener('touchstart', holdStart);
      lockLayer.addEventListener('touchend', holdEnd);
      lockLayer.addEventListener('mousedown', holdStart);
      lockLayer.addEventListener('mouseup', holdEnd);
    }
    lockLayer.addEventListener('contextmenu', function (e) { if (e.target.closest('[data-hold]')) e.preventDefault(); });

    setInterval(tick, 1000);

    if (LOCK_MODE) { initLockMode(); return; }

    S.subscribe(function () {
      if (M.onboarding.isActive()) { M.onboarding.onData(); return; }
      render(false);
      UI.sheet.onState();
      checkTransitions();
    });

    lastSnap = snapshot();
    wasEmergency = S.emergencyActive();
    render(true);

    if (NATIVE) {
      S.refreshApps();
      S.refreshUsage();
      // Keep the numbers fresh while Margin is on screen.
      setInterval(function () { if (!paused) S.refreshUsage(); }, 30000);
    }

    if (!S.get().onboarded) M.onboarding.start();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.M);
