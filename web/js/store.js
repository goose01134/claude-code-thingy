/* Margin — settings, app catalogue, usage data and derived values.
   On Android, usage comes from the system (via M.native) and settings are stored natively so
   the blocking service can enforce them. In a browser, Margin runs in demo mode with
   simulated usage. */
(function (M) {
  'use strict';

  var U = M.util;
  var NATIVE = M.native.available;
  var VERSION = 2;
  var STATE_KEY = 'margin.state.v2';
  var DEMO_KEY = 'margin.demo.v2';
  var CATALOG_KEY = 'margin.catalog.v2';
  var ICON_BASE = 'https://appicon.localhost/';

  // ---------------------------------------------------------------- demo data

  var DEMO_CATALOG = {
    instagram: { name: 'Instagram', category: 'Photo & social', glyph: 'I', tone: '#9C5A74', suggested: true },
    tiktok: { name: 'TikTok', category: 'Short video', glyph: 'T', tone: '#2B2B2E', suggested: true },
    youtube: { name: 'YouTube', category: 'Video', glyph: 'Y', tone: '#A44C42', suggested: true },
    snapchat: { name: 'Snapchat', category: 'Messaging', glyph: 'S', tone: '#B8952F', suggested: true },
    x: { name: 'X', category: 'News & social', glyph: 'X', tone: '#3C3C3F', suggested: false },
    reddit: { name: 'Reddit', category: 'Communities', glyph: 'R', tone: '#B3653F', suggested: false },
    facebook: { name: 'Facebook', category: 'Social', glyph: 'F', tone: '#46609A', suggested: false },
    pinterest: { name: 'Pinterest', category: 'Inspiration', glyph: 'P', tone: '#9A4746', suggested: false },
    threads: { name: 'Threads', category: 'Conversation', glyph: '@', tone: '#4B4B4E', suggested: false },
    twitch: { name: 'Twitch', category: 'Live streaming', glyph: 'T', tone: '#664F94', suggested: false }
  };

  /** Today's base usage curve by hour (sums to the sample day's 47 minutes). */
  var BASE_HOURLY = [0, 0, 0, 0, 0, 0, 0, 3, 6, 2, 0, 4, 7, 3, 0, 2, 5, 4, 8, 3, 0, 0, 0, 0];

  function zeros(n) { var a = []; for (var i = 0; i < n; i++) a.push(0); return a; }

  function demoDefaults() {
    return {
      apps: {
        // history = previous six days, oldest first. used/opens = today.
        instagram: { used: 19, opens: 14, history: [38, 42, 29, 51, 33, 40] },
        tiktok: { used: 14, opens: 9, history: [31, 28, 35, 30, 22, 34] },
        youtube: { used: 9, opens: 4, history: [32, 25, 41, 30, 44, 26] },
        snapchat: { used: 5, opens: 11, history: [12, 15, 10, 18, 14, 9] },
        x: { used: 6, opens: 5, history: [14, 9, 18, 11, 7, 12] },
        reddit: { used: 11, opens: 6, history: [22, 18, 25, 16, 20, 19] },
        facebook: { used: 0, opens: 0, history: [5, 0, 8, 3, 0, 4] },
        pinterest: { used: 3, opens: 2, history: [6, 4, 0, 9, 5, 2] },
        threads: { used: 2, opens: 3, history: [4, 6, 3, 2, 5, 3] },
        twitch: { used: 0, opens: 0, history: [0, 35, 0, 0, 48, 0] }
      },
      extraHourly: zeros(24),
      pastWeeks: [182, 164, 149, 137, 129],
      perms: { usage: false, overlay: false, notifications: false }
    };
  }

  function defaults() {
    return {
      version: VERSION,
      onboarded: false,
      name: '',
      allowance: 120,
      resetTime: '04:00',
      theme: 'system',
      tracked: [],
      limits: {},       // per-app minutes; absent = follows the daily allowance
      strict: {},       // per-app: false = remind instead of locking
      notifications: { warnings: true, warnAt: 15, dailySummary: true, weeklyReport: true, streaks: false },
      focus: [
        { id: 'f1', name: 'Deep work', days: [1, 2, 3, 4, 5], start: '09:00', end: '12:00', enabled: false },
        { id: 'f2', name: 'Wind down', days: [0, 1, 2, 3, 4, 5, 6], start: '22:00', end: '07:00', enabled: false }
      ],
      emergency: { enabled: true, minutes: 5, perDay: 1, hold: 3 },
      emergencyUsed: 0,
      emergencyDay: '',
      emergencyUntil: 0
    };
  }

  // ---------------------------------------------------------------- persistence

  function readLocal(key) {
    try { var raw = window.localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeLocal(key, value) {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ }
  }

  function upgrade(data) {
    if (!data || data.version !== VERSION) return null;
    var base = defaults();
    Object.keys(base).forEach(function (k) { if (!(k in data)) data[k] = base[k]; });
    return data;
  }

  function persist() {
    if (NATIVE) M.native.saveState(state);
    else writeLocal(STATE_KEY, state);
  }

  var state = upgrade(NATIVE ? M.native.getState() : readLocal(STATE_KEY)) || defaults();
  var demo = NATIVE ? null : (readLocal(DEMO_KEY) || demoDefaults());
  var catalog = {};
  var usage = emptyUsage();
  var subscribers = [];

  function saveDemo() { if (demo) writeLocal(DEMO_KEY, demo); }

  function emptyUsage() {
    return { ready: false, today: {}, days: [{}, {}, {}, {}, {}, {}], hourly: zeros(24), weeks: [] };
  }

  // ---------------------------------------------------------------- catalogue

  function nativeEntry(item) {
    return {
      name: item.name || item.id,
      category: item.category || '',
      suggested: !!item.suggested,
      glyph: U.glyph(item.name || item.id),
      tone: U.tone(item.id),
      icon: ICON_BASE + encodeURIComponent(item.id)
    };
  }

  function setCatalog(list) {
    var next = {};
    list.forEach(function (item) { if (item && item.id) next[item.id] = nativeEntry(item); });
    catalog = next;
  }

  if (NATIVE) setCatalog(readLocal(CATALOG_KEY) || []);
  else Object.keys(DEMO_CATALOG).forEach(function (id) {
    var c = DEMO_CATALOG[id];
    catalog[id] = { name: c.name, category: c.category, glyph: c.glyph, tone: c.tone, suggested: c.suggested, icon: null };
  });

  function ensureCatalogEntry(id, name) {
    if (!catalog[id]) catalog[id] = nativeEntry({ id: id, name: name || id });
  }

  // ---------------------------------------------------------------- subscriptions

  function emit() { subscribers.slice().forEach(function (fn) { fn(state); }); }
  function subscribe(fn) { subscribers.push(fn); }
  function get() { return state; }

  function update(mutator) {
    mutator(state);
    persist();
    emit();
  }

  // ---------------------------------------------------------------- the app model

  function usageOf(id) {
    if (!NATIVE) {
      var d = demo.apps[id];
      if (!d) return { used: 0, opens: 0, history: zeros(6), historyOpens: zeros(6) };
      return {
        used: d.used, opens: d.opens, history: d.history.slice(),
        historyOpens: d.history.map(function (m) { return Math.round(m / 3); })
      };
    }
    var t = usage.today[id];
    return {
      used: t ? t[0] : 0,
      opens: t ? t[1] : 0,
      history: usage.days.map(function (day) { var v = day[id]; return v ? v[0] : 0; }),
      historyOpens: usage.days.map(function (day) { var v = day[id]; return v ? v[1] : 0; })
    };
  }

  /** Everything the UI needs about one app. */
  function app(id) {
    var c = catalog[id] || { name: id, category: '', glyph: U.glyph(id), tone: U.tone(id), icon: NATIVE ? ICON_BASE + encodeURIComponent(id) : null };
    var u = usageOf(id);
    var custom = state.limits[id];
    var hasCustom = custom > 0 && custom < state.allowance;
    return {
      id: id,
      name: c.name,
      category: c.category,
      glyph: c.glyph,
      tone: c.tone,
      icon: c.icon,
      suggested: !!c.suggested,
      limit: hasCustom ? custom : state.allowance,
      customLimit: hasCustom,
      strict: state.strict[id] !== false,
      used: u.used,
      opens: u.opens,
      history: u.history,
      historyOpens: u.historyOpens,
      week: U.sum(u.history) + u.used
    };
  }

  // ---------------------------------------------------------------- derived values

  function isTracked(id) { return state.tracked.indexOf(id) >= 0; }

  function trackedIds() {
    // Hide apps that were uninstalled (once the real catalogue is known).
    var known = Object.keys(catalog).length > 0;
    return state.tracked.filter(function (id) { return !known || catalog[id]; });
  }

  function byWeekThenName(a, b) {
    var x = app(a), y = app(b);
    if (y.week !== x.week) return y.week - x.week;
    return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1;
  }

  function untrackedIds() {
    return Object.keys(catalog).filter(function (id) { return !isTracked(id); }).sort(byWeekThenName);
  }

  function suggestedIds() {
    return Object.keys(catalog).filter(function (id) { return catalog[id].suggested; }).sort(byWeekThenName);
  }

  function allIds() { return Object.keys(catalog).sort(byWeekThenName); }

  function usedToday() { return U.sum(trackedIds().map(function (id) { return app(id).used; })); }
  function remaining() { return Math.max(0, state.allowance - usedToday()); }

  function todayKey() { return U.dayKey(state.resetTime, new Date()); }
  function emergencyActive() { return state.emergencyUntil > Date.now(); }
  function emergencyUsedToday() { return state.emergencyDay === todayKey() ? state.emergencyUsed : 0; }
  function emergencyLeft() { return Math.max(0, state.emergency.perDay - emergencyUsedToday()); }

  function isLocked() { return trackedIds().length > 0 && remaining() <= 0 && !emergencyActive(); }

  function appOverLimit(id) {
    var a = app(id);
    return isTracked(id) && a.strict && a.used >= a.limit && !emergencyActive();
  }

  function overLimitIds() { return trackedIds().filter(appOverLimit); }

  /** The focus schedule active right now, if any. Mirrors TimeUtil.activeFocus(). */
  function activeFocus(now) {
    now = now || new Date();
    var mins = now.getHours() * 60 + now.getMinutes();
    var today = now.getDay();
    var yesterday = (today + 6) % 7;
    for (var i = 0; i < state.focus.length; i++) {
      var f = state.focus[i];
      if (!f.enabled) continue;
      var s = U.toMinutes(f.start);
      var e = U.toMinutes(f.end);
      if (s < e) {
        if (f.days.indexOf(today) >= 0 && mins >= s && mins < e) return f;
      } else if (s > e) {
        if (f.days.indexOf(today) >= 0 && mins >= s) return f;
        if (f.days.indexOf(yesterday) >= 0 && mins < e) return f;
      }
    }
    return null;
  }

  /** Seven daily totals for tracked apps, oldest first, ending today. */
  function weekTotals() {
    var out = zeros(7);
    trackedIds().forEach(function (id) {
      var a = app(id);
      for (var i = 0; i < 6; i++) out[i] += a.history[i] || 0;
      out[6] += a.used;
    });
    return out;
  }

  /** Today's tracked usage by clock hour. */
  function hourly() {
    if (NATIVE) return usage.hourly.slice();
    var used = usedToday();
    var extra = demo.extraHourly;
    var scale = Math.max(0, used - U.sum(extra)) / U.sum(BASE_HOURLY);
    return BASE_HOURLY.map(function (v, i) { return v * scale + extra[i]; });
  }

  function opensToday() { return U.sum(trackedIds().map(function (id) { return app(id).opens; })); }

  /** Average minutes per day for recent completed weeks, oldest first. */
  function pastWeeks() { return NATIVE ? usage.weeks.slice() : demo.pastWeeks.slice(); }

  function usageReady() { return !NATIVE || usage.ready; }

  // ---------------------------------------------------------------- actions

  function grantEmergency() {
    if (!state.emergency.enabled || emergencyLeft() <= 0) return false;
    if (NATIVE) {
      var next = upgrade(M.native.grantEmergency());
      if (!next) return false;
      state = next;
      emit();
      return true;
    }
    update(function (s) {
      s.emergencyUsed = emergencyUsedToday() + 1;
      s.emergencyDay = todayKey();
      s.emergencyUntil = Date.now() + s.emergency.minutes * 60000;
    });
    return true;
  }

  function track(id) {
    update(function (s) {
      if (s.tracked.indexOf(id) < 0) s.tracked.push(id);
      if (!(id in s.strict)) s.strict[id] = true;
    });
  }

  function untrack(id) {
    update(function (s) {
      s.tracked = s.tracked.filter(function (t) { return t !== id; });
      delete s.limits[id];
    });
  }

  /** Finish first-launch setup with the choices made in the tutorial. */
  function completeOnboarding(d) {
    update(function (s) {
      s.onboarded = true;
      s.name = d.name;
      s.allowance = d.allowance;
      s.theme = d.theme;
      s.tracked = d.tracked.slice();
      s.tracked.forEach(function (id) { if (!(id in s.strict)) s.strict[id] = true; });
    });
  }

  function restartOnboarding() {
    update(function (s) { s.onboarded = false; });
  }

  function resetAll() {
    var theme = state.theme;
    state = defaults();
    state.theme = theme;
    if (!NATIVE) { demo = demoDefaults(); saveDemo(); }
    persist();
    emit();
  }

  // ---------------------------------------------------------------- native refresh

  function refreshUsage(done) {
    if (!NATIVE) { if (done) done(); return; }
    M.native.request('requestUsage', function (data) {
      if (data && data.today) {
        var days = (data.days || []).slice(-6);
        while (days.length < 6) days.unshift({});
        var weeks = (data.weeks || []).slice();
        while (weeks.length && !weeks[0]) weeks.shift(); // weeks before the phone had any data
        usage = {
          ready: true,
          today: data.today,
          days: days,
          hourly: data.hourly && data.hourly.length === 24 ? data.hourly : zeros(24),
          weeks: weeks
        };
      } else {
        usage.ready = true;
      }
      emit();
      if (done) done(data);
    });
  }

  function refreshApps(done) {
    if (!NATIVE) { if (done) done(); return; }
    M.native.request('requestApps', function (list) {
      if (list && list.length) {
        setCatalog(list);
        writeLocal(CATALOG_KEY, list);
        emit();
      }
      if (done) done(list);
    });
  }

  /** Re-read settings saved by native code (e.g. emergency access granted on the lock screen). */
  function reload() {
    if (!NATIVE) return;
    var next = upgrade(M.native.getState());
    if (next) { state = next; emit(); }
  }

  // ---------------------------------------------------------------- demo simulation

  function pickWeighted(ids) {
    var weights = ids.map(function (id) { return U.sum(demo.apps[id].history) + 10; });
    var r = Math.random() * U.sum(weights);
    for (var i = 0; i < ids.length; i++) { r -= weights[i]; if (r <= 0) return ids[i]; }
    return ids[ids.length - 1];
  }

  /** Spread `minutes` of usage across tracked apps that still have time left. */
  function simulate(minutes) {
    if (NATIVE) return;
    var hour = new Date().getHours();
    var left = minutes;
    var guard = 200;
    while (left > 0 && guard-- > 0) {
      var ids = trackedIds().filter(function (id) { return demo.apps[id]; });
      if (!ids.length) break;
      var open = ids.filter(function (id) { var a = app(id); return !a.strict || a.used < a.limit; });
      var id = pickWeighted(open.length ? open : ids);
      var a = app(id);
      var room = a.strict && a.used < a.limit ? a.limit - a.used : 5;
      var chunk = Math.min(5, left, room);
      demo.apps[id].used += chunk;
      if (Math.random() < 0.45) demo.apps[id].opens += 1;
      demo.extraHourly[hour] += chunk;
      left -= chunk;
    }
    saveDemo();
    emit();
  }

  function addSession(id, minutes) {
    if (NATIVE || !demo.apps[id]) return;
    demo.apps[id].used += minutes;
    demo.apps[id].opens += 1;
    demo.extraHourly[new Date().getHours()] += minutes;
    saveDemo();
    emit();
  }

  function resetDay() {
    if (NATIVE) return;
    var base = demoDefaults();
    Object.keys(demo.apps).forEach(function (id) {
      demo.apps[id].used = base.apps[id].used;
      demo.apps[id].opens = base.apps[id].opens;
    });
    demo.extraHourly = zeros(24);
    saveDemo();
    update(function (s) { s.emergencyUsed = 0; s.emergencyUntil = 0; });
  }

  /** Simulated permissions for the browser demo. */
  function demoPerms() { return demo ? demo.perms : null; }
  function grantDemoPerm(which) {
    if (!demo) return;
    demo.perms[which] = true;
    saveDemo();
    emit();
  }

  M.store = {
    mode: NATIVE ? 'native' : 'demo',
    get: get,
    update: update,
    subscribe: subscribe,
    app: app,
    catalog: function () { return catalog; },
    ensureCatalogEntry: ensureCatalogEntry,
    isTracked: isTracked,
    trackedIds: trackedIds,
    untrackedIds: untrackedIds,
    suggestedIds: suggestedIds,
    allIds: allIds,
    usedToday: usedToday,
    remaining: remaining,
    todayKey: todayKey,
    emergencyActive: emergencyActive,
    emergencyLeft: emergencyLeft,
    isLocked: isLocked,
    appOverLimit: appOverLimit,
    overLimitIds: overLimitIds,
    activeFocus: activeFocus,
    weekTotals: weekTotals,
    hourly: hourly,
    opensToday: opensToday,
    pastWeeks: pastWeeks,
    usageReady: usageReady,
    grantEmergency: grantEmergency,
    track: track,
    untrack: untrack,
    completeOnboarding: completeOnboarding,
    restartOnboarding: restartOnboarding,
    resetAll: resetAll,
    refreshUsage: refreshUsage,
    refreshApps: refreshApps,
    reload: reload,
    simulate: simulate,
    addSession: addSession,
    resetDay: resetDay,
    demoPerms: demoPerms,
    grantDemoPerm: grantDemoPerm
  };
})(window.M);
