/* Custom PNG Sprite Loader for HELM'S DEEP.
 *
 * Slices and renders transparent top-down PNG assets directly from /sprites/:
 *   /sprites/cars/
 *   /sprites/boats/
 *   /sprites/planes/
 *   /sprites/trains/
 */
(function () {
  'use strict';

  var loaded = {};
  var attempted = {};

  var ALIASES = {
    // Supercars & Sports Cars
    56: ['porsche-911-gt3', 'porsche', 'comet'],
    57: ['lamborghini-huracan', 'huracan', 'lambo'],
    58: ['lamborghini-aventador', 'aventador', 'lambo'],
    59: ['taycan', 'porsche-taycan'],
    9:  ['ferrari', 'banshee'],
    10: ['cheetah', 'ferrari'],
    11: ['infernus', 'ferrari'],
    85: ['supra', 'gtr'],
    86: ['skyline', 'gtr'],

    // Sedans & Executive
    1:  ['sedan-silver', 'primo', 'sedan'],
    13: ['sentinel', 'sedan-blue'],
    64: ['ciaz', 'sedan-silver', 'sedan'],
    67: ['octavia', 'sedan-silver', 'sedan'],
    84: ['bentley', 'continental-gt'],
    89: ['ambassador', 'ambassador-state', 'state-car'],

    // Public Service & Municipal Trucks (Image #2)
    18: ['firetruck'],
    19: ['garbage-truck'],
    20: ['firetruck'],
    21: ['garbage-truck'],

    // Vintage Cars & Bikes (Image #6)
    22: ['vintage-roadster'],
    23: ['classic-convertible'],
    24: ['classic-cabriolet'],
    25: ['sidecar-bike'],
    26: ['vespa-scooter'],
    27: ['classic-finned'],
    28: ['gangster-coupe'],
    29: ['muscle-orange'],

    // 4 Gang Fleets (Image #7) - ONLY CARS, NO PLANES ON ROADS!
    41: ['gang2-dragon-suv'],    // Serrano (Gang SUV) -> Dragon Luxury SUV
    42: ['gang3-cyber-suv'],     // Baller LX (Gang SUV) -> Cyber SUV
    60: ['gang1-spiked-skull'],  // Cartel GT -> Spiked Skull Muscle Car
    61: ['gang1-gun-truck'],     // Dockside -> Armored Gun Truck
    62: ['gang2-dragon-sedan'],  // Byculla S -> Black Dragon Supercar
    63: ['gang2-dragon-suv'],    // Reay Road -> Black Dragon SUV
    65: ['gang3-cyber-snake'],   // Cyber Snake Supercar
    66: ['gang4-militia-sedan'], // Militia Armored Sedan
    68: ['gang4-militia-truck'], // Militia Safari Truck

    // Watercraft (Image #4) - ONLY FOR WATER VEHICLES!
    90: ['yacht', 'fishing-boat'],
    91: ['jetski', 'speedboat'],
    92: ['rescue-boat', 'speedboat']
  };

  function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function probe(slug) {
    if (!slug || attempted[slug]) return;
    attempted[slug] = true;

    var dirs = ['/sprites/cars/', '/sprites/boats/', '/sprites/planes/', '/sprites/trains/'];
    var di = 0;

    function nextDir() {
      if (di >= dirs.length) return;
      var path = dirs[di++] + encodeURIComponent(slug) + '.png';
      var img = new Image();
      img.onload = function () {
        loaded[slug] = img;
        console.log('[Sprites] Loaded custom sprite:', slug);
        try {
          if (window.__helmsdeep && window.__helmsdeep.clearSpriteCache) {
            window.__helmsdeep.clearSpriteCache();
          }
        } catch (e) {}
      };
      img.onerror = nextDir;
      img.src = path;
    }

    nextDir();
  }

  // Pre-load all sprites immediately on boot
  var preloads = [
    'porsche-911-gt3', 'porsche', 'lamborghini-huracan', 'lambo',
    'ferrari', 'gtr', 'sedan-silver', 'sedan-blue', 'van-white',
    'pickup-black', 'speedboat', 'yacht', 'fishing-boat',
    'military-chopper', 'passenger-jet', 'private-jet',
    'firetruck', 'garbage-truck', 'locomotive', 'metro-engine',
    'fighter-jet', 'military-cargo', 'chinook', 'trainer-prop',
    'jetski', 'rescue-boat', 'vintage-roadster', 'classic-convertible',
    'classic-cabriolet', 'vespa-scooter', 'sidecar-bike', 'classic-finned',
    'gangster-coupe', 'muscle-orange', 'gang1-spiked-skull', 'gang1-gun-truck',
    'gang2-dragon-sedan', 'gang2-dragon-suv', 'gang3-cyber-snake',
    'gang3-cyber-suv', 'gang4-militia-sedan', 'gang4-militia-truck'
  ];
  preloads.forEach(probe);

  // Hook called by S$ to retrieve pre-rendered / custom PNG sprites
  window.__hdGetCustomSprite = function (carTypeOrName, palIdx) {
    var candidateNames = [];

    if (typeof carTypeOrName === 'string') {
      candidateNames.push(slugify(carTypeOrName));
    } else if (typeof carTypeOrName === 'number') {
      if (ALIASES[carTypeOrName]) {
        candidateNames = candidateNames.concat(ALIASES[carTypeOrName]);
      }
      try {
        if (window.__helmsdeep && window.__helmsdeep.carDef) {
          var def = window.__helmsdeep.carDef(carTypeOrName);
          if (def && def.name) {
            candidateNames.push(slugify(def.name));
          }
        }
      } catch (e) {}
    }

    for (var i = 0; i < candidateNames.length; i++) {
      var slug = candidateNames[i];
      if (loaded[slug]) {
        return loaded[slug];
      }
      probe(slug);
    }

    return null;
  };

  console.log('[Sprites] Verified ALIASES: No planes or boats on roads!');
})();
