/* Touch controls for HELM'S DEEP.
 *
 * The game bundle is keyboard + mouse only: it reads `keydown`/`keyup` on
 * window (by `event.key`, lowercased) and `mousemove`/`mousedown` on its own
 * canvas. Rather than rebuild the bundle, this layer paints an on-screen pad and
 * replays the same events, so phones drive exactly the same code path a desktop
 * does.
 *
 * Layout, left thumb to right thumb:
 *   GAS / BRAKE pedals          W / S
 *   steering strip              A / D, drag like PUBG's look control
 *   FIRE                        mousedown on the canvas
 *   tap the street              mousemove on the canvas (aim)
 *   small key row               fullscreen · extras drawer · pause
 *
 * Steering is the part that has to feel analogue on a binary key: the strip
 * reports how far the thumb has travelled, and the key is pulsed with a duty
 * cycle proportional to that distance. A small drag feathers the wheel, a full
 * drag holds the key down.
 *
 * Enabled automatically on coarse pointers, on the first real touch, or with
 * ?touch=1. ?touch=0 turns it off.
 */
(function () {
  'use strict';

  var qs = new URLSearchParams(location.search);
  var forced = qs.get('touch');
  var coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ||
    navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  if (forced === '0') return;

  var canvas = null;
  var root = null;
  var held = Object.create(null);
  var aim = null;          // last aim point in client coords
  var firing = false;
  var steer = 0;           // -1 (full left) .. +1 (full right)
  var steerRaf = 0;

  /* ---------- event replay ---------------------------------------------- */

  function key(type, k, code) {
    window.dispatchEvent(new KeyboardEvent(type, {
      key: k, code: code || '', bubbles: true, cancelable: true
    }));
  }

  function press(k, code) {
    if (held[k]) return;
    held[k] = code || '';
    key('keydown', k, code);
  }

  function release(k) {
    if (!(k in held)) return;
    var code = held[k];
    delete held[k];
    key('keyup', k, code);
  }

  function tap(k, code) {
    press(k, code);
    setTimeout(function () { release(k); }, 70);
  }

  function releaseAll() {
    Object.keys(held).forEach(release);
    steer = 0;
    if (firing) stopFire();
  }

  function defaultAim() {
    var r = canvas.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.18 };
  }

  function mouse(target, type, pt, buttons) {
    target.dispatchEvent(new MouseEvent(type, {
      clientX: pt.x, clientY: pt.y, button: 0, buttons: buttons,
      bubbles: true, cancelable: true
    }));
  }

  function moveAim(pt) {
    aim = pt;
    mouse(canvas, 'mousemove', pt, firing ? 1 : 0);
  }

  function startFire() {
    if (firing) return;
    if (!aim) aim = defaultAim();
    mouse(canvas, 'mousemove', aim, 0);
    mouse(canvas, 'mousedown', aim, 1);
    firing = true;
  }

  function stopFire() {
    if (!firing) return;
    firing = false;
    mouse(window, 'mouseup', aim || defaultAim(), 0);
  }

  /** Click the minimap disc the game paints top-right, which is how the full
   *  map opens. Geometry mirrors the renderer: 176 px wide, 14 from the right,
   *  44 from the top, in canvas CSS pixels. */
  function openMap() {
    var r = canvas.getBoundingClientRect();
    var scale = r.width / (canvas.width / (window.devicePixelRatio || 1));
    var size = 176 * (isFinite(scale) && scale > 0 ? scale : 1);
    var pt = { x: r.right - 14 - size / 2, y: r.top + 44 + size / 2 };
    mouse(canvas, 'mousemove', pt, 0);
    mouse(canvas, 'mousedown', pt, 1);
    mouse(window, 'mouseup', pt, 0);
    aim = null;
  }

  /* ---------- analogue steering on a binary key -------------------------- */

  function steerLoop(ts) {
    var mag = Math.abs(steer);
    if (mag < 0.12) {
      release('a');
      release('d');
    } else {
      // Duty cycle: 12% of travel still nudges, full travel holds the key.
      var on = Math.min(1, 0.22 + mag * 0.86);
      var wantOn = (ts % 90) / 90 < on;
      var wanted = steer > 0 ? 'd' : 'a';
      var other = steer > 0 ? 'a' : 'd';
      release(other);
      if (wantOn) press(wanted, wanted === 'd' ? 'KeyD' : 'KeyA');
      else release(wanted);
    }
    paintSteer();
    steerRaf = requestAnimationFrame(steerLoop);
  }

  var knob = null;
  function paintSteer() {
    if (!knob) return;
    knob.style.transform = 'translateX(' + (steer * 58).toFixed(1) + 'px)';
    knob.style.opacity = Math.abs(steer) < 0.12 ? '0.45' : '1';
  }

  /* ---------- widgets ---------------------------------------------------- */

  var STYLE = [
    '#hd-touch{position:fixed;inset:0;z-index:40;pointer-events:none;',
    'font:800 10px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;',
    '-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;}',
    '#hd-touch.hd-hidden{display:none;}',
    '#hd-touch button{pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;',
    'display:flex;align-items:center;justify-content:center;color:#e8e4da;',
    'background:rgba(10,14,20,.38);border:1px solid rgba(232,228,218,.2);',
    'backdrop-filter:blur(2px);border-radius:11px;font:inherit;text-transform:uppercase;',
    'will-change:transform,background;transition:background .08s linear;}',
    '#hd-touch button.hd-on{background:rgba(252,211,77,.8);border-color:#fcd34d;color:#0a0e14;}',
    // left thumb: two small pedals
    '#hd-pedals{position:absolute;left:calc(12px + env(safe-area-inset-left));',
    'bottom:calc(12px + env(safe-area-inset-bottom));display:grid;gap:6px;}',
    '#hd-pedals button{width:58px;height:42px;font-size:15px;}',
    // right thumb: steering strip, sized for a thumb sweep
    '#hd-steer{position:absolute;right:calc(12px + env(safe-area-inset-right));',
    'bottom:calc(12px + env(safe-area-inset-bottom));width:150px;height:52px;',
    'pointer-events:auto;touch-action:none;border-radius:26px;',
    'background:rgba(10,14,20,.34);border:1px solid rgba(232,228,218,.18);',
    'display:flex;align-items:center;justify-content:center;}',
    '#hd-steer .hd-track{position:absolute;left:14px;right:14px;height:2px;background:rgba(232,228,218,.22);}',
    '#hd-steer .hd-knob{width:30px;height:30px;border-radius:50%;',
    'background:rgba(252,211,77,.85);opacity:.45;will-change:transform;}',
    '#hd-steer .hd-tag{position:absolute;bottom:4px;font-size:8px;color:#8b94a3;letter-spacing:.14em;}',
    // small action keys above the strip
    '#hd-act{position:absolute;right:calc(12px + env(safe-area-inset-right));',
    'bottom:calc(72px + env(safe-area-inset-bottom));display:flex;gap:6px;align-items:flex-end;}',
    '#hd-act button{width:50px;height:38px;}',
    '#hd-act button.hd-fire{width:58px;height:58px;border-radius:50%;font-size:11px;',
    'background:rgba(220,38,38,.36);border-color:rgba(248,113,113,.5);color:#fecaca;}',
    '#hd-act button.hd-fire.hd-on{background:rgba(248,113,113,.88);color:#180405;}',
    // utility row, clear of the minimap
    '#hd-top{position:absolute;left:calc(12px + env(safe-area-inset-left));',
    'top:calc(92px + env(safe-area-inset-top));display:flex;gap:6px;}',
    '#hd-top button{height:32px;padding:0 10px;font-size:10px;border-radius:9px;}',
    '#hd-more{position:absolute;left:calc(12px + env(safe-area-inset-left));',
    'top:calc(130px + env(safe-area-inset-top));display:none;',
    'grid-template-columns:repeat(4,64px);gap:5px;}',
    '#hd-more.hd-open{display:grid;}',
    '#hd-more button{height:34px;font-size:9px;}',
    // one-time fullscreen invitation
    '#hd-fs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);',
    'pointer-events:auto;padding:14px 22px;border-radius:14px;font:800 12px/1.3 Inter,system-ui,sans-serif;',
    'letter-spacing:.1em;text-transform:uppercase;color:#0a0e14;background:#fcd34d;border:0;}',
    '@media (max-height:380px){#hd-pedals button{width:52px;height:36px;}',
    '#hd-steer{width:132px;height:46px;}#hd-act button.hd-fire{width:50px;height:50px;}}'
  ].join('');

  function el(tag, attrs, parent) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  /** A button that holds a key down for as long as a finger is on it. */
  function holdBtn(parent, label, k, code, cls) {
    var b = el('button', { type: 'button', class: cls || '' }, parent);
    b.textContent = label;
    bind(b,
      function () { b.classList.add('hd-on'); press(k, code); },
      function () { b.classList.remove('hd-on'); release(k); });
    return b;
  }

  /** A button that fires one key tap per touch. */
  function tapBtn(parent, label, run) {
    var b = el('button', { type: 'button' }, parent);
    b.textContent = label;
    bind(b,
      function () { b.classList.add('hd-on'); run(); },
      function () { b.classList.remove('hd-on'); });
    return b;
  }

  function bind(node, down, up) {
    node.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { node.setPointerCapture(e.pointerId); } catch (_) { }
      down();
    });
    // `pointerleave` is deliberately not in this list: with the pointer
    // captured, a thumb that slides a few pixels off the key must keep it held
    // down rather than drop the throttle mid-corner.
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
      node.addEventListener(type, function (e) {
        e.preventDefault();
        up();
      });
    });
    node.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  /* ---------- build ------------------------------------------------------ */

  function build() {
    var style = el('style', {}, document.head);
    style.textContent = STYLE;

    var ui = el('div', { id: 'hd-touch' }, document.body);

    // Left thumb: throttle over brake/reverse.
    var pedals = el('div', { id: 'hd-pedals' }, ui);
    holdBtn(pedals, '\u25B2', 'w', 'KeyW');
    holdBtn(pedals, '\u25BC', 's', 'KeyS');

    // Right thumb: steer by dragging, PUBG style.
    var strip = el('div', { id: 'hd-steer' }, ui);
    el('div', { class: 'hd-track' }, strip);
    knob = el('div', { class: 'hd-knob' }, strip);
    el('div', { class: 'hd-tag' }, strip).textContent = 'STEER';
    wireSteer(strip);

    // Action keys sit above the strip so they never fight the steering thumb.
    var act = el('div', { id: 'hd-act' }, ui);
    tapBtn(act, 'E', function () { tap('e', 'KeyE'); });
    holdBtn(act, 'HAND', ' ', 'Space');
    holdBtn(act, 'NOS', 'Shift', 'ShiftLeft');
    var fire = el('button', { type: 'button', class: 'hd-fire' }, act);
    fire.textContent = 'FIRE';
    bind(fire,
      function () { fire.classList.add('hd-on'); startFire(); },
      function () { fire.classList.remove('hd-on'); stopFire(); });

    // Utility row + drawer.
    var top = el('div', { id: 'hd-top' }, ui);
    var more = el('div', { id: 'hd-more' }, ui);
    tapBtn(top, '\u26F6', toggleFullscreen);
    tapBtn(top, '\u22EF', function () { more.classList.toggle('hd-open'); });
    tapBtn(top, 'II', function () { tap('Escape', 'Escape'); });

    var weapon = 0;
    [
      ['MAP', openMap],
      ['TRANSIT', function () { tap('t', 'KeyT'); }],
      ['GUN', function () { weapon = (weapon % 6) + 1; tap(String(weapon), 'Digit' + weapon); }],
      ['MARK', function () { tap('n', 'KeyN'); }],
      ['MUSIC', function () { tap('m', 'KeyM'); }],
      ['SKIP', function () { tap('b', 'KeyB'); }],
      ['VIEW', function () { tap('v', 'KeyV'); }],
      ['ZOOM+', function () { tap(']', 'BracketRight'); }],
      ['ZOOM-', function () { tap('[', 'BracketLeft'); }],
      ['RACE', function () { tap('r', 'KeyR'); }],
      ['TIME', function () { tap('g', 'KeyG'); }],
      ['PUNCH', function () { tap('q', 'KeyQ'); }]
    ].forEach(function (pair) {
      // One-shot keys: fold the drawer again so it stops covering the pad.
      tapBtn(more, pair[0], function () {
        pair[1]();
        more.classList.remove('hd-open');
      });
    });

    steerRaf = requestAnimationFrame(steerLoop);
    return ui;
  }

  function wireSteer(strip) {
    var active = -1;
    var originX = 0;
    var reach = 64;   // px of thumb travel for full lock

    strip.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      active = e.pointerId;
      originX = e.clientX;
      try { strip.setPointerCapture(e.pointerId); } catch (_) { }
    });
    strip.addEventListener('pointermove', function (e) {
      if (e.pointerId !== active) return;
      e.preventDefault();
      var raw = (e.clientX - originX) / reach;
      steer = Math.max(-1, Math.min(1, raw));
      // Let the thumb re-anchor once it has run past full lock, so a long sweep
      // does not leave the knob pinned when it comes back.
      if (raw > 1) originX = e.clientX - reach;
      if (raw < -1) originX = e.clientX + reach;
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (type) {
      strip.addEventListener(type, function (e) {
        if (e.pointerId !== active) return;
        active = -1;
        steer = 0;
        release('a');
        release('d');
      });
    });
    strip.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function fullscreenActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function toggleFullscreen() {
    var d = document;
    if (fullscreenActive()) {
      (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      return;
    }
    var target = d.documentElement;
    var req = target.requestFullscreen || target.webkitRequestFullscreen;
    if (!req) return;
    var p = req.call(target);
    if (p && p.then) {
      // Android allows a landscape lock once fullscreen; iOS ignores both.
      p.then(function () {
        if (screen.orientation && screen.orientation.lock) {
          screen.orientation.lock('landscape').catch(function () { });
        }
      }).catch(function () { });
    }
  }

  /** Fullscreen needs a user gesture, so offer it once instead of asking the
   *  player to find the small key. */
  function offerFullscreen(ui) {
    if (!coarse || fullscreenActive()) return;
    var b = el('button', { id: 'hd-fs', type: 'button' }, ui);
    b.textContent = '\u26F6  Play fullscreen';
    var dismiss = function () { if (b.parentNode) b.parentNode.removeChild(b); };
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      e.stopPropagation();
      toggleFullscreen();
      dismiss();
    });
    setTimeout(dismiss, 12000);
  }

  /* ---------- aim: touching the street points the gun -------------------- */

  function wireAim() {
    var aiming = -1;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      aiming = e.pointerId;
      moveAim({ x: e.clientX, y: e.clientY });
      // A tap on the canvas is also how the minimap is opened, so replay the
      // click the way the game expects it.
      mouse(canvas, 'mousedown', aim, 1);
      mouse(window, 'mouseup', aim, 0);
    }, { passive: true });
    canvas.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse' || e.pointerId !== aiming) return;
      moveAim({ x: e.clientX, y: e.clientY });
    }, { passive: true });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      canvas.addEventListener(type, function (e) {
        if (e.pointerId === aiming) aiming = -1;
      }, { passive: true });
    });
  }

  /* ---------- hide the pad while a menu is up ---------------------------- */

  function watchMenus(ui) {
    var offered = false;
    var sync = function () {
      // The React shell paints menu / paused / busted / wasted as a full-bleed
      // overlay; its buttons are tappable on their own and the pad only gets in
      // the way, so fold it while one is open.
      var menuUp = !!root.querySelector('.absolute.inset-0');
      if (menuUp) releaseAll();
      ui.classList.toggle('hd-hidden', menuUp);
      // Offer fullscreen the moment play actually starts, not while the menu is
      // still covering the screen (where the invitation would be hidden and
      // would time out unseen).
      if (!menuUp && !offered) {
        offered = true;
        offerFullscreen(ui);
      }
    };
    new MutationObserver(sync).observe(root, { childList: true, subtree: true });
    sync();
  }

  /* ---------- boot ------------------------------------------------------- */

  function boot() {
    root = document.getElementById('helmsdeep-root');
    canvas = root && root.querySelector('canvas');
    if (!canvas) { requestAnimationFrame(boot); return; }

    var ui = build();
    wireAim();
    watchMenus(ui);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) releaseAll();
    });
    window.addEventListener('blur', releaseAll);
    // Stop the page itself from panning or pinch-zooming under the game.
    document.addEventListener('touchmove', function (e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
  }

  var booted = false;
  function bootOnce() {
    if (booted) return;
    booted = true;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

  if (forced === '1' || coarse) {
    bootOnce();
  } else {
    // Some browsers (and desktop-mode tabs on tablets) lie about the pointer.
    // A real finger on the glass is the one signal that cannot be faked, so the
    // pad also appears the first time the screen is actually touched.
    window.addEventListener('touchstart', bootOnce, { once: true, passive: true });
  }
})();
