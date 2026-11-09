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
- **Sea** — the open water keeps a faint swell and the drama moved to the
  coastline: every landmass is stroked with two animated dashed foam lines, so
  surf breaks along the shore. Anything that drives into the water loses drive,
  throws spray and sinks after 1.6 s, police cruisers included.
- **Bazooka** — seventh weapon slot, 12 rockets, reusing the tank's missile
  system from on foot or at the wheel, with a flame-and-smoke exhaust trail.
- **Collisions** — completely silent. Every impact cue (car-on-car, AI-on-AI,
  wall hits, pedestrian thuds, landings, punches, crushes) has been removed.
  Physics still applies (damage, knockback, displacement), but there is zero
  audio playback. Pedestrians below 110 closing speed are knocked down,
  displaced and sent fleeing (three hits kill) without any hit noise.
- **VIP Mumbai & State Convoy** — seven iconic residences marked on the map with
  gold rings and security details on the gates: Mannat (SRK), Galaxy (Salman Khan),
  Jalsa (Amitabh Bachchan), Antilia (Ambani), Matoshree (Thackeray), Varsha (CM)
  and Sahyadri. A state convoy periodically rolls through the city: a white
  Ambassador (State) sedan with a flashing red beacon, flanked by a police
  Cruiser and a SWAT van. Taking down the VIP car pays out a ₹2,50,000 bounty
  and slaps on 5 wanted stars.
- **Jobs** — the Flo trucks and police cars join the existing hire loop as kinds
  `flo` and `cop`: consignment runs (₹260 + ₹1.9/m, failed if you spill the
  load) and dispatch call-outs (₹180 + ₹1.3/m), both with pins, par-time bonus
  and HUD badge. The news crew needed six bodies in one 90 m circle within 90 s;
  two is enough now, so CH9 Mumbai Live actually turns up.

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
