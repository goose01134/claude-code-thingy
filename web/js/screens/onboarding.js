/* Margin — first-launch setup tutorial.
   Explains how Margin works, asks for permissions (simulated in the browser demo),
   and collects the first choices: name, apps, allowance and appearance. */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, UI = M.ui, icon = M.icon;
  var ALL_STEPS = ['welcome', 'how', 'name', 'usage', 'apps', 'allowance', 'blocking', 'look', 'done'];
  var PRESETS = [30, 60, 90, 120, 180];

  var layer = null;
  var active = false;
  var index = 0;
  var draft = null;
  var query = '';
  var renderedApps = -1;

  function perms() { return M.app.permissions() || {}; }

  /** Steps that apply on this device (e.g. no extra permissions are needed before Android 10). */
  function steps() {
    var p = perms();
    return ALL_STEPS.filter(function (k) {
      if (k === 'blocking') return p.overlayNeeded || p.notificationsNeeded || (p.batteryRelevant && !p.battery);
      return true;
    });
  }

  function current() { return steps()[index]; }

  function initDraft() {
    var s = S.get();
    draft = { name: s.name || '', allowance: s.allowance || 120, theme: s.theme || 'system', tracked: {}, appsTouched: false, allowanceTouched: false };
    s.tracked.forEach(function (id) { draft.tracked[id] = true; });
  }

  function selectedIds() {
    if (S.ios) return S.get().tracked.slice(); // picked in Apple's app picker
    return Object.keys(draft.tracked).filter(function (id) { return draft.tracked[id]; });
  }

  /** Pre-select the usual suspects the first time the app list is shown. */
  function preselect() {
    if (draft.appsTouched || selectedIds().length) return;
    var suggested = S.suggestedIds();
    if (S.mode === 'demo') suggested = suggested.slice(0, 4);
    suggested.forEach(function (id) { draft.tracked[id] = true; });
  }

  /** Average daily minutes of the selected apps over the previous six days. */
  function selectedAverage() {
    return selectedIds().reduce(function (sum, id) { return sum + U.sum(S.app(id).history) / 6; }, 0);
  }

  function suggestedAllowance() {
    var avg = selectedAverage();
    if (avg < 20) return 0;
    return U.clamp(Math.round(avg * 0.75 / 15) * 15, 15, 240);
  }

  // ---------------------------------------------------------------- pieces

  function permCard(which, title, body, ok, optional) {
    var icons = { usage: 'eye', overlay: 'layers', notifications: 'bell', battery: 'battery' };
    return '<div class="perm-card' + (ok ? ' ok' : '') + '">' +
      '<span class="perm-icon">' + icon(icons[which], 20) + '</span>' +
      '<span class="perm-main"><span class="perm-title">' + title +
      (optional ? ' <span class="pill neutral">Optional</span>' : '') + '</span>' +
      '<span class="perm-body">' + body + '</span></span>' +
      (ok
        ? '<span class="perm-done" aria-label="Allowed">' + icon('check', 18) + '</span>'
        : '<button class="btn btn-secondary btn-sm" data-action="ob-perm" data-which="' + which + '">Allow</button>') +
      '</div>';
  }

  function feature(iconName, title, body) {
    return '<div class="ob-feature"><span class="ob-feature-icon">' + icon(iconName, 22) + '</span>' +
      '<span class="ob-feature-text"><span class="ob-feature-title">' + title + '</span>' +
      '<span class="ob-feature-body">' + body + '</span></span></div>';
  }

  function appRow(a) {
    var on = !!draft.tracked[a.id];
    var sub = a.week > 0 ? U.fmt(a.week / 7) + ' a day this week' : (a.category || ' ');
    return '<button class="row app-row selectable' + (on ? ' selected' : '') + '" data-action="ob-toggle-app" data-id="' +
      U.esc(a.id) + '" data-search="' + U.esc(a.name.toLowerCase()) + '" role="checkbox" aria-checked="' + on + '">' +
      '<span class="row-lead">' + UI.appIcon(a, 40) + '</span>' +
      '<span class="row-main"><span class="row-title">' + U.esc(a.name) + '</span><span class="row-sub">' + U.esc(sub) + '</span></span>' +
      UI.check(on) + '</button>';
  }

  function countLabel() {
    var n = selectedIds().length;
    return n ? 'Continue with ' + n + (n === 1 ? ' app' : ' apps') : 'Choose at least one app';
  }

  /** iPhone: apps are chosen in Apple's app picker, which keeps the choice private. */
  function iosApps() {
    var n = selectedIds().length;
    return {
      body: '<p class="ob-eyebrow">Your apps</p>' +
        '<h1 class="ob-title">Which apps should count?</h1>' +
        '<p class="ob-lede">Pick them in Apple’s app list. Apple keeps your choice private: Margin can limit these apps but never sees which ones they are.</p>' +
        '<div class="perm-card' + (n ? ' ok' : '') + '">' +
        '<span class="perm-icon">' + icon('grid', 20) + '</span>' +
        '<span class="perm-main"><span class="perm-title">' + (n ? n + (n === 1 ? ' app chosen' : ' apps chosen') : 'No apps chosen yet') + '</span>' +
        '<span class="perm-body">' + (n ? 'Apps, categories and websites all count.' : 'Social media, video, games: whatever pulls you in.') + '</span></span>' +
        '<button class="btn btn-secondary btn-sm" data-action="ob-pick-apps">' + (n ? 'Change' : 'Choose') + '</button>' +
        '</div>',
      primary: n ? { label: countLabel(), action: 'ob-next', countLabel: true } : { label: 'Choose apps', action: 'ob-pick-apps' }
    };
  }

  // ---------------------------------------------------------------- steps

  var VIEWS = {
    welcome: function () {
      return {
        body: '<div class="ob-hero">' +
          '<svg class="ob-mark" viewBox="0 0 120 120" aria-hidden="true">' +
          '<circle cx="60" cy="60" r="46" class="ob-mark-track"/>' +
          '<path d="M60 14 A46 46 0 1 1 14 60" class="ob-mark-arc" pathLength="1"/>' +
          '</svg>' +
          '<p class="ob-wordmark">Margin</p>' +
          '<h1 class="ob-title xl">Make room for<br>what matters.</h1>' +
          '<p class="ob-lede">Margin gives social media a daily allowance. When it’s spent, your apps rest until tomorrow.</p>' +
          '</div>',
        primary: { label: 'Get started', action: 'ob-next' },
        note: 'Takes about a minute · Everything stays on your phone'
      };
    },

    how: function () {
      return {
        body: '<p class="ob-eyebrow">How it works</p>' +
          '<h1 class="ob-title">Three simple ideas</h1>' +
          '<div class="ob-features">' +
          feature('hourglass', 'One daily allowance', 'Shared by the apps that pull you in. You decide how much.') +
          feature('stats', 'A clear picture', 'See where your time goes, hour by hour and week by week.') +
          feature('lock', 'A gentle stop', 'When time’s up, those apps close until tomorrow, with an emergency exit for real needs.') +
          '</div>',
        primary: { label: 'Continue', action: 'ob-next' }
      };
    },

    name: function () {
      return {
        body: '<p class="ob-eyebrow">About you</p>' +
          '<h1 class="ob-title">What should we call you?</h1>' +
          '<p class="ob-lede">Just for your greeting. You can change it later.</p>' +
          '<input class="field ob-input" type="text" maxlength="24" autocomplete="given-name" placeholder="First name" value="' +
          U.esc(draft.name) + '" data-input="ob-name" enterkeyhint="next">',
        primary: { label: 'Continue', action: 'ob-next' },
        secondary: draft.name ? null : { label: 'Skip', action: 'ob-skip-name' }
      };
    },

    usage: function () {
      var p = perms();
      var ios = S.ios;
      return {
        body: '<p class="ob-eyebrow">Permission</p>' +
          '<h1 class="ob-title">See where your time goes</h1>' +
          (ios
            ? '<p class="ob-lede">To measure and limit apps, your iPhone asks you to allow Screen Time access for Margin.</p>' +
              permCard('usage', 'Screen Time access', p.usage ? 'Allowed. Thank you.' : 'Tap Allow, then confirm in the window that appears.', p.usage) +
              '<p class="ob-privacy">' + icon('lock', 16) + '<span>Your usage stays on this phone. Apple doesn’t even tell Margin which apps you use.</span></p>'
            : '<p class="ob-lede">To measure how long you spend in each app, Android asks you to allow usage access for Margin.</p>' +
              permCard('usage', 'Usage access', p.usage ? 'Allowed. Thank you.' : 'In the list that opens, choose Margin and turn on “Permit usage access”.', p.usage) +
              '<p class="ob-privacy">' + icon('lock', 16) + '<span>Your usage stays on this phone. Margin doesn’t even have internet access.</span></p>') +
          (S.mode === 'demo' ? '<p class="ob-demo-note">Browser demo: tapping Allow simulates the permission.</p>' : ''),
        primary: p.usage ? { label: 'Continue', action: 'ob-next' } : { label: ios ? 'Allow Screen Time access' : 'Allow usage access', action: 'ob-perm', which: 'usage' },
        secondary: p.usage ? null : { label: 'Not now', action: 'ob-next' }
      };
    },

    apps: function () {
      if (S.ios) return iosApps();
      preselect();
      var ids = S.allIds();
      var suggested = ids.filter(function (id) { return S.app(id).suggested; });
      var others = ids.filter(function (id) { return !S.app(id).suggested; });
      renderedApps = ids.length;
      var list;
      if (!ids.length) {
        list = '<p class="empty">Loading your apps…</p>';
      } else {
        list = '<div data-search-scope>' +
          (ids.length > 8 ? '<div class="search-wrap">' + UI.search(query, 'Search ' + ids.length + ' apps', 'ob-search') + '</div>' : '') +
          (suggested.length ? '<p class="group-label">Suggested</p><div class="list inset-app ob-list">' + suggested.map(S.app).map(appRow).join('') + '</div>' : '') +
          (others.length ? '<p class="group-label">' + (suggested.length ? 'Other apps' : 'Your apps') + '</p><div class="list inset-app ob-list">' + others.map(S.app).map(appRow).join('') + '</div>' : '') +
          '<p class="empty" data-search-empty style="display:none">No apps match.</p>' +
          '</div>';
      }
      return {
        body: '<p class="ob-eyebrow">Your apps</p>' +
          '<h1 class="ob-title">Which apps should count?</h1>' +
          '<p class="ob-lede">' + (suggested.length ? 'We’ve picked the usual suspects. Tap to change.' : 'Pick the apps that take up more time than you’d like.') + '</p>' +
          list,
        primary: { label: countLabel(), action: 'ob-next', disabled: !selectedIds().length, countLabel: true }
      };
    },

    allowance: function () {
      var avg = selectedAverage();
      var suggestion = suggestedAllowance();
      if (!draft.allowanceTouched && suggestion) draft.allowance = suggestion;
      var lede = avg >= 20
        ? 'Lately you’ve spent about <strong>' + U.fmt(Math.round(avg)) + ' a day</strong> in these apps. We suggest starting a little lower.'
        : 'Most people find 1–2 hours a comfortable place to start. You can change it any time.';
      return {
        body: '<p class="ob-eyebrow">Your allowance</p>' +
          '<h1 class="ob-title">How much time a day?</h1>' +
          '<p class="ob-lede">' + lede + '</p>' +
          '<div class="allowance-picker ob-picker">' +
          '<button class="stepper-btn lg" aria-label="Less time" data-action="ob-allowance" data-delta="-15"' + (draft.allowance <= 15 ? ' disabled' : '') + '>' + icon('minus', 22) + '</button>' +
          '<div class="allowance-value"><span class="tnum">' + U.fmt(draft.allowance) + '</span><small>per day, shared by ' +
          selectedIds().length + (selectedIds().length === 1 ? ' app' : ' apps') + '</small></div>' +
          '<button class="stepper-btn lg" aria-label="More time" data-action="ob-allowance" data-delta="15"' + (draft.allowance >= 360 ? ' disabled' : '') + '>' + icon('plus', 22) + '</button>' +
          '</div>' +
          '<div class="chips centered">' + PRESETS.map(function (m) {
            return '<button class="chip' + (draft.allowance === m ? ' on' : '') + '" data-action="ob-allowance" data-value="' + m + '">' + U.fmt(m) + '</button>';
          }).join('') + '</div>' +
          '<p class="group-foot center">Renews every day at ' + U.clockLabel(S.get().resetTime) + '.</p>',
        primary: { label: 'Continue', action: 'ob-next' }
      };
    },

    blocking: function () {
      var p = perms();
      var cards = '';
      if (p.overlayNeeded) {
        cards += permCard('overlay', 'Display over other apps',
          p.overlay ? 'Allowed.' : 'Lets Margin open its lock screen over other apps. In the list, choose Margin and turn it on.', p.overlay);
      }
      if (p.notificationsNeeded) {
        cards += permCard('notifications', 'Notifications',
          p.notifications ? 'Allowed.' : 'A heads-up before time runs out, plus a short daily summary.', p.notifications, true);
      }
      if (p.batteryRelevant && !p.battery) {
        cards += permCard('battery', 'Run without battery limits',
          'Some phones pause apps in the background. Choose Margin and set it to Unrestricted.', false, true);
      }
      var missing = p.overlayNeeded && !p.overlay;
      var title = p.overlayNeeded ? 'Let Margin close apps' : S.ios ? 'Stay in the loop' : 'Keep Margin running';
      var lede = p.overlayNeeded
        ? 'When your allowance runs out, Margin shows a calm lock screen instead of the app. Android needs your OK for that.'
        : S.ios
          ? 'Margin can give you a heads-up before time runs out, plus a short daily summary.'
          : 'Margin closes apps for you when time’s up. A couple of optional settings help it stay on time.';
      return {
        body: '<p class="ob-eyebrow">' + (p.overlayNeeded ? 'Permission' : 'Almost there') + '</p>' +
          '<h1 class="ob-title">' + title + '</h1>' +
          '<p class="ob-lede">' + lede + '</p>' +
          cards +
          (missing ? '<p class="ob-privacy">' + icon('bell', 16) + '<span>Without it, Margin can only send a notification when time’s up.</span></p>' : '') +
          (S.mode === 'demo' ? '<p class="ob-demo-note">Browser demo: tapping Allow simulates the permission.</p>' : ''),
        primary: { label: missing ? 'Continue without it' : 'Continue', action: 'ob-next', quiet: missing },
        primaryFirst: missing ? { label: 'Allow', action: 'ob-perm', which: 'overlay' } : null
      };
    },

    look: function () {
      return {
        body: '<p class="ob-eyebrow">Appearance</p>' +
          '<h1 class="ob-title">Choose your look</h1>' +
          '<p class="ob-lede">Automatic follows your phone’s light and dark setting. You can switch any time from Home or Settings.</p>' +
          UI.themePicker(draft.theme, 'ob-theme'),
        primary: { label: 'Continue', action: 'ob-next' }
      };
    },

    done: function () {
      var n = selectedIds().length;
      var e = S.get().emergency;
      return {
        body: '<div class="ob-hero done">' +
          '<svg class="ob-mark done" viewBox="0 0 120 120" aria-hidden="true">' +
          '<circle cx="60" cy="60" r="46" class="ob-mark-track"/>' +
          '<circle cx="60" cy="60" r="46" class="ob-mark-arc full" pathLength="1" transform="rotate(-90 60 60)"/>' +
          '<path d="M42 61 L54 73 L79 47" class="ob-mark-check" pathLength="1"/>' +
          '</svg>' +
          '<h1 class="ob-title">You’re all set' + (draft.name ? ', ' + U.esc(draft.name) : '') + '.</h1>' +
          '<p class="ob-lede">Margin is ready to keep you company.</p>' +
          '</div>' +
          '<div class="list ob-summary">' +
          UI.row({ lead: UI.tileIcon('hourglass'), title: U.fmt(draft.allowance) + ' a day', sub: 'Shared by ' + n + (n === 1 ? ' app' : ' apps') }) +
          UI.row({ lead: UI.tileIcon('clock'), title: 'Renews at ' + U.clockLabel(S.get().resetTime), sub: 'Change it any time in Settings' }) +
          UI.row({ lead: UI.tileIcon('shield'), title: 'Emergency access', sub: e.minutes + ' minutes, ' + (e.perDay === 1 ? 'once' : e.perDay + ' times') + ' a day' }) +
          '</div>',
        primary: { label: 'Start using Margin', action: 'ob-finish' }
      };
    }
  };

  // ---------------------------------------------------------------- rendering

  function progress() {
    var list = steps();
    var inner = list.filter(function (k) { return k !== 'welcome' && k !== 'done'; });
    var pos = inner.indexOf(current());
    if (pos < 0) return '<div class="ob-progress" aria-hidden="true"></div>';
    return '<div class="ob-progress" role="progressbar" aria-valuemin="1" aria-valuemax="' + inner.length + '" aria-valuenow="' + (pos + 1) + '">' +
      inner.map(function (k, i) { return '<span class="' + (i <= pos ? 'on' : '') + '"></span>'; }).join('') + '</div>';
  }

  function button(b, cls) {
    if (!b) return '';
    return '<button class="btn btn-block ' + cls + '" data-action="' + b.action + '"' +
      (b.which ? ' data-which="' + b.which + '"' : '') + (b.disabled ? ' disabled' : '') +
      (b.countLabel ? ' data-ob-count' : '') + '>' + b.label + '</button>';
  }

  function render(direction) {
    if (!layer) return;
    var key = current();
    var v = VIEWS[key]();
    var showBack = index > 0 && key !== 'done';
    var top = layer.querySelector('.ob-body');
    var keepScroll = !direction && top ? top.scrollTop : 0;
    layer.innerHTML = '<div class="ob ob-' + key + (direction ? ' ' + direction : '') + '">' +
      '<div class="ob-top">' +
      (showBack ? '<button class="ob-back" data-action="ob-back" aria-label="Back">' + icon('back', 22) + '</button>' : '<span class="ob-back-space"></span>') +
      progress() +
      '<span class="ob-back-space"></span>' +
      '</div>' +
      '<div class="ob-body">' + v.body + '</div>' +
      '<div class="ob-foot">' +
      button(v.primaryFirst, 'btn-primary') +
      button(v.primary, v.primaryFirst || v.primary.quiet ? 'btn-quiet' : 'btn-primary') +
      button(v.secondary, 'btn-quiet') +
      (v.note ? '<p class="ob-note">' + v.note + '</p>' : '') +
      '</div></div>';
    var body = layer.querySelector('.ob-body');
    body.scrollTop = keepScroll;
    var scope = layer.querySelector('[data-search-scope]');
    if (scope && query) UI.applySearch(scope, query);
    if (key === 'name' && direction) {
      setTimeout(function () { var input = layer.querySelector('.ob-input'); if (input) input.focus(); }, 350);
    }
  }

  function go(delta) {
    var list = steps();
    index = U.clamp(index + delta, 0, list.length - 1);
    render(delta > 0 ? 'forward' : 'backward');
  }

  // ---------------------------------------------------------------- lifecycle

  function start() {
    layer = layer || document.getElementById('onboarding-layer');
    initDraft();
    index = 0;
    query = '';
    active = true;
    M.ui.sheet.close();
    document.documentElement.className += ' onboarding';
    layer.classList.add('open');
    if (M.app.syncNative) M.app.syncNative();
    render('forward');
    S.refreshApps();
    S.refreshUsage();
  }

  function finish() {
    S.completeOnboarding({
      name: (draft.name || '').replace(/^\s+|\s+$/g, ''),
      allowance: draft.allowance,
      theme: draft.theme,
      tracked: selectedIds()
    });
    active = false;
    document.documentElement.className = document.documentElement.className.replace(/\s*onboarding/g, '');
    layer.classList.remove('open');
    M.app.applyTheme(false);
    M.app.navigate('home', null, true);
    setTimeout(function () { if (!active) layer.innerHTML = ''; }, 600);
  }

  M.onboarding = {
    start: start,
    isActive: function () { return active; },
    /** Back from Android: step back, or stay on the first screen. */
    back: function () { if (index > 0 && current() !== 'done') { go(-1); } return true; },
    /** Permissions may have changed in system settings. */
    onResume: function () {
      if (!active) return;
      var key = current();
      if (key === 'usage' || key === 'blocking' || (S.ios && key === 'apps')) {
        // A step can disappear (e.g. nothing left to allow), so keep the index in range.
        index = Math.min(index, steps().length - 1);
        render(null);
        if (perms().usage) S.refreshUsage();
      }
    },
    /** New data (app list, usage) while the app list is showing. */
    onData: function () {
      if (!active) return;
      if (current() === 'apps' && (S.ios || S.allIds().length !== renderedApps)) render(null);
    }
  };

  // ---------------------------------------------------------------- actions

  var A = M.actions;
  A['ob-next'] = function () {
    if (current() === 'apps' && !selectedIds().length) return;
    go(1);
  };
  A['ob-back'] = function () { go(-1); };
  A['ob-pick-apps'] = function () { M.native.pickApps(); };
  A['ob-skip-name'] = function () { draft.name = ''; go(1); };
  A['ob-perm'] = function (el) {
    var which = el.getAttribute('data-which');
    M.app.openPermission(which);
    if (S.mode === 'demo') setTimeout(function () { render(null); }, 50);
  };
  A['ob-toggle-app'] = function (el) {
    var id = el.getAttribute('data-id');
    draft.appsTouched = true;
    draft.tracked[id] = !draft.tracked[id];
    // Update in place so the list keeps its scroll position and the search keeps focus.
    var on = draft.tracked[id];
    el.className = el.className.replace(/\s*selected/g, '') + (on ? ' selected' : '');
    el.setAttribute('aria-checked', on ? 'true' : 'false');
    var check = el.querySelector('.check');
    if (check) check.className = 'check' + (on ? ' on' : '');
    var btn = layer.querySelector('[data-ob-count]');
    if (btn) { btn.textContent = countLabel(); btn.disabled = !selectedIds().length; }
  };
  A['ob-allowance'] = function (el) {
    var v = el.getAttribute('data-value');
    var d = el.getAttribute('data-delta');
    draft.allowanceTouched = true;
    draft.allowance = v ? parseInt(v, 10) : U.clamp(draft.allowance + parseInt(d, 10), 15, 360);
    render(null);
  };
  A['ob-theme'] = function (el) {
    draft.theme = el.getAttribute('data-value');
    M.app.applyTheme(true, draft.theme);
    render(null);
  };
  A['ob-finish'] = finish;

  M.inputs = M.inputs || {};
  M.inputs['ob-name'] = function (el) {
    draft.name = el.value;
    var skip = layer.querySelector('[data-action="ob-skip-name"]');
    if (skip) skip.style.visibility = el.value ? 'hidden' : '';
  };
  M.inputs['ob-search'] = function (el) {
    query = el.value;
    var scope = el.closest('[data-search-scope]');
    if (scope) UI.applySearch(scope, query);
  };

  document.addEventListener('keydown', function (e) {
    if (!active || (e.key !== 'Enter' && e.keyCode !== 13)) return;
    if (e.target && e.target.classList && e.target.classList.contains('ob-input')) {
      e.preventDefault();
      e.target.blur();
      go(1);
    }
  });
})(window.M);
