/* Custom PNG Sprite Loader for HELM'S DEEP.
 *
 * Slices and renders transparent top-down PNG assets directly from /sprites/:
 *   /sprites/cars/
 *   /sprites/boats/
 *   /sprites/planes/
 */
(function () {
  'use strict';

  var loaded = {};
  var attempted = {};

  var ALIASES = {
    // Supercars & Sports Cars
    56: ['porsche-911-gt3', 'porsche', 'comet'],
    57: ['lamborghini-huracan', 'huracan', 'lambo', 'vacca'],
    58: ['lamborghini-aventador', 'aventador', 'lambo-aventador', 'zentorno'],
    59: ['taycan', 'porsche-taycan', 'osiris'],
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

    // Utility & Vans
    21: ['van-white', 'van', 'burrito'],
    22: ['pony', 'van-white', 'van'],
    18: ['bobcat', 'pickup-black', 'pickup'],
    19: ['yosemite', 'pickup-black', 'pickup'],

    // Taxis & Public Transit
    12: ['cabbie', 'taxi', 'kaali-peeli'],
    54: ['auto', 'rickshaw', 'auto-rickshaw'],
    28: ['school-bus', 'bus'],
    26: ['trashmaster', 'garbage-truck', 'bmc-truck'],

    // Emergency & Military
    30: ['cruiser', 'police', 'police-cruiser'],
    45: ['swat-van', 'swat', 'enforcer'],
    43: ['rhino', 'tank'],
    44: ['military-chopper', 'blackhawk', 'helicopter'],

    // Boats
    90: ['yacht', 'alibaug-ferry', 'ferry'],
    91: ['speedboat'],
    92: ['police-speedboat', 'coast-guard', 'speedboat']
  };

  function slugify(name) {
    return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function probe(slug) {
    if (attempted[slug]) return;
    attempted[slug] = true;

    var dirs = ['/sprites/cars/', '/sprites/boats/', '/sprites/planes/'];
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

  // Pre-load common sprites immediately on boot
  var preloads = [
    'porsche-911-gt3', 'porsche', 'lamborghini-huracan', 'lambo',
    'ferrari', 'gtr', 'sedan-silver', 'sedan-blue', 'van-white',
    'pickup-black', 'speedboat', 'yacht', 'fishing-boat',
    'military-chopper', 'passenger-jet', 'private-jet'
  ];
  preloads.forEach(probe);

  // Hook called by S$(typeIndex, palIndex) inside helmsdeep.js
  window.__hdGetCustomSprite = function (typeId, carDef) {
    var nameSlug = slugify(carDef ? carDef.name : '');
    if (nameSlug && loaded[nameSlug]) return loaded[nameSlug];

    var list = ALIASES[typeId] || [];
    for (var i = 0; i < list.length; i++) {
      var candidate = list[i];
      if (loaded[candidate]) return loaded[candidate];
      if (!attempted[candidate]) probe(candidate);
    }

    if (nameSlug && !attempted[nameSlug]) probe(nameSlug);
    return null;
  };

  window.__hdCustomSprites = loaded;
  console.log('[Sprites] Custom PNG sprite system active with 16 high-res sprites.');
})();
