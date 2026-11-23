/* Margin — a small, consistent line-icon set (24px grid, 1.7 stroke). */
(function (M) {
  'use strict';

  var PATHS = {
    home: '<path d="M4 10.4 12 4l8 6.4V19a1 1 0 0 1-1 1h-4.25v-5.25h-5.5V20H5a1 1 0 0 1-1-1z"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    stats: '<path d="M5.5 20v-7M12 20V5M18.5 20v-10"/>',
    settings: '<path d="M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9"/><circle cx="15" cy="7.5" r="2"/><circle cx="9" cy="16.5" r="2"/>',
    chevron: '<path d="m9.5 6 6 6-6 6"/>',
    back: '<path d="m14.5 6-6 6 6 6"/>',
    plus: '<path d="M12 5.5v13M5.5 12h13"/>',
    minus: '<path d="M5.5 12h13"/>',
    close: '<path d="m7 7 10 10M17 7 7 17"/>',
    check: '<path d="m5.5 12.5 4.2 4.2 8.8-9.2"/>',
    bell: '<path d="M6.5 16v-5a5.5 5.5 0 1 1 11 0v5l1.5 2h-14z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
    moon: '<path d="M19 14.6A7.5 7.5 0 1 1 9.4 5a6 6 0 0 0 9.6 9.6z"/>',
    clock: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4.2l2.7 1.8"/>',
    hourglass: '<path d="M7 4h10M7 20h10"/><path d="M8 4c0 4.5 8 5 8 8s-8 3.5-8 8"/><path d="M16 4c0 4.5-8 5-8 8s8 3.5 8 8"/>',
    shield: '<path d="M12 4 18.5 6.5V12c0 3.8-2.8 6.8-6.5 8-3.7-1.2-6.5-4.2-6.5-8V6.5z"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8"/>',
    trash: '<path d="M5 7h14M10 7V5h4v2M7 7l.9 12.2a1 1 0 0 0 1 .8h6.2a1 1 0 0 0 1-.8L17 7"/>',
    arrowDown: '<path d="M12 5v13M6.5 12.5 12 18l5.5-5.5"/>',
    arrowUp: '<path d="M12 19V6M6.5 11.5 12 6l5.5 5.5"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    sun: '<circle cx="12" cy="12" r="3.8"/><path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7 18 18M6 18l1.3-1.3M16.7 7.3 18 6"/>',
    leaf: '<path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19 13 11"/>',
    bolt: '<path d="M13 3.5 6 13h5l-1 7.5L17 11h-5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    eye: '<path d="M3 12s3.5-6.5 9-6.5S21 12 21 12s-3.5 6.5-9 6.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.6"/>',
    layers: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/>',
    battery: '<rect x="3.5" y="7.5" width="15" height="9" rx="2"/><path d="M21 10.5v3"/><path d="M7 10.5v3M10 10.5v3"/>',
    user: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 19.5c1.2-3.3 3.8-5 7-5s5.8 1.7 7 5"/>',
    sparkle: '<path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5 9 15M15 9l2.5-2.5"/>'
  };

  function icon(name, size, extra) {
    size = size || 24;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra ? ' ' + extra : '') + '>' +
      (PATHS[name] || '') + '</svg>';
  }

  M.icon = icon;
})(window.M);
