/* Touch controls for BAMBAI '99 / Helm's Deep.
 *
 * The game bundle is keyboard + mouse only: it reads `keydown`/`keyup` on
 * window (by `event.key`, lowercased) and `mousemove`/`mousedown` on its own
 * canvas. Rather than rebuild the bundle, this layer paints an on-screen pad
 * and replays the same events, so phones drive exactly the same code path a
 * desktop does.
 *
 *   left pad   W / A / S / D          drive, walk
 *   FIRE       mousedown on canvas    shoot (works on foot and in a car)
 *   touch map  mousemove on canvas    aim (touch where you want to shoot)
 *   E          enter / leave vehicle
 *   HAND       Space                  handbrake (and descend in a heli)
 *   NOS        Shift                  nitro in a car, sprint on foot
 *   ...        T M B N V G H Esc 1-6  map, music, marker, view, time, weather
 *
 * Enabled automatically on coarse pointers. Force with ?touch=1, disable with
 * ?touch=0.
 */
(function () {
  'use strict';

  var qs = new URLSearchParams(location.search);
  var forced = qs.get('touch');
  var coarse = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ||
    navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  if (forced === '0') return;
  if (forced !== '1' && !coarse) return;

  var canvas = null;
  var root = null;
  var held = Object.create(null);
  var aim = null;          // last aim point in client coords
  var firing = false;

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
    if (firing) stopFire();
  }

  function defaultAim() {
    var r = canvas.getBoundingClientRect();
    // Straight up from the middle of the screen: the player is centred, so this
    // is a sane heading until the player drags a finger to aim.
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

  /* ---------- widgets ---------------------------------------------------- */

  var STYLE = [
    '#hd-touch{position:fixed;inset:0;z-index:40;pointer-events:none;',
    'font:800 12px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;',
    '-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;}',
    '#hd-touch.hd-hidden{display:none;}',
    '#hd-touch button{pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;',
    'display:flex;align-items:center;justify-content:center;color:#e8e4da;',
    'background:rgba(10,14,20,.46);border:1px solid rgba(232,228,218,.26);',
    'backdrop-filter:blur(3px);border-radius:14px;font:inherit;text-transform:uppercase;}',
    '#hd-touch button.hd-on{background:rgba(252,211,77,.82);border-color:#fcd34d;color:#0a0e14;}',
    '#hd-pad{position:absolute;left:calc(14px + env(safe-area-inset-left));',
    'bottom:calc(14px + env(safe-area-inset-bottom));display:grid;gap:6px;',
    'grid-template-columns:repeat(3,62px);grid-template-rows:repeat(2,56px);}',
    '#hd-pad button{font-size:20px;border-radius:16px;}',
    '#hd-act{position:absolute;right:calc(14px + env(safe-area-inset-right));',
    'bottom:calc(14px + env(safe-area-inset-bottom));display:grid;gap:8px;',
    'grid-template-columns:72px 86px;align-items:end;}',
    '#hd-act button{height:56px;font-size:11px;}',
    '#hd-act button.hd-fire{height:86px;border-radius:50%;font-size:13px;',
    'background:rgba(220,38,38,.42);border-color:rgba(248,113,113,.6);color:#fecaca;}',
    '#hd-act button.hd-fire.hd-on{background:rgba(248,113,113,.9);color:#180405;}',
    // Left edge, under the health HUD: the game paints its minimap into the
    // top right corner and these keys must not sit on top of it.
    '#hd-top{position:absolute;left:calc(14px + env(safe-area-inset-left));',
    'top:calc(96px + env(safe-area-inset-top));display:flex;gap:8px;}',
    '#hd-top button{height:38px;padding:0 12px;font-size:11px;border-radius:12px;}',
    '#hd-more{position:absolute;left:calc(14px + env(safe-area-inset-left));',
    'top:calc(142px + env(safe-area-inset-top));display:none;grid-template-columns:repeat(4,72px);gap:6px;}',
    '#hd-more.hd-open{display:grid;}',
    '#hd-more button{height:42px;font-size:10px;}',
    '@media (max-height:420px){#hd-pad{grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,46px);}',
    '#hd-act button{height:46px;}#hd-act button.hd-fire{height:74px;}}'
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
    // captured, a thumb that slides a few pixels off the key must keep it
    // held down rather than drop the throttle mid-corner.
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

    // Drive pad: W A S D, laid out as a cross.
    var pad = el('div', { id: 'hd-pad' }, ui);
    el('span', {}, pad);
    holdBtn(pad, '\u25B2', 'w', 'KeyW');
    el('span', {}, pad);
    holdBtn(pad, '\u25C0', 'a', 'KeyA');
    holdBtn(pad, '\u25BC', 's', 'KeyS');
    holdBtn(pad, '\u25B6', 'd', 'KeyD');

    // Action cluster: E / HAND / NOS on the left column, FIRE on the right.
    var act = el('div', { id: 'hd-act' }, ui);
    var col = el('div', { style: 'display:grid;gap:8px;grid-template-columns:72px;' }, act);
    holdBtn(col, 'NOS', 'Shift', 'ShiftLeft');
    tapBtn(col, 'E', function () { tap('e', 'KeyE'); });
    holdBtn(col, 'HAND', ' ', 'Space');
    var fire = el('button', { type: 'button', class: 'hd-fire' }, act);
    fire.textContent = 'FIRE';
    bind(fire,
      function () { fire.classList.add('hd-on'); startFire(); },
      function () { fire.classList.remove('hd-on'); stopFire(); });

    // Top right: fullscreen and the extras drawer.
    var top = el('div', { id: 'hd-top' }, ui);
    var more = el('div', { id: 'hd-more' }, ui);
    tapBtn(top, '\u26F6', toggleFullscreen);
    tapBtn(top, '\u22EF', function () { more.classList.toggle('hd-open'); });
    tapBtn(top, 'II', function () { tap('Escape', 'Escape'); });

    var weapon = 0;
    [
      ['MAP', function () { tap('t', 'KeyT'); }],
      ['GUN', function () { weapon = (weapon % 6) + 1; tap(String(weapon), 'Digit' + weapon); }],
      ['MARK', function () { tap('n', 'KeyN'); }],
      ['MUSIC', function () { tap('m', 'KeyM'); }],
      ['SKIP', function () { tap('b', 'KeyB'); }],
      ['VIEW', function () { tap('v', 'KeyV'); }],
      ['ZOOM+', function () { tap(']', 'BracketRight'); }],
      ['ZOOM-', function () { tap('[', 'BracketLeft'); }],
      ['RACE', function () { tap('r', 'KeyR'); }],
      ['TIME', function () { tap('g', 'KeyG'); }],
      ['WX', function () { tap('h', 'KeyH'); }],
      ['PUNCH', function () { tap('q', 'KeyQ'); }]
    ].forEach(function (pair) {
      // One-shot keys: fold the drawer again so it stops covering the pad.
      tapBtn(more, pair[0], function () {
        pair[1]();
        more.classList.remove('hd-open');
      });
    });

    return ui;
  }

  function toggleFullscreen() {
    var d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) {
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

  /* ---------- aim: touching the canvas points the gun -------------------- */

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
    var sync = function () {
      // The React shell paints menu / paused / busted / wasted as a full-bleed
      // overlay; its buttons are tappable on their own and the pad only gets in
      // the way, so fold it while one is open.
      var menuUp = !!root.querySelector('.absolute.inset-0');
      if (menuUp) releaseAll();
      ui.classList.toggle('hd-hidden', menuUp);
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
