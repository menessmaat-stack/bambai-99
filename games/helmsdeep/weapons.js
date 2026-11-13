/* Guns: the roster, how one is held, how it sounds, and what it throws.
 *
 * The bundle ships eight weapon *slots* with one set of numbers each. This
 * file turns each slot into a family of real guns sliced out of the weapon
 * sheet: the slot still owns the ammunition pool, so cycling variants never
 * strands you with an empty magazine, but the gun you are carrying decides
 * the rate of fire, the spread, the damage, the artwork and the noise.
 *
 * Nothing here reaches into the bundle's internals. `window.__helmsdeep`
 * publishes the live `WEAPONS` table and the game state, so a variant is
 * applied by writing the numbers the firing code already reads, and the four
 * hooks the bundle calls (`__hdGun`, `__hdBullets`, `__hdSfx`, plus the digit
 * keys taken on the capture phase) are the whole integration surface.
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------- roster
  //
  // `L` is the drawn length in world units. The character is about 15 units
  // tall, so a rifle at 14 reads as a rifle and a pistol at 7 reads as a
  // pistol; measuring these in metres would put a 2 m carbine on a man drawn
  // at 2.3 m and the gun would swamp him.
  var ROSTER = {
    pistol: [
      { slug: 'glock-17',       name: 'GLOCK 17',      L: 7.0, cd: 0.20, dmg: 13, spread: 0.045, speed: 880, ttl: 0.7,  auto: false },
      { slug: 'glock-18',       name: 'GLOCK 18C',     L: 7.0, cd: 0.085, dmg: 10, spread: 0.085, speed: 870, ttl: 0.7, auto: true },
      { slug: 'glock-19',       name: 'GLOCK 19',      L: 6.6, cd: 0.19, dmg: 12, spread: 0.05,  speed: 870, ttl: 0.7,  auto: false },
      { slug: 'pistol-compact', name: 'COMPACT .380',  L: 6.0, cd: 0.16, dmg: 9,  spread: 0.07,  speed: 820, ttl: 0.6,  auto: false },
      { slug: 'p226',           name: 'P226',          L: 7.2, cd: 0.19, dmg: 14, spread: 0.04,  speed: 900, ttl: 0.75, auto: false },
      { slug: 'beretta',        name: 'BERETTA 92',    L: 7.2, cd: 0.18, dmg: 13, spread: 0.045, speed: 890, ttl: 0.75, auto: false },
      { slug: 'm1911-tan',      name: 'M1911 .45',     L: 7.0, cd: 0.26, dmg: 19, spread: 0.05,  speed: 820, ttl: 0.7,  auto: false },
      { slug: 'tt-33',          name: 'TOKAREV TT',    L: 6.8, cd: 0.22, dmg: 16, spread: 0.055, speed: 940, ttl: 0.8,  auto: false },
      { slug: 'revolver',       name: '.357 REVOLVER', L: 7.4, cd: 0.42, dmg: 30, spread: 0.03,  speed: 950, ttl: 0.85, auto: false },
      { slug: 'deagle',         name: 'DESERT EAGLE',  L: 8.2, cd: 0.46, dmg: 42, spread: 0.035, speed: 1000, ttl: 0.9, auto: false },
      { slug: 'deagle-chrome',  name: 'DEAGLE CHROME', L: 8.2, cd: 0.46, dmg: 44, spread: 0.03,  speed: 1000, ttl: 0.9, auto: false }
    ],
    smg: [
      { slug: 'mp5a3',       name: 'MP5A3',      L: 10.5, cd: 0.070, dmg: 11, spread: 0.075, speed: 900, ttl: 0.65, auto: true },
      { slug: 'mp5k',        name: 'MP5K',       L: 8.6,  cd: 0.058, dmg: 9,  spread: 0.115, speed: 880, ttl: 0.6,  auto: true },
      { slug: 'mp5sd',       name: 'MP5SD',      L: 11.4, cd: 0.075, dmg: 10, spread: 0.055, speed: 820, ttl: 0.65, auto: true, quiet: true },
      { slug: 'mp5-compact', name: 'MP5 PDW',    L: 9.4,  cd: 0.062, dmg: 10, spread: 0.1,   speed: 890, ttl: 0.6,  auto: true },
      { slug: 'p90',         name: 'P90',        L: 9.8,  cd: 0.050, dmg: 9,  spread: 0.085, speed: 950, ttl: 0.7,  auto: true }
    ],
    shotgun: [
      { slug: 'shotgun-pump',   name: 'PUMP 12-GAUGE', L: 12.6, cd: 0.78, dmg: 12, spread: 0.185, speed: 760, ttl: 0.32, pellets: 9,  auto: false },
      { slug: 'shotgun-double', name: 'DOUBLE BARREL', L: 12.0, cd: 1.05, dmg: 15, spread: 0.26,  speed: 730, ttl: 0.28, pellets: 14, auto: false },
      { slug: 'shotgun-spas',   name: 'SEMI-AUTO 12G', L: 12.8, cd: 0.42, dmg: 10, spread: 0.165, speed: 780, ttl: 0.34, pellets: 8,  auto: true }
    ],
    rifle: [
      { slug: 'm4a1',       name: 'M4A1',          L: 13.4, cd: 0.095, dmg: 22, spread: 0.045, speed: 1500, ttl: 1.2, auto: true },
      { slug: 'm4-acog',    name: 'M4 ACOG',       L: 13.6, cd: 0.115, dmg: 26, spread: 0.022, speed: 1550, ttl: 1.3, auto: true },
      { slug: 'm4-sd',      name: 'M4 SUPPRESSED', L: 15.0, cd: 0.100, dmg: 21, spread: 0.030, speed: 1400, ttl: 1.2, auto: true, quiet: true },
      { slug: 'm4-cqb',     name: 'M4 CQB',        L: 12.2, cd: 0.082, dmg: 19, spread: 0.065, speed: 1450, ttl: 1.1, auto: true },
      { slug: 'acr-tan',    name: 'ACR',           L: 13.8, cd: 0.100, dmg: 24, spread: 0.038, speed: 1520, ttl: 1.25, auto: true },
      { slug: 'acr-tan-sd', name: 'ACR SUPPRESSED', L: 15.2, cd: 0.105, dmg: 23, spread: 0.028, speed: 1420, ttl: 1.2, auto: true, quiet: true },
      { slug: 'scar-tan',   name: 'SCAR-H',        L: 14.2, cd: 0.135, dmg: 33, spread: 0.035, speed: 1600, ttl: 1.35, auto: true }
    ],
    dmr: [
      { slug: 'sr-25',  name: 'SR-25 MARKSMAN', L: 15.0, cd: 0.34, dmg: 68, spread: 0.008, speed: 1700, ttl: 1.5, auto: false },
      { slug: 'm4-dmr', name: 'M4 DESIGNATED',  L: 14.4, cd: 0.28, dmg: 52, spread: 0.012, speed: 1650, ttl: 1.4, auto: false }
    ],
    sniper: [
      { slug: 'awp',    name: 'AWP',           L: 16.0, cd: 1.10, dmg: 450, spread: 0.002, speed: 2200, ttl: 1.8, auto: false },
      { slug: 'awp-od', name: 'AWP OLIVE',     L: 16.0, cd: 1.05, dmg: 420, spread: 0.003, speed: 2200, ttl: 1.8, auto: false },
      { slug: 'l96',    name: 'L96A1',         L: 16.4, cd: 1.25, dmg: 500, spread: 0.0015, speed: 2300, ttl: 2.0, auto: false },
      { slug: 'awm',    name: 'AWM MAGNUM',    L: 16.2, cd: 1.35, dmg: 560, spread: 0.0015, speed: 2400, ttl: 2.0, auto: false }
    ],
    grenade: [{ slug: null, icon: 'grenade', name: 'GRENADE' }],
    flamer:  [{ slug: null, name: 'FLAMER' }],
    bazooka: [{ slug: null, name: 'BAZOOKA' }]
  };

  // Number key -> slot. Nine keys, nine slots.
  var KEYS = ['pistol', 'smg', 'shotgun', 'rifle', 'dmr', 'sniper', 'grenade', 'flamer', 'bazooka'];

  // The marksman slot is new, so it has to be introduced to the tables the
  // bundle already owns: the stat row, the pickup roll and the full-ammo cheat.
  var DMR_BASE = { name: 'MARKSMAN', cd: 0.34, pellets: 1, spread: 0.008, speed: 1700,
                   ttl: 1.5, dmg: 68, auto: false, heat: 0.6, kind: 'bullet' };

  // --------------------------------------------------------------- sprites
  var imgs = {};
  function sprite(slug) {
    if (!slug) return null;
    var im = imgs[slug];
    if (im === undefined) {
      im = imgs[slug] = new Image();
      im.src = '/sprites/guns/' + slug + '.png';
    }
    return (im.complete && im.naturalWidth > 0) ? im : null;
  }
  function icon(slug) {
    var im = imgs['i:' + slug];
    if (im === undefined) {
      im = imgs['i:' + slug] = new Image();
      im.src = '/sprites/weapon-icons/' + slug + '.png';
    }
    return (im.complete && im.naturalWidth > 0) ? im : null;
  }
  Object.keys(ROSTER).forEach(function (cat) {
    ROSTER[cat].forEach(function (g) { if (g.slug) sprite(g.slug); if (g.icon) icon(g.icon); });
  });

  // ----------------------------------------------------------------- state
  var pick = {};                 // slot -> variant index
  Object.keys(ROSTER).forEach(function (c) { pick[c] = 0; });
  var lastShot = -99;            // game clock of the last round out of the barrel
  var recoil = 0;                // world units the gun is driven back

  function hd() { return window.__helmsdeep || null; }
  function cur() {
    var g = hd();
    var cat = g ? g.S.player.weapon : 'pistol';
    if (!ROSTER[cat]) cat = 'pistol';
    return ROSTER[cat][pick[cat] % ROSTER[cat].length];
  }

  // Writing the variant's numbers into the live stat row is the whole of
  // "equipping" it: the firing code reads that row every shot.
  function apply(cat) {
    var g = hd();
    if (!g) return;
    var row = g.WEAPONS[cat];
    if (!row) return;
    var v = ROSTER[cat][pick[cat] % ROSTER[cat].length];
    if (!v || !v.slug) return;                     // grenade, flamer, bazooka
    row.name = v.name;
    row.cd = v.cd;
    row.dmg = v.dmg;
    row.spread = v.spread;
    row.speed = v.speed;
    row.ttl = v.ttl;
    row.auto = !!v.auto;
    row.pellets = v.pellets || 1;
  }

  // ------------------------------------------------------------- held gun
  // Called from the on-foot player sprite, with the canvas already translated
  // to the player and rotated to his heading. Returns true when it drew, so
  // the stock black rectangle is skipped.
  window.__hdGun = function (ctx, p) {
    var v = cur();
    var g = hd();
    var t = g ? g.S.t : 0;
    var since = t - lastShot;
    recoil = since < 0.10 ? (1 - since / 0.10) * (v.kick || 2.2) : 0;

    var img = v.slug ? sprite(v.slug) : null;
    if (!img) return false;

    var L = v.L, H = L * (img.naturalHeight / img.naturalWidth);
    var x0 = 3.2 - recoil;
    // Aiming left would hang the gun upside down under the arm, so the sprite
    // is mirrored across the barrel line the moment the heading crosses over.
    var flip = Math.cos(p.h) < 0;
    ctx.save();
    if (flip) ctx.scale(1, -1);
    ctx.globalAlpha = 0.3;
    ctx.drawImage(img, x0 + 0.5, -H * 0.5 + 1.2, L, H);   // dropped shadow
    ctx.globalAlpha = 1;
    ctx.drawImage(img, x0, -H * 0.5, L, H);
    ctx.restore();

    if (since >= 0 && since < 0.07 && !v.quiet) muzzle(ctx, x0 + L, since / 0.07, v);
    return true;
  };

  // The flash was a single yellow wedge two frames long, which at this scale
  // is a dot. A real muzzle blast is a white core, a burning plume thrown
  // forward, sparks either side of it and the whole street lit for a frame,
  // so that is what comes out of the barrel now. The lifetime is 70 ms, long
  // enough to actually register at 60 fps.
  function muzzle(ctx, x, k, v) {
    var f = 1 - k;                       // 1 at the instant of firing
    var r = (v.flash || 4.2) * (0.55 + f * 0.9);
    var sp = v.pellets ? 1.5 : 1;        // a shotgun throws a wider cone
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // Light thrown onto the road around the muzzle.
    var g = ctx.createRadialGradient(x, 0, 0, x, 0, r * 7);
    g.addColorStop(0, 'rgba(255,196,96,' + (0.5 * f).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, 0, r * 7, 0, Math.PI * 2);
    ctx.fill();

    // The plume: three overlapping tongues of flame, longest in the middle.
    for (var i = -1; i <= 1; i++) {
      var spread = i * 0.42 * sp;
      var len = r * (i === 0 ? 4.4 : 2.6) * (0.5 + f);
      ctx.fillStyle = i === 0
        ? 'rgba(255,236,170,' + (0.92 * f).toFixed(3) + ')'
        : 'rgba(255,150,40,' + (0.6 * f).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.cos(spread - 0.24) * len, Math.sin(spread - 0.24) * len);
      ctx.lineTo(x + Math.cos(spread) * len * 1.25, Math.sin(spread) * len * 1.25);
      ctx.lineTo(x + Math.cos(spread + 0.24) * len, Math.sin(spread + 0.24) * len);
      ctx.closePath();
      ctx.fill();
    }

    // White-hot core at the crown.
    ctx.fillStyle = 'rgba(255,255,244,' + (0.95 * f).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(x + r * 0.6, 0, r * (0.5 + f * 0.6), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // -------------------------------------------------------------- bullets
  //
  // A 2 px line from the muzzle to a fixed fraction of the velocity made
  // every round look the same whatever fired it. The tracer is now as long
  // as the round is fast, with a hot head and a glow behind it.
  //
  // Rounds also used to vanish in silence. The engine deletes a bullet the
  // frame it hits something and never says so, but this hook sees the live
  // array every frame: anything that was there last frame and is gone now,
  // with time left on its fuse, hit something - and that is where the sparks
  // and the puff of dust go.
  var seen = new Map();

  function impact(x, y, vx, vy, mine) {
    var g = hd();
    if (!g) return;
    var parts = g.S.parts;
    if (parts.length > 540) return;
    var sp = Math.hypot(vx, vy) || 1;
    var bx = -vx / sp, by = -vy / sp;        // back along the flight path
    for (var i = 0; i < 6; i++) {
      var a = Math.atan2(by, bx) + (Math.random() - 0.5) * 1.5;
      var s = 60 + Math.random() * 190;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                   life: 0.1 + Math.random() * 0.18, max: 0.28,
                   r: 0.9 + Math.random() * 1.4,
                   col: Math.random() < 0.4 ? '#fff3c0' : '#ffb545', glow: true });
    }
    parts.push({ x: x, y: y, vx: bx * 24, vy: by * 24, life: 0.32, max: 0.32,
                 r: 3.4, col: '#6b6256', glow: false });     // dust off the wall
    parts.push({ x: x, y: y, vx: 0, vy: 0, life: 0.07, max: 0.07,
                 r: mine ? 5.5 : 4.2, col: '#fff6d0', glow: true });
  }

  window.__hdBullets = function (ctx, bullets) {
    var g = hd(), now = g ? g.S.t : 0;
    var live = new Set();
    ctx.save();
    ctx.lineCap = 'round';
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      live.add(b);
      var sp = Math.hypot(b.vx, b.vy) || 1;
      var len = Math.min(42, sp * 0.018);
      var nx = b.vx / sp, ny = b.vy / sp;
      var mine = b.from === 'player';
      var hot = mine ? '255,236,170' : '255,150,110';
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = 'rgba(' + hot + ',0.20)';
      ctx.lineWidth = 4.2;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - nx * len, b.y - ny * len);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(' + hot + ',0.95)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - nx * len * 0.6, b.y - ny * len * 0.6);
      ctx.stroke();
      ctx.fillStyle = mine ? 'rgba(255,252,232,0.98)' : 'rgba(255,200,154,0.98)';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.9, 0, Math.PI * 2);
      ctx.fill();
      seen.set(b, [b.x, b.y, b.vx, b.vy, b.ttl, mine, now]);
    }
    ctx.restore();

    seen.forEach(function (rec, key) {
      if (live.has(key)) return;
      seen.delete(key);
      if (now - rec[6] > 0.2) return;            // stale, not a hit
      if (rec[4] > 0.04) impact(rec[0], rec[1], rec[2], rec[3], rec[5]);
    });
  };

  // ----------------------------------------------------------------- audio
  // A second context rather than a reach into the bundle's mixer. It is
  // created on the first shot, which is always well after the gesture that
  // started the game, so it is never blocked.
  var ac = null, bus = null, noiseBuf = null;
  function audio() {
    if (ac) return ac;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try {
      ac = new C();
      bus = ac.createDynamicsCompressor();
      bus.threshold.value = -16;
      bus.ratio.value = 7;
      var out = ac.createGain();
      out.gain.value = 0.85;
      bus.connect(out);
      out.connect(ac.destination);
      var n = ac.sampleRate * 2;
      noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
    return ac;
  }

  function noise(t, dur, type, freq, q, gain, sweepTo) {
    var src = ac.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = ac.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    var g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f); f.connect(g); g.connect(bus);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function tone(t, dur, from, to, gain, type) {
    var o = ac.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    var g = ac.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // The shape of a gunshot is a crack (fast broadband), a body (the bore
  // resonance) and a tail (the report coming back off the buildings). The
  // three move together per family, which is what makes a shotgun sound
  // nothing like a pistol even though both are a noise burst.
  var VOICE = {
    pistol:  { crack: [0.05, 2400, 0.55], body: [0.07, 260, 60, 0.40], tail: 0.10 },
    smg:     { crack: [0.035, 3000, 0.40], body: [0.045, 300, 90, 0.26], tail: 0.06 },
    shotgun: { crack: [0.14, 1100, 0.95], body: [0.30, 150, 32, 0.95], tail: 0.34, pump: true },
    rifle:   { crack: [0.055, 3400, 0.70], body: [0.11, 220, 55, 0.52], tail: 0.20 },
    dmr:     { crack: [0.07, 3000, 0.85], body: [0.16, 190, 45, 0.66], tail: 0.30 },
    sniper:  { crack: [0.09, 2600, 1.00], body: [0.26, 150, 34, 0.90], tail: 0.55, echo: true },
    flamer:  { crack: [0.10, 700, 0.22], body: [0.12, 120, 70, 0.16], tail: 0 },
    bazooka: { crack: [0.18, 900, 0.80], body: [0.40, 120, 28, 0.90], tail: 0.4 }
  };

  function gunshot(cat, quiet) {
    if (!audio()) return;
    var v = VOICE[cat] || VOICE.pistol;
    var t = ac.currentTime;
    var k = quiet ? 0.28 : 1;
    noise(t, v.crack[0], 'bandpass', v.crack[1], 1.1, v.crack[2] * k, quiet ? v.crack[1] * 0.35 : 0);
    tone(t, v.body[0], v.body[1], v.body[2], v.body[3] * k, 'triangle');
    if (v.tail && !quiet) {
      // The tail is the street answering back: a late, dull, quieter copy.
      noise(t + 0.03, v.tail, 'lowpass', 900, 0.7, v.crack[2] * 0.3, 220);
    }
    if (v.echo && !quiet) {
      noise(t + 0.17, 0.5, 'lowpass', 500, 0.6, 0.22, 140);
      noise(t + 0.34, 0.6, 'lowpass', 340, 0.6, 0.11, 110);
    }
    if (quiet) noise(t, 0.05, 'highpass', 4200, 0.7, 0.12);   // the action, not the round
    if (v.pump) {                                             // the racking of the slide
      noise(t + 0.22, 0.035, 'bandpass', 2600, 3, 0.22);
      noise(t + 0.30, 0.035, 'bandpass', 1900, 3, 0.18);
    }
  }

  function blast() {
    if (!audio()) return;
    var t = ac.currentTime;
    tone(t, 0.7, 120, 22, 1.0, 'sine');
    noise(t, 0.55, 'lowpass', 1800, 0.6, 0.95, 70);
    noise(t + 0.05, 0.8, 'lowpass', 400, 0.5, 0.35, 60);
    noise(t + 0.3, 0.7, 'lowpass', 260, 0.5, 0.14, 90);       // rolling off the blocks
  }

  function click() {
    if (!audio()) return;
    var t = ac.currentTime;
    noise(t, 0.03, 'bandpass', 3200, 4, 0.3);
  }

  function whoosh() {
    if (!audio()) return;
    var t = ac.currentTime;
    noise(t, 0.26, 'bandpass', 700, 0.9, 0.22, 240);
  }

  // The bundle calls this before its own synth; returning true takes the shot.
  window.__hdSfx = function (what) {
    var g = hd();
    var cat = g ? g.S.player.weapon : 'pistol';
    if (what === 'boom') { blast(); return true; }
    if (what === 'empty') { click(); return true; }
    if (what === 'throw') { whoosh(); return true; }
    var v = cur();
    lastShot = g ? g.S.t : 0;
    gunshot(cat, !!v.quiet);
    kickback(cat);
    return true;
  };

  // Shell casings and the shove on the camera. Both come out of the same
  // place the sound does, so they can never disagree with the shot.
  var SHAKE = { shotgun: 5.5, sniper: 7, dmr: 4.5, rifle: 2.4, smg: 1.2, pistol: 1.6, flamer: 0 };
  function kickback(cat) {
    var g = hd();
    if (!g) return;
    var s = g.S, p = s.player;
    if (!p.onFoot) return;
    var shake = SHAKE[cat];
    if (shake === undefined) shake = 1.5;
    if (shake > 0) s.cam.shake = Math.max(s.cam.shake, shake);
    if (SHAKE[cat] === undefined || cat === 'flamer') return;   // nothing ejects

    var mx = p.x + Math.cos(p.h) * (v0(cat) + 3), my = p.y + Math.sin(p.h) * (v0(cat) + 3);
    // Smoke standing off the muzzle, drifting the way the round went. Twice
    // as much out of a shotgun, almost none out of a 9 mm.
    var puff = cat === 'shotgun' || cat === 'sniper' ? 3 : cat === 'pistol' || cat === 'smg' ? 1 : 2;
    for (var i = 0; i < puff; i++) {
      var sa = p.h + (Math.random() - 0.5) * 0.7;
      s.parts.push({
        x: mx, y: my,
        vx: Math.cos(sa) * (26 + Math.random() * 44), vy: Math.sin(sa) * (26 + Math.random() * 44),
        life: 0.3 + Math.random() * 0.4, max: 0.75,
        r: 2.2 + Math.random() * 3.4, col: '#8e8779', glow: false
      });
    }
    // Unburnt powder: a couple of embers thrown out with the round.
    for (i = 0; i < 2; i++) {
      var ea = p.h + (Math.random() - 0.5) * 0.9;
      s.parts.push({
        x: mx, y: my,
        vx: Math.cos(ea) * (110 + Math.random() * 150), vy: Math.sin(ea) * (110 + Math.random() * 150),
        life: 0.08 + Math.random() * 0.12, max: 0.22,
        r: 0.9 + Math.random() * 1.1, col: '#ffcf6a', glow: true
      });
    }

    // Brass leaves the port, which is the side the gun is held on.
    var a = p.h + (Math.PI / 2) * (Math.cos(p.h) < 0 ? -1 : 1) + (Math.random() - 0.5) * 0.5;
    var sp = 50 + Math.random() * 60;
    s.parts.push({
      x: p.x + Math.cos(p.h) * 5, y: p.y + Math.sin(p.h) * 5,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.5 + Math.random() * 0.3, max: 0.9,
      r: cat === 'shotgun' ? 1.6 : 1.0,
      col: cat === 'shotgun' ? '#b4342c' : '#c8a24a',
      glow: false
    });
  }

  // Where the barrel ends, in world units from the character's centre.
  function v0(cat) {
    var list = ROSTER[cat];
    if (!list) return 8;
    return list[pick[cat] % list.length].L || 8;
  }

  // ------------------------------------------------------------------- HUD
  var hud = null, hudT = 0;
  function buildHud() {
    if (hud) return hud;
    hud = document.createElement('div');
    hud.style.cssText =
      'position:fixed;left:50%;bottom:86px;transform:translateX(-50%);z-index:9000;' +
      'display:none;align-items:center;gap:12px;padding:10px 18px 10px 14px;' +
      'background:rgba(8,11,18,0.88);border:1px solid rgba(120,140,170,0.35);' +
      'border-radius:10px;backdrop-filter:blur(6px);pointer-events:none;' +
      'font-family:Inter,system-ui,sans-serif;color:#e8eaf0;' +
      'box-shadow:0 10px 30px rgba(0,0,0,0.45);transition:opacity .35s ease;';
    hud.innerHTML =
      '<canvas id="hdWepArt" width="176" height="56" style="width:88px;height:28px"></canvas>' +
      '<div><div id="hdWepName" style="font-weight:800;font-size:13px;letter-spacing:.5px"></div>' +
      '<div id="hdWepSub" style="font-size:11px;color:#8fa0b8;margin-top:2px"></div></div>' +
      '<div id="hdWepDots" style="display:flex;gap:4px;margin-left:4px"></div>';
    document.body.appendChild(hud);
    return hud;
  }

  function showHud() {
    var g = hd();
    if (!g) return;
    buildHud();
    var cat = g.S.player.weapon;
    var list = ROSTER[cat] || ROSTER.pistol;
    var idx = pick[cat] % list.length;
    var v = list[idx];
    var ammo = g.S.player.ammo[cat] || 0;

    var cv = document.getElementById('hdWepArt');
    var c = cv.getContext('2d');
    c.clearRect(0, 0, cv.width, cv.height);
    var art = v.slug ? sprite(v.slug) : (v.icon ? icon(v.icon) : null);
    if (art) {
      var k = Math.min(cv.width / art.naturalWidth, cv.height / art.naturalHeight);
      var w = art.naturalWidth * k, h = art.naturalHeight * k;
      c.drawImage(art, (cv.width - w) / 2, (cv.height - h) / 2, w, h);
    }
    document.getElementById('hdWepName').textContent = v.name;
    document.getElementById('hdWepSub').textContent =
      (ammo > 0 ? ammo + ' rounds' : 'no ammo') +
      (list.length > 1 ? ' \u00b7 press ' + (KEYS.indexOf(cat) + 1) + ' again for the next' : '');
    var dots = document.getElementById('hdWepDots');
    dots.innerHTML = '';
    if (list.length > 1) {
      for (var i = 0; i < list.length; i++) {
        var d = document.createElement('span');
        d.style.cssText = 'width:5px;height:5px;border-radius:50%;background:' +
          (i === idx ? '#fde047' : 'rgba(170,185,205,0.3)');
        dots.appendChild(d);
      }
    }
    hud.style.display = 'flex';
    hud.style.opacity = '1';
    hudT = Date.now();
    setTimeout(tickHud, 3000);
  }

  function tickHud() {
    if (!hud || Date.now() - hudT < 2900) return;
    hud.style.opacity = '0';
    setTimeout(function () { if (hud && hud.style.opacity === '0') hud.style.display = 'none'; }, 400);
  }

  // ------------------------------------------------------------------ keys
  // Taken on the capture phase so the bundle's own 1-7 handler never sees
  // them: it would select by index into a list that no longer matches.
  function onKey(ev) {
    var g = hd();
    if (!g) return;
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (window.__hdBuildState && window.__hdBuildState.on) return;
    var tag = ev.target && ev.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    var n = '123456789'.indexOf(ev.key);
    if (n < 0) return;
    var cat = KEYS[n];
    var p = g.S.player;
    if (p.weapon === cat) pick[cat] = (pick[cat] + 1) % ROSTER[cat].length;
    p.weapon = cat;
    apply(cat);
    showHud();
    click();
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }
  window.addEventListener('keydown', onKey, true);

  // --------------------------------------------------------------- startup
  // `__helmsdeep` only exists once the game has booted, so the slot that does
  // not ship with the bundle is introduced on the first frame it is there.
  var wired = false;
  (function wire() {
    var g = hd();
    if (g && !wired) {
      wired = true;
      if (!g.WEAPONS.dmr) g.WEAPONS.dmr = DMR_BASE;
      if (g.WEAPON_ORDER.indexOf('dmr') < 0) g.WEAPON_ORDER.push('dmr');
      if (!g.FULL_AMMO.dmr) g.FULL_AMMO.dmr = 60;
      Object.keys(ROSTER).forEach(apply);
    }
    requestAnimationFrame(wire);
  })();
})();
