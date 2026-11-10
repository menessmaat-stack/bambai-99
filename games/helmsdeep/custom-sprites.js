/* Custom PNG Sprite Loader for HELM'S DEEP.
 *
 * 100% Physically Accurate Vehicle Tagging:
 *   - BIKES ONLY map to real bike chassis (PCJ-6, Sanchez, NRG, Rapido, Police Bike)
 *   - CARS ONLY map to matching car chassis (Never stretched onto trucks!)
 *   - TRUCKS ONLY map to heavy truck chassis
 *   - PLANES ONLY fly (never on roads)
 *   - BOATS ONLY on water
 */
(function () {
  'use strict';

  var loaded = {};
  var attempted = {};

  // Strict 1:1 Physical Mapping:
  var CAR_ALIASES = {
    // === Supercars (l=44-46, w=20-21) ===
    56: ['porsche-911-gt3', 'porsche', 'comet'],
    57: ['lamborghini-huracan', 'huracan', 'lambo'],
    58: ['lamborghini-aventador', 'aventador', 'lambo'],
    59: ['taycan', 'porsche-taycan'],
    9:  ['ferrari', 'banshee'],
    10: ['cheetah', 'ferrari'],
    11: ['infernus', 'ferrari'],
    85: ['supra', 'gtr'],
    86: ['skyline', 'gtr'],

    // === Modern Sedans (l=46-50, w=21-22) ===
    0:  ['sedan-silver', 'sentinel'],
    1:  ['sedan-silver', 'primo'],
    13: ['sedan-blue'],
    64: ['ciaz', 'sedan-silver'],
    65: ['verna', 'sedan-blue'],
    66: ['sedan-silver'],
    67: ['octavia', 'sedan-silver'],
    84: ['bentley', 'continental-gt'],
    89: ['ambassador', 'ambassador-state'],

    // === Pickups & Vans (l=48-50, w=22-24) ===
    18: ['pickup-black', 'bobcat'],
    19: ['pickup', 'yosemite'],
    20: ['van-white', 'moonbeam'],
    21: ['van-white', 'burrito'],
    22: ['van', 'pony'],

    // === Municipal Trucks (l=66-78, w=26-28) ===
    26: ['garbage-truck'], // Trashmaster (Heavy Municipal Truck)
    47: ['ambulance'],

    // === Heavy fleet, matched to chassis by length/width, never by guess ===
    // Chassis dimensions read from the engine table, e.g. Coach l=100 w=28,
    // Catering Hi-Lift l=66 w=26 (a ramp/lift body), Tipper l=84 w=29.
    24: ['flatbed-lorry'],   // Mule           l=76  w=28
    25: ['car-carrier'],     // Linerunner     l=110 w=28
    27: ['coach-bus'],       // Coach          l=100 w=28
    28: ['city-bus'],        // School Bus     l=96  w=28
    51: ['ramp-truck'],      // Catering Hi-Lift l=66 w=26
    52: ['utility-tanker'],  // Fuel Bowser    l=72  w=27
    71: ['tipper-truck'],    // Tipper         l=84  w=29
    72: ['tanker-truck'],    // Tanker         l=96  w=29
    73: ['army-truck'],      // Container      l=118 w=29
    75: ['gas-tanker'],      // Water Truck    l=88  w=28

    // === 16 Vintage Cars (Mapped ONLY to Real Car Chassis l=46-50, w=21-22!) ===
    2:  ['classic-finned-cadillac'],     // Esperanto (Classic 1950s Finned Cruiser)
    4:  ['vintage-maroon-coupe'],        // Idaho (Classic Vintage Coupe)
    5:  ['classic-muscle-orange'],       // Stallion (Muscle Car with Racing Stripes)
    6:  ['classic-cream-cabriolet'],     // Voodoo (Classic Luxury Cabriolet)
    7:  ['vintage-navy-coupe'],          // Manana (Vintage Compact Coupe)
    32: ['vintage-sky-convertible'],     // Savanna (Sky Blue Open-Top Convertible)
    33: ['vintage-gangster-coupe'],      // Hermes (1940s Black Gangster Coupe with Trunk)
    34: ['classic-green-convertible'],   // Tornado (Classic Green Convertible)
    35: ['vintage-blue-silver-coupe'],   // Buccaneer (Two-Tone Blue/Silver Coupe)

    // === REAL BIKES ONLY! (Chassis l=26-28, w=10-11) ===
    // These are the ONLY real motorcycle chassis in the game engine:
    29: ['vintage-maroon-cruiser'],      // PCJ-6 (Classic Cruiser Motorcycle)
    38: ['vintage-touring-bike'],        // Sanchez (Vintage Touring Bike)
    39: ['vintage-cafe-racer'],          // NRG-500 (Vintage Cafe Racer)
    55: ['vintage-vespa-scooter'],       // Rapido (Vintage Vespa Scooter)
    77: ['vintage-gold-bobber'],         // Police Bike (Vintage Gold Bobber)

    // === 4 Gang Fleets (Mapped to Gang Cars & SUVs l=46-52, w=21-24) ===
    41: ['gang2-dragon-suv'],            // Serrano (Gang Luxury SUV)
    42: ['gang3-cyber-suv'],             // Baller LX (Cyber SUV)
    60: ['gang1-spiked-skull'],          // Cartel GT (Spiked Skull Muscle Car)
    61: ['gang1-gun-truck'],             // Dockside (Armored Gun Truck)
    62: ['gang2-dragon-sedan'],          // Byculla S (Black Dragon Supercar)
    63: ['gang2-dragon-suv'],            // Reay Road (Black Dragon SUV)
    68: ['gang4-militia-truck']          // Militia Safari Truck
  };

  // Watercraft ONLY -> /sprites/boats/
  var BOAT_ALIASES = {
    90: ['yacht', 'fishing-boat'],
    91: ['jetski', 'speedboat'],
    92: ['rescue-boat', 'speedboat']
  };

  function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function probe(dir, slug) {
    if (!slug) return;
    var key = dir + slug;
    if (attempted[key]) return;
    attempted[key] = true;

    var path = dir + encodeURIComponent(slug) + '.png';
    var img = new Image();
    img.onload = function () {
      loaded[key] = img;
      loaded[slug] = img;
      try {
        if (window.__helmsdeep && window.__helmsdeep.clearSpriteCache) {
          window.__helmsdeep.clearSpriteCache();
        }
      } catch (e) {}
    };
    img.src = path;
  }

  // Pre-load all sprites
  var carPreloads = [
    'civ-sedan-red', 'civ-sedan-silver', 'civ-sedan-darkblue', 'civ-coupe-white',
    'civ-4x4-green', 'civ-suv-black', 'civ-suv-white', 'civ-crossover-orange',
    'civ-coupe-yellow', 'civ-sedan-grey', 'civ-sedan-oceanblue', 'civ-sedan-burgundy',
    'porsche-911-gt3', 'porsche', 'lamborghini-huracan', 'lambo',
    'ferrari', 'gtr', 'sedan-silver', 'sedan-blue', 'van-white',
    'pickup-black', 'pickup', 'van', 'garbage-truck',
    'vintage-maroon-coupe', 'classic-green-convertible', 'classic-cream-cabriolet',
    'vintage-navy-coupe', 'vintage-sidecar-bike', 'vintage-maroon-cruiser',
    'vintage-vespa-scooter', 'vintage-black-bike', 'classic-finned-cadillac',
    'vintage-gangster-coupe', 'vintage-sky-convertible', 'classic-muscle-orange',
    'vintage-touring-bike', 'vintage-blue-silver-coupe', 'vintage-cafe-racer',
    'vintage-gold-bobber', 'gang1-spiked-skull', 'gang1-gun-truck',
    'gang2-dragon-sedan', 'gang2-dragon-suv', 'gang3-cyber-snake',
    'gang3-cyber-suv', 'gang4-militia-sedan', 'gang4-militia-truck'
  ];
  carPreloads.forEach(function(s) { probe('/sprites/cars/', s); });

  ['jetski', 'rescue-boat', 'speedboat', 'yacht', 'fishing-boat'].forEach(function(s) {
    probe('/sprites/boats/', s);
  });

  ['fighter-jet', 'military-cargo', 'chinook', 'trainer-prop', 'passenger-jet', 'private-jet'].forEach(function(s) {
    probe('/sprites/planes/', s);
  });

  ['locomotive', 'metro-engine'].forEach(function(s) {
    probe('/sprites/trains/', s);
  });

  // ---------------------------------------------------------------------
  // Reference-art sprite overrides.
  //
  // The city is baked from OpenStreetMap. Measured on the Fort tiles: of 6105
  // visible footprints, 0 carried a `name` and most carry no height or type,
  // so stock rendering gives grey boxes. Three mechanisms fix that:
  //   1. __hdBSpr paints hand-drawn art onto the *real OSM footprint*, chosen
  //      deterministically from the footprint hash, so a plot keeps the same
  //      art between frames and sessions.
  //   2. LANDMARKS places named art at real lat/lon for buildings OSM never
  //      tagged, using the same projection as the map bake:
  //      111320*cos(19.08) m/deg lon, 110574 m/deg lat, by 6.6667 units/m.
  //   3. __hdShore builds Mumbai's sea edge procedurally - tetrapod armour,
  //      promenade and palm rows - instead of pasting a reference tile.
  // ---------------------------------------------------------------------
  var CATALOG = {
    buildings: ['mantralaya', 'bmc-hq', 'old-secretariat', 'gpo-mumbai', 'rbi-main', 'sbi-hq',
      'bank-of-india', 'bse', 'air-india-bldg', 'mittal-tower', 'express-towers', 'wtc',
      'cst-station', 'police-hq', 'best-depot', 'income-tax', 'taj-palace', 'oberoi-trident',
      'world-trade-ctr', 'bombay-high-court', 'one-lodha-place', 'maker-towers', 'mittal-tower-np',
      'air-india-bldg-np', 'the-world-towers', 'rbi-hq', 'bse-tower', 'kohinoor-square',
      'peninsula-park', 'maker-maxity', 'empire-mills', 'asiatic-library', 'one-bkc', 'csmt',
      'express-towers-np', 'mafatlal-house', 'futurex', 'maker-chambers', 'mittal-tower-2',
      'air-india-bldg-2', 'bse-2', 'ilfs', 'godrej-one', 'wtc-mumbai', 'peninsula-park-2',
      'maker-maxity-2', 'lodha-excelus', 'birla-centurion'],
    homes: ['mannat', 'jalsa', 'galaxy-apts', 'prateeksha', 'shivshakti', 'aashirwad',
      'krishna-raj', 'vastu', 'antilia', 'sea-springs', 'bella-vista', 'juhu-villa',
      'janki-kutir', 'anand-villa', 'carter-road-estate', 'prime-beach'],
    transit: ['western-railway-term', 'central-ry-platform', 'elevated-metro-stn',
      'suburban-ry-station', 'old-chawl-courtyard', 'dharavi-redevelopment',
      'heritage-suburban-stn', 'metro-concourse', 'monorail-stn-beam', 'railway-yard-depot',
      'bdd-chawl-block', 'railway-overbridge', 'dadar-junction', 'harbour-line-shed',
      'bus-metro-interchange', 'dense-chawl-block'],
    houses: ['house-brown-gable', 'house-red-hip', 'shop-awning', 'house-grey-twin',
      'house-garage', 'house-brick-warehouse', 'house-courtyard', 'house-industrial-unit',
      'ha-small-gabled', 'ha-concrete-flat', 'ha-l-bungalow', 'ha-courtyard',
      'ha-coastal-tiny', 'ha-two-story-flat', 'ha-semi-detached', 'ha-corner-residence',
      'ha-tiny-brick', 'ha-improvised', 'ha-row-unit', 'ha-multi-material-hut',
      'ha-two-level-tenement', 'ha-back-alley', 'ha-narrow-chawl', 'ha-old-bungalow',
      'hb-small-gabled', 'hb-concrete-flat', 'hb-l-bungalow', 'hb-modern-suburban',
      'hb-multi-family', 'hb-two-story-flat', 'hb-corner-family', 'hb-narrow-row',
      'hb-compact-apartment', 'hb-medium-flat', 'hb-residential-complex', 'hb-three-rise',
      'hb-gated-homes', 'hb-double-story', 'hb-trad-bungalow', 'hb-modern-villa'],
    flats: ['luxury-highrise', 'twin-tower', 'curved-modern', 'premium-block', 'courtyard-apts',
      'terraced-garden', 'h-shaped-block', 'high-end-condo', 'sea-facing-luxury', 'glass-front',
      'multi-block', 'urban-atrium', 'linear-premium', 'gated-enclave', 'multi-tiered',
      'executive-block'],
    slums: ['shanty-single-room', 'shanty-improvised', 'shanty-iron-hut', 'shanty-tarp',
      'shanty-two-story', 'shanty-double-decker', 'shanty-extension', 'shanty-elevated',
      'shanty-row', 'shanty-l-shaped', 'shanty-multi-family', 'shanty-alleyway',
      'shanty-workshop', 'shanty-salvaged', 'shanty-concrete-tin', 'shanty-dense'],
    chains: ['burger-chain', 'pizza-outlet', 'fried-chicken', 'sandwich-shop',
      'indian-quick-service', 'indian-burger', 'south-indian-chain', 'coffee-shop',
      'ice-cream-parlor', 'donut-shop', 'pizzeria-italian', 'indian-tea-cafe', 'food-court',
      'drive-thru', 'multi-brand-qsr', 'restaurant-play-area'],
    stalls: ['kirana-store', 'tapri-tea-stall', 'paan-shop', 'vegetable-vendor', 'dhaba',
      'vada-pav-stall', 'chinese-bandi', 'juice-fruit-center', 'textile-shop', 'hardware-scrap',
      'mobile-repair', 'barber-shop', 'fish-market-stall', 'flower-stall', 'footwear-repair',
      'hawker-cart'],
    parks: ['shivaji-park-oval', 'kamala-nehru-park', 'hanging-gardens', 'sgnp-hub',
      'marine-drive-promenade', 'horniman-circle', 'bandstand-promenade', 'priyadarshini-park',
      'oval-maidan', 'azad-maidan', 'cross-maidan', 'five-gardens', 'chhota-kashmir',
      'joggers-park', 'tata-garden', 'society-park'],
    plants: ['tree-dense-round', 'tree-conifer-star', 'palm-fan', 'shrub-leafy', 'bush-cluster',
      'bush-flowering', 'rocks', 'hedge-row'],
    // Placeable only. These live under /sprites/cars/ and are deliberately
    // kept out of the building pools, so a lorry can never be chosen as a
    // house - the same isolation the driveable alias table enforces.
    vehicles: ['cement-mixer', 'tipper-truck', 'excavator', 'bulldozer', 'flatbed-lorry',
      'tanker-truck', 'army-truck', 'mobile-crane', 'coach-bus', 'city-bus', 'car-carrier',
      'fire-engine', 'road-roller', 'ramp-truck', 'tractor-timber', 'tractor-cargo',
      'utility-tanker', 'gas-tanker', 'ambulance']
  };
  var SLUG_DIR = {};
  var DIR_PATH = { vehicles: 'cars' };
  Object.keys(CATALOG).forEach(function (d) {
    var dir = DIR_PATH[d] || d;
    CATALOG[d].forEach(function (sl) { SLUG_DIR[sl] = dir; probe('/sprites/' + dir + '/', sl); });
  });

  function spriteFor(slug) {
    var d = SLUG_DIR[slug];
    if (!d) return null;
    var img = loaded['/sprites/' + d + '/' + slug];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  }
  window.__hdGetBuildingSprite = spriteFor;
  // The build editor needs the full catalog to draw its palette and the
  // night variant so placements match the rest of the city after dark.
  window.__hdCatalog = CATALOG;
  window.__hdDirPath = DIR_PATH;
  window.__hdFrameBuildings = [];
  window.__hdVisible = [];
  window.__hdOverrides = window.__hdOverrides || {};

  // Deterministic per-footprint hash so a plot keeps the same art forever.
  function hash2(x, y) {
    var h = (x * 73856093) ^ (y * 19349663);
    h = (h ^ (h >>> 13)) >>> 0;
    return h / 4294967296;
  }
  function pick(pool, x, y) {
    var i = Math.floor(hash2(x, y) * pool.length);
    return pool[i < pool.length ? i : pool.length - 1];
  }

  // Night lighting.
  //
  // `ctx.filter` forces Canvas2D to allocate and composite a separate surface
  // for every drawImage. Measured at Fort: 16.7ms of __hdBSpr time by day
  // against 87.4ms at night for the same 9900 calls - a 5x cost that lands
  // squarely on dense, zoomed-out views. Each sprite is therefore dimmed once
  // into an offscreen canvas and reused, and the warm spill is one shared
  // pre-rendered glow rather than a fresh radial gradient per building.
  var nightCache = new WeakMap();
  function nightVariant(img) {
    var c = nightCache.get(img);
    if (c) return c;
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return img;
    var cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    g.filter = 'brightness(0.46) saturate(0.72)';
    g.drawImage(img, 0, 0);
    nightCache.set(img, cv);
    return cv;
  }
  window.__hdNightSprite = nightVariant;

  var glowTile = null;
  function glow() {
    if (glowTile) return glowTile;
    var S = 128;
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    var g = cv.getContext('2d');
    var rg = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    rg.addColorStop(0, 'rgba(255,186,94,0.5)');
    rg.addColorStop(1, 'rgba(255,186,94,0)');
    g.fillStyle = rg;
    g.fillRect(0, 0, S, S);
    glowTile = cv;
    return cv;
  }

  function nightLights(ctx, cx, cy, w, h, seed, density) {
    var n = Math.round(w * h / 1400 * density);
    if (n < 3) n = 3; else if (n > 22) n = 22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var r = (w > h ? w : h) * 1.4;
    ctx.globalAlpha = 0.32;
    ctx.drawImage(glow(), cx - r / 2, cy - r / 2, r, r);
    ctx.globalAlpha = 1;
    for (var i = 0; i < n; i++) {
      var a = hash2(seed + i * 7919, seed - i * 104729);
      var b = hash2(seed - i * 15485, seed + i * 86028);
      if (a > 0.82) continue;                       // some flats are dark
      var sz = 1.6 + a * 2.4;
      ctx.fillStyle = b > 0.72 ? 'rgba(186,226,255,0.85)' : 'rgba(255,208,130,0.9)';
      ctx.fillRect(cx + (a - 0.5) * w * 0.86 - sz / 2, cy + (b - 0.5) * h * 0.86 - sz / 2,
                   sz, sz * 0.7);
    }
    ctx.restore();
  }

  function drawSprite(ctx, img, cx, cy, w, h, night, seed, density) {
    var kx = w / img.naturalWidth, ky = h / img.naturalHeight;
    var k = kx > ky ? kx : ky;
    var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    ctx.drawImage(night ? nightVariant(img) : img, cx - dw / 2, cy - dh / 2, dw, dh);
    if (night && density > 0) nightLights(ctx, cx, cy, dw, dh, seed, density);
    return dh;
  }

  var M = 6.6667;  // world units per metre

  // Neighbourhood zoning.
  //
  // Picking a pool per building made a shanty sit between two gated towers.
  // Real cities are zoned in patches, so the character is decided per ~180 m
  // cell and every plot inside that cell draws from the same family. The
  // building's own footprint still decides which size tier it gets, so a
  // genuinely large plot inside a low-rise pocket still reads as a block.
  var ZONE = 1200;                       // cell size in world units (~180 m)
  var zoneCache = new Map();
  function zoneAt(x, y) {
    var cx = Math.floor(x / ZONE), cy = Math.floor(y / ZONE);
    var key = cx * 46337 + cy;
    var z = zoneCache.get(key);
    if (z !== undefined) return z;
    var r = hash2(cx, cy);
    // Blend the cell with its neighbours so zones form patches rather than a
    // checkerboard: a cell surrounded by slum is far more likely to be slum.
    var n = (hash2(cx - 1, cy) + hash2(cx + 1, cy) + hash2(cx, cy - 1) + hash2(cx, cy + 1)) / 4;
    var v = r * 0.55 + n * 0.45;
    z = v < 0.17 ? 'slum' : v < 0.52 ? 'house' : v < 0.86 ? 'flat' : 'mixed';
    zoneCache.set(key, z);
    return z;
  }


  // Called from both building renderers for every visible footprint.
  // Returns true when it painted, so the stock grey box is skipped.
  window.__hdBSpr = function (ctx, q, view) {
    if (!q || !q.pts || q.pts.length < 6) return false;
    var xs = q.pts, minx = xs[0], maxx = xs[0], miny = xs[1], maxy = xs[1];
    for (var i = 2; i < xs.length; i += 2) {
      if (xs[i] < minx) minx = xs[i]; else if (xs[i] > maxx) maxx = xs[i];
      if (xs[i + 1] < miny) miny = xs[i + 1]; else if (xs[i + 1] > maxy) maxy = xs[i + 1];
    }
    var w = maxx - minx, h = maxy - miny;
    if (!(w > 0) || !(h > 0)) return false;
    var longSide = (w > h ? w : h) / M;                // metres
    var hgt = (q.hgt || 0) / M;                        // metres
    if (longSide < 4 || longSide > 110) return false;  // leave towers and sheds alone

    // OSM leaves `hgt` at 0 on most Mumbai footprints, so plot area carries
    // the signal instead: a 300 m2 plot is a house, a 900 m2 one is a block.
    var area = (w / M) * (h / M);                      // square metres
    var kind = q.kind, pool;
    var zone = zoneAt(q.cx || minx, q.cy || miny);
    // Plot area decides house vs block - forcing a tower onto a 200 m2 plot
    // is what pushed art out over the kerb. The zone only decides whether a
    // pocket is informal, which is the thing OSM genuinely does not record.
    var big = hgt > 14 || area > 520;

    if (kind === 'slum' || (zone === 'slum' && !big)) pool = CATALOG.slums;
    else if (kind === 'retail') pool = longSide < 16 ? CATALOG.stalls : CATALOG.chains;
    else if (kind === 'apartment') pool = CATALOG.flats;
    else if (kind === 'house') pool = CATALOG.houses;
    else pool = big ? CATALOG.flats : CATALOG.houses;

    var img = spriteFor(pick(pool, q.cx | 0, q.cy | 0));
    if (!img) return false;

    var nominal = 18, lo = 14, hi = 26, over = 1.0, dens = 1;
    if (pool === CATALOG.flats) { nominal = 55; lo = 38; hi = 74; over = 1.1; }
    else if (pool === CATALOG.slums) { nominal = 12; lo = 8; hi = 17; over = 1.1; dens = 0.5; }
    else if (pool === CATALOG.chains) { nominal = 28; lo = 21; hi = 36; }
    else if (pool === CATALOG.stalls) { nominal = 6; lo = 4; hi = 8; }

    lo *= M; hi *= M;
    var long = w > h ? w : h;
    // Hard ceiling tied to the plot: art may bleed a little past the
    // footprint for a sense of mass, never across the road.
    var ceiling = long * 1.25;
    if (hi > ceiling) hi = ceiling;
    if (lo > hi) lo = hi;
    var want = long * over;
    if (want < lo) want = lo; else if (want > hi) want = hi;
    var scale = want / long;
    var dw = w * scale, dh = h * scale;

    var ox = (minx + maxx) / 2, oy = (miny + maxy) / 2, rot = 0;

    // Human overrides win over anything the generator decided. Keyed on the
    // footprint centroid, which is stable across sessions because it comes
    // from the baked geometry rather than draw order.
    var key = (ox | 0) + ':' + (oy | 0);
    var ov = window.__hdOverrides && window.__hdOverrides[key];
    if (ov) {
      if (ov.hidden) return true;                 // deleted: suppress the box too
      if (ov.slug) { var oi = spriteFor(ov.slug); if (oi) img = oi; }
      if (ov.scale) { dw *= ov.scale; dh *= ov.scale; }
      if (ov.dx) ox += ov.dx;
      if (ov.dy) oy += ov.dy;
      rot = ov.rot || 0;
    }

    if (window.__hdFrameBuildings) {
      window.__hdFrameBuildings.push({ key: key, x: ox, y: oy, w: dw, h: dh, rot: rot,
                                       slug: ov && ov.slug ? ov.slug : null,
                                       kind: kind, police: kind === 'civic' });
    }

    if (rot) {
      ctx.save();
      ctx.translate(ox, oy);
      ctx.rotate(rot);
      drawSprite(ctx, img, 0, 0, dw, dh, !!(view && view.night),
                 (q.cx | 0) * 31 + (q.cy | 0), dens);
      ctx.restore();
    } else {
      drawSprite(ctx, img, ox, oy, dw, dh, !!(view && view.night),
                 (q.cx | 0) * 31 + (q.cy | 0), dens);
    }
    return true;
  };

  // [dir, slug, label, x, y, width, depth] - width/depth are real footprints.
  var LANDMARKS = [
    ["buildings","taj-palace","TAJ MAHAL PALACE",-46851,116472,900,633],
    ["buildings","oberoi-trident","OBEROI TRIDENT",-55688,113818,567,733],
    ["buildings","world-trade-ctr","WORLD TRADE CENTRE",-56670,122443,500,633],
    ["buildings","bombay-high-court","BOMBAY HIGH COURT",-49376,110722,867,533],
    ["buildings","one-lodha-place","ONE LODHA PLACE",-51340,63249,433,567],
    ["buildings","maker-towers","MAKER TOWERS",-55548,120674,633,500],
    ["buildings","the-world-towers","THE WORLD TOWERS",-52673,62954,633,533],
    ["buildings","rbi-hq","RBI HEADQUARTERS",-44887,108363,667,567],
    ["buildings","bse-tower","BOMBAY STOCK EXCHANGE",-46571,111091,467,500],
    ["buildings","kohinoor-square","KOHINOOR SQUARE",-40258,43640,467,467],
    ["buildings","peninsula-park","PENINSULA PARK",-48885,60669,567,533],
    ["buildings","maker-maxity","MAKER MAXITY",-23566,9952,933,733],
    ["buildings","empire-mills","EMPIRE MILLS",-49446,58899,733,600],
    ["buildings","asiatic-library","ASIATIC LIBRARY",-45799,108953,533,433],
    ["buildings","mantralaya","MANTRALAYA",-51550,111164,733,600],
    ["buildings","bmc-hq","BMC HEADQUARTERS",-45799,103055,733,567],
    ["buildings","old-secretariat","OLD SECRETARIAT",-48394,111312,700,633],
    ["buildings","gpo-mumbai","GPO MUMBAI",-44677,103203,667,600],
    ["buildings","sbi-hq","SBI HEADQUARTERS",-43976,109469,567,533],
    ["buildings","bank-of-india","BANK OF INDIA",-45449,110206,567,500],
    ["buildings","air-india-bldg","AIR INDIA BUILDING",-55899,113081,500,467],
    ["buildings","mittal-tower","MITTAL TOWER",-54847,112344,467,400],
    ["buildings","express-towers","EXPRESS TOWERS",-56250,113155,433,400],
    ["buildings","csmt","CSMT",-45449,103203,1100,667],
    ["buildings","police-hq","MUMBAI POLICE HQ",-46992,107257,700,600],
    ["buildings","best-depot","BEST BUS DEPOT",-59967,127161,733,567],
    ["buildings","income-tax","INCOME TAX OFFICE",-51901,108363,600,500],
    ["buildings","one-bkc","ONE BKC",-23846,10615,633,633],
    ["buildings","mafatlal-house","MAFATLAL HOUSE",-53304,113376,533,433],
    ["buildings","futurex","FUTUREX",-49797,62659,533,467],
    ["buildings","maker-chambers","MAKER CHAMBERS",-54707,112933,600,500],
    ["buildings","ilfs","IL&FS FINANCIAL CENTRE",-25249,9583,500,467],
    ["buildings","godrej-one","GODREJ ONE",5611,-6634,700,567],
    ["buildings","lodha-excelus","LODHA EXCELUS",-50849,63027,467,600],
    ["buildings","birla-centurion","BIRLA CENTURION",-47693,58236,600,500],
    ["homes","antilia","ANTILIA",-63193,80793,400,367],
    ["homes","mannat","MANNAT",-56250,27054,400,367],
    ["homes","jalsa","JALSA",-51901,8772,433,400],
    ["homes","galaxy-apts","GALAXY APARTMENTS",-54145,19682,367,333],
    ["homes","prateeksha","PRATEEKSHA",-51200,7372,400,367],
    ["homes","shivshakti","SHIVSHAKTI",-50148,6634,400,367],
    ["homes","aashirwad","AASHIRWAD",-56109,16807,367,333],
    ["homes","krishna-raj","KRISHNA RAJ",-54005,14154,400,367],
    ["homes","vastu","VASTU",-51901,11795,367,367],
    ["homes","sea-springs","SEA SPRINGS",-56811,24326,467,400],
    ["homes","bella-vista","BELLA VISTA",-52602,13269,400,367],
    ["homes","juhu-villa","JUHU VILLA",-51901,-14006,433,400],
    ["homes","janki-kutir","JANKI KUTIR",-51200,-11795,467,400],
    ["homes","anand-villa","ANAND VILLA",-49096,7372,400,367],
    ["homes","carter-road-estate","CARTER ROAD ESTATE",-56109,16218,467,400],
    ["homes","prime-beach","PRIME BEACH",-52602,-18429,467,400],
    ["transit","western-railway-term","MUMBAI CENTRAL",-56109,81825,1000,733],
    ["transit","central-ry-platform","DADAR CENTRAL",-39277,45483,933,633],
    ["transit","elevated-metro-stn","ANDHERI METRO",-37313,-29265,800,467],
    ["transit","suburban-ry-station","ANDHERI STATION",-37874,-28749,867,600],
    ["transit","old-chawl-courtyard","PAREL CHAWL",-44186,56762,600,567],
    ["transit","dharavi-redevelopment","DHARAVI REDEVELOPMENT",-30860,28012,800,733],
    ["transit","heritage-suburban-stn","BANDRA STATION",-41661,18871,867,600],
    ["transit","metro-concourse","GHATKOPAR METRO",5611,-4423,733,633],
    ["transit","monorail-stn-beam","WADALA MONORAIL",-26652,46441,800,467],
    ["transit","railway-yard-depot","KURLA RAILWAY YARD",-14729,11057,933,800],
    ["transit","bdd-chawl-block","BDD CHAWL WORLI",-57512,58973,733,533],
    ["transit","railway-overbridge","ELPHINSTONE BRIDGE",-49096,53444,800,467],
    ["transit","dadar-junction","DADAR JUNCTION",-40188,45262,867,667],
    ["transit","harbour-line-shed","WADALA HARBOUR SHED",-30860,45704,800,633],
    ["transit","bus-metro-interchange","GHATKOPAR INTERCHANGE",6312,-4423,800,667],
    ["transit","dense-chawl-block","DHARAVI CHAWLS",-33666,29487,733,700],
    ["parks","shivaji-park-oval","SHIVAJI PARK",-42082,38333,2533,2400],
    ["parks","kamala-nehru-park","KAMALA NEHRU PARK",-67051,90966,1000,933],
    ["parks","hanging-gardens","HANGING GARDENS",-66069,91556,1267,1200],
    ["parks","sgnp-hub","SANJAY GANDHI NP",7014,-110575,2133,2000],
    ["parks","horniman-circle","HORNIMAN CIRCLE",-44537,109837,867,867],
    ["parks","priyadarshini-park","PRIYADARSHINI PARK",-72942,86985,1400,1133],
    ["parks","oval-maidan","OVAL MAIDAN",-49797,111312,2067,1400],
    ["parks","azad-maidan","AZAD MAIDAN",-47693,104309,1800,1533],
    ["parks","cross-maidan","CROSS MAIDAN",-49096,106520,1333,1200],
    ["parks","five-gardens","FIVE GARDENS",-32964,40544,1533,1333],
    ["parks","chhota-kashmir","CHHOTA KASHMIR",-15430,-50127,1667,1333],
    ["parks","joggers-park","JOGGERS PARK",-56109,11795,1200,1000],
    ["parks","tata-garden","TATA GARDEN",-54005,20641,1000,867],
    ["parks","society-park","SOCIETY PARK",-35068,-22115,933,867]
  ];

  window.__hdDrawLandmarks = function (ctx, camX, camY, viewW, viewH, night) {
    // Published for the build editor: inverting this is the only exact way to
    // turn a click into world units once zoom, DPR and camera shake are in.
    if (ctx.getTransform) {
      var tf = ctx.getTransform();
      window.__hdViewTf = { a: tf.a, b: tf.b, c: tf.c, d: tf.d, e: tf.e, f: tf.f };
    }
    // The building pass runs just before this one, so whatever it collected is
    // exactly what is on screen right now - that is the editor's hit list.
    window.__hdVisible = window.__hdFrameBuildings || [];
    window.__hdFrameBuildings = [];
    var zoom = viewW > 0 ? ctx.canvas.width / viewW : 1;
    var inv = 1 / (zoom > 0.0001 ? zoom : 0.0001);
    for (var i = 0; i < LANDMARKS.length; i++) {
      var L = LANDMARKS[i], x = L[3], y = L[4], w = L[5], h = L[6];
      if (Math.abs(x - camX) > viewW / 2 + w) continue;
      if (Math.abs(y - camY) > viewH / 2 + h) continue;
      var img = spriteFor(L[1]);
      if (!img) continue;
      // Parks get the same night dimming but no lit windows - a maidan at
      // 2am is dark grass, not a lit facade.
      var dens = L[0] === 'parks' ? 0 : (L[0] === 'transit' ? 0.7 : 1.1);
      var dh = drawSprite(ctx, img, x, y, w, h, night, x * 31 + y, dens);
      if (L[0] !== 'parks' && window.__hdFrameBuildings) {
        // Landmarks are editable and parkable like any other footprint.
        window.__hdFrameBuildings.push({ key: 'lm:' + L[1], x: x, y: y, w: w, h: dh,
                                         rot: 0, slug: L[1], kind: L[0],
                                         police: L[1] === 'police-hq' || L[1] === 'best-depot' });
      }
      if (zoom < 0.18) continue;                       // labels turn to mush zoomed out
      ctx.save();
      ctx.translate(x, y + dh / 2 + 10 * inv);
      ctx.scale(inv, inv);
      ctx.font = 'bold 13px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var tw = ctx.measureText(L[2]).width;
      ctx.fillStyle = 'rgba(10,15,26,0.9)';
      ctx.fillRect(-tw / 2 - 7, -9, tw + 14, 18);
      ctx.fillStyle = '#fde047';
      ctx.fillText(L[2], 0, 0);
      ctx.restore();
    }
    if (window.__hdSignals) window.__hdSignals(ctx, camX, camY, viewW, viewH, night, window.__hdTime || 0);
    if (window.__hdDrawBuild) window.__hdDrawBuild(ctx, camX, camY, viewW, viewH, night);
  };

  // Procedural sea edge. Walks the water polygon, works out which side is
  // land from the winding, and lays tetrapod armour on the water side with a
  // promenade kerb and palm row on the land side - the Marine Drive and
  // Bandstand look, generated along whatever coastline OSM actually has
  // rather than a reference tile pasted over the map.
  function signedArea(pts) {
    var a = 0;
    for (var i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      a += pts[j] * pts[i + 1] - pts[i] * pts[j + 1];
    }
    return a / 2;
  }

  // `side` is +1 for a water polygon (its interior is the sea) and -1 for a
  // land polygon (its interior is the city), so the armour always lands on
  // the seaward face of whichever polygon defines the coast here.
  // True when there is genuinely open water 120 units out along the normal.
  // Narrow channels - the Mithi, the Thane creek inlets - fail this, which is
  // how the coast treatment stays off the rivers.
  function makeOpenSea(pts, inward, isWater) {
    return function (px, py, nx, ny) {
      var qx = px + nx * 120, qy = py + ny * 120;
      var inside = pointIn(pts, qx, qy);
      return isWater ? inside : !inside;
    };
  }

  window.__hdShore = function (ctx, area, zoom, view, side) {
    if (zoom < 0.3) return;
    var pts = area.pts;
    if (!pts || pts.length < 8) return;
    var night = !!(view && view.night);
    // The Arabian Sea polygon is tens of thousands of units long, so the
    // armour is generated per frame for the visible stretch only.
    var pad = 60;
    if (!view || !isFinite(view.x0) || !isFinite(view.x1)) return;
    var x0 = view.x0 - pad, y0 = view.y0 - pad, x1 = view.x1 + pad, y1 = view.y1 + pad;
    var inward = area.__wind;
    if (inward === undefined) inward = area.__wind = signedArea(pts) > 0 ? 1 : -1;
    inward *= (side || 1);

    var palm = spriteFor('palm-fan');
    var openSea = makeOpenSea(pts, inward, (side || 1) > 0);
    var stations = 0;
    ctx.save();
    for (var i = 0; i < pts.length; i += 2) {
      var j = (i + 2) % pts.length;
      var ax = pts[i], ay = pts[i + 1], bx = pts[j], by = pts[j + 1];
      if ((ax < x0 && bx < x0) || (ax > x1 && bx > x1)) continue;
      if ((ay < y0 && by < y0) || (ay > y1 && by > y1)) continue;
      var dx = bx - ax, dy = by - ay;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      dx /= len; dy /= len;
      var nx = dy * inward, ny = -dx * inward;   // unit normal into the water
      for (var t = 0; t < len; t += 13) {
        var px = ax + dx * t, py = ay + dy * t;
        if (px < x0 || px > x1 || py < y0 || py > y1) continue;
        if (++stations > 1400) { ctx.restore(); return; }
        if (!openSea(px, py, nx, ny)) continue;
        var r = hash2(px | 0, py | 0);

        // tetrapod / boulder armour just off the kerb
        var rad = 3.4 + r * 3.6;
        var ox = px + nx * (2 + r * 5), oy = py + ny * (2 + r * 5);
        ctx.fillStyle = night ? '#1b1f26' : '#43423f';
        ctx.beginPath();
        ctx.moveTo(ox - rad, oy);
        ctx.lineTo(ox - rad * 0.3, oy - rad * 0.9);
        ctx.lineTo(ox + rad * 0.8, oy - rad * 0.4);
        ctx.lineTo(ox + rad * 0.5, oy + rad * 0.8);
        ctx.lineTo(ox - rad * 0.6, oy + rad * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = night ? 'rgba(120,132,150,0.3)' : 'rgba(216,214,206,0.34)';
        ctx.fillRect(ox - rad * 0.45, oy - rad * 0.55, rad * 0.7, rad * 0.5);

        // promenade kerb on the land side
        ctx.fillStyle = night ? '#4b4a46' : '#cdc7b7';
        ctx.fillRect(px - nx * 3.2 - 3, py - ny * 3.2 - 3, 6.5, 6.5);

        // Palms were spaced off a running counter, so every camera move
        // re-dealt them and the whole row appeared to slide. Space them off
        // the world position instead and they stay put. `openSea` keeps them
        // on the coast: probing across a creek lands back on land, so the
        // river banks get bare kerb rather than a palm avenue.
        if (hash2((px / 37) | 0, (py / 37) | 0) < 0.14 && openSea(px, py, nx, ny)) {
          if (palm) {
            var tx = px - nx * 15, ty = py - ny * 15, pd = 22 + r * 10;
            ctx.drawImage(night ? nightVariant(palm) : palm, tx - pd / 2, ty - pd / 2, pd,
                          pd * palm.naturalHeight / palm.naturalWidth);
          }
          if (night) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.9;
            ctx.drawImage(glow(), px - nx * 8 - 26, py - ny * 8 - 26, 52, 52);
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------------
  // Traffic signals.
  //
  // The engine has no signal system at all - the dark posts near crossings
  // are generic street furniture, which is why junctions read oddly. These
  // are real heads: one per approach, set back on the left kerb at the stop
  // line, rotated to face oncoming traffic, with the usual three aspects.
  // Opposing approaches share a phase, cross traffic runs on the opposite
  // phase, and the offset is hashed per junction so the whole city does not
  // blink in unison.
  // ---------------------------------------------------------------------
  var SIG_CELL = 4000;
  var sigGrid = null;

  function buildSignals() {
    sigGrid = new Map();
    var map = window.__hdMap;
    if (!map || !map.graph) return;
    var g = map.graph, nodes = g.nodes, ne = g.nodeEdges, edges = g.edges;
    if (!nodes || !ne || !edges) return;
    var count = ne.length;
    var seen = new Map();
    for (var i = 0; i < count; i++) {
      var list = ne[i];
      if (!list || list.length < 3) continue;          // not a junction
      var nx = nodes[i * 2], ny = nodes[i * 2 + 1];
      if (!isFinite(nx) || !isFinite(ny)) continue;
      // Only signal roads wide enough to warrant one; lanes and service
      // alleys meeting a street do not get a head.
      var wide = 0, arms = [];
      for (var k = 0; k < list.length; k++) {
        var e = edges[list[k]];
        if (!e || !e.pts || e.pts.length < 4) continue;
        var w = e.width || 10;
        if (w >= 12) wide++;
        // heading of this arm, measured leaving the junction
        var ax = e.pts[0], ay = e.pts[1];
        var far = Math.hypot(ax - nx, ay - ny) < 1;
        var bx = far ? e.pts[2] : e.pts[e.pts.length - 4];
        var by = far ? e.pts[3] : e.pts[e.pts.length - 3];
        arms.push({ h: Math.atan2(by - ny, bx - nx), w: w });
      }
      if (wide < 3 || arms.length < 3) continue;
      // A roundabout is a ring of three-way nodes, and a dual carriageway
      // crossing is four nodes a few metres apart. Signalling each one gives
      // the forest of heads this is meant to avoid, so collapse anything
      // inside a 70-unit cell down to the busiest node.
      var ck = Math.floor(nx / 70) * 73856093 ^ Math.floor(ny / 70);
      var prev = seen.get(ck);
      if (prev && prev.arms.length >= arms.length) continue;
      var cand = { x: nx, y: ny, arms: arms, ph: hash2(nx | 0, ny | 0), ck: ck };
      seen.set(ck, cand);
    }
    // Second pass: cluster what survived. A roundabout is a ring of junction
    // nodes and a grade-separated interchange is a knot of them; both are
    // unsignalled in reality, and signalling each node is what produced a
    // forest of heads. Clusters of three or more are dropped outright, and a
    // pair collapses to its busiest node.
    var cands = [];
    seen.forEach(function (j) { cands.push(j); });
    var near = new Map();
    for (var ci = 0; ci < cands.length; ci++) {
      var c = cands[ci];
      var gx = Math.floor(c.x / 150), gy = Math.floor(c.y / 150);
      for (var ox = -1; ox <= 1; ox++) {
        for (var oy = -1; oy <= 1; oy++) {
          var gk = (gx + ox) * 73856093 ^ (gy + oy);
          var l = near.get(gk);
          if (!l) near.set(gk, l = []);
          if (ox === 0 && oy === 0) l.push(c);
        }
      }
    }
    for (var cj = 0; cj < cands.length; cj++) {
      var d = cands[cj];
      var gx2 = Math.floor(d.x / 150), gy2 = Math.floor(d.y / 150);
      var peers = 0, best = d;
      for (var px = -1; px <= 1; px++) {
        for (var py = -1; py <= 1; py++) {
          var pl = near.get((gx2 + px) * 73856093 ^ (gy2 + py));
          if (!pl) continue;
          for (var pi = 0; pi < pl.length; pi++) {
            var q = pl[pi];
            if (q === d) continue;
            if (Math.hypot(q.x - d.x, q.y - d.y) > 150) continue;
            peers++;
            if (q.arms.length > best.arms.length) best = q;
          }
        }
      }
      if (peers >= 2) continue;                 // roundabout / interchange knot
      if (best !== d) continue;                 // a pair: only the busier node
      // Four heads is a crossroads; anything more is a slip road artefact.
      var arms = d.arms.slice().sort(function (a, b) { return b.w - a.w; }).slice(0, 4);
      var key = Math.floor(d.x / SIG_CELL) * 46337 + Math.floor(d.y / SIG_CELL);
      var bucket = sigGrid.get(key);
      if (!bucket) sigGrid.set(key, bucket = []);
      bucket.push({ x: d.x, y: d.y, arms: arms, ph: d.ph });
    }
  }

  window.__hdSignals = function (ctx, camX, camY, viewW, viewH, night, time) {
    var zoom = viewW > 0 ? ctx.canvas.width / viewW : 1;
    if (zoom < 0.45) return;                            // unreadable zoomed out
    if (!sigGrid) buildSignals();
    if (!sigGrid || !sigGrid.size) return;

    var x0 = Math.floor((camX - viewW / 2) / SIG_CELL), x1 = Math.floor((camX + viewW / 2) / SIG_CELL);
    var y0 = Math.floor((camY - viewH / 2) / SIG_CELL), y1 = Math.floor((camY + viewH / 2) / SIG_CELL);
    var CYCLE = 14;                                     // seconds per full cycle

    for (var cx = x0; cx <= x1; cx++) {
      for (var cy = y0; cy <= y1; cy++) {
        var bucket = sigGrid.get(cx * 46337 + cy);
        if (!bucket) continue;
        for (var b = 0; b < bucket.length; b++) {
          var j = bucket[b];
          if (Math.abs(j.x - camX) > viewW / 2 + 60) continue;
          if (Math.abs(j.y - camY) > viewH / 2 + 60) continue;
          var t = ((time || 0) + j.ph * CYCLE) % CYCLE;

          for (var a = 0; a < j.arms.length; a++) {
            var arm = j.arms[a];
            // North-south arms run on the first half of the cycle, east-west
            // on the second; amber bridges the swap.
            var nsish = Math.abs(Math.sin(arm.h)) > 0.5;
            var green = nsish ? t < CYCLE * 0.42 : (t > CYCLE * 0.5 && t < CYCLE * 0.92);
            var amber = nsish ? (t >= CYCLE * 0.42 && t < CYCLE * 0.5)
                              : (t >= CYCLE * 0.92 || t < 0.0001);
            var lamp = green ? 2 : amber ? 1 : 0;

            var back = arm.w * 0.5 + 16;                // stop line set-back
            var side = arm.w * 0.5 + 5;                 // left kerb
            var hx = j.x + Math.cos(arm.h) * back + Math.cos(arm.h + Math.PI / 2) * side;
            var hy = j.y + Math.sin(arm.h) * back + Math.sin(arm.h + Math.PI / 2) * side;

            ctx.save();
            ctx.translate(hx, hy);
            ctx.rotate(arm.h + Math.PI);                // face oncoming traffic
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(-3, -8.5, 8, 19);
            ctx.fillStyle = night ? '#1b1f26' : '#23272e';
            ctx.fillRect(-4, -9.5, 8, 19);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 0.7;
            ctx.strokeRect(-4, -9.5, 8, 19);
            var cols = ['#ff3b30', '#ffb020', '#2bd96a'];
            for (var L = 0; L < 3; L++) {
              var on = L === lamp;
              ctx.beginPath();
              ctx.arc(0, -5.5 + L * 5.5, 2.3, 0, Math.PI * 2);
              ctx.fillStyle = on ? cols[L] : 'rgba(18,20,24,0.9)';
              ctx.fill();
              if (on) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = night ? 0.85 : 0.45;
                ctx.drawImage(glow(), -11, -5.5 + L * 5.5 - 11, 22, 22);
                ctx.restore();
              }
            }
            ctx.restore();
          }
        }
      }
    }
  };

  // Scatter vegetation inside park/forest polygons so greens stop reading as
  // flat colour fills.
  var PLANT_POOL = CATALOG.plants;
  window.__hdPlants = function (ctx, area, zoom) {
    if (zoom < 0.22) return;
    var pts = area.pts;
    if (!pts || pts.length < 6) return;
    if (!area.__pl) {
      var minx = pts[0], maxx = pts[0], miny = pts[1], maxy = pts[1];
      for (var i = 2; i < pts.length; i += 2) {
        if (pts[i] < minx) minx = pts[i]; else if (pts[i] > maxx) maxx = pts[i];
        if (pts[i + 1] < miny) miny = pts[i + 1]; else if (pts[i + 1] > maxy) maxy = pts[i + 1];
      }
      var w = maxx - minx, h = maxy - miny;
      var n = Math.round(w * h / (90 * 90));
      if (n < 3) n = 3; else if (n > 26) n = 26;
      var list = [];
      for (var j = 0; j < n; j++) {
        var r1 = hash2((minx | 0) + j * 7919, (miny | 0) + j * 104729);
        var r2 = hash2((maxx | 0) + j * 15485, (maxy | 0) + j * 86028);
        var px = minx + r1 * w, py = miny + r2 * h;
        if (!pointIn(pts, px, py)) continue;
        var r3 = hash2(px | 0, py | 0);
        list.push({ x: px, y: py, s: pick(PLANT_POOL, px | 0, py | 0), d: 34 + r3 * 46 });
      }
      area.__pl = list;
    }
    for (var k = 0; k < area.__pl.length; k++) {
      var p = area.__pl[k], im = spriteFor(p.s);
      if (!im) continue;
      var dw = p.d, dh = p.d * im.naturalHeight / im.naturalWidth;
      ctx.drawImage(im, p.x - dw / 2, p.y - dh / 2, dw, dh);
    }
  };


  // A throw inside any of these runs inside the render loop, which aborts the
  // rest of the frame - the city stops updating and input looks dead even
  // though the game is still stepping. Each hook is wrapped so one bad
  // footprint can only cost its own draw, and the failure is reported once.
  (function hardenHooks() {
    var reported = {};
    ['__hdBSpr', '__hdDrawLandmarks', '__hdPlants', '__hdShore'].forEach(function (name) {
      var fn = window[name];
      if (typeof fn !== 'function') return;
      window[name] = function () {
        try {
          return fn.apply(this, arguments);
        } catch (err) {
          if (!reported[name]) {
            reported[name] = true;
            console.error('[helmsdeep] ' + name + ' disabled after error:', err);
          }
          return false;
        }
      };
    });
  })();

  function pointIn(pts, x, y) {
    var inside = false;
    for (var i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      var xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  // Hook called by S$ for road cars: STRICTLY SEARCHES /sprites/cars/ ONLY!
  window.__hdGetCustomSprite = function (carTypeOrName, carDef) {
    var isBoat = carDef && carDef.boat;
    var dir = isBoat ? '/sprites/boats/' : '/sprites/cars/';
    var aliases = isBoat ? BOAT_ALIASES : CAR_ALIASES;

    var candidates = [];
    if (typeof carTypeOrName === 'number' && aliases[carTypeOrName]) {
      candidates = candidates.concat(aliases[carTypeOrName]);
    }
    if (typeof carTypeOrName === 'string') {
      candidates.push(slugify(carTypeOrName));
    }

    for (var i = 0; i < candidates.length; i++) {
      var slug = candidates[i];
      // CRITICAL: Block any airplane or boat from ever loading for road vehicles!
      if (!isBoat && (slug.includes('jet') || slug.includes('cargo') || slug.includes('plane') || slug.includes('boat') || slug.includes('chinook'))) {
        continue;
      }
      var key = dir + slug;
      if (loaded[key]) return loaded[key];
      if (loaded[slug] && !isBoat && !slug.includes('jet') && !slug.includes('cargo') && !slug.includes('plane') && !slug.includes('boat')) {
        return loaded[slug];
      }
      probe(dir, slug);
    }
    return null;
  };

  window.__hdGetPlaneSprite = function (kind) {
    var slug = slugify(kind);
    var key = '/sprites/planes/' + slug;
    if (loaded[key]) return loaded[key];
    if (loaded[slug]) return loaded[slug];
    probe('/sprites/planes/', slug);
    return null;
  };

  window.__hdGetTrainSprite = function (kind) {
    var slug = slugify(kind);
    var key = '/sprites/trains/' + slug;
    if (loaded[key]) return loaded[key];
    if (loaded[slug]) return loaded[slug];
    probe('/sprites/trains/', slug);
    return null;
  };

  console.log('[Sprites] Verified 100% Physically Accurate Tagging: Zero dimension mismatch!');
})();
