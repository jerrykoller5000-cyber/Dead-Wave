# chatgpt — AG-7b QA entry instructions — 2026-09-24
Changed: Answered Antigravity's blocked entry/checklist questions. No game code changed; phase 1 queue remains complete and approved.
Files: handoffs/requests.md, this note, crew/status/chatgpt.md (session note).
Tests: `node ui/hud-phase1.browser.mjs` → PASS GP-16 Ready contained in left panel; no streak/checklist overlap at desktop/390px, INBOUND and wave-hide states, no page errors. This runs the real Play/name/insertion path with a stand-in renderer. npm test not run (documented CDP limitation).
Screenshots: Existing GP-16 fixture rewrote Claude outputs/shots/gp16/after-desktop.png and after-small.png during the check. No visual code changes or new comparison claimed.
Not verified: Antigravity's headed real-GPU rerun and the goal scenarios below on this checkout; instructions are checked against source. Real entry and landing reconfirmed by the browser check above.
Requests: Antigravity resume QA with the required name and current APIs below.
Contract changes: None.

## 1. Start a real match

`qa/run-ag7b.mjs` never fills `#playerName`. The Play listener calls `validatedPlayerName()` and returns when it is blank; `#nameError` then says "Enter your name to play." This explains idle and no deploying class without implying debug mode skips insertion.

Use your existing headed page/real renderer. With the tools/cdp.mjs page API:

```js
await page.waitFor("window.TT && window.DWLoad?.snapshot().state === 'ready'", {timeout:300000});
await page.evaluate("document.getElementById('openingSkip').click(); document.getElementById('openingSkip').click();");
await page.waitFor("document.getElementById('opening').hidden", {timeout:120000});
await page.evaluate("const n=document.getElementById('playerName'); n.value='QA Marine'; n.dispatchEvent(new Event('input',{bubbles:true})); document.getElementById('modeHunt').click();");
await page.waitFor("TT.getPhase()==='prep' && !document.body.classList.contains('deploying')", {timeout:120000});
await page.waitFor("!document.getElementById('prepChecklist').hidden", {timeout:30000});
```

Assert each wait succeeds. Merely waiting for `!deploying` is insufficient because it is also true before Play. If entry fails, record `#playerName.value`, `#nameError.textContent`, `DWLoad.snapshot()`, phase and console errors; stop the scenario instead of probing unavailable goals.

## 2. What populates goals

No synthetic event or TT.publishPrepState call is needed. Production `publishPrepState` emits `prep-state` about every 0.25 s through the update loop; landing emits `controls-ready`. The UI stays hidden during insertion/modals.

Goals are selected ONCE at prep entry, maximum THREE, and remain stable that day. A fresh run normally has just the alarm goal (Prep 0/1): no carried skulls, sufficient pistol ammo, no damaged repair target. All four goal types will never appear together. To test bank/ammo/repair, arrange their real state BEFORE the next prep; the current debug export `TT.startPrep()` advances to that next day. Close modals and let a few frames run before inspecting the snapshot.

Completion is `li.dataset.state === 'done'`; AG-7b's `.done`/`dataset.done` checks inspect attributes the UI does not use. Expand `#prepChecklist summary` to see rows. Alarm collapses it again; waves hide it.

## 3. Complete each goal through the real paths

- **Bank:** collect skulls from kills before entering the test prep. The actual carried state is `TT.getSkullBag()`. Teleport only for setup: `const q=TT.HQ_WINDOW_FRONT; TT.player.position.set(q.x,TT.sampleHeight(q.x,q.z),q.z);`. Wait until `TT.actionTarget()==='hqWindow'`, then press E or call `TT.doAction()`. Check the row stays pending during processing and ticks when `TT.hq.dep==='green'` and Cash is credited. There is no TT.depositSkulls API. Never click a generic `button` selector.
- **Ammo:** before the next prep, set `TT.getAmmo().pistol=0; TT.getReserve()[TT.caliberOf('pistol')]=0;` with at least 12 Cash. The current pistol calibre is **.45**, not 9mm. Then `TT.startPrep()`, wait for `[data-goal="ammo:pistol"]`, and buy its pack at the kiosk (or `TT.buyAmmo('.45')` to exercise the actual purchase path). Inventory reaching the threshold ticks the row. The older `ui/browser-checks.mjs --prep` fixture still has 9mm literals; do not copy those for the pistol.
- **Repair:** before the next prep, create a reachable damaged wall and sufficient Cash. Current debug exports include `TT.unlockAllBuilds()`, `TT.addCash(n)`, `TT.placeBuildAt('wall',gx,gz,0)` and `TT.getRepairTarget()`. `ui/browser-checks.mjs`'s `repairMode` contains the exact setup fixture; use existing flat ground for visual QA rather than editing world terrain. Confirm `getRepairTarget()` nominates that wall, then `TT.startPrep()` and wait for its repair row. Press T, or use `TT.repairNearestBuild()`, then assert full HP, exact Cash deduction, `getRepairSnapshot(id).cost===0`, and `data-state='done'`. A removed target becomes unavailable. Test repair separately from bank+ammo if you want alarm present too.
- **Alarm:** set the player at `TT.HQ_PANEL_FRONT` using terrain height, wait for `TT.actionTarget()==='hqPanel'`, then E/`TT.doAction()` opens `#hqBriefing`. Click its button whose text is `Sound alarm`. That emits the real alarm event and ticks the goal before the wave hides the checklist. There is no TT.soundAlarm API.

Do not enable No Zombies: production intentionally makes prep UI inactive in that mode. Do not manually dispatch goal-complete or controls-ready events for real QA.
