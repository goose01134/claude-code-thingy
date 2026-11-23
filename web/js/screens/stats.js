/* Margin — Statistics: daily and weekly usage, top apps, progress over weeks. */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, UI = M.ui, C = M.charts, icon = M.icon;
  var view = { range: 'week', day: 6 };

  function avg(arr) { return arr.length ? U.sum(arr) / arr.length : 0; }

  function topApps(range) {
    var rows = S.trackedIds().map(S.app).map(function (a) {
      return {
        app: a,
        minutes: range === 'day' ? a.used : a.week,
        opens: range === 'day' ? a.opens : U.sum(a.historyOpens) + a.opens
      };
    }).sort(function (x, y) { return y.minutes - x.minutes; });
    if (!rows.length) return '<p class="empty card">Counted apps will appear here.</p>';
    var total = U.sum(rows.map(function (r) { return r.minutes; })) || 1;
    var max = Math.max(1, rows[0].minutes);
    return '<div class="list inset-app">' + rows.map(function (r, i) {
      return '<button class="row app-row" data-action="open-app-detail" data-id="' + U.esc(r.app.id) + '">' +
        '<span class="rank tnum">' + (i + 1) + '</span>' +
        '<span class="row-lead">' + UI.appIcon(r.app, 36) + '</span>' +
        '<span class="row-main">' +
        '<span class="row-title">' + U.esc(r.app.name) + '</span>' +
        '<span class="usage-line">' + UI.progress(r.minutes, max, i === 0 ? 'accent' : '') + '</span>' +
        '<span class="row-sub tnum">' + r.opens + (r.opens === 1 ? ' open' : ' opens') + ' · ' + Math.round(r.minutes / total * 100) + '% of total</span>' +
        '</span>' +
        '<span class="row-value strong tnum">' + U.fmt(r.minutes) + '</span>' +
        '</button>';
    }).join('') + '</div>';
  }

  function dayView() {
    var hours = S.hourly();
    var used = S.usedToday();
    var peak = hours.indexOf(Math.max.apply(null, hours));
    var peakLabel = U.clockLabel((peak < 10 ? '0' : '') + peak + ':00');
    return '<div class="stat-hero">' +
      '<p class="stat-hero-label">Today so far</p>' +
      '<p class="stat-hero-value tnum">' + U.fmt(used) + '</p>' +
      '<p class="stat-hero-sub">' + (used > 0 ? 'Most active around ' + peakLabel : 'No time in counted apps yet today') +
      ' · ' + S.opensToday() + (S.opensToday() === 1 ? ' open' : ' opens') + '</p>' +
      '</div>' +
      '<div class="card chart-card">' + C.hourly(hours) + '</div>';
  }

  function weekView(s) {
    var totals = S.weekTotals();
    var labels = U.lastDays(7).map(function (d, i) { return i === 6 ? 'Today' : U.DAYS_SHORT[d.getDay()]; });
    var dailyAvg = Math.round(avg(totals.slice(0, 6)));
    var weeks = S.pastWeeks();
    var lastWeek = weeks.length ? weeks[weeks.length - 1] : 0;
    var sel = view.day;
    var selLabel = sel === 6 ? 'Today' : U.DAYS_LONG[U.lastDays(7)[sel].getDay()];
    var compare = '';
    if (lastWeek > 0) {
      var delta = Math.round((dailyAvg - lastWeek) / lastWeek * 100);
      compare = '<span class="delta' + (delta > 0 ? ' up' : '') + '">' + icon(delta > 0 ? 'arrowUp' : 'arrowDown', 14) +
        Math.abs(delta) + '%</span> ' + (delta > 0 ? 'more' : 'less') + ' than last week';
    } else {
      compare = 'Comparisons with earlier weeks appear after your first full week.';
    }

    return '<div class="stat-hero">' +
      '<p class="stat-hero-label">Daily average</p>' +
      '<p class="stat-hero-value tnum">' + U.fmt(dailyAvg) + '</p>' +
      '<p class="stat-hero-sub">' + compare + '</p>' +
      '</div>' +
      '<div class="card chart-card">' +
      '<div class="chart-caption"><span>' + selLabel + '</span><span class="tnum">' +
      (totals[sel] > s.allowance
        ? '<span class="is-warn">' + U.fmt(totals[sel] - s.allowance) + ' over allowance</span>'
        : U.fmt(s.allowance - totals[sel]) + ' under allowance') + '</span></div>' +
      C.weekBars({ values: totals, labels: labels, limit: s.allowance, selected: sel, action: 'stats-day' }) +
      '</div>';
  }

  function progressCard(dailyAvg) {
    var vals = S.pastWeeks().concat([dailyAvg]);
    if (vals.length < 2) {
      return '<div class="card chart-card empty-chart"><p class="chart-foot first">Your weekly trend will appear here once Margin has a full week to compare.</p></div>';
    }
    var labels = vals.map(function (v, i) {
      var back = vals.length - 1 - i;
      return back === 0 ? 'This wk' : '−' + back + ' wk';
    });
    var first = vals[0];
    var change = first > 0 ? Math.round((first - dailyAvg) / first * 100) : 0;
    var weeksBack = vals.length - 1;
    var foot = change > 0
      ? 'You’re spending <strong>' + change + '% less time</strong> in counted apps than ' + weeksBack + (weeksBack === 1 ? ' week' : ' weeks') + ' ago.'
      : change < 0
        ? 'Usage is up ' + Math.abs(change) + '% on ' + weeksBack + (weeksBack === 1 ? ' week' : ' weeks') + ' ago. A tighter allowance can help.'
        : 'Your daily average is steady.';
    return '<div class="card chart-card">' + C.trend(vals, labels) + '<p class="chart-foot">' + foot + '</p></div>';
  }

  function render(s) {
    var totals = S.weekTotals();
    var full = totals.slice(0, 6);
    var within = full.filter(function (v) { return v <= s.allowance; }).length;
    var dailyAvg = Math.round(avg(full));
    var best = Math.min.apply(null, full);
    var bestDay = U.DAYS_LONG[U.lastDays(7)[full.indexOf(best)].getDay()];

    return '<section class="screen stats"><div class="stagger">' +
      '<header class="screen-head"><div><p class="eyebrow">Your habits</p><h1 class="title">Statistics</h1></div></header>' +
      UI.segmented([{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }], view.range, 'stats-range', 'lg') +
      '<div class="range-body">' + (view.range === 'day' ? dayView() : weekView(s)) + '</div>' +
      '<div class="tiles">' +
      '<div class="tile"><p class="tile-label">Best day</p><p class="tile-value">' + U.fmt(best) + '</p><p class="tile-sub">' + bestDay + '</p></div>' +
      '<div class="tile"><p class="tile-label">On target</p><p class="tile-value">' + within + '<span class="tile-unit"> of 6</span></p><p class="tile-sub">days this week</p></div>' +
      '<div class="tile"><p class="tile-label">Opens today</p><p class="tile-value">' + S.opensToday() + '</p><p class="tile-sub">across apps</p></div>' +
      '</div>' +
      '<section class="block">' +
      '<div class="block-head"><h2 class="h2">Most used</h2><span class="footnote">' + (view.range === 'day' ? 'Today' : 'Last 7 days') + '</span></div>' +
      topApps(view.range) +
      '</section>' +
      '<section class="block">' +
      '<div class="block-head"><h2 class="h2">Progress</h2><span class="footnote">Average per day</span></div>' +
      progressCard(dailyAvg) +
      '</section>' +
      '</div></section>';
  }

  M.screens.stats = { render: render };

  M.actions['stats-range'] = function (el) {
    view.range = el.getAttribute('data-value');
    M.app.render(false);
  };
  M.actions['stats-day'] = function (el) {
    view.day = parseInt(el.getAttribute('data-i'), 10);
    M.app.render(false);
  };
})(window.M);
