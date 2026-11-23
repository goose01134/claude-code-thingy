/* Margin — reusable UI building blocks (render to HTML strings) and overlays. */
(function (M) {
  'use strict';

  var U = M.util;
  var icon = M.icon;
  var ringLast = {};

  var UI = { entering: false };

  function attrsToString(attrs) { return attrs ? ' ' + attrs : ''; }

  /**
   * App icon. On Android this is the real icon (served locally by the native shell);
   * if it can't load, or in the browser demo, a monogram tile is shown instead.
   * Accepts an app id or an app object from store.app().
   */
  UI.appIcon = function (idOrApp, size) {
    var a = typeof idOrApp === 'string' ? M.store.app(idOrApp) : idOrApp;
    size = size || 40;
    var radius = Math.round(size * 0.27);
    var box = 'width:' + size + 'px;height:' + size + 'px;border-radius:' + radius + 'px;font-size:' + Math.round(size * 0.42) + 'px';
    var mono = '<span class="app-glyph" style="background:' + a.tone + ';border-radius:' + radius + 'px">' + U.esc(a.glyph) + '</span>';
    if (a.icon) {
      return '<span class="app-icon has-img" style="' + box + '" aria-hidden="true">' + mono +
        '<img src="' + U.esc(a.icon) + '" alt="" loading="lazy" onerror="this.parentNode.className+=\' img-failed\'"></span>';
    }
    return '<span class="app-icon" style="' + box + '" aria-hidden="true">' + mono + '</span>';
  };

  /** Round selection check used in pickers. */
  UI.check = function (on) {
    return '<span class="check' + (on ? ' on' : '') + '" aria-hidden="true">' + icon('check', 14) + '</span>';
  };

  /**
   * Search field that filters elements carrying data-search="<lowercase text>" inside
   * the closest [data-search-scope], without re-rendering (so typing keeps focus).
   */
  UI.search = function (value, placeholder, key) {
    return '<label class="search">' + icon('search', 18) +
      '<input class="search-input" type="search" autocomplete="off" spellcheck="false" data-input="' + (key || 'search') + '" value="' +
      U.esc(value || '') + '" placeholder="' + U.esc(placeholder || 'Search') + '"></label>';
  };

  // ---------- Theme picker (with miniature previews of each look) ----------

  var PALETTES = {
    light: { bg: '#F5F4F0', surface: '#FFFFFF', ink: '#151514', accent: '#2E6A58', track: '#E1E0DA', line: 'rgba(21,21,20,.12)' },
    dark: { bg: '#0F0F0E', surface: '#242422', ink: '#F3F2EE', accent: '#7DB9A4', track: '#2E2E2B', line: 'rgba(255,255,255,.14)' }
  };
  var clipSeq = 0;

  function miniature(p) {
    return '<rect x="0.5" y="0.5" width="63" height="87" rx="11" fill="' + p.bg + '" stroke="' + p.line + '"/>' +
      '<circle cx="32" cy="29" r="12.5" fill="none" stroke="' + p.track + '" stroke-width="4"/>' +
      '<path d="M32 16.5 A12.5 12.5 0 1 1 20.1 32.9" fill="none" stroke="' + p.accent + '" stroke-width="4" stroke-linecap="round"/>' +
      '<rect x="9" y="52" width="46" height="11" rx="3.5" fill="' + p.surface + '"/>' +
      '<rect x="9" y="66" width="46" height="11" rx="3.5" fill="' + p.surface + '"/>' +
      '<rect x="13" y="56.5" width="20" height="2" rx="1" fill="' + p.ink + '" opacity=".5"/>' +
      '<rect x="13" y="70.5" width="13" height="2" rx="1" fill="' + p.ink + '" opacity=".5"/>';
  }

  function themeArt(kind) {
    var body;
    if (kind === 'system') {
      var id = 'half' + (++clipSeq);
      body = miniature(PALETTES.light) +
        '<clipPath id="' + id + '"><path d="M64 0V88H0z"/></clipPath>' +
        '<g clip-path="url(#' + id + ')">' + miniature(PALETTES.dark) + '</g>';
    } else {
      body = miniature(PALETTES[kind]);
    }
    return '<svg class="theme-art" viewBox="0 0 64 88" aria-hidden="true">' + body + '</svg>';
  }

  UI.themePicker = function (value, action) {
    var opts = [['system', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']];
    return '<div class="theme-tiles" role="radiogroup" aria-label="Appearance">' + opts.map(function (o) {
      var on = value === o[0];
      return '<button class="theme-tile' + (on ? ' selected' : '') + '" role="radio" aria-checked="' + on +
        '" data-action="' + action + '" data-value="' + o[0] + '">' + themeArt(o[0]) +
        '<span class="theme-name">' + o[1] + '</span>' + UI.check(on) + '</button>';
    }).join('') + '</div>';
  };

  UI.applySearch = function (scope, query) {
    var q = (query || '').toLowerCase().replace(/^\s+|\s+$/g, '');
    var items = scope.querySelectorAll('[data-search]');
    var shown = 0;
    for (var i = 0; i < items.length; i++) {
      var match = !q || items[i].getAttribute('data-search').indexOf(q) >= 0;
      items[i].style.display = match ? '' : 'none';
      if (match) shown++;
    }
    var empty = scope.querySelector('[data-search-empty]');
    if (empty) empty.style.display = shown ? 'none' : '';
    return shown;
  };

  UI.tileIcon = function (name) {
    return '<span class="tile-icon">' + icon(name, 18) + '</span>';
  };

  UI.toggle = function (on, action, attrs) {
    return '<button class="toggle' + (on ? ' on' : '') + '" role="switch" aria-checked="' + (on ? 'true' : 'false') +
      '" data-action="' + action + '"' + attrsToString(attrs) + '><span class="toggle-knob"></span></button>';
  };

  /**
   * A list row.
   * o: { lead, title, sub, value, valueStrong, right, action, attrs, chevron, danger, cls }
   */
  UI.row = function (o) {
    var tag = o.action ? 'button' : 'div';
    return '<' + tag + ' class="row' + (o.danger ? ' row-danger' : '') + (o.cls ? ' ' + o.cls : '') + '"' +
      (o.action ? ' data-action="' + o.action + '"' : '') + attrsToString(o.attrs) + '>' +
      (o.lead ? '<span class="row-lead">' + o.lead + '</span>' : '') +
      '<span class="row-main"><span class="row-title">' + o.title + '</span>' +
      (o.sub ? '<span class="row-sub">' + o.sub + '</span>' : '') + '</span>' +
      (o.value != null ? '<span class="row-value' + (o.valueStrong ? ' strong' : '') + ' tnum">' + o.value + '</span>' : '') +
      (o.right || '') +
      (o.chevron ? '<span class="row-chev">' + icon('chevron', 18) + '</span>' : '') +
      '</' + tag + '>';
  };

  UI.group = function (label, inner, footer, listCls) {
    return '<div class="group">' +
      (label ? '<p class="group-label">' + label + '</p>' : '') +
      '<div class="list' + (listCls ? ' ' + listCls : '') + '">' + inner + '</div>' +
      (footer ? '<p class="group-foot">' + footer + '</p>' : '') +
      '</div>';
  };

  /** Segmented control. options: [{ value, label }] */
  UI.segmented = function (options, value, action, cls) {
    var idx = 0;
    options.forEach(function (o, i) { if (String(o.value) === String(value)) idx = i; });
    var n = options.length;
    return '<div class="seg' + (cls ? ' ' + cls : '') + '" role="tablist">' +
      '<span class="seg-ind" style="width:calc((100% - 4px) / ' + n + ');transform:translateX(' + (idx * 100) + '%)"></span>' +
      options.map(function (o, i) {
        return '<button class="seg-item' + (i === idx ? ' active' : '') + '" role="tab" aria-selected="' + (i === idx) +
          '" data-action="' + action + '" data-value="' + U.esc(o.value) + '" data-i="' + i + '">' + o.label + '</button>';
      }).join('') +
      '</div>';
  };

  UI.stepper = function (label, decAction, incAction, opts) {
    opts = opts || {};
    return '<div class="stepper">' +
      '<button class="stepper-btn" aria-label="Decrease" data-action="' + decAction + '"' + attrsToString(opts.attrs) +
      (opts.minReached ? ' disabled' : '') + '>' + icon('minus', 18) + '</button>' +
      '<span class="stepper-value tnum">' + label + '</span>' +
      '<button class="stepper-btn" aria-label="Increase" data-action="' + incAction + '"' + attrsToString(opts.attrs) +
      (opts.maxReached ? ' disabled' : '') + '>' + icon('plus', 18) + '</button>' +
      '</div>';
  };

  UI.progress = function (value, max, tone) {
    var pct = max > 0 ? U.clamp(value / max * 100, 0, 100) : 0;
    return '<div class="bar-track"><div class="bar-fill ' + (tone || '') + '" style="width:' + pct.toFixed(1) + '%"></div></div>';
  };

  /**
   * Circular progress ring. Animates from its previously rendered value.
   * o: { key, value (0..1), size, stroke, tone, center }
   */
  UI.ring = function (o) {
    var size = o.size || 240;
    var stroke = o.stroke || 14;
    var r = (size - stroke) / 2;
    var c = 2 * Math.PI * r;
    var from = UI.entering || !(o.key in ringLast) ? 0 : ringLast[o.key];
    var half = size / 2;
    return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' +
      '<svg viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="' + U.esc(o.label || '') + '">' +
      '<circle class="ring-track" cx="' + half + '" cy="' + half + '" r="' + r + '" stroke-width="' + stroke + '"/>' +
      '<circle class="ring-progress' + (o.tone ? ' ' + o.tone : '') + (o.value <= 0.001 ? ' empty' : '') +
      '" data-ring="' + o.key + '" data-to="' + o.value + '" data-c="' + c +
      '" cx="' + half + '" cy="' + half + '" r="' + r + '" stroke-width="' + stroke +
      '" stroke-dasharray="' + c + '" style="stroke-dashoffset:' + (c * (1 - from)) +
      '" transform="rotate(-90 ' + half + ' ' + half + ')"/>' +
      '</svg><div class="ring-center">' + (o.center || '') + '</div></div>';
  };

  /** Run post-render animations (rings). */
  UI.hydrate = function (root) {
    var rings = root.querySelectorAll('[data-ring]');
    if (!rings.length) return;
    // Force layout so the starting offset is committed before we transition.
    root.getBoundingClientRect();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        for (var i = 0; i < rings.length; i++) {
          var el = rings[i];
          var to = parseFloat(el.getAttribute('data-to'));
          var c = parseFloat(el.getAttribute('data-c'));
          el.style.strokeDashoffset = c * (1 - to);
          ringLast[el.getAttribute('data-ring')] = to;
        }
      });
    });
  };

  // ---------- Sheet ----------

  var sheetLayer, sheetBody, sheetRender = null, sheetOpts = {};

  UI.sheet = {
    init: function (layer) {
      sheetLayer = layer;
      layer.innerHTML = '<div class="sheet-scrim" data-action="sheet-close"></div>' +
        '<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grabber"></div><div class="sheet-body"></div></div>';
      sheetBody = layer.querySelector('.sheet-body');
      enableDragToDismiss(layer.querySelector('.sheet'));
    },
    /** renderFn(state) -> html. opts.live re-renders on every state change. */
    open: function (renderFn, opts) {
      sheetRender = renderFn;
      sheetOpts = opts || {};
      sheetBody.innerHTML = renderFn(M.store.get());
      sheetBody.scrollTop = 0;
      sheetLayer.querySelector('.sheet').style.transform = '';
      sheetLayer.getBoundingClientRect();
      sheetLayer.classList.add('open');
    },
    refresh: function () {
      if (!sheetRender || !UI.sheet.isOpen()) return;
      var top = sheetBody.scrollTop;
      var focused = document.activeElement;
      var hadFocus = focused && sheetBody.contains(focused) && focused.getAttribute('data-input');
      sheetBody.innerHTML = sheetRender(M.store.get());
      sheetBody.scrollTop = top;
      // Re-apply any search filter (and focus) after the content was rebuilt.
      var input = sheetBody.querySelector('.search-input');
      var scope = sheetBody.querySelector('[data-search-scope]');
      if (input && scope && input.value) UI.applySearch(scope, input.value);
      if (hadFocus) {
        var again = sheetBody.querySelector('[data-input="' + hadFocus + '"]');
        if (again) again.focus();
      }
    },
    onState: function () { if (sheetOpts.live) UI.sheet.refresh(); },
    close: function () {
      if (!UI.sheet.isOpen()) return;
      sheetLayer.classList.remove('open');
      sheetLayer.querySelector('.sheet').style.transform = '';
      var fn = sheetOpts.onClose;
      sheetRender = null;
      sheetOpts = {};
      if (fn) fn();
    },
    isOpen: function () { return sheetLayer && sheetLayer.classList.contains('open'); }
  };

  function enableDragToDismiss(sheet) {
    var startY = null, dy = 0;
    sheet.addEventListener('touchstart', function (e) {
      var body = sheet.querySelector('.sheet-body');
      if (body.scrollTop > 0) { startY = null; return; }
      startY = e.touches[0].clientY;
      dy = 0;
    }, { passive: true });
    sheet.addEventListener('touchmove', function (e) {
      if (startY == null) return;
      dy = Math.max(0, e.touches[0].clientY - startY);
      if (dy > 0) {
        sheet.style.transition = 'none';
        sheet.style.transform = 'translateY(' + dy + 'px)';
      }
    }, { passive: true });
    sheet.addEventListener('touchend', function () {
      if (startY == null) return;
      sheet.style.transition = '';
      if (dy > 110) UI.sheet.close();
      else sheet.style.transform = '';
      startY = null;
    });
  }

  // ---------- Toast ----------

  var toastEl, toastTimer;
  UI.toast = function (msg) {
    if (!toastEl) toastEl = document.getElementById('toast');
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  };

  M.ui = UI;
})(window.M);
