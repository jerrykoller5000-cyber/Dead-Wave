# antigravity — AG-98 road stage 5: desktop build end to end — 2026-10-19
Changed:          Built and synced the fresh desktop bundle (`dist/dead-wave` -> `%LOCALAPPDATA%\Grave Shift\game`, 1502 files, 567.0 MB, `v0.1.0`, 952 takes), launched `%LOCALAPPDATA%\Grave Shift\dead-wave.exe` on `http://dw.localhost/index.html` without Node or repo on `PATH`, and verified Title, Day 1 prep, all 6 day mission sites (`truck`, `truck cutters`, `ranger` + `radio`/`board`/`door`, `trapper`, `hikers`, `fuel`, `convoy`), the Hollows (Root Warren below + cave mouth), and Night 1 combat with full sound (`pistol`/`m4` synth banks, zombie voice takes, night ambience) and music (`elevenlabs/night-01_sections.ogg`). Audited all network requests and scene textures: 0 broken/missing textures (`81/81` valid), 0 failed audio decodes, 0 uncaught page errors, and only 2 silent, caught 404 probes in `core/takes.js:197-199` (`GET http://dw.localhost/__zsounds` and `GET http://dw.localhost/z-sounds/levels.json`).
Files:            qa/2026-10-19-AG-98/run-ag98.mjs, qa/2026-10-19-AG-98/ag98-summary.json, qa/2026-10-19-AG-98/01-title-screen.png, qa/2026-10-19-AG-98/02-day1-prep.png, qa/2026-10-19-AG-98/03-site-truck.png, qa/2026-10-19-AG-98/04-site-truck-cutters-cave-mouth.png, qa/2026-10-19-AG-98/05-site-ranger.png, qa/2026-10-19-AG-98/05b-site-ranger-radio.png, qa/2026-10-19-AG-98/05c-site-ranger-board.png, qa/2026-10-19-AG-98/05d-site-ranger-door.png, qa/2026-10-19-AG-98/06-site-trapper.png, qa/2026-10-19-AG-98/07-site-hikers.png, qa/2026-10-19-AG-98/08-site-fuel.png, qa/2026-10-19-AG-98/09-site-convoy.png, qa/2026-10-19-AG-98/10-hollows-cave-mouth.png, qa/2026-10-19-AG-98/11-hollows-warren-below.png, qa/2026-10-19-AG-98/12-night1-combat.png
Tests:            not run (full suite is a coordinated integration job per rule 16); desktop end-to-end verification run via testing slot (`node crew/crew.mjs slot run antigravity AG-98 --checks "..." -- node qa/2026-10-19-AG-98/run-ag98.mjs`) → PASS (`cleanExit: true`)
Screenshots:      qa/2026-10-19-AG-98/01-title-screen.png, qa/2026-10-19-AG-98/02-day1-prep.png, qa/2026-10-19-AG-98/03-site-truck.png, qa/2026-10-19-AG-98/04-site-truck-cutters-cave-mouth.png, qa/2026-10-19-AG-98/05-site-ranger.png, qa/2026-10-19-AG-98/05b-site-ranger-radio.png, qa/2026-10-19-AG-98/05c-site-ranger-board.png, qa/2026-10-19-AG-98/05d-site-ranger-door.png, qa/2026-10-19-AG-98/06-site-trapper.png, qa/2026-10-19-AG-98/07-site-hikers.png, qa/2026-10-19-AG-98/08-site-fuel.png, qa/2026-10-19-AG-98/09-site-convoy.png, qa/2026-10-19-AG-98/10-hollows-cave-mouth.png, qa/2026-10-19-AG-98/11-hollows-warren-below.png, qa/2026-10-19-AG-98/12-night1-combat.png
Not verified:     none
Requests:         FYI sent to cursor ("AG-98 desktop build audit: 2 silent 404 probes in core/takes.js on dw.localhost")
Contract changes: none

## Rule 16 (Game-test slot)
All desktop game launches were executed strictly one at a time through the machine-wide testing queue:
- `node crew/crew.mjs slot run antigravity AG-98 --checks "AG-98 desktop build end-to-end (package.mjs, installed exe, title, day 1, 6 day mission sites, Hollows, night 1 with sound and music)" -- node qa/2026-10-19-AG-98/run-ag98.mjs`
- `node crew/crew.mjs slot run antigravity AG-98 --checks "AG-98 Hollows warren + Night 1 combat shots and audio summary" -- node qa/2026-10-19-AG-98/run-ag98.mjs --skip-build`

## Evidence & End-to-End Audit Summary (`qa/2026-10-19-AG-98/ag98-summary.json`)

1. **Packaged Build & Installed Desktop Sync (`tools/package.mjs`)**
   - Output: `Dead Wave packaged -> dist\dead-wave (1502 files, 567.0 MB, v0.1.0, 952 takes)`
   - Synced to `%LOCALAPPDATA%\Grave Shift\game` and launched `%LOCALAPPDATA%\Grave Shift\dead-wave.exe` from its own install directory with a clean Windows-only `PATH` (no Node, no repo, no dev server).

2. **Every HTTP 404 / Network Request & Texture Audit**
   - **Total network requests on `http://dw.localhost/`**: `307`–`590` requests across full run.
   - **Failed asset loads (`Network.loadingFailed`, non-canceled)**: `0` (`[]`).
   - **Uncaught page errors (`page.errors`)**: `0` (`[]`).
   - **Media element errors (`<audio>`, `<video>`, `<img>`, `<script>`)**: `0` (`[]`).
   - **Scene Three.js textures (`textureCheck`)**: `81` unique textures traversed across all scene materials (`map`, `alphaMap`, `bumpMap`, `normalMap`, `roughnessMap`, `metalnessMap`, `emissiveMap`), `brokenCount: 0` (`broken: []`).
   - **HTTP >= 400 responses (`http404AndErrors` / `fetchFailsInPage`)**: Exactly **2** HTTP 404s, both silent probes in `core/takes.js` caught by `.catch(() => null)` in `fetchJson` (`core/audio.js:540`):
     1. `GET http://dw.localhost/__zsounds` → `404 Not Found` (`core/takes.js:197`: probes the dev-server live directory endpoint first, then falls back cleanly to `z-sounds/index.json` on line 198, which loads all 370 folders / 952 takes).
     2. `GET http://dw.localhost/z-sounds/levels.json` → `404 Not Found` (`core/takes.js:199`: probes for an optional per-take gain trim file not present in the repo or `dist/dead-wave`).

3. **Title Screen & Day 1 Prep**
   - **Title (`01-title-screen.png`)**: `url: "http://dw.localhost/index.html"`, `desktopFlag: true`, `versionText: "v0.1.0"`, `renderer: "WebGPURenderer"` (NVIDIA GeForce RTX 5080), `musicState: { stage: "calm", mood: "menu", deckTrack: "menu_theme", playing: true }`, `takesState.listed: { folders: 370, takes: 952, source: "ok" }`, `bankStats: { banks: 78, pending: 0 }`.
   - **Day 1 Prep (`02-day1-prep.png`)**: `phase: "prep", day: 1`, `musicState: { stage: "calm", mood: "dawnprep", deckTrack: "calm_day", front: "http://dw.localhost/assets/soundtrack/calm_day.ogg", volume: 0.09, playing: true, lastDeckError: null }`.

4. **All 6 Day Mission Sites (`~` Console `site ...`)**
   - `site truck` (`03-site-truck.png`): `pos: (-96.97, -0.15, -46.83)`, prompt `"Chained shut."`
   - `site truck cutters` (`04-site-truck-cutters-cave-mouth.png`): `pos: (-160.73, 0.68, 87.04)`, prompt `"E Take the bolt cutters"`
   - `site ranger` (`05-site-ranger.png`): `pos: (31.09, -5.31, -17.85)`, prompt `"E Lockbox"`
   - `site ranger radio` (`05b-site-ranger-radio.png`): `pos: (36.35, -6.80, -18.70)`, prompt `"E Look"`
   - `site ranger board` (`05c-site-ranger-board.png`): `pos: (39.31, -7.26, -24.00)`, prompt `"E Look"`
   - `site ranger door` (`05d-site-ranger-door.png`): `pos: (39.05, -7.33, -18.87)`, prompt `"E Look"`
   - `site trapper` (`06-site-trapper.png`): `pos: (-39.54, 0.43, 42.01)`, prompt `"E Look"` (horseshoe trail across stones)
   - `site hikers` (`07-site-hikers.png`): `pos: (-100.31, -0.89, -17.21)`, prompt `"E Look"` (suspended pack in pine)
   - `site fuel` (`08-site-fuel.png`): `pos: (-44.65, -3.02, -15.62)`, prompt `"Hold E Fill the can"`
   - `site convoy` (`09-site-convoy.png`): `pos: (-117.88, 0.35, 48.98)`, prompt `"E Work the jack"`, `actionTarget: "convoyJack"`

5. **The Hollows (Cave Mouth & Warren Below)**
   - **Warren Below (`11-hollows-warren-below.png`)**: `hollowState: { below: true, cave: 0, theme: "root", place: "warren", depth: 1 }` (`Root warren · Depth 1 · Galleries · Hush · 7:57 · Stir · 0%`), `belowAudio: { k: 0.9955, built: true, hum: 0.0114, rumble: 0.0026, counts: { drips: 2 } }`, `takeBeds: [{ key: "warren", id: "below/warren-ambience", level: 0.233 }]`.
   - **Cave Mouth (`10-hollows-cave-mouth.png`)**: Root Warren mouth (`caveIndex: 0, cavePos: (164.48, 69.65)`), `placesState: { built: true, breaths: 3, dread: 1.0 }`, prompt `"The Hush is flat. Tomorrow."` (`actionTarget: "hollowMouth"` at 4.2m).

6. **Night 1 Wave with Sound & Music (`12-night1-combat.png`)**
   - **Wave & FPS**: `phase: "wave", day: 1, aliveZombies: 15`, `60 fps` (`low: 60`, `draws: 251`, `tris: 621k`).
   - **Night 1 Music**: `playing: true, stage: "fight", mood: "fight", deckTrack: "elevenlabs/night-01", front: "http://dw.localhost/assets/soundtrack/elevenlabs/night-01_sections.ogg", section: "dropA", sectionMode: "fight", sectionLoop: { start: 20, end: 60, loop: true }, volume: 0.1301, deckLevel: 1, lastDeckError: null, sectionsReadyNight01: true`.
   - **Audio Mix & Live Output RMS**: `ctx: "running", weap: 1.35, fx: 0.80, amb: 0.4956`, live pistol shot output `pistolLevel: { rms: 0.0289, peak: 0.2274, frames: 29, state: "running" }`.
   - **Takes & Synth Banks**: `failedDecodes: 0`, `loadedFoldersCount: 106` (of 370 folders / 952 takes), `banksBuilt: 78, pending: 0, misses: 0`, `shotCount: { pistol: 6, m4: 5 }`, active zombie voices (`shambler: 15, shambler:chase: 4, shambler:attack: 3, shambler:hurt: 3, shambler:death: 4`), night ambience beds (`world/wind-night: 0.072`, `world/crickets-night: 0.160`).
