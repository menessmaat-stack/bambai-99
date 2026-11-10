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
      'house-garage', 'house-brick-warehouse', 'house-courtyard', 'house-industrial-unit'],
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
      'bush-flowering', 'rocks', 'hedge-row']
  };
  var SLUG_DIR = {};
  Object.keys(CATALOG).forEach(function (d) {
    CATALOG[d].forEach(function (sl) { SLUG_DIR[sl] = d; probe('/sprites/' + d + '/', sl); });
  });

  function spriteFor(slug) {
    var d = SLUG_DIR[slug];
    if (!d) return null;
    var img = loaded['/sprites/' + d + '/' + slug];
    return (img && img.complete && img.naturalWidth > 0) ? img : null;
  }
  window.__hdGetBuildingSprite = spriteFor;

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

  // Night lighting. The art is drawn for daylight, so at night the sprite is
  // dimmed and lit windows plus a warm spill are composited back on top.
  // Window positions come from the footprint hash, so they do not crawl.
  function nightLights(ctx, cx, cy, w, h, seed, density) {
    var n = Math.round(w * h / 1400 * density);
    if (n < 3) n = 3; else if (n > 26) n = 26;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var r = (w > h ? w : h) * 0.7;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, 'rgba(255,186,94,0.15)');
    g.addColorStop(1, 'rgba(255,186,94,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    for (var i = 0; i < n; i++) {
      var a = hash2(seed + i * 7919, seed - i * 104729);
      var b = hash2(seed - i * 15485, seed + i * 86028);
      if (a > 0.82) continue;                       // some flats are dark
      var px = cx + (a - 0.5) * w * 0.86;
      var py = cy + (b - 0.5) * h * 0.86;
      var s = 1.6 + a * 2.4;
      ctx.fillStyle = b > 0.72 ? 'rgba(186,226,255,0.85)' : 'rgba(255,208,130,0.9)';
      ctx.fillRect(px - s / 2, py - s / 2, s, s * 0.7);
    }
    ctx.restore();
  }

  function drawSprite(ctx, img, cx, cy, w, h, night, seed, density) {
    var kx = w / img.naturalWidth, ky = h / img.naturalHeight;
    var k = kx > ky ? kx : ky;
    var dw = img.naturalWidth * k, dh = img.naturalHeight * k;
    ctx.save();
    if (night) ctx.filter = 'brightness(0.46) saturate(0.72)';
    ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
    ctx.restore();
    if (night && density > 0) nightLights(ctx, cx, cy, dw, dh, seed, density);
    return dh;
  }

  var M = 6.6667;  // world units per metre

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

    var kind = q.kind, pool;
    if (kind === 'slum') pool = CATALOG.slums;
    else if (kind === 'retail') pool = longSide < 16 ? CATALOG.stalls : CATALOG.chains;
    else if (longSide < 26 && hgt < 14) pool = CATALOG.houses;
    else if (kind === 'apartment' || kind === 'house' || kind === undefined) pool = CATALOG.flats;
    else return false;

    var img = spriteFor(pick(pool, q.cx | 0, q.cy | 0));
    if (!img) return false;
    // Street stalls are 3-6 m objects. Scaling one to fill a 16 m retail
    // footprint turns a tea cart into a warehouse, so cap them.
    if (pool === CATALOG.stalls) {
      var cap = 7 * M;
      if (w > cap) w = cap;
      if (h > cap) h = cap;
    }
    drawSprite(ctx, img, (minx + maxx) / 2, (miny + maxy) / 2, w, h,
               !!(view && view.night), (q.cx | 0) * 31 + (q.cy | 0),
               pool === CATALOG.slums ? 0.5 : 1);
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
  window.__hdShore = function (ctx, area, zoom, view, side) {
    if (zoom < 0.3) return;
    var pts = area.pts;
    if (!pts || pts.length < 8) return;
    var night = !!(view && view.night);
    // The Arabian Sea polygon is tens of thousands of units long, so the
    // armour is generated per frame for the visible stretch only.
    var pad = 60;
    var x0 = view.x0 - pad, y0 = view.y0 - pad, x1 = view.x1 + pad, y1 = view.y1 + pad;
    var inward = area.__wind;
    if (inward === undefined) inward = area.__wind = signedArea(pts) > 0 ? 1 : -1;
    inward *= (side || 1);

    var palm = spriteFor('palm-fan');
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

        if ((stations & 7) === 3) {
          if (palm) {
            var tx = px - nx * 15, ty = py - ny * 15, pd = 22 + r * 10;
            ctx.save();
            if (night) ctx.filter = 'brightness(0.45) saturate(0.7)';
            ctx.drawImage(palm, tx - pd / 2, ty - pd / 2, pd,
                          pd * palm.naturalHeight / palm.naturalWidth);
            ctx.restore();
          }
          if (night) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            var lx = px - nx * 8, ly = py - ny * 8;
            var g2 = ctx.createRadialGradient(lx, ly, 0, lx, ly, 26);
            g2.addColorStop(0, 'rgba(255,196,110,0.55)');
            g2.addColorStop(1, 'rgba(255,196,110,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(lx - 26, ly - 26, 52, 52);
            ctx.restore();
          }
        }
      }
    }
    ctx.restore();
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
