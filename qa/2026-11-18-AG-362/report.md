# AG-362 — `GT-20124` J164 Landed Close-Ups Look Barrier Failure

- **Task ID**: `AG-362`
- **Request**: `J164 LANDED: actual72e unarmed+pistol front/3q/right-thigh closeups` (`review/GT-20124/SHORT-AG-LANDED-REQUEST-v1.md` -> `review/GT-20124/native-mag-landed-ag-v1.mjs`)
- **Result**: **FAILED / BLOCKED at `LOOK BARRIER landed GT20124 native mags`** (refused `FIRST-CELL-LOOKED.txt`; `native-mag-landed-ag-v1.mjs` exited `1` with `failure.json` preserved).

## What Happened
1. Ran `node crew/crew.mjs slot run antigravity AG-362 --checks "J164 LANDED actual72e unarmed+pistol front/3q/right-thigh closeups" -- node review/GT-20124/native-mag-landed-ag-v1.mjs` cleanly via the game-test slot (granted `11:10:43Z` alongside `chatgpt2 GT-20124` `t227`).
2. `native-mag-landed-ag-v1.mjs` verified all 6 landed hashes (`index.html` `72e543b44476bf4187896db03d2811b3`), `WebGPU` backend, `all16Inside: true`, `vestSlotsExact: true`, `instanceCapacity: 5`, `pageErrors: []`, and exact historical `commonCamera` (`cx=-26.0021, cz=-632.0563, baseY=-200, distance=2.9710`) in `FIRST-CELL-PENDING.json`, then paused at `LOOK BARRIER landed GT20124 native mags`.
3. Immediately inspected `review/GT-20124/native-mag-landed-ag-v1/landed/unarmed-front.png`: **instead of the `studio` backdrop Marine close-up (as in `AG-358`), the PNG shows the initial `enterTraining()` Training Ground `FIRING LINE` overhead frame** (`training.tg.group` visible, booth/targets behind the tiny player, camera stuck at initial `enterTraining()` overhead angle).
4. Because `unarmed-front.png` cannot verify the Marine's belt pouches, thighs, or right-thigh gear visually, writing `FIRST-CELL-LOOKED.txt` was refused and the 180s barrier timed out cleanly (`AssertionError: Immediate actual image LOOK required`), releasing the game-test slot at `11:14:27Z`.

## Root Cause Diagnosis
- `review/GT-20124/native-mag-short-ag-stage-v1.js` calls `H.loop(false)` and renders via `GT24Draw()` (`H.render()` + `queue.onSubmittedWorkDone()`) **without** `DWInspect.still(true)` (which creates the synchronous `presentFrame()` 2D copy canvas specifically added in `CB-345` to prevent Chromium WebGPU swapchain freeze on `page.screenshot()`).
- Running concurrently in a second `headless:false` window alongside `chatgpt2`'s `t227` (`--window-size=1200,1200`, no `--window-position`), Chromium's compositor kept the initial `enterTraining()` `trainingWarmCompile()` swapchain surface pinned when `page.screenshot()` captured `unarmed-front.png`.
- Note also: `review/GT-20124/native-mag-landed-ag-v1/` now contains `failure.json`, `sources-before.json`, and `landed/unarmed-front.png`; `native-mag-landed-ag-v1.mjs` uses `{flag:'wx'}` so it cannot re-run to the same output path until `chatgpt2` updates the helper (`I.still(true)` / `--exclusive` / clean output folder).

## Evidence
- `review/GT-20124/native-mag-landed-ag-v1/landed/unarmed-front.png`
- `review/GT-20124/native-mag-landed-ag-v1/failure.json`
- `review/GT-20124/native-mag-landed-ag-v1/landed/{FIRST-CELL-PENDING.json,setup.json}`
- [diag-barrier-fail.jpg](diag-barrier-fail.jpg) (paired `AG-358` expected vs `AG-362` frozen `FIRING LINE` capture)
