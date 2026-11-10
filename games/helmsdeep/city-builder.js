/* City builder.
 *
 * The baked OSM geometry gives footprints but no sense of what a block is: it
 * cannot tell a gated society from a chawl, so the renderer has to guess, and
 * guesses put a shanty next to a tower. This lets a human place the truth
 * directly - pick art, drop it, rotate and size it - and ship the result as a
 * small JSON patch anyone can import, so a neighbourhood can be corrected
 * collaboratively instead of re-derived.
 *
 * Placements persist in localStorage and render above the generated city.
 */
(function () {
  'use strict';

  var KEY = 'helmsdeep.build.v1';
  var M = 6.6667;                       // world units per metre
  var state = { on: false, items: [], sel: -1, brush: null, snap: true, drag: null };

  function load() {
    try { state.items = JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { state.items = []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state.items)); } catch (e) { /* quota */ }
  }

  // The renderer publishes its world transform every frame. Inverting it is
  // the only exact way to turn a click into world units, because zoom, DPR,
  // camera lerp and screen shake are all folded into it.
  function screenToWorld(px, py) {
    var t = window.__hdViewTf;
    if (!t) return null;
    var det = t.a * t.d - t.b * t.c;
    if (!det) return null;
    var x = px - t.e, y = py - t.f;
    return { x: (x * t.d - y * t.c) / det, y: (y * t.a - x * t.b) / det };
  }

  function hit(wx, wy) {
    for (var i = state.items.length - 1; i >= 0; i--) {
      var it = state.items[i];
      var dx = wx - it.x, dy = wy - it.y;
      var c = Math.cos(-it.rot), s = Math.sin(-it.rot);
      if (Math.abs(dx * c - dy * s) <= it.w / 2 && Math.abs(dx * s + dy * c) <= it.h / 2) return i;
    }
    return -1;
  }

  // Drawn from the landmark pass so placements share the city's layer:
  // above buildings, below traffic.
  window.__hdDrawBuild = function (ctx, camX, camY, viewW, viewH, night) {
    var zoom = window.__hdViewTf ? window.__hdViewTf.a : 1;
    for (var i = 0; i < state.items.length; i++) {
      var it = state.items[i];
      var r = it.w > it.h ? it.w : it.h;
      if (Math.abs(it.x - camX) > viewW / 2 + r) continue;
      if (Math.abs(it.y - camY) > viewH / 2 + r) continue;
      var img = window.__hdGetBuildingSprite && window.__hdGetBuildingSprite(it.slug);
      if (!img) continue;
      var kx = it.w / img.naturalWidth, ky = it.h / img.naturalHeight;
      var k = kx > ky ? kx : ky;
      var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
      ctx.save();
      ctx.translate(it.x, it.y);
      if (it.rot) ctx.rotate(it.rot);
      ctx.drawImage(night && window.__hdNightSprite ? window.__hdNightSprite(img) : img,
                    -dw / 2, -dh / 2, dw, dh);
      if (state.on) {
        var sel = i === state.sel;
        ctx.strokeStyle = sel ? '#4adeff' : 'rgba(74,222,255,0.3)';
        ctx.lineWidth = (sel ? 2 : 1) / zoom;
        ctx.strokeRect(-it.w / 2, -it.h / 2, it.w, it.h);
        if (sel) {
          ctx.fillStyle = '#4adeff';
          var n = 6 / zoom;
          ctx.fillRect(-n / 2, -it.h / 2 - n * 2, n, n * 2);     // heading nub
        }
      }
      ctx.restore();
    }
  };

  // ------------------------------------------------------------------- panel
  var el = {}, activeDir = null;

  function btn(label, fn) {
    var b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'flex:1;min-width:80px;background:#162030;border:1px solid #2b3a4d;' +
      'color:#c9d4e2;padding:6px 8px;border-radius:5px;cursor:pointer;' +
      'font:600 11px Inter,system-ui,sans-serif';
    b.onclick = fn;
    return b;
  }

  function status(msg) { if (el.status) el.status.textContent = msg; }

  function buildPanel() {
    if (el.panel) return;
    var w = document.createElement('div');
    w.id = 'hd-build';
    w.style.cssText = 'position:fixed;right:12px;top:52px;width:310px;' +
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
    help.innerHTML = 'Pick a tile, then click the map to place.<br>' +
      'Drag to move &middot; <b>R</b>/<b>Shift+R</b> rotate 15&deg; &middot; <b>[</b>/<b>]</b> resize<br>' +
      '<b>Del</b> remove &middot; <b>Esc</b> deselect &middot; <b>G</b> grid snap &middot; <b>Shift+B</b> toggle';
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
    tools.appendChild(btn('Export', exportJson));
    tools.appendChild(btn('Import', importJson));
    tools.appendChild(btn('Clear all', function () {
      if (!state.items.length) return;
      if (confirm('Remove all ' + state.items.length + ' placements?')) {
        state.items = []; state.sel = -1; save(); status('cleared');
      }
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
        ';border-radius:4px;padding:2px;cursor:pointer;height:62px;display:flex;' +
        'align-items:center;justify-content:center';
      var img = document.createElement('img');
      img.src = '/sprites/' + activeDir + '/' + slug + '.png';
      img.loading = 'lazy';
      img.style.cssText = 'max-width:100%;max-height:100%';
      cell.appendChild(img);
      cell.onclick = function () {
        state.brush = { dir: activeDir, slug: slug };
        renderGrid();
        status('brush: ' + slug + ' \u2014 click the map');
      };
      el.grid.appendChild(cell);
    });
  }

  function exportJson() {
    var text = JSON.stringify(state.items);
    if (navigator.clipboard) navigator.clipboard.writeText(text);
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = 'bambai-build.json';
    a.click();
    URL.revokeObjectURL(a.href);
    status(state.items.length + ' placements copied + downloaded');
  }

  function importJson() {
    var text = prompt('Paste a build JSON patch (adds to what is already here):');
    if (!text) return;
    try {
      var add = JSON.parse(text);
      if (!Array.isArray(add)) throw new Error('expected an array');
      var ok = 0;
      add.forEach(function (it) {
        if (typeof it.slug !== 'string' || !isFinite(it.x) || !isFinite(it.y)) return;
        state.items.push({ slug: it.slug, x: +it.x, y: +it.y,
                           w: +it.w || 200, h: +it.h || 200, rot: +it.rot || 0 });
        ok++;
      });
      save();
      status('imported ' + ok + ' placements');
    } catch (e) { status('import failed: ' + e.message); }
  }

  function canvas() {
    return document.querySelector('#helmsdeep-root canvas') || document.querySelector('canvas');
  }

  function worldAt(ev) {
    var cv = canvas();
    if (!cv) return null;
    var r = cv.getBoundingClientRect();
    return screenToWorld((ev.clientX - r.left) * (cv.width / r.width),
                         (ev.clientY - r.top) * (cv.height / r.height));
  }

  function onDown(ev) {
    if (!state.on || ev.button !== 0) return;
    var cv = canvas();
    if (!cv || ev.target !== cv) return;
    var w = worldAt(ev);
    if (!w) return;
    ev.preventDefault();
    ev.stopImmediatePropagation();

    var idx = hit(w.x, w.y);
    if (idx >= 0) {
      state.sel = idx;
      state.drag = { dx: state.items[idx].x - w.x, dy: state.items[idx].y - w.y };
      status('selected ' + state.items[idx].slug + ' \u2014 ' +
             Math.round(state.items[idx].w / M) + ' m');
      return;
    }
    if (!state.brush) { state.sel = -1; status('pick a tile first'); return; }

    var img = window.__hdGetBuildingSprite(state.brush.slug);
    var ar = img && img.naturalWidth ? img.naturalHeight / img.naturalWidth : 1;
    // Default plot sizes match what the generator uses, so a placed block
    // lands at the same scale as its generated neighbours.
    var d = state.brush.dir;
    var metres = d === 'stalls' ? 6 : d === 'slums' ? 12 : d === 'houses' ? 18 :
                 d === 'chains' ? 28 : d === 'flats' ? 55 : d === 'parks' ? 160 : 70;
    var base = metres * M;
    var x = w.x, y = w.y;
    if (state.snap) { x = Math.round(x / 40) * 40; y = Math.round(y / 40) * 40; }
    state.items.push({ slug: state.brush.slug, x: x, y: y, w: base, h: base * ar, rot: 0 });
    state.sel = state.items.length - 1;
    save();
    status('placed ' + state.brush.slug + ' at ' + metres + ' m (' + state.items.length + ' total)');
  }

  function onMove(ev) {
    if (!state.on || !state.drag || state.sel < 0) return;
    var w = worldAt(ev);
    if (!w) return;
    var it = state.items[state.sel];
    it.x = w.x + state.drag.dx;
    it.y = w.y + state.drag.dy;
    if (state.snap) { it.x = Math.round(it.x / 40) * 40; it.y = Math.round(it.y / 40) * 40; }
  }

  function onUp() { if (state.drag) { state.drag = null; save(); } }

  function onKey(ev) {
    if ((ev.key === 'B' || ev.key === 'b') && ev.shiftKey) {
      toggle(!state.on);
      ev.preventDefault(); ev.stopImmediatePropagation();
      return;
    }
    if (!state.on) return;
    var it = state.sel >= 0 ? state.items[state.sel] : null;
    var k = ev.key;

    if (k === 'Escape') { state.sel = -1; state.brush = null; renderGrid(); status('deselected'); }
    else if (k === 'g' || k === 'G') { state.snap = !state.snap; status('grid snap ' + (state.snap ? 'on' : 'off')); }
    else if (it && (k === 'r' || k === 'R')) {
      it.rot += (ev.shiftKey ? -1 : 1) * Math.PI / 12;
      save(); status('rotated to ' + Math.round(it.rot * 180 / Math.PI) + '\u00b0');
    } else if (it && (k === '[' || k === ']')) {
      var f = k === ']' ? 1.12 : 1 / 1.12;
      it.w *= f; it.h *= f;
      save(); status('size ' + Math.round(it.w / M) + ' m');
    } else if (it && (k === 'Delete' || k === 'Backspace')) {
      state.items.splice(state.sel, 1); state.sel = -1; save(); status('removed');
    } else return;

    ev.preventDefault();
    ev.stopImmediatePropagation();
  }

  function toggle(on) {
    buildPanel();
    state.on = on;
    el.panel.style.display = on ? 'block' : 'none';
    if (on) { renderTabs(); status(state.items.length + ' placements loaded'); }
    else { state.sel = -1; state.drag = null; }
    var b = document.getElementById('btnBuild');
    if (b) b.style.filter = on ? 'brightness(1.45)' : '';
  }

  window.__hdToggleBuild = function () { toggle(!state.on); };

  load();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildPanel);
  else buildPanel();
  // Capture phase: the game listens for keys on window, so editor keys must be
  // swallowed before they start driving the car.
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('mousedown', onDown, true);
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('mouseup', onUp, true);
})();
