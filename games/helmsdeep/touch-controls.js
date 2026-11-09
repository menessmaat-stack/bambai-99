/* Touch controls for HELM'S DEEP.
 *
 * The game bundle is keyboard + mouse only: it reads `keydown`/`keyup` on
 * window (by `event.key`, lowercased) and `mousemove`/`mousedown` on its own
 * canvas. Rather than rebuild the bundle, this layer paints an on-screen pad and
 * replays the same events, so phones drive exactly the same code path a desktop
 * does.
 *
 * Layout, left thumb to right thumb:
 *   throttle / brake pedals     W / S
 *   steering strip              A / D, drag like PUBG's look control
 *   enter · handbrake · nitro · FIRE
 *   tap the street              mousemove on the canvas (aim)
 *   small key row               fullscreen · extras drawer · pause
 *
 * Everything is an icon: a phone screen is too small to read 9 px words
 * mid-corner, and the steering strip needs no caption once you have dragged it.
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

  var knob = null;

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
    if (knob) {
      knob.style.transform = 'translateX(' + (steer * 60).toFixed(1) + 'px)';
      knob.style.opacity = mag < 0.12 ? '0.5' : '1';
    }
    steerRaf = requestAnimationFrame(steerLoop);
  }

  /* ---------- widgets ---------------------------------------------------- */

  /** Inline stroke icons, drawn on a 24x24 grid. */
  var ICON = {
    gas: 'M12 4 L19 13 H14.5 V20 H9.5 V13 H5 Z',
    brake: 'M12 20 L5 11 H9.5 V4 H14.5 V11 H19 Z',
    enter: 'M4 5 v14 M4 12 h11 M11 8 l4 4 -4 4 M19 5 v14',
    hand: 'M7 20 h10 M12 20 V9 M12 9 l5 -5 M9 14 h6',
    nos: 'M12 3 c3 4 5 6 5 10 a5 5 0 0 1 -10 0 c0 -3 2 -4 3 -6 c1 2 2 2 2 4 c1 -3 0 -5 0 -8 Z',
    fire: 'M12 3 v4 M12 17 v4 M3 12 h4 M17 12 h4 M12 9 a3 3 0 1 0 0 6 a3 3 0 1 0 0 -6',
    full: 'M4 9 V4 h5 M15 4 h5 v5 M20 15 v5 h-5 M9 20 H4 v-5',
    more: 'M6.5 12 h.01 M12 12 h.01 M17.5 12 h.01',
    pause: 'M9 5 v14 M15 5 v14',
    map: 'M9 4 L3 7 v13 l6 -3 6 3 6 -3 V4 l-6 3 Z M9 4 v13 M15 7 v13',
    train: 'M7 4 h10 a2 2 0 0 1 2 2 v8 a2 2 0 0 1 -2 2 H7 a2 2 0 0 1 -2 -2 V6 a2 2 0 0 1 2 -2 Z M5 10 h14 M8.5 20 l2 -4 M15.5 20 l-2 -4',
    gun: 'M3 9 h12 l2 4 h4 M7 13 v4 h4 M3 9 v4 h4',
    pin: 'M12 21 s6 -6.5 6 -11 a6 6 0 1 0 -12 0 c0 4.5 6 11 6 11 Z M12 8 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4',
    music: 'M9 18 V6 l10 -2 v12 M9 18 a2.5 2.5 0 1 1 -2.5 -2.5 a2.5 2.5 0 0 1 2.5 2.5 M19 16 a2.5 2.5 0 1 1 -2.5 -2.5 a2.5 2.5 0 0 1 2.5 2.5',
    skip: 'M5 5 l9 7 -9 7 Z M18 5 v14',
    eye: 'M2 12 s4 -6 10 -6 s10 6 10 6 s-4 6 -10 6 s-10 -6 -10 -6 Z M12 9.5 a2.5 2.5 0 1 0 0 5 a2.5 2.5 0 1 0 0 -5',
    zoomIn: 'M11 18 a7 7 0 1 1 0 -14 a7 7 0 0 1 0 14 Z M20 20 l-4.5 -4.5 M11 8 v6 M8 11 h6',
    zoomOut: 'M11 18 a7 7 0 1 1 0 -14 a7 7 0 0 1 0 14 Z M20 20 l-4.5 -4.5 M8 11 h6',
    flag: 'M6 21 V4 M6 4 h11 l-2 4 2 4 H6',
    clock: 'M12 21 a9 9 0 1 1 0 -18 a9 9 0 0 1 0 18 Z M12 7 v5 l3 2',
    punch: 'M6 12 V9 a2 2 0 0 1 4 0 M10 11 V7.5 a2 2 0 0 1 4 0 v3.5 M14 11 V8.5 a2 2 0 0 1 4 0 V14 a5 5 0 0 1 -5 5 h-2 a5 5 0 0 1 -5 -5 v-2'
  };

  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[name] + '"/></svg>';
  }

  var STYLE = [
    '#hd-touch{position:fixed;inset:0;z-index:40;pointer-events:none;',
    '-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;}',
    '#hd-touch.hd-hidden{display:none;}',
    '#hd-touch svg{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.9;',
    'stroke-linecap:round;stroke-linejoin:round;pointer-events:none;}',
    '#hd-touch button{pointer-events:auto;touch-action:none;-webkit-user-select:none;user-select:none;',
    'display:flex;align-items:center;justify-content:center;padding:0;',
    'color:rgba(236,240,245,.92);',
    'background:linear-gradient(180deg,rgba(26,33,44,.58),rgba(10,14,20,.5));',
    'border:1px solid rgba(255,255,255,.14);border-radius:14px;',
    'box-shadow:0 2px 10px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.1);',
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    'will-change:transform;transition:transform .07s ease,background .07s linear;}',
    '#hd-touch button.hd-on{transform:scale(.94);',
    'background:linear-gradient(180deg,rgba(252,211,77,.94),rgba(240,188,40,.94));',
    'border-color:rgba(255,232,150,.9);color:#0b0e13;}',
    // left thumb: throttle over brake
    '#hd-pedals{position:absolute;left:calc(14px + env(safe-area-inset-left));',
    'bottom:calc(14px + env(safe-area-inset-bottom));display:grid;gap:8px;}',
    '#hd-pedals button{width:56px;height:46px;border-radius:16px;}',
    '#hd-pedals svg{width:24px;height:24px;}',
    // right thumb: the steering strip, no caption
    '#hd-steer{position:absolute;right:calc(14px + env(safe-area-inset-right));',
    'bottom:calc(14px + env(safe-area-inset-bottom));width:164px;height:52px;',
    'pointer-events:auto;touch-action:none;border-radius:26px;',
    'background:linear-gradient(180deg,rgba(26,33,44,.5),rgba(10,14,20,.44));',
    'border:1px solid rgba(255,255,255,.12);',
    'box-shadow:0 2px 12px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.08);',
    '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);',
    'display:flex;align-items:center;justify-content:center;}',
    '#hd-steer .hd-track{position:absolute;left:18px;right:18px;height:3px;border-radius:2px;',
    'background:rgba(255,255,255,.14);}',
    '#hd-steer .hd-knob{width:34px;height:34px;border-radius:50%;opacity:.5;',
    'background:radial-gradient(circle at 35% 30%,#ffe9a8,#f0bc28 70%);',
    'box-shadow:0 2px 8px rgba(0,0,0,.45);will-change:transform,opacity;}',
    // action cluster above the strip
    '#hd-act{position:absolute;right:calc(14px + env(safe-area-inset-right));',
    'bottom:calc(76px + env(safe-area-inset-bottom));display:flex;gap:8px;align-items:flex-end;}',
    '#hd-act button{width:46px;height:40px;}',
    '#hd-act button.hd-fire{width:62px;height:62px;border-radius:50%;',
    'background:radial-gradient(circle at 38% 30%,rgba(248,113,113,.5),rgba(153,27,27,.62));',
    'border-color:rgba(248,113,113,.55);color:#ffe4e4;}',
    '#hd-act button.hd-fire svg{width:26px;height:26px;}',
    '#hd-act button.hd-fire.hd-on{',
    'background:radial-gradient(circle at 38% 30%,#fca5a5,#dc2626);color:#2a0606;',
    'border-color:#fecaca;}',
    // utility row, clear of the minimap
    '#hd-top{position:absolute;left:calc(14px + env(safe-area-inset-left));',
    'top:calc(92px + env(safe-area-inset-top));display:flex;gap:8px;}',
    '#hd-top button{width:38px;height:34px;border-radius:11px;}',
    '#hd-top svg{width:18px;height:18px;}',
    '#hd-more{position:absolute;left:calc(14px + env(safe-area-inset-left));',
    'top:calc(134px + env(safe-area-inset-top));display:none;',
    'grid-template-columns:repeat(4,46px);gap:8px;}',
    '#hd-more.hd-open{display:grid;}',
    '#hd-more button{height:40px;border-radius:12px;}',
    '#hd-more svg{width:19px;height:19px;}',
    // one-time fullscreen invitation
    '#hd-touch button#hd-fs{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);',
    'pointer-events:auto;width:76px;height:76px;border-radius:50%;border:0;color:#0b0e13;',
    'background:radial-gradient(circle at 35% 30%,#ffe9a8,#f0bc28 70%);',
    'box-shadow:0 6px 24px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;}',
    '#hd-touch button#hd-fs svg{width:30px;height:30px;stroke-width:2;}',
    '@media (max-height:380px){#hd-pedals button{width:50px;height:40px;}',
    '#hd-steer{width:142px;height:46px;}#hd-act button.hd-fire{width:54px;height:54px;}',
    '#hd-act button{width:42px;height:36px;}}'
  ].join('');

  function el(tag, attrs, parent) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(n);
    return n;
  }

  /** A button that holds a key down for as long as a finger is on it. */
  function holdBtn(parent, icon, label, k, code, cls) {
    var b = el('button', { type: 'button', class: cls || '', 'aria-label': label }, parent);
    b.innerHTML = svg(icon);
    bind(b,
      function () { b.classList.add('hd-on'); press(k, code); },
      function () { b.classList.remove('hd-on'); release(k); });
    return b;
  }

  /** A button that fires one key tap per touch. */
  function tapBtn(parent, icon, label, run) {
    var b = el('button', { type: 'button', 'aria-label': label }, parent);
    b.innerHTML = svg(icon);
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
    holdBtn(pedals, 'gas', 'Accelerate', 'w', 'KeyW');
    holdBtn(pedals, 'brake', 'Brake and reverse', 's', 'KeyS');

    // Right thumb: steer by dragging, PUBG style.
    var strip = el('div', { id: 'hd-steer' }, ui);
    el('div', { class: 'hd-track' }, strip);
    knob = el('div', { class: 'hd-knob' }, strip);
    wireSteer(strip);

    // Action keys sit above the strip so they never fight the steering thumb.
    var act = el('div', { id: 'hd-act' }, ui);
    tapBtn(act, 'enter', 'Enter or leave vehicle', function () { tap('e', 'KeyE'); });
    holdBtn(act, 'hand', 'Handbrake', ' ', 'Space');
    holdBtn(act, 'nos', 'Nitro / sprint', 'Shift', 'ShiftLeft');
    var fire = el('button', { type: 'button', class: 'hd-fire', 'aria-label': 'Fire' }, act);
    fire.innerHTML = svg('fire');
    bind(fire,
      function () { fire.classList.add('hd-on'); startFire(); },
      function () { fire.classList.remove('hd-on'); stopFire(); });

    // Utility row + drawer.
    var top = el('div', { id: 'hd-top' }, ui);
    var more = el('div', { id: 'hd-more' }, ui);
    tapBtn(top, 'full', 'Fullscreen', toggleFullscreen);
    tapBtn(top, 'more', 'More controls', function () { more.classList.toggle('hd-open'); });
    tapBtn(top, 'pause', 'Pause', function () { tap('Escape', 'Escape'); });

    var weapon = 0;
    [
      ['map', 'City map', openMap],
      ['train', 'Transit map', function () { tap('t', 'KeyT'); }],
      ['gun', 'Next weapon', function () { weapon = (weapon % 6) + 1; tap(String(weapon), 'Digit' + weapon); }],
      ['pin', 'Next landmark', function () { tap('n', 'KeyN'); }],
      ['music', 'Music on/off', function () { tap('m', 'KeyM'); }],
      ['skip', 'Next track', function () { tap('b', 'KeyB'); }],
      ['eye', 'Camera view', function () { tap('v', 'KeyV'); }],
      ['zoomIn', 'Zoom in', function () { tap(']', 'BracketRight'); }],
      ['zoomOut', 'Zoom out', function () { tap('[', 'BracketLeft'); }],
      ['flag', 'Street race', function () { tap('r', 'KeyR'); }],
      ['clock', 'Time of day', function () { tap('g', 'KeyG'); }],
      ['punch', 'Punch', function () { tap('q', 'KeyQ'); }]
    ].forEach(function (item) {
      // One-shot keys: fold the drawer again so it stops covering the pad.
      tapBtn(more, item[0], item[1], function () {
        item[2]();
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

  /** Fullscreen needs a user gesture, so offer it once when play starts rather
   *  than hoping the player finds the small key. */
  function offerFullscreen(ui) {
    if (!coarse || fullscreenActive()) return;
    var b = el('button', { id: 'hd-fs', type: 'button', 'aria-label': 'Play fullscreen' }, ui);
    b.innerHTML = svg('full');
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
