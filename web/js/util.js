/* Margin — small formatting and date helpers. */
window.M = window.M || {};

(function (M) {
  'use strict';

  var DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DAYS_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /** 73 -> "1h 13m", 47 -> "47m", 120 -> "2h" */
  function fmt(min) {
    min = Math.max(0, Math.round(min));
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (!h) return m + 'm';
    if (!m) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  /** 73 -> "1 hour 13 minutes" */
  function fmtLong(min) {
    min = Math.max(0, Math.round(min));
    var h = Math.floor(min / 60);
    var m = min % 60;
    var parts = [];
    if (h) parts.push(h + (h === 1 ? ' hour' : ' hours'));
    if (m || !h) parts.push(m + (m === 1 ? ' minute' : ' minutes'));
    return parts.join(' ');
  }

  /** 272 seconds -> "4:32" */
  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function sum(arr) { return arr.reduce(function (s, v) { return s + v; }, 0); }

  function parseHM(hm) {
    var p = String(hm).split(':');
    return { h: parseInt(p[0], 10) || 0, m: parseInt(p[1], 10) || 0 };
  }
  function toMinutes(hm) { var t = parseHM(hm); return t.h * 60 + t.m; }

  /**
   * "04:00" -> "4:00 AM". Formatted by hand: older Android WebViews apply the
   * wrong timezone offset in toLocaleTimeString and would show "3:00 AM".
   */
  function clockLabel(hm) {
    var t = parseHM(hm);
    var h12 = t.h % 12 || 12;
    return h12 + ':' + (t.m < 10 ? '0' : '') + t.m + ' ' + (t.h < 12 ? 'AM' : 'PM');
  }

  /** Next Date at which "HH:MM" occurs. */
  function nextAt(hm, now) {
    now = now || new Date();
    var t = parseHM(hm);
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.h, t.m, 0, 0);
    if (d <= now) d.setDate(d.getDate() + 1);
    return d;
  }

  /** "Today" / "Tomorrow" / weekday for a future date. */
  function relativeDay(d, now) {
    now = now || new Date();
    var a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var b = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((b - a) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return DAYS_LONG[d.getDay()];
  }

  function greeting(d) {
    var h = d.getHours();
    if (h >= 5 && h < 12) return 'Good morning';
    if (h >= 12 && h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function dateLabel(d) {
    return DAYS_LONG[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  }

  /** The last n days, oldest first, ending today. */
  function lastDays(n) {
    var out = [];
    var now = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push(d);
    }
    return out;
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  /** "2026-11-18": the day containing `now`, where days start at the reset time. Mirrors TimeUtil.dayKey(). */
  function dayKey(resetHM, now) {
    now = now || new Date();
    var t = parseHM(resetHM);
    var d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), t.h, t.m, 0, 0);
    if (d > now) d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  var TONES = ['#9C5A74', '#46609A', '#A44C42', '#B8952F', '#3F6F64', '#664F94', '#8A6A4F', '#3C3C3F'];

  /** A stable, muted colour for an app without an icon. */
  function tone(seed) {
    var h = 0;
    for (var i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 9973;
    return TONES[h % TONES.length];
  }

  function glyph(name) {
    var m = /[A-Za-z0-9]/.exec(name || '');
    return m ? m[0].toUpperCase() : (name || '?').charAt(0);
  }

  /** Summarise a set of weekdays: [1..5] -> "Weekdays". */
  function daysSummary(days) {
    var s = days.slice().sort().join(',');
    if (s === '0,1,2,3,4,5,6') return 'Every day';
    if (s === '1,2,3,4,5') return 'Weekdays';
    if (s === '0,6') return 'Weekends';
    if (!days.length) return 'Never';
    var order = [1, 2, 3, 4, 5, 6, 0];
    return order.filter(function (d) { return days.indexOf(d) >= 0; })
      .map(function (d) { return DAYS_SHORT[d]; }).join(', ');
  }

  /** Launch flags: the Android shell passes e.g. "#native=1&sysdark=0". */
  function flag(name) {
    var q = (window.location.search || '') + (window.location.hash || '');
    var m = new RegExp('[?&#]' + name + '=([^&#]*)').exec(q);
    return m ? m[1] : null;
  }

  function isNative() { return flag('native') === '1'; }

  /** The iPhone shell passes "#native=1&platform=ios". */
  function isIOS() { return isNative() && flag('platform') === 'ios'; }

  function systemPrefersDark() {
    if (typeof window.__marginSysDark === 'boolean') return window.__marginSysDark; // updated by the Android shell
    var f = flag('sysdark');
    if (f === '1') return true;
    if (f === '0') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }

  // ---------- capability flags (set before first render) ----------

  var docEl = document.documentElement;

  /** CSS custom properties (WebView 49+). Without them only the light theme is available. */
  var supportsVars = !!(window.CSS && window.CSS.supports && window.CSS.supports('color', 'var(--probe)'));

  /** Flexbox `gap` (WebView 84+). Feature-tested by layout, as CSS.supports gives false positives. */
  function detectFlexGap() {
    var box = document.createElement('div');
    box.style.cssText = 'display:flex;flex-direction:column;row-gap:1px;position:absolute;visibility:hidden';
    box.appendChild(document.createElement('div'));
    box.appendChild(document.createElement('div'));
    document.body.appendChild(box);
    var ok = box.scrollHeight === 1;
    document.body.removeChild(box);
    return ok;
  }

  if (isNative()) docEl.className += ' native';
  if (isIOS()) docEl.className += ' ios';
  if (!supportsVars) docEl.className += ' no-vars';
  if (!detectFlexGap()) docEl.className += ' no-flexgap';

  M.util = {
    DAYS_LONG: DAYS_LONG,
    DAYS_SHORT: DAYS_SHORT,
    DAYS_LETTER: DAYS_LETTER,
    fmt: fmt,
    fmtLong: fmtLong,
    fmtClock: fmtClock,
    esc: esc,
    clamp: clamp,
    sum: sum,
    parseHM: parseHM,
    toMinutes: toMinutes,
    clockLabel: clockLabel,
    nextAt: nextAt,
    relativeDay: relativeDay,
    greeting: greeting,
    dateLabel: dateLabel,
    lastDays: lastDays,
    daysSummary: daysSummary,
    dayKey: dayKey,
    tone: tone,
    glyph: glyph,
    flag: flag,
    isNative: isNative,
    isIOS: isIOS,
    supportsVars: supportsVars,
    systemPrefersDark: systemPrefersDark
  };
})(window.M);
