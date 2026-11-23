/* Margin — lightweight SVG charts. No dependencies. */
(function (M) {
  'use strict';

  var U = M.util;

  /** Path for a bar with rounded top corners only. */
  function topRoundedBar(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    return 'M' + x + ' ' + (y + h) +
      'V' + (y + r) +
      'Q' + x + ' ' + y + ' ' + (x + r) + ' ' + y +
      'H' + (x + w - r) +
      'Q' + (x + w) + ' ' + y + ' ' + (x + w) + ' ' + (y + r) +
      'V' + (y + h) + 'Z';
  }

  function n(v) { return Math.round(v * 10) / 10; }

  /**
   * Seven-day bar chart with an allowance line. Bars are tappable.
   * o: { values, labels, limit, selected, action }
   */
  function weekBars(o) {
    var W = 335, H = 184, top = 28, bottom = 28;
    var plotH = H - top - bottom;
    var maxV = Math.max(o.limit || 0, Math.max.apply(null, o.values)) * 1.08 || 1;
    var slot = W / o.values.length;
    var bw = 24;
    var base = top + plotH;
    var out = '';

    // baseline
    out += '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" class="chart-axis"/>';

    // allowance line
    if (o.limit) {
      var ly = n(base - o.limit / maxV * plotH);
      out += '<line x1="0" x2="' + W + '" y1="' + ly + '" y2="' + ly + '" class="chart-limit"/>';
      out += '<text x="' + W + '" y="' + (ly - 6) + '" text-anchor="end" class="chart-note">' + U.fmt(o.limit) + ' ' + (o.limitLabel || 'allowance') + '</text>';
    }

    o.values.forEach(function (v, i) {
      var h = Math.max(2, v / maxV * plotH);
      var x = n(slot * i + (slot - bw) / 2);
      var y = n(base - h);
      var sel = i === o.selected;
      var over = o.limit && v > o.limit;
      out += '<g class="chart-hit" data-action="' + o.action + '" data-i="' + i + '">' +
        '<rect x="' + n(slot * i) + '" y="0" width="' + n(slot) + '" height="' + H + '" fill="transparent"/>' +
        '<path class="bar' + (sel ? ' sel' : '') + (over && !sel ? ' over' : '') + '" style="animation-delay:' + (i * 0.04) + 's" d="' +
        topRoundedBar(x, y, bw, h, 6) + '"/>' +
        '<text x="' + n(slot * i + slot / 2) + '" y="' + (H - 8) + '" text-anchor="middle" class="chart-label' + (sel ? ' sel' : '') + '">' +
        o.labels[i] + '</text>' +
        '</g>';
    });

    if (o.selected != null && o.selected >= 0) {
      var sv = o.values[o.selected];
      var sx = n(slot * o.selected + slot / 2);
      var sy = n(base - Math.max(2, sv / maxV * plotH) - 9);
      out += '<text x="' + sx + '" y="' + sy + '" text-anchor="middle" class="chart-value">' + U.fmt(sv) + '</text>';
    }

    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Usage over the last seven days">' + out + '</svg>';
  }

  /** 24-hour distribution for today. */
  function hourly(values) {
    var W = 335, H = 132, top = 14, bottom = 24;
    var plotH = H - top - bottom;
    var maxV = Math.max.apply(null, values) || 1;
    var slot = W / 24;
    var bw = n(slot * 0.58);
    var base = top + plotH;
    var peak = values.indexOf(Math.max.apply(null, values));
    var nowH = new Date().getHours();
    var out = '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" class="chart-axis"/>';

    values.forEach(function (v, i) {
      var x = n(slot * i + (slot - bw) / 2);
      if (v <= 0.05) {
        out += '<rect x="' + x + '" y="' + (base - 2) + '" width="' + bw + '" height="2" rx="1" class="bar ghost"/>';
        return;
      }
      var h = Math.max(3, v / maxV * plotH);
      out += '<path class="bar' + (i === peak ? ' sel' : '') + '" style="animation-delay:' + (i * 0.015) + 's" d="' +
        topRoundedBar(x, n(base - h), bw, h, 3) + '"/>';
    });

    [[0, '12 AM'], [6, '6 AM'], [12, '12 PM'], [18, '6 PM']].forEach(function (t) {
      out += '<text x="' + n(slot * t[0] + 1) + '" y="' + (H - 6) + '" class="chart-label">' + t[1] + '</text>';
    });
    // "now" tick
    var nx = n(slot * nowH + slot / 2);
    out += '<line x1="' + nx + '" x2="' + nx + '" y1="' + (base + 3) + '" y2="' + (base + 7) + '" class="chart-now"/>';

    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Usage by hour today">' + out + '</svg>';
  }

  /** Weekly averages trend line. */
  function trend(values, labels) {
    var W = 335, H = 160, top = 30, bottom = 28, padX = 18;
    var plotH = H - top - bottom;
    var maxV = Math.max.apply(null, values) * 1.05;
    var minV = Math.min.apply(null, values) * 0.75;
    var step = (W - padX * 2) / (values.length - 1);
    var base = top + plotH;
    var pts = values.map(function (v, i) {
      return [n(padX + step * i), n(top + (1 - (v - minV) / (maxV - minV)) * plotH)];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0] + ' ' + p[1]; }).join('');
    var area = line + 'L' + pts[pts.length - 1][0] + ' ' + base + 'L' + pts[0][0] + ' ' + base + 'Z';
    var out = '<line x1="0" x2="' + W + '" y1="' + base + '" y2="' + base + '" class="chart-axis"/>';
    out += '<path d="' + area + '" class="trend-area"/>';
    out += '<path d="' + line + '" class="trend-line" pathLength="1"/>';
    pts.forEach(function (p, i) {
      var last = i === pts.length - 1;
      out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (last ? 5 : 3.5) + '" class="trend-dot' + (last ? ' last' : '') + '"/>';
      out += '<text x="' + p[0] + '" y="' + (p[1] - 12) + '" text-anchor="middle" class="chart-label' + (last ? ' strong' : '') + '">' +
        U.fmt(values[i]) + '</text>';
      out += '<text x="' + p[0] + '" y="' + (H - 7) + '" text-anchor="middle" class="chart-label' + (last ? ' sel' : '') + '">' + labels[i] + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Average daily usage by week">' + out + '</svg>';
  }

  M.charts = { weekBars: weekBars, hourly: hourly, trend: trend };
})(window.M);
