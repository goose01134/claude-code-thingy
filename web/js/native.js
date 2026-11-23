/* Margin — thin wrapper around the native bridge (window.MarginNative), from the Android shell
   or the iPhone shell. In a browser the bridge is absent and the app runs in demo mode. */
(function (M) {
  'use strict';

  var N = window.MarginNative;
  var available = !!N && M.util.isNative();
  var callbacks = {};
  var seq = 0;

  function parse(text) {
    if (!text) return null;
    try { return JSON.parse(text); } catch (e) { return null; }
  }

  M.native = {
    available: available,
    info: available ? (parse(N.info()) || {}) : {},
    /** Running in the iPhone app. Screen Time keeps app names private there, so the Apps and
        Statistics tabs are native screens and usage is a single total. */
    ios: available && M.util.isIOS(),

    getState: function () { return available ? parse(N.getState()) : null; },
    saveState: function (state) { if (available) N.saveState(JSON.stringify(state)); },
    permissions: function () { return available ? (parse(N.permissions()) || {}) : null; },
    openPermission: function (which) { if (available) N.openPermission(which); },
    appLabel: function (pkg) { return available ? N.appLabel(pkg) : ''; },
    launchApp: function (pkg) { if (available) N.launchApp(pkg); },
    grantEmergency: function () { return available ? parse(N.grantEmergency()) : null; },
    lockAction: function (action) { if (available) N.lockAction(action); },
    setDarkBars: function (dark) { if (available) { try { N.setDarkBars(dark); } catch (e) { /* optional */ } } },
    /** iPhone: show a native screen ('apps', 'stats') above the tab bar, or none. */
    showNative: function (screen, inset) { if (available && N.showNative) N.showNative(screen || null, inset || 0); },
    /** iPhone: open Apple's app picker. */
    pickApps: function () { if (available && N.pickApps) N.pickApps(); },

    /** Asynchronous request: the native side answers later through resolve(). */
    request: function (method, cb) {
      if (!available || typeof N[method] !== 'function' && typeof N[method] !== 'object') { cb(null); return; }
      var id = 'r' + (++seq);
      callbacks[id] = cb;
      try { N[method](id); } catch (e) { delete callbacks[id]; cb(null); }
    },
    resolve: function (id, payload) {
      var cb = callbacks[id];
      delete callbacks[id];
      if (cb) cb(parse(payload));
    }
  };
})(window.M);
