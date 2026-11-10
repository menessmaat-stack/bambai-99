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
  var M = 6.6667;                        // world units per metre

  var state = {
    on: false,
    items: [],
    brush: null,
    snap: false,
    sel: null,         // {kind:'item', i} | {kind:'gen', key}
    multi: [],         // marquee selection, same shape as `sel`
    marquee: null,     // {x0,y0,x1,y1} in world units while dragging
    drag: null         // {mode:'move'|'resize'|'rotate', ...}
  };

  function load() {
    try { state.items = JSON.parse(localStorage.getItem(K_ITEMS)) || []; } catch (e) { state.items = []; }
    try { window.__hdOverrides = JSON.parse(localStorage.getItem(K_OVER)) || {}; }
    catch (e) { window.__hdOverrides = {}; }
  }
  function saveItems() {
    try { localStorage.setItem(K_ITEMS, JSON.stringify(state.items)); } catch (e) { /* quota */ }
  }
  function saveOver() {
    try { localStorage.setItem(K_OVER, JSON.stringify(window.__hdOverrides)); } catch (e) { /* quota */ }
  }

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

  // ---------------------------------------------------------------- render
  window.__hdDrawBuild = function (ctx, camX, camY, viewW, viewH, night) {
    var i, it, img;
    for (i = 0; i < state.items.length; i++) {
      it = state.items[i];
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
      ctx.restore();
    }
    if (!state.on) return;

    var z = zoom();

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
      '<b>Click any building</b> \u2014 generated ones too \u2014 to select.<br>' +
      'Drag body to move \u00b7 drag <span style="color:#4adeff">\u25a0</span> corner to resize \u00b7 ' +
      'drag <span style="color:#fde047">\u25cf</span> nub to rotate.<br>' +
      'Pick a tile then click a building to re-skin it, or click empty ground to place.<br>' +
      '<b>D</b> or <b>Alt+drag</b> duplicate (keeps angle + size)<br>' +
      '<b>Drag empty ground</b> to marquee-select a group, then D / drag / Del<br>' +
      '<b>Del</b> delete \u00b7 <b>Esc</b> deselect \u00b7 <b>G</b> snap \u00b7 <b>Shift+B</b> close';
    w.appendChild(help);

    el.status = document.createElement('div');
    el.status.style.cssText = 'font-size:11px;color:#4adeff;margin-bottom:8px;min-height:15px';
    w.appendChild(el.status);

    el.tabs = document.createElement('div');
    el.tabs.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px';
    w.appendChild(el.tabs);

    el.grid = document.createElement('div');
    el.grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:4px';
    w.appendChild(el.grid);

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

  function exportJson() {
    var payload = { items: state.items, overrides: window.__hdOverrides };
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
      status('imported ' + n + ' changes');
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
    if (!state.on || ev.button !== 0) return;
    if (el.panel && el.panel.contains(ev.target)) return;      // palette clicks
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
      if (state.brush) { applyBrush(); return; }
      status('selected ' + (hitB.kind === 'gen' ? 'generated building' : 'placed building') +
             ' \u2014 ' + Math.round(hitB.w / M) + ' m');
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
                 d === 'parks' ? 160 : 70;
    var base = metres * M;
    var x = w.x, y = w.y;
    if (state.snap) { x = Math.round(x / 40) * 40; y = Math.round(y / 40) * 40; }
    state.items.push({ slug: state.brush.slug, x: x, y: y, w: base, h: base * ar, rot: 0 });
    state.sel = { kind: 'item', i: state.items.length - 1 };
    saveItems();
    status('placed ' + state.brush.slug + ' at ' + metres + ' m');
  }

  function onMove(ev) {
    if (!state.on || !state.drag) return;
    var w = worldAt(ev);
    if (!w) return;
    var d = state.drag;

    if (d.mode === 'marquee') {
      state.marquee.x1 = w.x;
      state.marquee.y1 = w.y;
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
    if (state.drag.mode === 'resize' && state.sel && state.sel.kind === 'gen') {
      var o = over(state.sel.key);
      o.baseScale = o.scale || 1;             // next drag starts from here
    }
    state.drag = null;
    saveItems(); saveOver();
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
    saveItems();
    status('duplicated ' + fresh.length + ' buildings');
  }

  function remove() {
    if (!state.sel) return;
    if (state.sel.kind === 'item') { state.items.splice(state.sel.i, 1); saveItems(); }
    else { over(state.sel.key).hidden = true; saveOver(); }
    state.sel = null;
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

  function toggle(on) {
    buildPanel();
    state.on = on;
    el.panel.style.display = on ? 'block' : 'none';
    var cv = canvas();
    if (cv) cv.style.cursor = on ? 'crosshair' : '';
    if (on) {
      renderTabs();
      status(state.items.length + ' placed, ' +
             Object.keys(window.__hdOverrides).length + ' edits loaded');
    } else { state.sel = null; state.drag = null; }
    var b = document.getElementById('btnBuild');
    if (b) b.style.filter = on ? 'brightness(1.45)' : '';
  }

  window.__hdToggleBuild = function () { toggle(!state.on); };
  // Exposed for debugging and for scripted checks of the editor.
  window.__hdBuildState = state;

  load();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPanel);
  else buildPanel();
  // Capture phase: the game listens on window, so editor input has to be taken
  // before it starts driving the car or dragging the minimap.
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('mouseup', onUp, true);
})();
