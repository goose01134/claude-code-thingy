/* Margin — Lockout screen. Calm, clear, never judgmental.
   Shown inside the app (preview / demo) and, on Android, as the real lock screen over a blocked app. */
(function (M) {
  'use strict';

  var U = M.util, S = M.store, icon = M.icon;

  var SUGGESTIONS = [
    'Perhaps a short walk, a glass of water, or a few pages of a book.',
    'A good moment to call someone, stretch, or simply do nothing at all.',
    'The feed will still be there tomorrow. This evening won’t be.',
    'Try noticing five things around you that you haven’t looked at today.'
  ];

  function focusFor(ctx, s) {
    return s.focus.filter(function (f) { return f.id === ctx.focusId; })[0];
  }

  /** When does access return for this context? */
  function availableAt(ctx, s) {
    if (ctx.type === 'focus') {
      var f = focusFor(ctx, s);
      if (f) return U.nextAt(f.end);
    }
    return U.nextAt(s.resetTime);
  }

  function countdownText(ctx, s) {
    var ms = availableAt(ctx, s) - Date.now();
    return 'in ' + U.fmt(Math.ceil(ms / 60000));
  }

  function emergencyBlock(s, expanded) {
    var e = s.emergency;
    if (!e.enabled) return '<p class="lock-note">Emergency access is turned off in Settings.</p>';
    var left = S.emergencyLeft();
    if (left <= 0) return '<p class="lock-note">You’ve used today’s emergency access.</p>';
    if (!expanded) {
      return '<button class="btn btn-quiet btn-block" data-action="lock-emergency">Need it for something important?</button>';
    }
    return '<div class="hold-panel">' +
      '<p class="hold-copy">Press and hold for ' + e.hold + ' seconds to open your apps for ' + e.minutes +
      (e.minutes === 1 ? ' minute.' : ' minutes.') + '</p>' +
      '<button class="hold" data-hold aria-label="Hold to unlock for ' + e.minutes + ' minutes">' +
      '<span class="hold-fill"></span>' +
      '<span class="hold-label">' + icon('shield', 18) + 'Hold to unlock ' + e.minutes + ' min</span>' +
      '</button>' +
      '<p class="hold-meta">' + left + ' of ' + e.perDay + ' remaining today</p>' +
      '</div>';
  }

  /** ctx: { type: 'daily' | 'app' | 'focus', id?: app id, focusId? }. mode: 'app' or 'lock'. */
  function render(ctx, s, expanded, mode) {
    var title, body, whenLabel;
    var at = availableAt(ctx, s);
    var a = ctx.id ? S.app(ctx.id) : null;

    if (ctx.type === 'app' && a) {
      title = 'Time’s up for ' + U.esc(a.name) + '.';
      body = 'You’ve used the ' + U.fmtLong(a.limit) + ' you set for ' + U.esc(a.name) + ' today. Your other apps are still available.';
      whenLabel = U.esc(a.name) + ' is available again';
    } else if (ctx.type === 'focus') {
      var f = focusFor(ctx, s);
      title = 'Focus time.';
      body = (f ? U.esc(f.name) : 'A focus schedule') + ' is on right now. Your apps will be here when it ends.';
      whenLabel = 'Available again';
    } else {
      title = 'Your time is up.';
      body = 'Your social media allowance has been used for today.';
      whenLabel = 'Available again';
    }

    var hhmm = (at.getHours() < 10 ? '0' : '') + at.getHours() + ':' + (at.getMinutes() < 10 ? '0' : '') + at.getMinutes();
    var suggestion = SUGGESTIONS[new Date().getDate() % SUGGESTIONS.length];
    var primary = mode === 'lock'
      ? '<button class="btn btn-ink btn-block" data-action="lock-home">Got it</button>'
      : '<button class="btn btn-ink btn-block" data-action="lock-home">Back to Margin</button>';
    var secondary = mode === 'lock'
      ? '<button class="btn btn-quiet btn-block lock-open" data-action="lock-open">Open Margin</button>'
      : '';

    return '<div class="lock">' +
      '<div class="lock-top">' +
      '<span class="lock-brand">' + icon('leaf', 16) + 'Margin</span>' +
      '</div>' +
      '<div class="lock-main">' +
      (a && mode === 'lock'
        ? '<div class="orb has-app" aria-hidden="true"><span></span><span></span><span></span><i>' + M.ui.appIcon(a, 48) + '</i></div>'
        : '<div class="orb" aria-hidden="true"><span></span><span></span><span></span><i>' + icon('moon', 28) + '</i></div>') +
      '<h1 class="lock-title">' + title + '</h1>' +
      '<p class="lock-body">' + body + '</p>' +
      '<div class="lock-when">' +
      '<span class="lock-when-label">' + whenLabel + '</span>' +
      '<span class="lock-when-time tnum">' + U.relativeDay(at) + ', ' + U.clockLabel(hhmm) + '</span>' +
      '<span class="lock-when-in tnum" data-lock-countdown>' + countdownText(ctx, s) + '</span>' +
      '</div>' +
      '<p class="lock-suggest">' + suggestion + '</p>' +
      '</div>' +
      '<div class="lock-actions">' +
      primary +
      emergencyBlock(s, expanded) +
      secondary +
      '</div>' +
      '</div>';
  }

  M.screens.lockout = { render: render, countdownText: countdownText };
})(window.M);
