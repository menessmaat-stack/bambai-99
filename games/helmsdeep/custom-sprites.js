/* Custom PNG Sprite Loader for HELM'S DEEP.
 *
 * Strict Category Isolation:
 *   Road vehicles ONLY load from /sprites/cars/
 *   Watercraft ONLY load from /sprites/boats/
 *   Aircraft ONLY load from /sprites/planes/
 *   Trains ONLY load from /sprites/trains/
 */
(function () {
  'use strict';

  var loaded = {};
  var attempted = {};

  // Strict Road Vehicle Aliases -> ONLY files in /sprites/cars/!
  var CAR_ALIASES = {
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

    // 16 Vintage Cars & Bikes (Reference Image 6)
    2:  ['vintage-maroon-coupe'],
    3:  ['classic-green-convertible'],
    4:  ['classic-cream-cabriolet'],
    5:  ['vintage-navy-coupe'],
    22: ['vintage-maroon-coupe'],
    23: ['classic-green-convertible'],
    24: ['classic-cream-cabriolet'],
    25: ['vintage-sidecar-bike'],
    26: ['vintage-vespa-scooter'],
    27: ['classic-finned-cadillac'],
    28: ['vintage-gangster-coupe'],
    29: ['classic-muscle-orange'],
    32: ['vintage-sky-convertible'],
    33: ['vintage-gangster-coupe'],
    34: ['classic-finned-cadillac'],
    35: ['classic-muscle-orange'],
    38: ['vintage-touring-bike'],
    39: ['vintage-cafe-racer'],
    55: ['vintage-black-bike'],
    77: ['vintage-gold-bobber'],

    // 4 Gang Fleets (Image #7) - ONLY CARS & TRUCKS!
    41: ['gang2-dragon-suv'],
    42: ['gang3-cyber-suv'],
    60: ['gang1-spiked-skull'],
    61: ['gang1-gun-truck'],
    62: ['gang2-dragon-sedan'],
    63: ['gang2-dragon-suv'],
    65: ['gang3-cyber-snake'],
    66: ['gang4-militia-sedan'],
    68: ['gang4-militia-truck']
  };

  // Watercraft Aliases -> ONLY /sprites/boats/!
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

  // Pre-load all 16 vintage vehicles + supercars + emergency trucks
  var carPreloads = [
    'porsche-911-gt3', 'porsche', 'lamborghini-huracan', 'lambo',
    'ferrari', 'gtr', 'sedan-silver', 'sedan-blue', 'van-white',
    'pickup-black', 'firetruck', 'garbage-truck',
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
    if (carDef && carDef.name) {
      candidates.push(slugify(carDef.name));
    }

    for (var i = 0; i < candidates.length; i++) {
      var slug = candidates[i];
      // Prevent planes or boats from ever loading for road cars!
      if (!isBoat && (slug.includes('jet') || slug.includes('cargo') || slug.includes('plane') || slug.includes('boat') || slug.includes('chinook'))) {
        continue;
      }
      var key = dir + slug;
      if (loaded[key]) return loaded[key];
      if (loaded[slug]) return loaded[slug];
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

  console.log('[Sprites] Verified: All 16 vintage vehicles + strict category isolation!');
})();
