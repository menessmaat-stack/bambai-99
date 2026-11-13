/* City builder.
 *
 * The baked OSM geometry gives footprints but no sense of what a block is: it
 * cannot tell a gated society from a chawl, so the renderer has to guess, and
 * guesses put a shanty next to a tower. This lets a human correct the city
 * directly - move, resize, rotate, re-skin or delete what the generator made,
 * and drop new art anywhere - then ship the result as a JSON patch anyone can
 * import, so a neighbourhood is corrected collaboratively rather than guessed
 * again.
 *
 * Two stores, both in localStorage:
 *   overrides - edits to generated footprints, keyed by footprint centroid
 *   items     - buildings placed by hand that OSM never had
 */
(function () {
  'use strict';

  var K_ITEMS = 'helmsdeep.build.v1';
  var K_OVER = 'helmsdeep.overrides.v1';
  var K_HIST = 'helmsdeep.build.history.v1';
  var K_REV = 'helmsdeep.build.rev';
  var K_WHO = 'helmsdeep.build.author';
  var HIST_MAX = 5;                      // admin can roll back this far
  var M = 6.6667;                        // world units per metre

  var state = {
    on: false,
    items: [],
    brush: null,
    snap: false,
    tool: null,        // 'park' while the parking bay tool is armed
    sel: null,         // {kind:'item', i} | {kind:'gen', key}
    multi: [],         // marquee selection, same shape as `sel`
    marquee: null,     // {x0,y0,x1,y1} in world units while dragging
    drag: null,        // {mode:'move'|'resize'|'rotate'|'lay', ...}
    cam: null,         // free camera while editing; null hands it back
    rev: 0             // counts up on every edit; the server keeps the highest
  };

  // 15 degrees, so a road run comes out straight instead of a degree off.
  var LAY_SNAP = Math.PI / 12;

  var PAN_STEP = 320;                    // ~48 m per arrow tap

  // Who is editing. Falls back to the signed-in game account, then to a
  // stable per-browser id, so an exported patch always carries an author.
  function author() {
    var who = null;
    try { who = localStorage.getItem(K_WHO); } catch (e) { /* private mode */ }
    if (who) return who;
    try {
      var auth = JSON.parse(localStorage.getItem('helmsdeep.auth') || 'null');
      if (auth && auth.id) who = auth.id;
    } catch (e) { /* ignore */ }
    if (!who) who = 'guest-' + Math.random().toString(36).slice(2, 7);
    try { localStorage.setItem(K_WHO, who); } catch (e) { /* ignore */ }
    return who;
  }

  function history() {
    try { return JSON.parse(localStorage.getItem(K_HIST)) || []; } catch (e) { return []; }
  }

  // One snapshot per edit, newest first, capped at five. Snapshots are whole
  // states rather than diffs: the data is small and a restore must never
  // depend on replaying every edit that came before it.
  function snapshot(note, who) {
    var h = history();
    h.unshift({
      ts: Date.now(),
      by: who || author(),
      note: note || 'edit',
      items: JSON.parse(JSON.stringify(state.items)),
      overrides: JSON.parse(JSON.stringify(window.__hdOverrides || {}))
    });
    if (h.length > HIST_MAX) h.length = HIST_MAX;
    try { localStorage.setItem(K_HIST, JSON.stringify(h)); } catch (e) { /* quota */ }
    renderHistory();
  }

  function ago(ts) {
    var d = Math.max(0, Date.now() - ts) / 1000;
    if (d < 60) return Math.round(d) + 's ago';
    if (d < 3600) return Math.round(d / 60) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  }

  // ------------------------------------------------------- never lose work
  //
  // Two ways an afternoon of placements used to vanish, both fixed here.
  //
  // 1. localStorage is keyed by origin, and every Vercel deployment gets its
  //    own hostname. Opening the game from a fresh deployment link showed an
  //    empty city. Edits now belong to the signed-in player id on the server
  //    (`/api/build`) and the local copy is only a cache.
  // 2. A failed write was swallowed. If the five-deep history filled the
  //    quota, `saveItems` threw, the catch ignored it, and the next reload
  //    read whatever was last written successfully. Writes now retry after
  //    dropping the history, and say so if they still cannot land.
  function readKey(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }

  var lastSaveError = '';

  function writeKey(key, value) {
    var text = JSON.stringify(value);
    try {
      localStorage.setItem(key, text);
      lastSaveError = '';
      return true;
    } catch (e) {
      // Out of room: the revision history is the expendable part.
      try { localStorage.removeItem(K_HIST); } catch (e2) { /* ignore */ }
      try {
        localStorage.setItem(key, text);
        lastSaveError = '';
        return true;
      } catch (e3) {
        lastSaveError = 'browser storage is full \u2014 kept on the server only';
        return false;
      }
    }
  }

  function load() {
    state.items = readKey(K_ITEMS, null) || [];
    window.__hdOverrides = readKey(K_OVER, null) || {};
    state.rev = readKey(K_REV, 0) || 0;
    // A half-written local store is still recoverable: the newest snapshot
    // holds a whole state, so take it rather than start from nothing.
    if (!state.items.length && !Object.keys(window.__hdOverrides).length) {
      var h = history();
      if (h.length && (h[0].items || h[0].overrides)) {
        state.items = h[0].items || [];
        window.__hdOverrides = h[0].overrides || {};
      }
    }
  }
  function saveItems() { writeKey(K_ITEMS, state.items); push(); }
  function saveOver() { writeKey(K_OVER, window.__hdOverrides); push(); }

  // The server copy. `rev` only ever counts up, and the server refuses a
  // write that is behind what it holds, so a tab left open overnight cannot
  // overwrite a later session - it is told to pull instead.
  var syncState = 'local', pushT = 0, pulling = false;

  function token() {
    var auth = readKey('helmsdeep.auth', null);
    return auth && auth.token ? auth.token : null;
  }

  function setSync(s) { syncState = s; renderSync(); }

  function push(now) {
    var tk = token();
    if (!tk) { setSync('local'); return; }
    state.rev = (state.rev || 0) + 1;
    writeKey(K_REV, state.rev);
    clearTimeout(pushT);
    var body = JSON.stringify({ token: tk, rev: state.rev,
                                items: state.items, overrides: window.__hdOverrides });
    if (now) {                                   // on the way out
      try { navigator.sendBeacon('/api/build', new Blob([body], { type: 'application/json' })); }
      catch (e) { /* nothing more we can do */ }
      return;
    }
    setSync('saving');
    // Debounced: a drag commits on release, but a rapid series of them is one
    // write rather than twenty.
    pushT = setTimeout(function () {
      fetch('/api/build', { method: 'POST', headers: { 'content-type': 'application/json' },
                            body: body, keepalive: true })
        .then(function (r) {
          if (r.status === 409) { pull(true); return; }
          setSync(r.ok ? 'saved' : 'offline');
        })
        .catch(function () { setSync('offline'); });
    }, 1200);
  }

  // Takes the server copy when it is ahead. Called once at startup and again
  // if a write comes back stale.
  function pull(force) {
    var tk = token();
    if (!tk || pulling) return;
    pulling = true;
    fetch('/api/build?token=' + encodeURIComponent(tk), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        pulling = false;
        if (!d) { setSync('offline'); return; }
        var theirs = Number(d.rev) || 0;
        if (!force && theirs <= (state.rev || 0)) {
          // Local is the same or newer. If the server has never seen it, send it.
          if (theirs < (state.rev || 0)) push();
          else setSync('saved');
          return;
        }
        state.items = Array.isArray(d.items) ? d.items : [];
        window.__hdOverrides = d.overrides && typeof d.overrides === 'object' ? d.overrides : {};
        state.rev = theirs;
        writeKey(K_ITEMS, state.items);
        writeKey(K_OVER, window.__hdOverrides);
        writeKey(K_REV, state.rev);
        setSync('saved');
        if (el.panel && state.on) { renderHistory(); }
      })
      .catch(function () { pulling = false; setSync('offline'); });
  }

  function renderSync() {
    if (!el.sync) return;
    var n = state.items.length + Object.keys(window.__hdOverrides || {}).length;
    var text = { saving: 'saving\u2026', saved: 'saved to your account',
                 offline: 'offline \u2014 kept on this browser',
                 local: 'not signed in \u2014 kept on this browser' }[syncState];
    el.sync.textContent = n + ' edit' + (n === 1 ? '' : 's') + ' \u00b7 ' + text +
                          (lastSaveError ? ' \u00b7 ' + lastSaveError : '');
    el.sync.style.color = syncState === 'saved' ? '#7fd49a'
                        : syncState === 'saving' ? '#8fa0b8' : '#e0a33a';
  }

  window.addEventListener('pagehide', function () {
    if (pushT) { clearTimeout(pushT); push(true); }
  });

  // The renderer publishes its world transform every frame. Inverting it is
  // the only exact way to turn a click into world units: zoom, DPR, camera
  // lerp and screen shake are all folded into that matrix.
  function screenToWorld(px, py) {
    var t = window.__hdViewTf;
    if (!t) return null;
    var det = t.a * t.d - t.b * t.c;
    if (!det) return null;
    var x = px - t.e, y = py - t.f;
    return { x: (x * t.d - y * t.c) / det, y: (y * t.a - x * t.b) / det };
  }
  function zoom() { return window.__hdViewTf ? window.__hdViewTf.a : 1; }

  function over(key) {
    var o = window.__hdOverrides[key];
    if (!o) o = window.__hdOverrides[key] = {};
    return o;
  }

  // ------------------------------------------------------------ selection
  // Boxes are returned in world units with a rotation, covering both stores so
  // the rest of the editor does not care which one a thing came from.
  function boxes() {
    var out = [];
    var gen = window.__hdVisible || [];
    for (var i = 0; i < gen.length; i++) {
      out.push({ kind: 'gen', key: gen[i].key, x: gen[i].x, y: gen[i].y,
                 w: gen[i].w, h: gen[i].h, rot: gen[i].rot || 0 });
    }
    for (var j = 0; j < state.items.length; j++) {
      var it = state.items[j];
      out.push({ kind: 'item', i: j, x: it.x, y: it.y, w: it.w, h: it.h, rot: it.rot || 0 });
    }
    return out;
  }

  function boxFor(ref) {
    if (!ref) return null;
    var all = boxes();
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      if (ref.kind === 'item' && b.kind === 'item' && b.i === ref.i) return b;
      if (ref.kind === 'gen' && b.kind === 'gen' && b.key === ref.key) return b;
    }
    return null;
  }

  function selBox() {
    if (!state.sel) return null;
    var all = boxes();
    for (var i = 0; i < all.length; i++) {
      var b = all[i];
      if (state.sel.kind === 'item' && b.kind === 'item' && b.i === state.sel.i) return b;
      if (state.sel.kind === 'gen' && b.kind === 'gen' && b.key === state.sel.key) return b;
    }
    return null;
  }

  function local(b, wx, wy) {
    var dx = wx - b.x, dy = wy - b.y;
    var c = Math.cos(-b.rot), s = Math.sin(-b.rot);
    return { x: dx * c - dy * s, y: dx * s + dy * c };
  }

  function pick(wx, wy) {
    var all = boxes(), best = null, bestArea = Infinity;
    for (var i = 0; i < all.length; i++) {
      var b = all[i], p = local(b, wx, wy);
      if (Math.abs(p.x) > b.w / 2 || Math.abs(p.y) > b.h / 2) continue;
      var a = b.w * b.h;
      if (a < bestArea) { bestArea = a; best = b; }   // smallest hit wins
    }
    return best;
  }

  // Handle hit test in screen pixels so grabbing stays the same size at any
  // zoom: corner = resize, nub above the top edge = rotate.
  function handleAt(b, wx, wy) {
    var z = zoom(), tol = 11 / z;
    var p = local(b, wx, wy);
    if (Math.abs(p.x - b.w / 2) < tol && Math.abs(p.y - b.h / 2) < tol) return 'resize';
    if (Math.abs(p.x) < tol && Math.abs(p.y + b.h / 2 + 18 / z) < tol * 1.4) return 'rotate';
    return null;
  }

  // Faint orange over everything you have changed, so a glance at the map
  // tells you which blocks have been corrected and which are still whatever
  // the generator guessed. Two layers: the block wash and the item box.
  var WORK_CELL = 1400;                  // ~210 m, about a Mumbai block

  function drawWorked(ctx, camX, camY, viewW, viewH, z) {
    var cells = {}, spots = [], k, parts, ov = window.__hdOverrides || {};
    for (k in ov) {
      if (!Object.prototype.hasOwnProperty.call(ov, k)) continue;
      parts = k.split(':');
      var x = +parts[0], y = +parts[1];
      if (!isFinite(x) || !isFinite(y)) continue;
      spots.push([x, y, 70]);
      cells[Math.floor(x / WORK_CELL) + ',' + Math.floor(y / WORK_CELL)] = 1;
    }
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      spots.push([it.x, it.y, (it.w > it.h ? it.w : it.h) * 0.6]);
      cells[Math.floor(it.x / WORK_CELL) + ',' + Math.floor(it.y / WORK_CELL)] = 1;
    }
    if (!spots.length) return;

    var halfW = viewW / 2 + WORK_CELL, halfH = viewH / 2 + WORK_CELL;
    ctx.save();
    ctx.fillStyle = 'rgba(255,146,38,0.10)';
    for (k in cells) {
      if (!Object.prototype.hasOwnProperty.call(cells, k)) continue;
      parts = k.split(',');
      var cx = +parts[0] * WORK_CELL, cy = +parts[1] * WORK_CELL;
      if (Math.abs(cx + WORK_CELL / 2 - camX) > halfW) continue;
      if (Math.abs(cy + WORK_CELL / 2 - camY) > halfH) continue;
      ctx.fillRect(cx, cy, WORK_CELL, WORK_CELL);
    }
    ctx.fillStyle = 'rgba(255,146,38,0.20)';
    ctx.strokeStyle = 'rgba(255,146,38,0.55)';
    ctx.lineWidth = 1.2 / z;
    for (var s = 0; s < spots.length; s++) {
      var p = spots[s], r = p[2];
      if (Math.abs(p[0] - camX) > viewW / 2 + r) continue;
      if (Math.abs(p[1] - camY) > viewH / 2 + r) continue;
      ctx.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
      ctx.strokeRect(p[0] - r, p[1] - r, r * 2, r * 2);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------- ground pass
  //
  // Roads, painted ground, parking bays and road decals are items like any
  // other - same box, so selecting, moving, rotating, resizing, deleting and
  // the undo history all work on them unchanged - but they are painted in a
  // different pass. The building layer runs after this one, so a house
  // standing on a road stays on top of it, which is the way round a city
  // works.
  //
  // A road is one straight run: `w` is its length, `h` its width, `rot` its
  // bearing.
  function isGround(it) {
    return it.kind === 'road' || it.kind === 'ground' ||
           it.kind === 'park' || it.kind === 'decal' || it.kind === 'terrain';
  }

  var TOOL_HINT = {
    road: 'drag a run \u2014 15\u00b0 steps, Alt for free',
    park: 'drag out a bay \u2014 one slot per 9 m',
    'ground:grass': 'drag a rectangle of grass',
    'ground:forest': 'drag a rectangle of woodland',
    'ground:sand': 'drag a rectangle of sand',
    'ground:dirt': 'drag a rectangle of bare earth',
    'ground:gravel': 'drag a rectangle of gravel',
    'ground:water': 'drag a rectangle of water'
  };

  // Which palette tab a slug came from, and how brightly that kind of
  // building burns after dark. A warehouse is not a block of flats.
  var dirCache = null;
  function dirOf(slug) {
    if (!dirCache) {
      dirCache = {};
      var cat = window.__hdCatalog || {};
      Object.keys(cat).forEach(function (d) {
        cat[d].forEach(function (s) { dirCache[s] = d; });
      });
    }
    return dirCache[slug];
  }
  var LIT = { houses: 1, homes: 1.1, flats: 1.3, slums: 0.55, chains: 1.2, stalls: 0.9,
              buildings: 1.2, transit: 0.7 };

  // A car is about 50 units long, so a bay slot is 62 with room to open a
  // door. One slot minimum, however short the bay is drawn.
  var SLOT = 62;
  function bays(it) { return Math.max(1, Math.round(it.w / SLOT)); }

  // A laid road is the engine's road, not a photograph of one.
  //
  // The first attempt repeated a square tile from the asset sheet along the
  // run. At a road's width that is one tile every 13 m, and the sheet's own
  // kerbs and crack lines repeat with it: the result read as a striped ribbon
  // laid over the city rather than a street in it, and a terrain run was the
  // same banding in green. So a run is drawn the way `Ii` draws every other
  // road - kerb, casing, carriageway, centre line, in the palette the rest of
  // the map is using - and a ground patch is a single tile you place and
  // size, never a repeat.
  var DAY = { road: '#454950', kerb: '#7e7b73', casing: '#23262a',
              mark: 'rgba(238,238,230,0.8)' };
  var NIGHT = { road: '#2a2d32', kerb: '#43423d', casing: '#111317',
                mark: 'rgba(226,226,214,0.55)' };

  function drawRoad(ctx, it, night) {
    var c = night ? NIGHT : DAY;
    var half = it.w / 2, w = it.h;
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot || 0);
    ctx.lineCap = 'round';                 // so two runs meeting do not notch
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half, 0);
    // Pavement, then the dark edge under it, then the carriageway.
    ctx.strokeStyle = c.kerb; ctx.lineWidth = w + 20; ctx.stroke();
    ctx.strokeStyle = c.casing; ctx.lineWidth = w + 3; ctx.stroke();
    ctx.strokeStyle = c.road; ctx.lineWidth = w; ctx.stroke();
    // Centre line, at the engine's 3 m dash on a 6 m gap.
    if (w >= 46) {
      ctx.strokeStyle = c.mark;
      ctx.lineWidth = Math.max(1, w * 0.022);
      ctx.setLineDash([20, 40]);
      ctx.beginPath();
      ctx.moveTo(-half + 10, 0);
      ctx.lineTo(half - 10, 0);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawPatch(ctx, it, night) {
    var img = window.__hdGetBuildingSprite && window.__hdGetBuildingSprite(it.slug);
    if (!img) return;
    var src = night && window.__hdNightSprite ? window.__hdNightSprite(img) : img;
    ctx.save();
    ctx.translate(it.x, it.y);
    if (it.rot) ctx.rotate(it.rot);
    ctx.drawImage(src, -it.w / 2, -it.h / 2, it.w, it.h);
    ctx.restore();
  }

  // Painted ground, in the exact colours `qi` fills a park, a beach or the
  // sea with, so a patch you lay is indistinguishable from one OSM supplied.
  // Grass and forest get the same scattered vegetation the generator puts on
  // a real park, which is what stops a patch reading as a flat green sticker.
  var GROUND = {
    grass:  { day: '#55914a', night: '#243f26', edge: 'rgba(20,36,18,0.35)', plants: 1 },
    forest: { day: '#44793c', night: '#1d3522', edge: 'rgba(16,30,14,0.4)', plants: 1 },
    sand:   { day: '#ebd79b', night: '#7a6e4d', edge: 'rgba(196,172,118,0.85)' },
    dirt:   { day: '#6d6150', night: '#2f2a22', edge: 'rgba(40,34,26,0.45)' },
    gravel: { day: '#8a8274', night: '#3b382f', edge: 'rgba(48,44,38,0.45)' },
    water:  { day: '#17658a', night: '#0d3448', edge: 'rgba(224,210,164,0.55)' }
  };
  var GROUND_ORDER = ['grass', 'forest', 'sand', 'dirt', 'gravel', 'water'];

  // `__hdPlants` caches its scatter on the object it is given, and items are
  // serialised to storage, so the scratch copy lives beside the item instead
  // of on it.
  var plantCache = new WeakMap();
  function plantArea(it) {
    var a = plantCache.get(it);
    var hw = it.w / 2, hh = it.h / 2;
    if (!a || a.w !== it.w || a.h !== it.h || a.x !== it.x || a.y !== it.y) {
      a = { w: it.w, h: it.h, x: it.x, y: it.y,
            pts: [it.x - hw, it.y - hh, it.x + hw, it.y - hh,
                  it.x + hw, it.y + hh, it.x - hw, it.y + hh] };
      plantCache.set(it, a);
    }
    return a;
  }

  function drawGround(ctx, it, night, inv) {
    var g = GROUND[it.type] || GROUND.grass;
    ctx.save();
    ctx.translate(it.x, it.y);
    if (it.rot) ctx.rotate(it.rot);
    ctx.fillStyle = night ? g.night : g.day;
    ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
    ctx.strokeStyle = g.edge;
    ctx.lineWidth = Math.max(1, inv);
    ctx.strokeRect(-it.w / 2, -it.h / 2, it.w, it.h);
    ctx.restore();
    if (g.plants && window.__hdPlants && !it.rot) {
      window.__hdPlants(ctx, plantArea(it), 1 / (inv || 1));
    }
  }

  function drawBay(ctx, it, night) {
    var n = bays(it);
    ctx.save();
    ctx.translate(it.x, it.y);
    ctx.rotate(it.rot || 0);
    ctx.fillStyle = night ? '#1d2024' : '#3a3d42';
    ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h);
    ctx.strokeStyle = night ? 'rgba(226,226,214,0.45)' : 'rgba(238,238,230,0.8)';
    ctx.lineWidth = Math.max(1.2, it.h * 0.03);
    ctx.strokeRect(-it.w / 2, -it.h / 2, it.w, it.h);
    ctx.beginPath();
    for (var i = 1; i < n; i++) {
      var x = -it.w / 2 + (it.w / n) * i;
      ctx.moveTo(x, -it.h / 2);
      ctx.lineTo(x, it.h / 2);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Painted ground first, then roads over it, then the decals and bays on
  // the road: the same order the map itself is built in.
  var LAYER = { ground: 0, road: 1, park: 2, decal: 3 };

  window.__hdGround = function (ctx, camX, camY, viewW, viewH, night) {
    var inv = viewW > 0 ? viewW / ctx.canvas.width : 1;
    var draw = [];
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      if (!isGround(it)) continue;
      var r = (it.w > it.h ? it.w : it.h) * 0.6 + 40;
      if (Math.abs(it.x - camX) > viewW / 2 + r) continue;
      if (Math.abs(it.y - camY) > viewH / 2 + r) continue;
      draw.push(it);
    }
    draw.sort(function (a, b) { return (LAYER[a.kind] || 0) - (LAYER[b.kind] || 0); });
    for (i = 0; i < draw.length; i++) {
      var d = draw[i];
      if (d.kind === 'ground') drawGround(ctx, d, night, inv);
      else if (d.kind === 'road') drawRoad(ctx, d, night);
      else if (d.kind === 'park') drawBay(ctx, d, night);
      else drawPatch(ctx, d, night);
    }
  };

  // ---------------------------------------------------------------- render
  window.__hdDrawBuild = function (ctx, camX, camY, viewW, viewH, night) {
    var i, it, img;
    for (i = 0; i < state.items.length; i++) {
      it = state.items[i];
      if (isGround(it)) continue;                 // painted under the buildings
      var r = it.w > it.h ? it.w : it.h;
      if (Math.abs(it.x - camX) > viewW / 2 + r) continue;
      if (Math.abs(it.y - camY) > viewH / 2 + r) continue;
      img = window.__hdGetBuildingSprite && window.__hdGetBuildingSprite(it.slug);
      if (!img) continue;
      var kx = it.w / img.naturalWidth, ky = it.h / img.naturalHeight;
      var k = kx > ky ? kx : ky;
      var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      ctx.save();
      ctx.translate(it.x, it.y);
      if (it.rot) ctx.rotate(it.rot);
      ctx.drawImage(night && window.__hdNightSprite ? window.__hdNightSprite(img) : img,
                    -dw / 2, -dh / 2, dw, dh);
      // A hand-placed house was the only dark one on the street: the
      // generator lights its own and this pass never did.
      if (night && window.__hdNightLights && LIT[dirOf(it.slug)]) {
        window.__hdNightLights(ctx, 0, 0, dw, dh, (it.x | 0) * 31 + (it.y | 0),
                               LIT[dirOf(it.slug)]);
      }
      ctx.restore();
    }
    if (!state.on) return;

    var z = zoom();

    // Where you have already worked. Edits are sparse, so this walks the two
    // stores directly rather than the visible list: a faint orange wash over
    // the ~200 m block that holds them, and a tighter box on each thing you
    // touched. Painted under the selection chrome so cyan still reads.
    drawWorked(ctx, camX, camY, viewW, viewH, z);

    if (state.multi.length) {
      ctx.save();
      ctx.strokeStyle = '#4adeff';
      ctx.lineWidth = 1.5 / z;
      for (var mi = 0; mi < state.multi.length; mi++) {
        var mb = boxFor(state.multi[mi]);
        if (!mb) continue;
        ctx.save();
        ctx.translate(mb.x, mb.y);
        ctx.rotate(mb.rot);
        ctx.strokeRect(-mb.w / 2, -mb.h / 2, mb.w, mb.h);
        ctx.restore();
      }
      ctx.restore();
    }

    if (state.marquee) {
      var m = state.marquee;
      ctx.save();
      ctx.strokeStyle = '#4adeff';
      ctx.fillStyle = 'rgba(74,222,255,0.10)';
      ctx.lineWidth = 1.5 / z;
      ctx.setLineDash([7 / z, 5 / z]);
      var rx = Math.min(m.x0, m.x1), ry = Math.min(m.y0, m.y1);
      ctx.fillRect(rx, ry, Math.abs(m.x1 - m.x0), Math.abs(m.y1 - m.y0));
      ctx.strokeRect(rx, ry, Math.abs(m.x1 - m.x0), Math.abs(m.y1 - m.y0));
      ctx.restore();
    }

    var b = selBox();
    if (!b) return;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    ctx.strokeStyle = '#4adeff';
    ctx.lineWidth = 2 / z;
    ctx.setLineDash([6 / z, 4 / z]);
    ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
    ctx.setLineDash([]);
    var hs = 9 / z;
    ctx.fillStyle = '#4adeff';
    ctx.fillRect(b.w / 2 - hs / 2, b.h / 2 - hs / 2, hs, hs);          // resize grip
    ctx.beginPath();
    ctx.moveTo(0, -b.h / 2);
    ctx.lineTo(0, -b.h / 2 - 18 / z);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -b.h / 2 - 18 / z, hs * 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#fde047';
    ctx.fill();                                                        // rotate grip
    ctx.restore();
  };

  // ------------------------------------------------------------------ panel
  var el = {}, activeDir = null;

  function mkBtn(label, fn) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'flex:1;min-width:76px;background:#162030;border:1px solid #2b3a4d;' +
      'color:#c9d4e2;padding:6px 8px;border-radius:5px;cursor:pointer;' +
      'font:600 11px Inter,system-ui,sans-serif';
    b.onclick = fn;
    return b;
  }
  function status(m) { if (el.status) el.status.textContent = m; }

  function buildPanel() {
    if (el.panel) return;
    var w = document.createElement('div');
    w.id = 'hd-build';
    w.style.cssText = 'position:fixed;right:12px;top:52px;width:312px;' +
      'max-height:calc(100vh - 70px);overflow:auto;z-index:60;' +
      'background:rgba(10,14,20,0.96);border:1px solid #27313d;border-radius:10px;' +
      'padding:10px;font:12px/1.45 Inter,system-ui,sans-serif;color:#c9d4e2;display:none';

    var head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;gap:8px;margin-bottom:8px';
    head.innerHTML = '<strong style="color:#4adeff;letter-spacing:.06em">BUILD MODE</strong>';
    var x = document.createElement('button');
    x.textContent = '\u00d7';
    x.style.cssText = 'margin-left:auto;background:none;border:0;color:#7c8aa0;font-size:18px;cursor:pointer';
    x.onclick = function () { toggle(false); };
    head.appendChild(x);
    w.appendChild(head);

    var help = document.createElement('div');
    help.style.cssText = 'color:#7c8aa0;font-size:11px;margin-bottom:8px';
    help.innerHTML =
      '<b>Scroll</b> to move the map \u00b7 right-drag or arrows do the same<br>' +
      '<b>Click any building</b> \u2014 generated ones too \u2014 to select.<br>' +
      'Drag body to move \u00b7 drag <span style="color:#4adeff">\u25a0</span> corner to resize \u00b7 ' +
      'drag <span style="color:#fde047">\u25cf</span> nub to rotate.<br>' +
      '<b>Road</b> then drag a run \u2014 the bearing snaps to 15\u00b0 so it comes out ' +
      'straight, Alt for a free angle. It is drawn as the city\u2019s own road.<br>' +
      '<b>Grass / sand / dirt / water</b> then drag a rectangle to paint ground.<br>' +
      '<b>Parking</b> then drag: cars park in those bays and nowhere else.<br>' +
      'The <b>roads</b> tab holds potholes, grates and the rest \u2014 click to drop one.<br>' +
      '<b>D</b> or <b>Alt+drag</b> duplicate (keeps angle + size)<br>' +
      '<b>Drag empty ground</b> to marquee-select a group, then D / drag / Del<br>' +
      '<b>Del</b> delete \u00b7 <b>Esc</b> deselect \u00b7 <b>G</b> snap \u00b7 <b>Shift+B</b> close';
    w.appendChild(help);

    var toolRow = document.createElement('div');
    toolRow.style.cssText = 'display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap';
    el.tools = {};
    function armTool(name, label) {
      var b = mkBtn(label, function () {
        state.tool = state.tool === name ? null : name;
        if (state.tool) { state.brush = null; renderGrid(); }
        paintTool();
        status(state.tool ? TOOL_HINT[state.tool] || 'drag it out' : 'ready');
      });
      b.style.flex = '0 0 auto';
      b.style.minWidth = '0';
      b.style.padding = '5px 9px';
      el.tools[name] = b;
      toolRow.appendChild(b);
    }
    armTool('road', '\u2550 Road');
    GROUND_ORDER.forEach(function (g) { armTool('ground:' + g, g); });
    armTool('park', '\u25a4 Parking');
    w.appendChild(toolRow);

    el.sync = document.createElement('div');
    el.sync.style.cssText = 'font-size:11px;margin-bottom:6px;min-height:14px';
    w.appendChild(el.sync);
    renderSync();

    el.status = document.createElement('div');
    el.status.style.cssText = 'font-size:11px;color:#4adeff;margin-bottom:8px;min-height:15px';
    w.appendChild(el.status);

    el.tabs = document.createElement('div');
    el.tabs.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px';
    w.appendChild(el.tabs);

    el.grid = document.createElement('div');
    el.grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px';
    w.appendChild(el.grid);

    el.hist = document.createElement('div');
    el.hist.style.cssText = 'margin-top:10px;border-top:1px solid #1d2630;padding-top:8px';
    w.appendChild(el.hist);

    var tools = document.createElement('div');
    tools.style.cssText = 'display:flex;gap:6px;margin-top:10px;flex-wrap:wrap';
    tools.appendChild(mkBtn('Duplicate', function () { duplicate(); }));
    tools.appendChild(mkBtn('Export', exportJson));
    tools.appendChild(mkBtn('Import', importJson));
    tools.appendChild(mkBtn('Reset edits', function () {
      var n = state.items.length + Object.keys(window.__hdOverrides).length;
      if (!n) return;
      if (!confirm('Discard all ' + n + ' edits?')) return;
      state.items = []; window.__hdOverrides = {}; state.sel = null;
      saveItems(); saveOver(); status('reset');
    }));
    w.appendChild(tools);

    document.body.appendChild(w);
    el.panel = w;
    renderHistory();
  }

  function renderHistory() {
    if (!el.hist) return;
    var h = history();
    el.hist.innerHTML = '';

    var who = document.createElement('div');
    who.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:11px';
    who.innerHTML = '<span style="color:#7c8aa0">editing as</span>';
    var input = document.createElement('input');
    input.value = author();
    input.style.cssText = 'flex:1;min-width:0;background:#0e141c;border:1px solid #243040;' +
      'color:#4adeff;border-radius:4px;padding:3px 6px;font:600 11px Inter,system-ui,sans-serif';
    input.onchange = function () {
      var v = (input.value || '').trim().slice(0, 24);
      if (v) { try { localStorage.setItem(K_WHO, v); } catch (e) { /* ignore */ } }
      renderHistory();
    };
    who.appendChild(input);
    el.hist.appendChild(who);

    var head = document.createElement('div');
    head.style.cssText = 'color:#7c8aa0;font-size:11px;margin-bottom:4px';
    head.textContent = h.length ? 'Last update: ' + h[0].by + ' \u00b7 ' + ago(h[0].ts) +
                                  ' \u00b7 ' + h[0].note
                                : 'No edits yet';
    el.hist.appendChild(head);

    h.forEach(function (rev, i) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:10px;' +
        'color:#9aa7b8;padding:2px 0';
      var label = document.createElement('span');
      label.style.cssText = 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      label.textContent = (i === 0 ? '\u25cf ' : '\u25cb ') + rev.by + ' \u00b7 ' +
                          rev.note + ' \u00b7 ' + ago(rev.ts);
      var btn = document.createElement('button');
      btn.textContent = 'Restore';
      btn.style.cssText = 'background:#162030;border:1px solid #2b3a4d;color:#c9d4e2;' +
        'border-radius:4px;padding:2px 6px;cursor:pointer;font-size:10px';
      btn.onclick = function () {
        if (!confirm('Restore the city to ' + rev.by + '\u2019s version from ' + ago(rev.ts) + '?')) return;
        // Restoring is itself an edit, so the state being replaced is kept.
        snapshot('before restore');
        state.items = JSON.parse(JSON.stringify(rev.items || []));
        window.__hdOverrides = JSON.parse(JSON.stringify(rev.overrides || {}));
        state.sel = null; state.multi = [];
        saveItems(); saveOver();
        status('restored ' + rev.by + '\u2019s version');
        renderHistory();
      };
      row.appendChild(label);
      row.appendChild(btn);
      el.hist.appendChild(row);
    });
  }

  function renderTabs() {
    var cat = window.__hdCatalog;
    if (!cat) { status('sprite catalog still loading\u2026'); return; }
    var dirs = Object.keys(cat);
    if (!activeDir || !cat[activeDir]) activeDir = dirs[0];
    el.tabs.innerHTML = '';
    dirs.forEach(function (d) {
      var b = document.createElement('button');
      b.textContent = d + ' (' + cat[d].length + ')';
      b.style.cssText = 'background:' + (d === activeDir ? '#1d3346' : '#121a24') +
        ';border:1px solid ' + (d === activeDir ? '#4adeff' : '#243040') +
        ';color:#c9d4e2;padding:3px 7px;border-radius:4px;cursor:pointer;font-size:10px';
      b.onclick = function () { activeDir = d; renderTabs(); };
      el.tabs.appendChild(b);
    });
    renderGrid();
  }

  function renderGrid() {
    var cat = window.__hdCatalog || {};
    el.grid.innerHTML = '';
    (cat[activeDir] || []).forEach(function (slug) {
      var cell = document.createElement('button');
      cell.title = slug;
      var on = state.brush && state.brush.slug === slug;
      cell.style.cssText = 'background:#0e141c;border:1px solid ' + (on ? '#4adeff' : '#222c38') +
        ';border-radius:4px;padding:2px;cursor:pointer;height:60px;display:flex;' +
        'align-items:center;justify-content:center';
      var img = document.createElement('img');
      var dp = (window.__hdDirPath || {})[activeDir] || activeDir;
      img.src = '/sprites/' + dp + '/' + slug + '.png';
      img.loading = 'lazy';
      img.style.cssText = 'max-width:100%;max-height:100%';
      cell.appendChild(img);
      cell.onclick = function () {
        state.brush = state.brush && state.brush.slug === slug ? null : { dir: activeDir, slug: slug };
        if (state.brush) { state.tool = null; paintTool(); }
        renderGrid();
        // A brush with something selected re-skins it immediately; that is the
        // common case when fixing a block that drew as the wrong type.
        if (state.brush && state.sel) applyBrush();
        else status(state.brush ? 'brush: ' + slug : 'brush cleared');
      };
      el.grid.appendChild(cell);
    });
  }

  function applyBrush() {
    if (!state.brush || !state.sel) return;
    if (state.sel.kind === 'gen') {
      over(state.sel.key).slug = state.brush.slug;
      over(state.sel.key).hidden = false;
      saveOver();
    } else {
      state.items[state.sel.i].slug = state.brush.slug;
      saveItems();
    }
    status('re-skinned to ' + state.brush.slug);
  }

  function paintTool() {
    if (!el.tools) return;
    Object.keys(el.tools).forEach(function (name) {
      var b = el.tools[name], on = state.tool === name;
      b.style.background = on ? '#0e3a4a' : '#162030';
      b.style.borderColor = on ? '#4adeff' : '#2b3a4d';
      b.style.color = on ? '#9fe8ff' : '#c9d4e2';
    });
  }

  // ------------------------------------------------------------- parking
  //
  // The engine parked up to fourteen cars against whatever large footprint
  // happened to be on screen, which is how a chawl forecourt and the middle
  // of a service lane ended up full of Fortuners nobody asked for. The bays
  // you draw are the only places it may use; until you draw one it keeps a
  // far smaller stock against civic frontages, so the kerb is not bare.
  //
  // Returns true either way: the engine's own parking never runs again.
  var CIVIL = [16, 19, 20, 21, 12, 18, 2, 5, 7];   // ordinary cars and vans

  // Bays are evenly spaced, so a seed built by adding the coordinates lands
  // on the same remainder every slot and parks a row of identical red cars.
  // Mixing the bits first is what makes a row look like a street.
  function mix(x, y) {
    var h = Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663);
    h = (h ^ (h >>> 13)) >>> 0;
    return h;
  }

  function parkOne(S, x, y, h, seed) {
    for (var i = 0; i < S.cars.length; i++) {
      var c = S.cars[i];
      if (!c.dead && Math.abs(c.x - x) < 26 && Math.abs(c.y - y) < 26) return false;
    }
    var ty = CIVIL[seed % CIVIL.length];
    S.cars.push({ x: x, y: y, h: h, vx: 0, vy: 0, w: 0, steer: 0, type: ty,
                  pal: (seed >>> 4) % 6, seed: ((seed >>> 8) % 100) / 100, hp: 420,
                  player: false, ai: 'parked', speed: 0, stuck: 0, panic: 0, shootCd: 0,
                  burn: 0, dead: false, wreckT: 0, siren: 0, patrol: false,
                  rider: null, hdp: 1 });
    return true;
  }

  window.__hdParking = function (S) {
    var mine = [], i, j;
    for (i = 0; i < state.items.length; i++) {
      if (state.items[i].kind === 'park') mine.push(state.items[i]);
    }
    var p = S.player, n = 0;
    for (j = 0; j < S.cars.length; j++) if (!S.cars[j].dead && S.cars[j].hdp) n++;
    var cap = mine.length ? 18 : 5;
    if (n >= cap || S.cars.length >= 60) return true;

    if (mine.length) {
      for (i = 0; i < mine.length && n < cap; i++) {
        var it = mine[i];
        if (Math.hypot(it.x - p.x, it.y - p.y) > 2600) continue;
        var k = bays(it), c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0);
        for (j = 0; j < k && n < cap; j++) {
          var off = -it.w / 2 + (it.w / k) * (j + 0.5);
          var bx = it.x + c * off, by = it.y + s * off;
          if (Math.hypot(bx - p.x, by - p.y) < 120) continue;   // not under your feet
          // A bay is drawn along its length and the cars sit across it.
          if (parkOne(S, bx, by, (it.rot || 0) + Math.PI / 2, mix(bx, by))) n++;
        }
      }
      return true;
    }

    var vis = window.__hdVisible || [];
    for (i = 0; i < vis.length && n < cap; i++) {
      var b = vis[i];
      if (!(b.w >= 60 && b.h >= 60)) continue;
      var d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < 320 || d > 1500) continue;
      if (parkOne(S, b.x - b.w * 0.25, b.y + b.h * 0.5 + 34, Math.PI / 2,
                  mix(b.x, b.y))) n++;
    }
    return true;
  };

  function exportJson() {
    var payload = { by: author(), ts: Date.now(),
                    items: state.items, overrides: window.__hdOverrides };
    var text = JSON.stringify(payload);
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = 'bambai-build.json';
    a.click();
    URL.revokeObjectURL(a.href);
    status(state.items.length + ' placed, ' +
           Object.keys(window.__hdOverrides).length + ' edits exported');
  }

  function importJson() {
    var text = prompt('Paste a build patch (merges into what is here):');
    if (!text) return;
    try {
      var p = JSON.parse(text);
      var items = Array.isArray(p) ? p : (p.items || []);
      var ovs = Array.isArray(p) ? {} : (p.overrides || {});
      var n = 0;
      items.forEach(function (it) {
        if (typeof it.slug !== 'string' || !isFinite(it.x) || !isFinite(it.y)) return;
        state.items.push({ slug: it.slug, x: +it.x, y: +it.y,
                           w: +it.w || 200, h: +it.h || 200, rot: +it.rot || 0 });
        n++;
      });
      Object.keys(ovs).forEach(function (k) { window.__hdOverrides[k] = ovs[k]; n++; });
      saveItems(); saveOver();
      // Credit the patch author, not whoever pasted it, so the log shows who
      // actually made the change.
      var by = (!Array.isArray(p) && p.by) ? p.by : 'imported';
      snapshot('imported ' + n + ' changes', by);
      status('imported ' + n + ' changes from ' + by);
    } catch (e) { status('import failed: ' + e.message); }
  }

  // ------------------------------------------------------------------ input
  function canvas() {
    return document.querySelector('#helmsdeep-root canvas') || document.querySelector('canvas');
  }
  function worldAt(ev) {
    var cv = canvas();
    if (!cv) return null;
    var r = cv.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return null;
    return screenToWorld((ev.clientX - r.left) * (cv.width / r.width),
                         (ev.clientY - r.top) * (cv.height / r.height));
  }

  function onDown(ev) {
    if (!state.on) return;
    if (el.panel && el.panel.contains(ev.target)) return;      // palette clicks
    // Right or middle drag walks the camera. Left is already spoken for by
    // selection and the marquee, and the editor should not need the car to
    // be driven to the block being fixed.
    if (ev.button === 2 || ev.button === 1) {
      var pw = worldAt(ev);
      if (!pw) return;
      state.drag = { mode: 'pan', wx: pw.x, wy: pw.y };
      ev.preventDefault();
      ev.stopImmediatePropagation();
      status('panning');
      return;
    }
    if (ev.button !== 0) return;
    var w = worldAt(ev);
    if (!w) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();

    // A grip on the current selection beats picking something new, otherwise
    // the grips would be unusable wherever buildings overlap.
    var b = selBox();
    if (b) {
      var h = handleAt(b, w.x, w.y);
      if (h === 'resize') {
        state.drag = { mode: 'resize', w0: b.w, h0: b.h,
                       d0: Math.hypot(w.x - b.x, w.y - b.y) || 1 };
        status('resizing');
        return;
      }
      if (h === 'rotate') {
        state.drag = { mode: 'rotate', a0: Math.atan2(w.y - b.y, w.x - b.x), r0: b.rot };
        status('rotating');
        return;
      }
    }

    // Laying ground comes before picking something up: a road run starts on
    // open tarmac, and the buildings already standing there must not swallow
    // the drag.
    if (state.tool) {
      var made = null;
      if (state.tool === 'park') {
        made = { kind: 'park', x: w.x, y: w.y, w: SLOT, h: 56, rot: 0 };
      } else if (state.tool === 'road') {
        made = { kind: 'road', x: w.x, y: w.y, w: 1, h: 90, rot: 0 };
      } else if (state.tool.indexOf('ground:') === 0) {
        made = { kind: 'ground', type: state.tool.slice(7),
                 x: w.x, y: w.y, w: 1, h: 1, rot: 0 };
      }
      if (made) {
        state.items.push(made);
        state.sel = { kind: 'item', i: state.items.length - 1 };
        state.drag = { mode: made.kind === 'ground' ? 'rect' : 'lay',
                       x0: w.x, y0: w.y, i: state.sel.i, free: !!ev.altKey };
        status(TOOL_HINT[state.tool] || 'drag it out');
        return;
      }
    }

    var hitB = pick(w.x, w.y);
    if (hitB && state.multi.length) {
      var inGroup = state.multi.some(function (r) {
        return (r.kind === 'item' && hitB.kind === 'item' && r.i === hitB.i) ||
               (r.kind === 'gen' && hitB.kind === 'gen' && r.key === hitB.key);
      });
      if (inGroup) {
        state.drag = { mode: 'group', dx: 0, dy: 0, bx: w.x, by: w.y };
        status('moving ' + state.multi.length + ' buildings');
        return;
      }
      state.multi = [];
    }
    if (hitB) {
      state.sel = hitB.kind === 'item' ? { kind: 'item', i: hitB.i } : { kind: 'gen', key: hitB.key };
      if (ev.altKey) {
        duplicate(0, 0);                      // Alt-drag: grab a clone, not the original
        var nb = selBox();
        if (nb) { state.drag = { mode: 'move', dx: nb.x - w.x, dy: nb.y - w.y, bx: nb.x, by: nb.y }; }
        return;
      }
      state.drag = { mode: 'move', dx: hitB.x - w.x, dy: hitB.y - w.y, bx: hitB.x, by: hitB.y };
      // A single click selects and nothing else. Re-skinning here meant
      // every nudge of an already-placed building silently replaced it with
      // whatever was highlighted in the palette; that is now a double click.
      status('selected ' + (hitB.kind === 'gen' ? 'generated building' : 'placed building') +
             ' \u2014 ' + Math.round(hitB.w / M) + ' m' +
             (state.brush ? ' \u2014 double-click to make it ' + state.brush.slug : ''));
      return;
    }

    if (!state.brush) {
      // Empty ground with no brush starts a rubber band: drag a box over a
      // street and everything inside becomes the working group.
      state.sel = null;
      state.multi = [];
      state.marquee = { x0: w.x, y0: w.y, x1: w.x, y1: w.y };
      state.drag = { mode: 'marquee' };
      status('drag to select a group');
      return;
    }

    var img = window.__hdGetBuildingSprite(state.brush.slug);
    var ar = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    var d = state.brush.dir;
    var metres = d === 'vehicles' ? 7 : d === 'stalls' ? 6 : d === 'slums' ? 12 :
                 d === 'houses' ? 18 : d === 'chains' ? 28 : d === 'flats' ? 55 :
                 d === 'parks' ? 160 : d === 'roads' ? 13 : 70;
    var base = metres * M;
    var x = w.x, y = w.y;
    if (state.snap) { x = Math.round(x / 40) * 40; y = Math.round(y / 40) * 40; }
    // A pothole belongs on the road surface, not on top of the buildings,
    // so it goes into the ground pass with the rest of the tarmac.
    state.items.push({ kind: d === 'roads' ? 'decal' : undefined,
                       slug: state.brush.slug, x: x, y: y,
                       w: base, h: base * ar, rot: 0 });
    state.sel = { kind: 'item', i: state.items.length - 1 };
    commit('placed ' + state.brush.slug);
    status('placed ' + state.brush.slug + ' at ' + metres + ' m');
  }

  function onMove(ev) {
    if (!state.on || !state.drag) return;
    var w = worldAt(ev);
    if (!w) return;
    var d = state.drag;

    // Pan is computed before the move, because dragging the camera changes
    // the world point under the cursor: hold the grabbed point still and
    // shift the camera by the difference.
    if (d.mode === 'pan') {
      if (!state.cam) return;
      state.cam.x += d.wx - w.x;
      state.cam.y += d.wy - w.y;
      return;
    }
    if (d.mode === 'marquee') {
      state.marquee.x1 = w.x;
      state.marquee.y1 = w.y;
      return;
    }
    // A run follows the cursor from where it started. The bearing snaps to
    // 15 degrees unless Alt is down, which is what keeps a road straight
    // instead of wandering a degree per drag.
    if (d.mode === 'lay') {
      var it = state.items[d.i];
      if (!it) return;
      var vx = w.x - d.x0, vy = w.y - d.y0;
      var len = Math.hypot(vx, vy);
      var ang = Math.atan2(vy, vx);
      if (!d.free && !ev.altKey) ang = Math.round(ang / LAY_SNAP) * LAY_SNAP;
      if (len < it.h * 0.5) len = it.h * 0.5;
      it.w = len;
      it.rot = ang;
      it.x = d.x0 + Math.cos(ang) * len / 2;
      it.y = d.y0 + Math.sin(ang) * len / 2;
      status(it.kind === 'park'
        ? bays(it) + ' bay' + (bays(it) === 1 ? '' : 's')
        : Math.round(len / M) + ' m of road');
      return;
    }
    // Painted ground is a rectangle between where the drag started and where
    // the cursor is, not a run: a strip of grass is a strip, a field is a
    // field, and neither should be forced through a fixed width.
    if (d.mode === 'rect') {
      var g = state.items[d.i];
      if (!g) return;
      g.w = Math.max(16, Math.abs(w.x - d.x0));
      g.h = Math.max(16, Math.abs(w.y - d.y0));
      g.x = (d.x0 + w.x) / 2;
      g.y = (d.y0 + w.y) / 2;
      status(Math.round(g.w / M) + ' x ' + Math.round(g.h / M) + ' m of ' + g.type);
      return;
    }
    if (d.mode === 'group') {
      var gdx = w.x + d.dx - d.bx, gdy = w.y + d.dy - d.by;
      d.bx += gdx; d.by += gdy;
      for (var gi = 0; gi < state.multi.length; gi++) nudge(state.multi[gi], gdx, gdy);
      return;
    }

    var b = selBox();
    if (!b) return;

    if (d.mode === 'move') {
      var nx = w.x + d.dx, ny = w.y + d.dy;
      if (state.snap) { nx = Math.round(nx / 40) * 40; ny = Math.round(ny / 40) * 40; }
      if (state.sel.kind === 'item') {
        state.items[state.sel.i].x = nx;
        state.items[state.sel.i].y = ny;
      } else {
        var o = over(state.sel.key);
        o.dx = (o.dx || 0) + (nx - b.x);
        o.dy = (o.dy || 0) + (ny - b.y);
      }
    } else if (d.mode === 'resize') {
      var f = (Math.hypot(w.x - b.x, w.y - b.y) || 1) / d.d0;
      if (f < 0.15) f = 0.15; else if (f > 8) f = 8;
      if (state.sel.kind === 'item') {
        state.items[state.sel.i].w = d.w0 * f;
        state.items[state.sel.i].h = d.h0 * f;
      } else {
        over(state.sel.key).scale = (over(state.sel.key).baseScale || 1) * f;
      }
      status('size ' + Math.round(d.w0 * f / M) + ' m');
    } else if (d.mode === 'rotate') {
      var a = Math.atan2(w.y - b.y, w.x - b.x) - d.a0 + d.r0;
      if (ev.shiftKey) a = Math.round(a / (Math.PI / 12)) * (Math.PI / 12);
      if (state.sel.kind === 'item') state.items[state.sel.i].rot = a;
      else over(state.sel.key).rot = a;
      status('rotation ' + Math.round(a * 180 / Math.PI) + '\u00b0');
    }
  }

  function nudge(ref, dx, dy) {
    if (ref.kind === 'item') {
      state.items[ref.i].x += dx;
      state.items[ref.i].y += dy;
    } else {
      var o = over(ref.key);
      o.dx = (o.dx || 0) + dx;
      o.dy = (o.dy || 0) + dy;
    }
  }

  // Commits that deserve a revision entry. Drags fire once on release, not
  // per mouse-move, so the five slots stay meaningful.
  function commit(note) { saveItems(); saveOver(); snapshot(note); }

  function onUp() {
    if (state.drag && state.drag.mode === 'marquee') {
      var m = state.marquee;
      var x0 = Math.min(m.x0, m.x1), x1 = Math.max(m.x0, m.x1);
      var y0 = Math.min(m.y0, m.y1), y1 = Math.max(m.y0, m.y1);
      state.multi = [];
      if (x1 - x0 > 8 && y1 - y0 > 8) {
        var all = boxes();
        for (var i = 0; i < all.length; i++) {
          var b = all[i];
          if (b.x < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue;
          state.multi.push(b.kind === 'item' ? { kind: 'item', i: b.i } : { kind: 'gen', key: b.key });
        }
      }
      state.marquee = null;
      state.drag = null;
      status(state.multi.length + ' selected \u2014 D duplicates, drag moves, Del removes');
      return;
    }
    if (!state.drag) return;
    if (state.drag.mode === 'pan') { state.drag = null; status('ready'); return; }
    if (state.drag.mode === 'lay' || state.drag.mode === 'rect') {
      var laid = state.items[state.drag.i];
      state.drag = null;
      var what = !laid ? 'ground'
        : laid.kind === 'park' ? 'parking' : laid.kind === 'road' ? 'road' : laid.type;
      commit('laid ' + what);
      status(laid && laid.kind === 'park'
        ? bays(laid) + ' bay' + (bays(laid) === 1 ? '' : 's') + ' \u2014 cars park here now'
        : 'laid ' + what + ' \u2014 drag the body to move it, the corner to resize');
      return;
    }
    if (state.drag.mode === 'resize' && state.sel && state.sel.kind === 'gen') {
      var o = over(state.sel.key);
      o.baseScale = o.scale || 1;             // next drag starts from here
    }
    state.drag = null;
    commit('moved');
  }

  // Duplicate keeps the angle and size you just dialled in and drops the copy
  // one footprint to the right, so a row of matching houses is Alt-drag or a
  // few taps of D rather than re-rotating each one.
  function duplicate(offX, offY) {
    var b = selBox();
    if (!b) return;
    var slug = null;
    if (state.sel.kind === 'item') slug = state.items[state.sel.i].slug;
    else {
      var g = (window.__hdVisible || []).find(function (v) { return v.key === state.sel.key; });
      slug = (g && g.slug) || (window.__hdOverrides[state.sel.key] || {}).slug;
    }
    if (!slug) { status('this one has no art to copy \u2014 re-skin it first'); return; }
    var dx = offX === undefined ? b.w * 1.05 : offX;
    var dy = offY === undefined ? 0 : offY;
    state.items.push({ slug: slug, x: b.x + dx, y: b.y + dy,
                       w: b.w, h: b.h, rot: b.rot });
    state.sel = { kind: 'item', i: state.items.length - 1 };
    saveItems();
    status('duplicated \u2014 ' + Math.round(b.rot * 180 / Math.PI) + '\u00b0, ' +
           Math.round(b.w / M) + ' m');
  }

  // Copies the whole marquee as one block, preserving the relative layout and
  // every angle, and offsets it clear of the original along its widest axis.
  function duplicateGroup() {
    if (!state.multi.length) return;
    var bs = [];
    for (var i = 0; i < state.multi.length; i++) {
      var b = boxFor(state.multi[i]);
      if (!b) continue;
      var slug = b.kind === 'item' ? state.items[b.i].slug
                                   : ((window.__hdOverrides[b.key] || {}).slug ||
                                      ((window.__hdVisible || []).find(function (v) { return v.key === b.key; }) || {}).slug);
      if (!slug) continue;
      bs.push({ slug: slug, x: b.x, y: b.y, w: b.w, h: b.h, rot: b.rot });
    }
    if (!bs.length) { status('nothing in the group has art to copy'); return; }
    var minx = Infinity, maxx = -Infinity, miny = Infinity, maxy = -Infinity;
    bs.forEach(function (b) {
      if (b.x - b.w / 2 < minx) minx = b.x - b.w / 2;
      if (b.x + b.w / 2 > maxx) maxx = b.x + b.w / 2;
      if (b.y - b.h / 2 < miny) miny = b.y - b.h / 2;
      if (b.y + b.h / 2 > maxy) maxy = b.y + b.h / 2;
    });
    var w = maxx - minx, h = maxy - miny;
    var ox = w >= h ? w * 1.05 : 0, oy = w >= h ? 0 : h * 1.05;
    var fresh = [];
    bs.forEach(function (b) {
      state.items.push({ slug: b.slug, x: b.x + ox, y: b.y + oy, w: b.w, h: b.h, rot: b.rot });
      fresh.push({ kind: 'item', i: state.items.length - 1 });
    });
    state.multi = fresh;
    state.sel = null;
    commit('duplicated ' + fresh.length);
    status('duplicated ' + fresh.length + ' buildings');
  }

  function remove() {
    if (!state.sel) return;
    if (state.sel.kind === 'item') { state.items.splice(state.sel.i, 1); saveItems(); }
    else { over(state.sel.key).hidden = true; saveOver(); }
    state.sel = null;
    commit('deleted');
    status('deleted');
  }

  function onKey(ev) {
    if ((ev.key === 'B' || ev.key === 'b') && ev.shiftKey) {
      toggle(!state.on);
      ev.preventDefault(); ev.stopImmediatePropagation();
      return;
    }
    if (!state.on) return;
    var k = ev.key;

    // Arrows walk the free camera while the editor is open. WASD is left
    // alone: D duplicates, and a letter that both pans and edits is how you
    // lose work. Hold Shift for three blocks at a time.
    if (state.cam) {
      var step = PAN_STEP * (ev.shiftKey ? 3 : 1);
      var px = 0, py = 0;
      if (k === 'ArrowLeft') px = -step;
      else if (k === 'ArrowRight') px = step;
      else if (k === 'ArrowUp') py = -step;
      else if (k === 'ArrowDown') py = step;
      if (px || py) {
        state.cam.x += px; state.cam.y += py;
        ev.preventDefault(); ev.stopImmediatePropagation();
        return;
      }
    }

    if (k === 'Escape') { state.sel = null; state.multi = []; state.marquee = null;
      state.brush = null; renderGrid(); status('deselected'); }
    else if (k === 'g' || k === 'G') { state.snap = !state.snap; status('grid snap ' + (state.snap ? 'on' : 'off')); }
    else if (k === 'Delete' || k === 'Backspace') {
      if (state.multi.length) {
        // Delete generated footprints first, then placed items from the end,
        // so splicing never shifts an index we have not used yet.
        var idxs = [];
        state.multi.forEach(function (r) {
          if (r.kind === 'gen') { over(r.key).hidden = true; } else idxs.push(r.i);
        });
        idxs.sort(function (a, b) { return b - a; })
            .forEach(function (i) { state.items.splice(i, 1); });
        var n = state.multi.length;
        state.multi = []; state.sel = null;
        saveItems(); saveOver();
        status('removed ' + n);
      } else remove();
    }
    else if (k === 'd' || k === 'D') {
      if (state.multi.length) duplicateGroup();
      else if (state.sel) duplicate();
    }
    else if (state.sel && (k === '[' || k === ']')) {
      var f = k === ']' ? 1.12 : 1 / 1.12;
      if (state.sel.kind === 'item') {
        state.items[state.sel.i].w *= f; state.items[state.sel.i].h *= f; saveItems();
      } else {
        var o = over(state.sel.key);
        o.scale = (o.scale || 1) * f; o.baseScale = o.scale; saveOver();
      }
      status('resized');
    } else if (state.sel && (k === 'r' || k === 'R')) {
      var step = (ev.shiftKey ? -1 : 1) * Math.PI / 12;
      if (state.sel.kind === 'item') { state.items[state.sel.i].rot += step; saveItems(); }
      else { var o2 = over(state.sel.key); o2.rot = (o2.rot || 0) + step; saveOver(); }
      status('rotated');
    } else return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  // Double click re-skins what is under the cursor with the palette brush.
  // Single click only selects, so dragging a building about no longer turns
  // it into whatever happened to be highlighted.
  function onDbl(ev) {
    if (!state.on || ev.button !== 0) return;
    if (el.panel && el.panel.contains(ev.target)) return;
    if (!state.brush) return;
    var w = worldAt(ev);
    if (!w) return;
    var hit = pick(w.x, w.y);
    if (!hit) return;
    state.sel = hit.kind === 'item' ? { kind: 'item', i: hit.i } : { kind: 'gen', key: hit.key };
    state.drag = null;
    ev.preventDefault();
    ev.stopImmediatePropagation();
    applyBrush();
  }

  // Scroll moves the map. Right-drag works but needs a two-button mouse, and
  // on a trackpad the obvious gesture for walking a map is two fingers; the
  // game's own wheel handler is a zoom, which the editor has no use for, so
  // it is taken here while the panel is open.
  function onWheel(ev) {
    if (!state.on || !state.cam) return;
    if (el.panel && el.panel.contains(ev.target)) return;    // the palette scrolls
    var cv = canvas();
    if (!cv) return;
    var r = cv.getBoundingClientRect();
    if (!r.width || !r.height) return;
    // CSS pixels -> canvas pixels -> world units.
    var k = (cv.width / r.width) / (zoom() || 1);
    // Chrome reports pixels, Firefox lines, and a page scroll is a screen.
    var unit = ev.deltaMode === 1 ? 16 : ev.deltaMode === 2 ? r.height : 1;
    state.cam.x += ev.deltaX * unit * k;
    state.cam.y += ev.deltaY * unit * k;
    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  // The camera is the game's while you play and the editor's while you
  // build, handed over at the point the panel opens so the view does not
  // jump: it starts exactly where the player was standing.
  function camNow() {
    var cv = canvas();
    if (!cv) return null;
    return screenToWorld(cv.width / 2, cv.height / 2);
  }

  function toggle(on) {
    buildPanel();
    state.on = on;
    el.panel.style.display = on ? 'block' : 'none';
    var cv = canvas();
    if (cv) cv.style.cursor = on ? 'crosshair' : '';
    if (on) {
      var c = camNow();
      state.cam = c ? { x: c.x, y: c.y } : null;
      window.__hdFreeCam = state.cam;
      renderTabs();
      renderHistory();
      status(state.items.length + ' placed, ' +
             Object.keys(window.__hdOverrides).length + ' edits loaded \u2014 ' +
             'scroll, right-drag or arrows to move the map');
    } else {
      state.sel = null; state.drag = null;
      state.cam = null;
      window.__hdFreeCam = null;              // the player gets it back
    }
    var b = document.getElementById('btnBuild');
    if (b) b.style.filter = on ? 'brightness(1.45)' : '';
  }

  window.__hdToggleBuild = function () { toggle(!state.on); };
  // Exposed for debugging and for scripted checks of the editor.
  window.__hdBuildState = state;

  load();
  // The local copy draws immediately; the account copy lands a moment later
  // and wins if it is ahead, which is what makes a new deployment hostname,
  // a different browser or a cleared cache a non-event.
  pull(false);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPanel);
  else buildPanel();
  // Capture phase: the game listens on window, so editor input has to be taken
  // before it starts driving the car or dragging the minimap.
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('mouseup', onUp, true);
  window.addEventListener('dblclick', onDbl, true);
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  // Right-drag is the pan gesture, so the browser menu has to stay shut
  // while the editor is open.
  window.addEventListener('contextmenu', function (ev) {
    if (state.on) ev.preventDefault();
  }, true);
})();
