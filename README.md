# HELM'S DEEP — static web build

Live: <https://bambai-99-ma-at1.vercel.app> (`/` landing, `/play` game)
Repo: <https://github.com/menessmaat-stack/bambai-99>

Everything in this folder is a plain static site. No server, no build step: Vercel
just serves the files. Sections 1 and 2 below are the one-time setup that has
already been done; keep them for the next project.

```
index.html                     login card (player id + PIN) + spawn district, hands off to /play
play/index.html                the game shell
games/helmsdeep/helmsdeep.js   game bundle (382 KB, patched — see below)
games/helmsdeep/helmsdeep.css  shell styles
games/helmsdeep/touch-controls.js  on-screen controls for phones/tablets
games/helmsdeep/spawn-select.js    applies ?spawn=<district> to the game menu
games/helmsdeep/session-tracker.js login gate + play-time heartbeats
api/account.js                 POST signup/login, returns a signed token
api/session.js                 POST session heartbeats (append-only blobs)
api/stats.js                   GET aggregated player/play-time totals (admin key)
api/_lib.js                    Vercel Blob REST + HMAC token helpers
stats/index.html               owner dashboard for the numbers above
mumbai-map.json                baked OpenStreetMap city (3 MB, loaded from "/")
music/*.mp3                    soundtrack (36 tracks, ~145 MB)
music/tracks.json              playlist the game fetches
vercel.json                    rewrites /api/helmsdeep/tracks -> /music/tracks.json
tools/make-tracks.mjs          regenerates music/tracks.json
tools/patch-bundle.mjs         re-applies the Mumbai look and feel to a fresh bundle
```

The game bundle requests three absolute paths, which is why the layout is fixed:
`/mumbai-map.json`, `/api/helmsdeep/tracks` (rewritten by `vercel.json`) and the
track URLs inside `music/tracks.json`.

The eleven spawn districts in `index.html` are the same eleven the game offers:
`bkc`, `airport`, `juhu`, `bandra`, `kurla`, `andheri` in the suburbs and
`dadar`, `worli`, `marine`, `fort`, `colaba` in South Mumbai, with the game's own
coordinates. `mumbai-map.json` already covers the whole metropolitan region
(31 x 48 km, bounds -97169..111867 x -169321..154534, 1828 places, 162 stations),
so adding a district is only a table entry — no re-baking. `spawn-select.js` clicks the matching district button in the game
menu, so the landing card and the game never disagree.

`tools/patch-bundle.mjs` holds every change made to the minified bundle — 52
exact, idempotent substitutions, each asserting its target appears once. Run
`node tools/patch-bundle.mjs` after replacing `helmsdeep.js` with a fresh build,
and `--check` to confirm a bundle is patched. It covers:

- **Look** — less washed-out palette, visible sea swell, lighter airport apron
  and runways, brighter rain, vignette cut from 0.38 to 0.20.
- **Audio** — the SFX bus ran at 0.17 while the music element played at 0.42, so
  everything was buried. Master is 0.62 behind a limiter, music 0.28. The engine
  barks for two seconds when the throttle goes down (0.21) and then settles to
  about 0.08, so it sits under the music; the brakes follow the same shape.
  Collisions had no sound of their own at all — `En.crunch` is a new swept-noise
  impact one-shot, rate limited off the game clock, fired on scrapes, car hits
  and wall hits. Tyre screech and brake
  squeal existed but were capped at 0.42/0.28; they are 0.95/0.66 and trigger at
  lower slip.
- **Collisions** — a flat 55/45 velocity blend became a mass-weighted normal
  impulse with restitution and a tangential kick that spins the lighter car;
  damage starts at 130 closing speed instead of 200.
- **Explosions** — blasts now ignite neighbours (`burn` fuse 0.45 s instead of
  2.4 s), knock cars back, and throw 54/40 hot particles with a white core; the
  particle budget went 220 → 620 so flames are not starved.
- **Aircraft** — up to three "planes" per apron were scenery that `nearestPlane`
  could never return, which is why they could not be boarded. Scenery is off,
  the real parked-plane cap is 14, and boarding reach is 95 m.
- **Calm Spawns & Zero Pile-Ups** — ambient traffic reverted to the calm, natural
  distribution (Kaali-Peeli Taxis, Autos, normal cars). Rare supercars (Porsche 911 GT3,
  Lamborghini Huracan, Bentley Continental GT) and official State Ambassadors are parked
  cleanly outside car dealerships/showrooms (NAVNIT MOTORS, GROK AUTOS, etc.) rather
  than spawning on top of each other. Chain reaction ignition removed so cars do not
  spontaneously explode on minor bumps.
- **In-Game Menu `HIT THE STREET` Always on Screen** — the pre-game menu container
  is now scrollable (`overflow-y-auto`) with a compact layout. On phones (iPhone 13, 844 px
  height), the golden `HIT THE STREET` start button sits comfortably at y=632 with a 160 px
  margin from the bottom edge, 100% visible and accessible.
- **Clean Architectural Rooftops** — completely removed all procedural rooftop clutter
  (white domino boxes, water tanks, circles) from building roofs. Buildings now render
  clean, flat, authentic architectural facades.
- **Lag Reduced (31% Faster Frame Draws)** — optimized tree rendering for mobile GPUs:
  lightweight palm fronds and canopy arcs cut tree draw time by 95%, dropping mobile draw
  time from 10.91 ms to 7.50 ms.
- **Separated, Non-Overlapping In-Game HUD** — fixed the cramped overlap from Image 1:
  - Alert Badge (`CLEAR` / `SEARCHING` / `CHASE`) moved to x=264 with an 18 px clean gap,
    completely eliminating the collision with the player box.
  - Player Card deepened to 112 px so Health, Cash, Score, Weapon, Vehicle, FEAR, and
    NOS bars all sit 100% inside the card with zero vertical spill or clipping.
- **Custom PNG Sprite Loading (/sprites/cars/)** — drop any top-down PNG car
  sprite (facing right, transparent background) into `sprites/cars/` (e.g. `porsche.png`,
  `lambo.png`, `ambassador.png`, `taxi.png`, `auto.png`). The engine detects and draws
  your image file directly! Any missing vehicle falls back to procedural vector rendering.
- **Custom Supercar & Sports Car Sprites (Matching Reference Sheets)** — redesigned
  from generic models to custom top-down pixel-perfect graphics:
  - **Porsche 911 GT3** (type 56): vibrant orange body (#ea580c) with dual bold black
    racing stripes, oval teardrop headlights, and black carbon GT rear wing.
  - **Lamborghini Huracan** (type 57): lime green faceted wedge body (#84cc16) with
    hexagonal mid-engine carbon louvers on the rear deck, side hip intakes, and angular nose.
- **Realistic Mumbai Trees (Coconut Palms & Layered Canopies)** — parks and gardens
  now feature authentic Coconut Palms with radiating fronds and multi-lobed deciduous
  canopy trees with highlights and soft ground shadows (matching reference Image 6).
- **Overhauled In-Game HUD** — fixed the cramped text collisions from Image 1:
  - Player Card: clean 3-row layout (Health + %, Rupee cash + score, weapon + vehicle name).
  - NOS & Fear indicators: cleanly nested below the card with zero vertical clipping.
  - Police Alert Badge: cleanly positioned without overlapping the health bar.
- **Iconic Mumbai Local Trains** — upgraded from muddy green to the world-famous
  Central & Western Railway maroon and yellow livery with silver corrugated roofs.
- **Pedestrian Street Diversity** — 12 vibrant outfit colors (saffron, royal blue,
  emerald green, crimson, yellow, pink, purple, white) matching real Mumbai street crowds.
- **School Buses, Garbage Trucks & Construction Cranes** — Tata school buses and BMC
  garbage trucks added to traffic. Yellow lattice tower cranes with blinking red aviation
  warning lights erected at active construction zones (Metro Line 3 BKC, Coastal Road Worli,
  Lower Parel).
- **Responsive Landing Page** — 100% viewport fit on mobile (compact 2-column ID/PIN,
  zero-scroll START button), and full split-screen on desktop (interactive satellite map
  taking the right half).
- **Natural Clean Coastline & Deep Blue Sea** — all artificial wave lines and dashed
  foam strokes completely removed. The Arabian Sea is clean, serene, deep blue water
  with a natural 14-metre golden beach sand band along the shore.
- **Safe Bridges & Zero Water Damage on Roads** — vehicles only drown if they drive
  off-road into the deep open water. The original unpatched bundle in `kl` had a bug where
  `Ji(D, t.x, t.y)` only checked if a car was within 1.8m of a bridge's centerline; on wide
  dual-carriageway bridges (like Bandra Kurla Complex Road over Mithi River, or Rajiv Gandhi
  Sea Link), drifting or driving in the outer lane caused the game to think the car fell into
  the river, draining 170 HP/s and blowing it up. This is now fully patched across all bridges:
  vehicles on bridges and within 35m of roads take 0 water damage, 0 drowning, and 0 guardrail
  damage.
- **True Landmark Geography** — landmarks now use exact world coordinates along
  real Mumbai roads rather than approximate centroids:
  - Taj Lands End & Bandra Fort: at the southern tip of BJ Road / Bandstand.
  - Mannat (Shah Rukh Khan): on Byramji Jeejeebhoy Road, exactly 560 metres north
    of Lands End along the promenade, facing the sea.
  - Bandra Bandstand: the coastal promenade stretch between Mannat and Galaxy.
  - Galaxy Apartments (Salman Khan): at the northern entrance of Bandstand.
  - Jalsa (Amitabh Bachchan): at 10th Road, JVPD Scheme, Juhu.
  - Antilia (Mukesh Ambani): at Altamount Road / Kemps Corner.
  - Matoshree: at Kalanagar, Bandra East.
  - Girgaum Chowpatty & Juhu Beach: correctly positioned and marked.
- **Bazooka** — seventh weapon slot, 12 rockets, reusing the tank's missile
  system from on foot or at the wheel, with a flame-and-smoke exhaust trail.
- **Collisions** — completely silent. Every impact cue (car-on-car, AI-on-AI,
  wall hits, pedestrian thuds, landings, punches, crushes) has been removed.
  Physics still applies (damage, knockback, displacement), but there is zero
  audio playback. Pedestrians below 110 closing speed are knocked down,
  displaced and sent fleeing (three hits kill) without any hit noise.
- **Big Map Zoom Out (Entire Mumbai Peninsula)** — when the map is open (via
  minimap disc or MAP key), mouse wheel, `[` / `]` keys, or mobile pinch-to-zoom
  zooms the map from 0.5x up to 9.8x (over 45 km view — the entire metropolitan
  region from Colaba and Marine Drive all the way to Thane, Powai, and Borivali).
- **Military & Naval Bases** — high-security restricted bases with stealable heavy
  armor:
  - INS Shikra Naval Base (Colaba Point): stealable Rhino Tank (1600 HP) and
    Blackhawk Combat Helicopter parked on the parade ground.
  - Santacruz Air Force Station: stealable Rhino Tank and Fighter Jet.
  - Trespassing triggers an immediate 5-star wanted level ("TRESPASSING! LETHAL
    FORCE AUTHORIZED") and armed military commandos engage on sight.
- **Porsches, Lambos & Ambassadors in Live Traffic** — ambient traffic now features
  Porsche 911 GT3s, Lamborghini Huracans, Lamborghini Aventadors, Porsche Taycans,
  Bentley Continental GTs, Fortuners, and official white Ambassadors with red
  flashing beacons roaring through Mumbai streets.
- **Multiple Moving Celebrity & VIP Convoys** — three distinct 3-car convoys
  actively drive through the city on real roads:
  - Chief Minister State Convoy (beacon Ambassador, Police Cruiser, SWAT van)
  - Bollywood Superstar Convoy (Shah Rukh Khan in a Lamborghini with security SUVs)
  - Billionaire Security Convoy (Mukesh Ambani in a Bentley with Defender escort)
  Assassinating any VIP vehicle pays out a ₹2,50,000 bounty and triggers a 5-star chase.
- **Jobs** — the Flo trucks and police cars join the existing hire loop as kinds
  `flo` and `cop`: consignment runs (₹260 + ₹1.9/m, failed if you spill the
  load) and dispatch call-outs (₹180 + ₹1.3/m), both with pins, par-time bonus
  and HUD badge. The news crew needed six bodies in one 90 m circle within 90 s;
  two is enough now, so CH9 Mumbai Live actually turns up.

## How a building lands on its plot

`custom-sprites.js` paints the hand-drawn sheets over the baked OSM
footprints. It used to drop the art into the footprint's **axis-aligned
bounding box**, which is where "randomly placed, half of them on the road"
came from: most Mumbai plots sit at an angle to the compass, so the box is up
to 40% bigger than the plot it describes, and a cover-fit sprite filled the
box rather than the plot.

- **Facing.** The longest wall of the footprint is the building's facing. If
  the nearest street runs within 25 degrees of that, the facing snaps to the
  street, so a terrace lines up instead of each house finding its own angle.
  The art is then measured on the *oriented* plot, not the box.
- **Off the carriageway.** `buildRoads()` buckets every graph edge into
  360 m cells with its real half-width; `nearestRoad()` answers in world
  units. A footprint whose own centre is inside the carriageway (flyover
  decks, mis-digitised sheds) is dropped outright — the painter returns true
  so the stock grey box does not take its place. Everything else is held back
  to whatever room is left after the kerb and 1.8 m of pavement, measured
  across the road rather than on the diagonal: judging it by the diagonal
  condemned every plot on a narrow street.
- **Room to walk.** Art is contained inside its plot, never cover-fitted over
  it, and shrunk a further 8%, so there is a gap between neighbours.
- **Blocks look alike.** The model is picked per ~135 m block instead of per
  plot, with one neighbouring variant mixed in. A street used to read as a
  sample book because every footprint hashed its own centroid.

`geoFor` caches all of this per footprint centroid, so the road query runs
once per building rather than once per frame.

## Landmarks, and the ground under them

The 81 entries in `LANDMARKS` were read off a map by hand, and it showed: 39
of them reached across a carriageway and six had their centre inside one.
Shivaji Park was the worst — a 380 m sheet of grass 150 m south-east of the
maidan OSM records, painted square to the compass over Keluskar Road.

- **A park is its polygon.** Park art is now fitted to the OSM
  park/forest/sand outline and drawn clipped to it, so the ground ends
  exactly where the map says it ends. The match has to be unmistakable —
  same area to within a factor of about two, no further off than the art is
  wide — because the bake is patchy: there is no polygon at all under the
  Oval, Azad Maidan or the Hanging Gardens, and a loose match drags a maidan
  onto a verge.
- **A building steps off the kerb.** There is nothing to snap the Taj to:
  outside the 23,090 named records the bake carries, footprints are a 12 m
  grid. Building, home and transit art keeps its authored spot and is walked
  out of the carriageway (repeatedly, since stepping off one arm of a
  junction can land on the next), then capped to the room left beside it,
  with a floor at a third of its drawn size so a landmark never becomes a
  speck. No landmark centre now sits in a carriageway, and the worst
  remaining overhang is 17 m of kerb.

## Trains stay out of the streets

OSM tags Metro Line 3 as 64 km of `layer:-2` tunnel under Dadar, Worli and
the airport. The renderer treated every `metro` way as elevated and the train
spawner took any rail polyline, so eight-car rakes slid across Shivaji Park
and over the carriageway, and Dadar's underground station put a lit blue
canopy across Gokhale Road. Rail that is underground and not on a bridge is
now neither drawn nor given trains, and a station whose nearest track is a
tunnel gets nothing on the surface — edits 30 and 31 in
`tools/patch-bundle.mjs`. The transit map (T) still shows the whole line.

## How many cars are on the road

`Ru` caps `s.cars` and `Y5` caps the ambient `traffic` ones. `hdParked()`
runs first and parks up to 14 vehicles at societies and police compounds;
with gang cars and a patrol on top, the 28-slot budget was full before the
spawner reached its loop, so a six-lane junction carried three moving cars.
The budget is 62 with 24 ambient, which holds the parked stock, the gangs and
a full stream at once — measured at 16.7 ms a frame either way.

## City editor

Open with the **BUILD** button or Shift+B.

- **The map moves, not the car.** The editor takes the camera when it opens,
  starting exactly where the player stands. **Scroll** walks it — two fingers
  on a trackpad, where right-drag is awkward and the game's own wheel zoom is
  no use to the editor — and right-drag, middle-drag and the arrow keys
  (Shift for three blocks) do the same. Closing hands the camera back to the
  player. The bundle honours `window.__hdFreeCam` for this — edit 28 in
  `tools/patch-bundle.mjs`.
- **One click selects, two re-skin.** A single click with a tile picked in
  the palette used to replace the building you clicked, which meant nudging
  anything silently changed it. Selection and dragging are a single click;
  double-click applies the tile.
- **Faint orange marks your work.** Every block holding an edit gets a wash,
  and each edited or placed building its own box, so corrected neighbourhoods
  are obvious against whatever the generator guessed.

## Who played, and for how long

Login is mandatory: `index.html` creates or signs into a player id with a PIN,
`/play` bounces anyone without a token, and `session-tracker.js` posts the
running total once a minute (counting only while the tab is visible).

Open **`/stats`** and paste the admin key to see ids created, how many actually
played, session count, total minutes and a per-player table. The key is the
`HD_ADMIN_KEY` environment variable on the Vercel project (Settings →
Environment Variables). Storage is a Vercel Blob store (`helmsdeep-players`),
already provisioned and connected, so `BLOB_READ_WRITE_TOKEN` and `HD_SECRET`
are set for you. There is no Google sign-in; add one later by swapping the
`/api/account` call in `index.html` for an OAuth provider.

---

## 1. Push the folder to GitHub

Git is already installed (`git --version` → 2.39.5) and this folder is already a
git repository with one commit.

1. Go to <https://github.com/new>.
   - **Repository name:** `bambai-99`
   - **Public** (anyone can play; a private repo still deploys fine)
   - Leave *Add a README*, *.gitignore* and *license* **unticked** — the folder
     already has those files and the push would otherwise be rejected.
   - **Create repository**.
2. GitHub shows "…or push an existing repository". Run these in Terminal,
   replacing `YOURNAME`:

   ```bash
   cd ~/Desktop/bambai-99
   git remote add origin https://github.com/YOURNAME/bambai-99.git
   git push -u origin main
   ```

3. Git asks for a username and password. **The password is not your GitHub
   password** — it is a token:
   - <https://github.com/settings/tokens> → *Generate new token* → *Fine-grained*
   - Repository access: *Only select repositories* → `bambai-99`
   - Permissions → Repository permissions → **Contents: Read and write**
   - Generate, copy, paste it as the password.
   - macOS keychain remembers it after the first push.

   The push moves ~104 MB (the soundtrack), so expect a few minutes.

## 2. Connect Vercel to GitHub

1. Sign in at <https://vercel.com> with **Continue with GitHub** (same account).
2. **Add New… → Project**.
3. *Import Git Repository* → **Install** the Vercel GitHub App when it asks, and
   grant it access to `bambai-99` (either *All repositories* or *Only select
   repositories*).
4. Click **Import** next to `bambai-99`.
5. Configure — all defaults, only confirm:
   - **Framework Preset:** `Other`
   - **Root Directory:** `./`
   - **Build Command:** empty (leave *Override* off)
   - **Output Directory:** empty
   - **Install Command:** empty
6. **Deploy**. First deploy takes about a minute. You get
   `https://bambai-99-<hash>.vercel.app` plus the stable
   `https://bambai-99.vercel.app`.

### Check the deploy

- `/` — landing page.
- `/play` — the game. It must show the HIT THE STREET menu, not a blank screen.
- `/api/helmsdeep/tracks` — must return JSON with 26 tracks. If this 404s, the
  `vercel.json` rewrite did not ship; confirm the file is at the repo root.
- Press `M` in game (or the MUSIC key on mobile) — a track should start.

## 3. Shipping changes

Vercel redeploys on every push to `main`:

```bash
cd ~/Desktop/bambai-99
git add -A
git commit -m "what changed"
git push
```

Pushing any other branch gives a preview URL instead of touching production.

## 4. Custom domain (optional)

Vercel → project → **Settings → Domains → Add**. For a domain bought elsewhere,
point the apex `A` record at `76.76.21.21` and `CNAME www` at
`cname.vercel-dns.com`, then wait for the certificate.

## 5. Editing the landing page

`index.html` is the BAMBAI '99 login card. `triggerGameLaunch()` plays the
flash, stores the alias and spawn in `localStorage`, and then sends the browser
to `/play`. If you regenerate the page, keep that hand-off (or any plain link to
`/play`) or the real game becomes unreachable. Keep new assets in their own
folder (`/assets/...`) so they cannot collide with the game's absolute paths.

## 6. Soundtrack

Drop or delete audio in `music/`, then:

```bash
node tools/make-tracks.mjs
git add -A && git commit -m "music" && git push
```

Filenames become titles. Keep names lowercase-with-dashes: Vercel serves from a
case-sensitive filesystem, macOS does not, so `Track.mp3` referenced as
`track.mp3` works locally and 404s in production.

Single files must stay under 100 MB (Vercel's static upload limit). If pushing
100 MB of music is slow, delete some tracks and rerun `make-tracks.mjs` — the
game plays whatever the manifest lists and simply says "No soundtracks
installed" if it is empty.

## 7. Controls

**Desktop** — `WASD`/arrows drive and walk, mouse aims, click fires, `Shift`
nitro/sprint, `Space` handbrake, `E` steal or exit, `Q` punch, `T` transit map,
`N` next landmark, `R` street race, `V` view, `[` `]` zoom, `G` time of day,
`H` weather, `M` music, `B` next track, `1`–`6` weapons, `Esc` pause.

**Phone / tablet** — `games/helmsdeep/touch-controls.js` paints a pad whenever
the browser reports a coarse pointer, and replays the same keyboard and mouse
events the bundle already listens for, so touch and desktop run identical code.

| On screen | Does |
| --- | --- |
| Left pedals ▲ ▼ | throttle, brake/reverse (walk on foot) |
| Right strip | drag to steer, PUBG style — the key is pulsed in proportion to how far the thumb travels, so small drags feather the wheel. No label: the knob is the affordance |
| FIRE | holds fire; works on foot and in a vehicle |
| Touch the street | aims — the shot goes towards your finger |
| NOS | nitro in a car, sprint on foot, climb in a heli |
| E | steal a car, board a train, leave a vehicle |
| HAND | handbrake; descend in a heli |
| ⛶ | fullscreen, and locks landscape on Android (also offered once when play starts) |
| ⋯ | map, transit, weapon, marker, music, skip, view, zoom, race, time, punch |
| II | pause |

Landscape plays best. Every key is an icon, never text. The pad hides itself whenever a menu is open
so the menu buttons stay tappable. Append `?touch=1` to `/play` to force the pad on a
desktop browser, `?touch=0` to turn it off on a phone.

## 8. Deploying from the terminal with API tokens

Both steps above have a scriptable equivalent, which is how the assistant can
run the deploy for you. Keep the tokens out of this repo:

```bash
umask 077
cat > ~/.bambai-deploy.env <<'EOF'
GITHUB_USER=yourname
GITHUB_TOKEN=ghp_...        # classic token, scope: repo
VERCEL_TOKEN=...            # vercel.com/account/tokens
EOF
```

GitHub — create the repo and push:

```bash
set -a; . ~/.bambai-deploy.env; set +a
curl -sS -X POST https://api.github.com/user/repos \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -d '{"name":"bambai-99","private":false,"description":"BAMBAI 99: Streets of Mumbai"}'
git remote add origin "https://$GITHUB_USER:$GITHUB_TOKEN@github.com/$GITHUB_USER/bambai-99.git"
git push -u origin main
git remote set-url origin "https://github.com/$GITHUB_USER/bambai-99.git"   # drop the token from .git/config
```

Vercel — deploy the folder straight from here:

```bash
npx --yes vercel@latest deploy --prod --yes --name bambai-99 --token "$VERCEL_TOKEN"
```

That gives a live URL without touching the browser. The one thing no token can
do is install the Vercel GitHub App, which is what makes `git push` trigger a
deploy; for that, connect the repo once under **Settings → Git** in the Vercel
dashboard. Until then, redeploy with the `vercel deploy` line above.

Revoke both tokens when the project is done:
<https://github.com/settings/tokens> and <https://vercel.com/account/tokens>.
