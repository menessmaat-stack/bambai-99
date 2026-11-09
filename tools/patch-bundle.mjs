/* Mumbai look pass over the prebuilt game bundle.
 *
 *   node tools/patch-bundle.mjs            # patch games/helmsdeep/helmsdeep.js
 *   node tools/patch-bundle.mjs --check    # verify it is already patched
 *
 * The bundle ships minified from the Next.js build, so these are exact string
 * substitutions. Each one asserts its target is present, and each is idempotent
 * (running twice is a no-op), so re-run this after dropping in a fresh bundle.
 *
 * What it changes, and why:
 *  - sea, land and greens were close to grey, which read as washed out. The
 *    palette is nudged towards saturated water and warmer ground so roads
 *    (cool grey) separate from land (warm) instead of blending into it.
 *  - the sea already had a sine-wave swell, but at 0.2 alpha and 0.4 m stroke
 *    it was invisible at play zoom. Amplitudes, opacity and widths are raised
 *    and a third long-period swell is added.
 *  - "Cabbie" was painted as a yellow NYC cab with a checker stripe. Mumbai's
 *    kaali-peeli is a black car with a yellow roof, so the body goes black and
 *    the roof panel is overpainted taxi yellow.
 *  - taxis and autos were ~4% and ~5% of traffic. On a Mumbai street they are
 *    everywhere, so their weight in the ambient traffic table goes up.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'games/helmsdeep/helmsdeep.js';

/** [description, find, replace] — `find` must be unique in the bundle. */
const EDITS = [
  // ---- palette: stop the city looking washed out -------------------------
  ['day sea', 'sea:"#20536a"', 'sea:"#17658a"'],
  ['day land', 'land:"#4f4d49"', 'land:"#615a4f"'],
  ['day park', 'park:"#4e7f45"', 'park:"#55914a"'],
  ['day forest', 'forest:"#3e6b3a"', 'forest:"#44793c"'],
  ['day kerb', 'kerb:"#9b968b"', 'kerb:"#aaa294"'],
  ['day median', 'median:"#6d6a62"', 'median:"#7b7568"'],
  ['night sea', 'sea:"#102a39"', 'sea:"#0d3448"'],
  ['night land', 'land:"#23242a"', 'land:"#2a2922"'],

  // ---- sea: make the swell actually visible -------------------------------
  [
    'wave layers',
    'I(0,2.4*G,38*G,0.9,n.night?"rgba(150,186,226,0.14)":"rgba(240,250,255,0.2)",Math.max(0.4*G,Y)),' +
    'I(V*0.5,1.5*G,23*G,-1.3,n.night?"rgba(120,156,200,0.09)":"rgba(214,236,250,0.12)",Math.max(0.25*G,Y*0.7))',
    'I(V*0.25,5.2*G,74*G,0.45,n.night?"rgba(96,136,178,0.18)":"rgba(255,255,255,0.16)",Math.max(1.8*G,Y*1.5)),' +
    'I(0,3.4*G,38*G,0.9,n.night?"rgba(150,186,226,0.28)":"rgba(240,250,255,0.44)",Math.max(1.1*G,Y)),' +
    'I(V*0.5,2.2*G,23*G,-1.3,n.night?"rgba(120,156,200,0.2)":"rgba(214,236,250,0.3)",Math.max(0.7*G,Y*0.7))'
  ],

  // ---- Cabbie: kaali-peeli, not a New York checker cab --------------------
  [
    'kaali-peeli livery',
    'H5(e,n,u,["#e8b431","#b5861c","#f4d36a"]);let l=n,o=u;' +
    'for(let i=0;i<10;i++)e.fillStyle=i%2===0?"#17181b":"#f2efe6",' +
    'e.fillRect(l*0.06+i*(l*0.088),o/2-1.5,l*0.088,1.5),' +
    'e.fillStyle=i%2===0?"#f2efe6":"#17181b",' +
    'e.fillRect(l*0.06+i*(l*0.088),o/2,l*0.088,1.5);',
    'H5(e,n,u,["#17181c","#0b0c0e","#2b2d33"]);let l=n,o=u;' +
    'e.fillStyle="#f5b000",a(e,l*0.405,1.9,l*0.27,o-3.8,2.4),e.fill(),' +
    'e.strokeStyle="rgba(12,10,2,0.55)",e.lineWidth=0.7,' +
    'a(e,l*0.405,1.9,l*0.27,o-3.8,2.4),e.stroke(),' +
    'e.fillStyle="rgba(255,255,255,0.14)",e.fillRect(l*0.405,2.4,l*0.27,1.1);'
  ],

  // ---- traffic mix: Mumbai runs on taxis and autos ------------------------
  [
    'traffic weights',
    'var Yi=[0,0,0,1,1,2,3,5,6,7,7,8,8,8,9,12,12,12,14,',
    'var Yi=[0,0,0,1,1,2,3,5,6,7,7,8,8,8,9,12,12,12,12,12,12,12,12,12,12,12,54,54,54,14,'
  ]
];

const check = process.argv.includes('--check');
let src = readFileSync(FILE, 'utf8');
let applied = 0;
let already = 0;

for (const [what, find, replace] of EDITS) {
  const hits = src.split(find).length - 1;
  if (hits === 0) {
    if (src.includes(replace)) {
      already++;
      console.log(`  = ${what} (already patched)`);
      continue;
    }
    console.error(`FAIL ${what}: target string not found and replacement absent`);
    process.exit(1);
  }
  if (hits > 1) {
    console.error(`FAIL ${what}: target string appears ${hits} times, expected 1`);
    process.exit(1);
  }
  src = src.replace(find, replace);
  applied++;
  console.log(`  + ${what}`);
}

if (check) {
  console.log(applied ? `${applied} edit(s) NOT applied` : 'bundle is patched');
  process.exit(applied ? 1 : 0);
}
if (applied) writeFileSync(FILE, src);
console.log(`${applied} applied, ${already} already in place`);
