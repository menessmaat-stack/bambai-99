/* Carry the district picked on the landing page into the game menu.
 *
 * The bundle keeps its start district in component state with no URL or API
 * hook, but the menu renders one button per district, and clicking one is
 * exactly how a player sets it. So `/play?spawn=juhu` finds the "Juhu Beach"
 * button and clicks it once, leaving the player to hit HIT THE STREET.
 *
 * The ids and labels mirror the `Dt` table in the bundle; index.html offers the
 * same six.
 */
(function () {
  'use strict';

  var LABELS = {
    bkc: "Bandra Kurla Complex",
    airport: "CSMIA Airport",
    juhu: "Juhu Beach",
    bandra: "Bandra West",
    kurla: "Kurla Station",
    andheri: "Andheri Metro"
  };

  var want = LABELS[new URLSearchParams(location.search).get('spawn')];
  if (!want) return;

  var deadline = Date.now() + 30000;

  function attempt() {
    var root = document.getElementById('helmsdeep-root');
    var buttons = root ? root.querySelectorAll('button') : [];
    for (var i = 0; i < buttons.length; i++) {
      if (buttons[i].textContent.trim() === want) {
        buttons[i].click();
        return;
      }
    }
    // The menu only exists once the map has loaded, which takes a moment on a
    // phone; keep looking until it shows up, then give up quietly.
    if (Date.now() < deadline) setTimeout(attempt, 150);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attempt);
  } else {
    attempt();
  }
})();
