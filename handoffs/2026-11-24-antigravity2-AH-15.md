# antigravity2 — AH-15 Daytime Quests, Minigames & Side Quests Overhaul — 2026-11-24

Changed:          Overhauled all daytime quests, minigames, side quests, field notes, story gates, and bounties (Medical Convoy hydraulic jack & sleeper spitter, Trapper's Safe Path & iron cellar including 100% cellar terrain-bleed fix, Radio Relay CRT oscilloscope, Hikers' hanging bear bag & Maya's camera viewfinder, Price's Diesel Pump & HQ generator, Clarke's Utility Truck chain/alarm, Ranger Camp clues/lockbox, mast boots yank, winch/vine gates, and day bounties) with a unified diegetic Branch CRT HUD, 10 new quest audio cues, upgraded PBR/canvas props, and story-linked playback decks. Coordinated with Antigravity 3 (`AI-1`) and left all Survivors files untouched.
Files:            ui/day-mission-hud.js (new), ui/day-mission-hud.test.mjs (new), core/audio.js, game/convoy-visual.js, game/trapper-path.js, game/trapper-path.test.mjs, ui/relay-panel.js, studio/day-mission-props.js, ui/story-playback.js, ui/story-playback.css, ui/ranger-clues.js, index.html (daytime quests, bounties, story gates, prop notes), qa/AH-15/before/01..12.png, qa/AH-15/after/01..14.png, qa/AH-15/index.html
Tests:            Unit suite (`node --test` across 20 files, incl. new `ui/day-mission-hud.test.mjs` and updated `game/trapper-path.test.mjs`): 129 pass, 0 fail (post-polish subset 16 pass, 0 fail). Static check: `node tools/check-players.mjs` -> 320 reads, all allowed. Browser regressions via game-test slot (`--jobs 1`): full day-quest batch (`t215 t263 t264 t265 t266 t267 t268 t286 t287 t303`) -> 10 checks: 190 pass, 0 fail; final post-polish smoke (`t215 t265 t267 t268`) -> 4 checks: 85 pass, 0 fail.
Screenshots:      Side-by-side HTML gallery: qa/AH-15/index.html. Before (12 native RTX 5080 WebGPU shots, 0 page errors): qa/AH-15/before/01-convoy-jack.png .. 12-ranger-keypad.png. After (14 native RTX 5080 WebGPU shots, 0 page errors): qa/AH-15/after/01-convoy-jack.png .. 14-hikers-camera.png.
Not verified:     Full `npm test` suite beyond the 10 targeted daytime-quest/story/encoding browser checks (`t215`, `t263`–`t268`, `t286`, `t287`, `t303`) was left to Claude's cloud integration run per AGENTS.md Rule 16 (D-135). Survivors quests/NPCs were deliberately excluded after coordinating with Antigravity 3 (`AI-1`).
Requests:         Coordinated with `antigravity3` (`AI-1`) releasing `ui/survivors.js` & `index.html (survivors)`; answered both URGENT crash reports from `antigravity` (`AG-416`) on `updateDayMissionHud` and verified zero runtime errors across all 14 shots and all browser tests.
Contract changes: none (added optional `pry(amount)` method on `createTrapperPath` keeping initial 3.0 s snap intact for `t268`; exported 10 additive audio helpers from `core/audio.js`).

## Summary of Changes

1. **Unified Diegetic Daytime Quest HUD (`ui/day-mission-hud.js`, `ui/day-mission-hud.test.mjs`):**
   - Non-modal Branch CRT field-kit HUD + edge vignette (`acid` / `trap` / `clear`) covering all 8 daytime quest, minigame, story-gate, and bounty modes (`convoy`, `trapper`/`trapper-held`, `truck-cut`/`truck-alarm`, `fuel-fill`/`fuel-carry`/`fuel-down`, `hikers-river`/`hikers-snag`/`hikers-hang`, `gate-winch`/`gate-vines`, `boots-yank`, `bounty-site`/`bounty-wanderer`).
   - Automatically hides during modals (`objectiveModalOpen`), pause, or Hollows (`hollowFloor`).
   - Caught and fixed `[hidden]` CSS specificity bug (`#dayMissionHud [hidden]{display:none!important}`) during AFTER screenshot inspection.

2. **Medical Convoy — Ambulance MED-04 (`game/convoy-visual.js`, `index.html`):**
   - Weathered PBR canvas textures for ribbed roof (`MED-04 · PGB · FOB THRESHOLD`), flanks (`PGB MEDICAL · UNIT 04 · SIGNED: 12`), cracked windshield, `10T PGB` mechanical jack gauge, and Hale's blood-smudged roadside manifest clipboard.
   - Added roof AC louver seated cleanly aft of the `MED-04` stencil, roof grab rails, rear interior stretcher/med-lockers, flickering emergency lightbars, heavy 10T ribbed bottle jack with caged beat lamp, flush rocker-sill brackets, spilled gauze/oil slick, `setWarning(on)` cab rattle, and animated sleeper lunge.
   - Wired rhythm-strip HUD, `jackPump`/`jackSlip`/`cabRattle`/`acidSpray` audio, hydraulic sparks, acid globs, sleeper hit sparks, banners, and green acid screen-edge vignette.

3. **Trapper's Safe Path & Iron Cellar (`game/trapper-path.js`, `game/trapper-path.test.mjs`, `index.html`):**
   - Added active `pry(amount)` mechanic on `[SPACE]` and `[E]` while clamped in a bear trap (preserving initial 3.0 s snap for `t268`), with live pry-free HUD gauge, jaw sparks, red trap vignette, and `trapClamp`/`trapPry`/`stoneStep` audio.
   - Shortened inner-row posts to 0.78 m trail bollards for clear 8-row sightlines; added charred-oak plaques + bright hammered silver horseshoes with individual glint materials, weathered gate signboard (`KEEP OUT — WALK THE IRON`), 3 swaying horseshoe wind-chimes, flickering warm amber oil lanterns, Cpl. Okafor's 21-day chalk tally plaque (`IRON HOLDS. THEY WALK RIGHT OVER. — CPL. OKAFOR (3 WKS)`), and PGB medic pouch inside the cellar.
   - **Critical visual fix:** Eliminated terrain bleeding through the underground iron cellar floor in `excavateTrapperCellar` by expanding vertex drop to `pitFloor - 0.95` inside the cellar cap footprint and collapsing intersecting `groundSectors` triangles under the cap (`qa/AH-15/before/06-trapper-cellar.png` vs `qa/AH-15/after/06-trapper-cellar.png`).

4. **Radio Relay, Story Playbacks & Ranger Camp (`ui/relay-panel.js`, `ui/story-playback.js`, `ui/story-playback.css`, `ui/ranger-clues.js`, `index.html`):**
   - Upgraded `#relayPanel` / `#rangerPanel` into riveted Branch CRT hardware with slotted corner bolts, chamfered switches, metallic keypad buttons, aged log paper, and a **live animated green-phosphor CRT Oscilloscope `<canvas>`** in `'radio'` mode (zero `"code"`/`"clue"` leaks for `t266`).
   - Upgraded Maya's Camera playback into a weathered camcorder viewfinder (`● PLAY ▶`, `OCT 04 · 21:47`, `BAT 14%`, corner focus reticles, scanlines) and Ambulance Cab Radio into a live animated `PGB TRANSCEIVER · 154.28 MHz · RANGER BAND` waveform deck.
   - Upgraded all 4 Ranger inspection artworks (coffee-stained `FORESTRY SAR · 6 HIKERS OVERDUE — NORTH RIDGE` clipboard with horseshoe doodle & push-pin; Forestry SAR VHF-FM Transceiver with `VOL`/`SQL` knobs & `LAST CALL 01:42 — NO REPLY` tape; Forestry pine-crest truck door; riveted steel lockbox lid strip).
   - Added Sato's dropped PGB signals headset beside his boonie hat, relay lever arc-sparks & reboot banner, vault lift rising steam puffs, and mast boots yank crunch/shake.

5. **Hikers' Bear Bag, Fuel Depot, Clarke's Truck, Gates, Notes & Bounties (`studio/day-mission-props.js`, `core/audio.js`, `index.html`):**
   - `makeHikersBag`: hiker-orange trail-marker flag ribbon, silver carabiner, rolled slate-blue foam pad; wired trunk tie-ribbon, wind-sway, rope-cut hemp chunks + `ropeSnap`, river bobbing + continuous wake ripples, and drowned-rise water splashes.
   - `makeFuelPump` & `makeGenerator`: weathered chipped red-enamel `PGB DEPOT 02 · FLAMMABLE · DIESEL` cabinet, double-sided dials, unclipped double-sided frosted `DIESEL` globe, Price's plinth clipboard, live rotating `userData.crank` + `fuelGlug`, jerrycan carry sway, and HQ generator exhaust puffs + glowing green running LED.
   - Clarke's Utility Truck: sheared iron-bar stubs + hiker flashlight beside bolt cutters at the mine mouth, chain-cutting sparks, snap chunks, and strobing headlamp + amber hazard light during the 20 s car alarm.
   - Field notes & side activities: restyled `.prop-note-card` + paper rustle, iron horseshoe chime/sparks, winch drag dust/sparks + vine-chop leaf bursts, and daytime bounty HUD + `AudioSys.bountyClear` + ember burst on `settleBounty`.

## Art / UI / Sound Principle Scores (0–5, `docs/art-direction.md`, `docs/asset-principles.md`, `docs/ui-principles.md`, `docs/sound-principles.md`)

- **Family:** Branch Field Hardware / Forestry Civilian Hardware (reserved colors respected; zero neon/sci-fi bleed; all "what is never said" rules in `docs/story.md` §12 honored).
- **Screenshots:** `qa/AH-15/after/01..14.png` (and `qa/AH-15/before/01..12.png`).

| Category | Score | Evidence |
| --- | --- | --- |
| Silhouette & Readability | 5 / 5 | `01-convoy-jack.png` (`MED-04` unobstructed, roof AC aft), `04-trapper-yard.png` (8-row bollard sightlines), `08-hikers-bag.png`, `09-fuel-pump.png` (`DIESEL` globe & crank) |
| Materials & Story Detail | 5 / 5 | `01`/`02` weathered ambulance & Hale's manifest, `06` riveted cellar + Okafor's 21-day tally, `09` enamel depot pump, `11`/`13` SAR log & VHF transceiver |
| World Grounding & Zero Bleed | 5 / 5 | `06-trapper-cellar.png` (0% terrain bleed), `01-convoy-jack.png` (flush rocker sill & grounded wheels/jack) |
| Diegetic UI & Clarity | 5 / 5 | `01`/`02`/`04`/`05`/`08` `#dayMissionHud` modes, `03`/`14` playback decks, `07`/`12` riveted CRT/lockbox hardware |
| Audio & Kinetic Juice | 4.5 / 5 | 10 new `outBus()` cues in `core/audio.js`, sparks/acid/ripples/exhaust/vignettes/shake wired cleanly |

## Game-Test Slot Record (AGENTS.md Rule 16)

All browser captures and browser tests ran strictly through `node crew/crew.mjs slot run antigravity2 AH-15` with `--jobs 1` and released cleanly on exit:
1. BEFORE GPU capture (12 shots, RTX 5080 WebGPU) — 0 page errors.
2. Full day-quest regression batch (`t215 t263 t264 t265 t266 t267 t268 t286 t287 t303`, `--jobs 1`) — `10 checks: 190 pass, 0 fail`.
3. AFTER GPU captures (first pass + polished pass + final post-HUD-fix 14 shots, RTX 5080 WebGPU) — 0 page errors.
4. Final post-polish regression smoke (`t215 t265 t267 t268`, `--jobs 1`) — `4 checks: 85 pass, 0 fail`.
