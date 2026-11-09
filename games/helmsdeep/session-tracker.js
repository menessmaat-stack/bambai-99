/* Gate /play behind a player id, and report how long that player actually
 * plays.
 *
 * Time is counted only while the tab is visible, so a game left open in a
 * background tab overnight does not turn into eight hours of "play time". The
 * running total is posted once a minute and once more on the way out, and the
 * server keeps the largest number it sees for the session.
 */
(function () {
  'use strict';

  var AUTH_KEY = 'helmsdeep.auth';
  var HEARTBEAT_MS = 60000;

  var auth = null;
  try { auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { auth = null; }

  if (!auth || !auth.token) {
    // Mandatory login: no token, no city.
    location.replace('/?next=play');
    return;
  }

  var sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  var seconds = 0;
  var lastTick = Date.now();
  var sent = -1;

  function post(body, beacon) {
    var payload = JSON.stringify(body);
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/session', new Blob([payload], { type: 'application/json' }));
      return;
    }
    fetch('/api/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true
    }).catch(function () { /* a dropped heartbeat costs one minute of detail */ });
  }

  function report(beacon) {
    if (Math.round(seconds) === sent) return;
    sent = Math.round(seconds);
    post({ token: auth.token, sessionId: sessionId, seconds: sent }, beacon);
  }

  function tick() {
    var now = Date.now();
    if (!document.hidden) seconds += (now - lastTick) / 1000;
    lastTick = now;
  }

  setInterval(tick, 1000);
  setInterval(function () { tick(); report(false); }, HEARTBEAT_MS);

  document.addEventListener('visibilitychange', function () {
    tick();
    if (document.hidden) report(false);
  });
  window.addEventListener('pagehide', function () { tick(); report(true); });

  report(false); // session start, so a player who quits in under a minute still counts

  window.__hdSession = { id: auth.id, session: sessionId, seconds: function () { return seconds; } };
})();
