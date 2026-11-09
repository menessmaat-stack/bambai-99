# BAMBAI '99 — static web build

Everything in this folder is a plain static site. No server, no build step: Vercel
just serves the files.

```
index.html                     landing page (replace with your own)
play/index.html                the game shell
games/helmsdeep/helmsdeep.js   game bundle (382 KB)
games/helmsdeep/helmsdeep.css  shell styles
games/helmsdeep/touch-controls.js  on-screen controls for phones/tablets
mumbai-map.json                baked OpenStreetMap city (3 MB, loaded from "/")
music/*.mp3                    soundtrack (26 tracks, ~100 MB)
music/tracks.json              playlist the game fetches
vercel.json                    rewrites /api/helmsdeep/tracks -> /music/tracks.json
tools/make-tracks.mjs          regenerates music/tracks.json
```

The game bundle requests three absolute paths, which is why the layout is fixed:
`/mumbai-map.json`, `/api/helmsdeep/tracks` (rewritten by `vercel.json`) and the
track URLs inside `music/tracks.json`.

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

## 5. Swapping in your own landing page

Overwrite `index.html` with your HTML. Keep one link pointing at `/play`, keep
`vercel.json` as is, and keep any new assets in their own folder (`/assets/...`)
so they cannot collide with the game's absolute paths.

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
| Left cross ▲ ◀ ▼ ▶ | throttle, steer, brake/reverse (walk on foot) |
| FIRE | holds fire; works on foot and in a vehicle |
| Touch the street | aims — the shot goes towards your finger |
| NOS | nitro in a car, sprint on foot, climb in a heli |
| E | steal a car, board a train, leave a vehicle |
| HAND | handbrake; descend in a heli |
| ⛶ | fullscreen, and locks landscape on Android |
| ⋯ | map, weapon, marker, music, skip, view, zoom, race, time, weather, punch |
| II | pause |

Landscape plays best. The pad hides itself whenever a menu is open so the menu
buttons stay tappable. Append `?touch=1` to `/play` to force the pad on a
desktop browser, `?touch=0` to turn it off on a phone.
