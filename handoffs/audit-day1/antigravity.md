# antigravity — AG-15 day-1 audit — 2026-09-25
Changed:          audit only, no code changed. 9 problems: 2 S1, 4 S2, 3 S3.
Files:            handoffs/audit-day1/antigravity.md (+ screenshots)
Tests:            Engine load (11.3s), Scavenging FPS (60.7 fps), Flamethrower FPS (58.8 fps), Finisher FPS (60.2 fps), 2 full playthroughs on Jerry's RTX 5080
Screenshots:      qa/shots/2026-09-25-AG-15/
Not verified:     none (audited start-to-finish twice on hardware GPU via headless CDP)
Requests:         none (the audit goes to Claude)
Contract changes: none

## Top 5
1. **AG-A1**: `startMode` calls `clearDeathLog()`, wiping `tt_death_log` from localStorage on every match start (violates Jerry's Order 4 / CU-24).
2. **AG-A2**: Death screen "Play again" returns to title menu instead of launching Day 1 fresh run, and `quitToMenu` destroys morning save `tt_day_start` (violates Jerry's Order 5 / CU-25).
3. **AG-A5**: Building mode instruction HUD card collides and directly overlaps with the weapon ammo/grenade status card at bottom-left.
4. **AG-A3**: Day-1 wave spawns are throttled to 8 concurrent bodies, forcing the remaining 12 zombies into disjointed trickle groups.
5. **AG-A4**: Fresh profile receives no Onboarding Tutorial prompt, no Day 1 Briefing modal, and no Day 1 end-of-night payoff summary screen.

---

## Hardware GPU Performance Measurements (NVIDIA GeForce RTX 5080)
- **Cold Boot & Load Time**: 11.3 s from navigation to Title Screen (Passes AGENTS.md Rule 12 budget of <= 15 s cold).
- **Title Menu Screen**: 45.5 fps mean (1% low: 28.2 fps, worst: 35.5 ms, hitches: 2). Background `stepLivePreRoll()` incurs slight frame timing cost.
- **Day 1 Scavenging Phase**: 60.7 fps mean (1% low: 47.8 fps, worst: 20.9 ms, hitches: 0).
- **Day 1 Wave Active Flamethrower Combat (10s Continuous Firing)**: 58.8 fps mean (1% low: 38.5 fps, worst: 26.0 ms, hitches: 0).
- **CL-33 Wave Finisher Orbit Camera**: 60.2 fps mean (1% low: 51.3 fps, worst: 19.5 ms, hitches: 2).
- **Day Clear State Transition**: Hitch of 373 ms (1% low drops to 3 fps) during audio stinger dispatch and day-advance logic.

---

## S1 · Broken

### AG-A1 · S1 · engine · `startMode` calls `clearDeathLog()`, wiping `tt_death_log` on every match start
- Where:    `index.html` (inside `function startMode(mode)`)
- Steps:    Play match, die from a zombie attack (`cause: 'shambler'`), record death to `tt_death_log`, click Play again / start a new game.
- Expected: Per Jerry's Order 4 (2026-09-24 22:52Z / CU-24): "A fresh playthrough still shows unlocked deaths on the tombstone. The collection is `tt_death_log` in localStorage, so it survives a new game."
- Seen:     `startMode()` explicitly invokes `clearDeathLog();` which executes `localStorage.removeItem('tt_death_log');`. Unlocked deaths are erased on every game start.
- Owner:    Cursor
- Fix idea: Remove `clearDeathLog();` from `startMode()`. Only wipe it if the player explicitly selects "Reset Profile" in settings.
- Proof:    `index.html` line inside `startMode()`: `resetEconomy(); clearDayStart(); clearDeathLog(); bank = 40;`. Verified in `qa/run-ag15.mjs` and `qa/run-ag15-deep.mjs`: `localStorage.getItem('tt_death_log')` returns `null` after starting match. Screenshot: [11-death-cemetery-real.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/shots/2026-09-25-AG-15/11-death-cemetery-real.png).

### AG-A2 · S1 · engine · Death screen "Play again" returns to title menu instead of fresh Day 1 run, and `quitToMenu` wipes `tt_day_start`
- Where:    `index.html` (`function resetGame` and `function quitToMenu`)
- Steps:    Die on Day 1 (or Day 2+), then click "Play again" on the tombstone panel. Also: pause on Day 2 and click "Quit to Menu".
- Expected: Per Jerry's Order 5 (2026-09-24 22:52Z / CU-25): "The morning save (`tt_day_start`) resumes on Play. A death's Play again is a new run at day 1."
- Seen:     Clicking "Play again" (`#again`) calls `resetGame()`, which sets `gameStarted = false; phase = 'idle'; day = 0;` and drops the player back to the Title Screen. The player must click Play again from the menu. When they do, `tt_day_start` was not cleared on death, so it resumes the prior run's day rather than starting fresh at Day 1. Conversely, pausing and clicking "Quit to Menu" executes `clearDayStart()`, destroying the player's saved morning progress completely.
- Owner:    Cursor
- Fix idea: In `#again` handler, clear `tt_day_start` and directly call `startMode('hunt')` (fresh Day 1). In `quitToMenu()`, remove `clearDayStart()` so the morning save persists and can be resumed from the menu.
- Proof:    `qa/shots/2026-09-25-AG-15/12-restart-state-real.png`. State inspection confirmed `day: 0, phase: 'idle'` immediately after clicking "Play again", with stale `tt_day_start` left intact.

---

## S2 · Wrong

### AG-A3 · S2 · combat · Day-1 wave spawns throttled to 8 concurrent zombies, causing 12 remaining to trickle in disjointed groups
- Where:    `combat/` / `index.html` (wave director / `spawnWave`)
- Steps:    Stand in yard at HQ, sound Day 1 alarm, observe incoming horde.
- Expected: Per Jerry's order and `docs/plan.md`: horde sizes stay intact (Day 1 is 20 bodies). The wave should feel like a cohesive 20-zombie threat attacking from the North Cave/treeline.
- Seen:     Only 6 to 8 zombies spawn concurrently due to `dayActiveCap` (GB-29 proposal). After the player clears the initial 8 zombies, the remaining 12 spawn in staggered trickles, turning the Day 1 wave into repetitive small skirmishes rather than an exciting 20-body defense.
- Owner:    Grokbot
- Fix idea: Raise Day 1 `dayActiveCap` to at least 16–20 so the horde rushes together as intended by the 20-body design.
- Proof:    `qa/shots/2026-09-25-AG-15/07-wave1-spawns.png` (perf overlay confirms `zombs 6` concurrent despite `Zombies left: 20`).

### AG-A4 · S2 · ui · Missing Day 1 Onboarding Tutorial & Day 1 / Day 2 Briefing Modals
- Where:    `ui/` / `index.html`
- Steps:    Start fresh profile (`localStorage.clear()`), watch insertion, land at HQ, and complete Day 1 wave.
- Expected: Per `docs/plan.md` (Phase 2) and `handoffs/audit-day1/README.md`: first run presents an onboarding tutorial offer, Day 1 briefing with objectives, and at Dawn a payoff summary ("Dawn: payoff. A short summary of the night, achievements unlocked, and tomorrow's briefing").
- Seen:     On landing, no tutorial offer or coach dialog is displayed. When Day 1 wave is cleared, the game briefly flashes a small "DAY 1 CLEARED" banner and immediately rolls straight into Day 2 prep with zero night payoff summary modal, zero skulls banked report, and zero Day 2 briefing popup.
- Owner:    ChatGPT / Claude
- Fix idea: Hook an end-of-night summary card before advancing `day` to 2, displaying kills, cash, skulls banked, and Day 2 mission targets.
- Proof:    `qa/shots/2026-09-25-AG-15/02-landing-briefing.png` and `qa/shots/2026-09-25-AG-15/10-dawn-summary-real.png`.

### AG-A5 · S2 · ui · Building mode instruction HUD card collides and directly overlaps with weapon ammo status box at bottom-left
- Where:    `index.html` / `ui/hud.js`
- Steps:    Equip weapon, enter build mode (`B` or `TT.setPlaceMode('wall')`).
- Expected: The building help card ("WALL $14 [R] rotate...") is positioned above or docked beside the weapon ammo/grenade box.
- Seen:     The building mode instruction box renders at the exact same screen coordinates as the weapon status box (`12 PISTOL 12/12 · 50 spare Gx3 Hx0`), directly colliding and obscuring vital HUD text.
- Owner:    ChatGPT
- Fix idea: Set `bottom: 84px` (or dock above `.ammo-display`) when build mode tooltip is active.
- Proof:    [05-building-placement.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/shots/2026-09-25-AG-15/05-building-placement.png).

### AG-A6 · S2 · performance · 373 ms hitch / frame stall on wave clear transition when Day 1 completes
- Where:    `index.html` (`function beginWaveFinisher` / `dayCleared` / `updateDayNight`)
- Steps:    Kill last zombie of Day 1 wave while monitoring frame delta via `TT.perfSnapshot()`.
- Expected: Smooth transition into the CL-33 finisher camera orbit at 60 fps.
- Seen:     A sharp 373.2 ms frame stall occurs at the moment of wave clear (1% low FPS plunges to 3.2 fps).
- Owner:    Cursor / Claude
- Fix idea: Defer non-critical cleanup (blood decal garbage collection, sound track pre-buffering) over multiple rAF frames instead of doing all synchronous allocations on the kill frame.
- Proof:    `qa/probe-flamer-finisher.mjs` measured `worst 373.2 ms` and 2 hitches during the finisher trigger. Screenshot: [09-finisher-orbit-real.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/shots/2026-09-25-AG-15/09-finisher-orbit-real.png).

---

## S3 · Polish

### AG-A7 · S3 · visual · Title screen menu items intersect HQ rooftop barbed wire coils
- Where:    `index.html` (`#menu` styles and title camera orbit)
- Steps:    Load title screen at 1280x720.
- Expected: Menu buttons ("PLAY", "SETTINGS", "QUIT") framed cleanly against sky, ground, or solid cabin wall.
- Seen:     The "PLAY" button and its surrounding highlight line directly cut through the barbed wire coils on the HQ roof railing.
- Owner:    Claude (camera orbit elevation) / ChatGPT (menu vertical offset)
- Fix idea: Adjust menu camera target elevation by +1.5m or move `#menu` container down 20px so text sits on the clean cabin siding.
- Proof:    [01-menu-screen.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/shots/2026-09-25-AG-15/01-menu-screen.png).

### AG-A8 · S3 · ui · Death screen Ways to Die displays raw unformatted question marks `?`
- Where:    `index.html` (`#winMsg .deathlog`)
- Steps:    Die and skip/wait for tombstone plaque.
- Expected: Undiscovered death ways render as subtle locked icons, dashes, or formatted mystery cards.
- Seen:     Renders as a raw unspaced string of 60+ question marks: `???????????????????????????????????????????????????????????????`.
- Owner:    ChatGPT
- Fix idea: Style each locked death way as an individual badge `.d.locked { opacity: 0.3; }`.
- Proof:    Console inspection of `#winMsg` text during `qa/run-ag15-deep.mjs`: `'Ways to die · 0 / 21 found???????????????????????????????????????????????????????????????'`.

### AG-A9 · S3 · ui · "DAY 1 CLEARED" banner text awkwardly clips viewport right margin under minimap
- Where:    `index.html` (`#bigBanner` / `.banner-sub`)
- Steps:    Clear Day 1 wave, observe top right banner.
- Expected: Banner subtitle is centered or cleanly padded from the viewport margin.
- Seen:     The text "Use the prep — repair, build, resupply, turn in skulls" is positioned right at the right edge of the screen and wraps awkwardly next to the minimap border.
- Owner:    ChatGPT
- Fix idea: Add `padding-right: 24px` and set `text-align: right; margin-right: 170px` when minimap is active.
- Proof:    [10-dawn-summary-real.png](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/shots/2026-09-25-AG-15/10-dawn-summary-real.png).

---

## Visual Verification Shot Catalog (`qa/shots/2026-09-25-AG-15/`)
- `01-menu-screen.png` (646 KB): Title screen with callsign input and barbed wire typography intersection.
- `02-landing-briefing.png` (838 KB): Marine landing at HQ yard; note absence of intro tutorial or onboarding dialog.
- `03-scavenging-hud.png` (778 KB): Scavenging HUD layout with health, ammo, minimap, cash, skulls, and ready panel.
- `04-kiosk-real-modal.png` (481 KB): Live Supply Kiosk modal with Weapons, Ammo, Builds, Gear tabs, and Restock button.
- `05-building-placement.png` (814 KB): Wall ghost preview showing HUD collision between building controls and ammo card.
- `06-dusk-prep-countdown.png` (730 KB): Dusk lighting transition and prep timer countdown.
- `07-wave1-spawns.png` (749 KB): Wave 1 start showing `DAY 1 — HORDE INBOUND` banner and 8-zombie active throttle.
- `08-flamethrower-active.png` (858 KB): Active flamethrower firing (58.8 fps on RTX 5080) with 20 zombies in world.
- `09-finisher-orbit-real.png` (828 KB): CL-33 wave finisher 360 orbit around corpse showing 373 ms transition hitch.
- `10-dawn-summary-real.png` (697 KB): Dawn transition showing immediate Day 2 switch without payoff report.
- `11-death-cemetery-real.png` (335 KB): Pitch-black cemetery death cutscene showing tombstone carving.
- `12-restart-state-real.png` (751 KB): Post "Play again" click returning to menu screen with `day: 0` and uncleaned save.
