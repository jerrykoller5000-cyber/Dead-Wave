Changed:
- Completed independent floor-only visual review (`AG-351`, zero 5080 captures run per D-114) of ChatGPT's GP152 Leaper floor work across existing `v27` pair/crush sheets (`runtime-final-pair-sheets-v1/`, `runtime-knock-continuous-v7/`) and optimized `v34` sheets (`runtime-knock-continuous-v11/`, `runtime-cave-native-v1/`, `runtime-maimed-native-v5/`, `runtime-normal-continuous-v4/`) plus seeded perf pair `runtime-perf-seeded-pair-v1/comparison.json`.
- Floor-only visual verdict (`v27` + `v34` — **FLOOR CONTACT PASS**, **STYLE/TIMING CAVEATS NOTED**, **PERF STILL HARD-BLOCKED FOR LANDING**):
  - **Rest / Spawn / Idle / Statue (`statue-all-lights.jpg`, `spawn-all-lights.jpg`, `idle-all-lights.jpg`):**
    - `statue` shows the biggest floor fix: BEFORE dipped the rear toes diagonally down through the floor grid; AFTER (`v27`) tucks into a proper quadruped crouch cleanly on top of the floor plane (`states.json` `minBodyGap = -0.073mm`, `handL/R -0.025mm`, `footL/R -0.073mm`).
    - `spawn` and `idle` lift the slightly sunken BEFORE front wrists cleanly onto the floor plane (`minBodyGap = -0.073mm`), four supports grounded across noon/overcast/dusk/night.
  - **Walk (`walk-all-lights.jpg` in `v27`, `walk-0/30/60/90/119` in `v34/runtime-normal-continuous-v4`):**
    - Alternating gait plants stance hands and rear stance foot cleanly on the grid (`footL -0.073mm`, `handR -0.034mm`) with crisp vertical clearance on swing limbs (`handL +137.076mm`, `footR +111.290mm`), zero sunken limbs.
  - **Hit & POI Sleep (`hit-all-lights.jpg`, `poi-sleep-all-lights.jpg` in `v27`; `hit-0/18/35`, `poi-sleep-29` in `v34/runtime-normal-continuous-v4`; `cave-sleep` in `v34/runtime-cave-native-v1`):**
    - `hit` (`v27` & `v34`) plants cleanly onto the floor without BEFORE's rear-foot droop (`v27` `minBodyGap = -0.080mm`).
    - `poi-sleep` in `v27` (`-0.033mm`) carried the red hit-flash tint because it was sampled right after hit; `v34` `poi-sleep-29` shows neutral grey color with paws grounded in alert/crouch, while `v34` `cave-sleep` / `cave-step-0` shows true low supine cave-sleep splayed flat on the floor grid.
  - **Knockdown & Getup (`v7` `forward-side.jpg`/`back-side.jpg`, `v34` `v11` `forward-side-sheet.jpg`/`back-side-sheet.jpg`, `v34` `cave-step-15..95`):**
    - **Lying phases (`steps 19–91`) pass floor contact cleanly:** forward (`prone`) rests flat belly-down along the grid (`v7` `coreGap 11.4–11.7mm`, `minBodyGap 0.00mm`); back (`supine`) rests flat on his back with heels on grid and arms relaxed outward (`coreGap 0.0mm`, `minBodyGap 0.00mm`), zero floor penetration.
    - **End crouch (`steps 114–131`, `cave-step-45–95`)** settles cleanly on all 4 supports (`<= 0.1–0.2mm`).
    - **Getup transition timing caveat (no floor clipping, but visually abrupt):**
      - Forward `step 110` plants front claws (`0.1/0.0mm`) while both hind feet remain `+82.8/+88.9mm` airborne trailing behind until `step 114`.
      - Back `step 105 -> 110` (`v7` & `v11`) and `cave-step-15 -> 30` (`v34`) snap in ~5 frames (~83ms) from seated pelvis up into a tall **bipedal hind-toe stand** (`v7` `coreGap 517.4mm`, `footL/R 3.3/-0.0mm`) with long arms dangling `+177.1/+162.5mm` above the floor before dropping onto all fours at `114`/`cave-45`. Visually rigid (matches ChatGPT's flagged quick pushup timing note).
  - **Maimed `legR` loss (`v34` `runtime-maimed-native-v5/all-native-frames.jpg`):**
    - Severed right thigh stump cleanly above grid; across `maimed-hit-0/18/35`, arms stay uncrossed on their own sides and remaining 3 supports plant cleanly on the grid.
  - **Explicitly outside GP152 floor-only scope (per Director `00:40Z`):** unchanged mesh seams, flat palm/claw-tip stance geometry, and night/dusk torch lighting remain deferred to later restyle.
  - **Landing remains HARD BLOCKED on FPS:** `v27` regressed `35.72 -> 16.67` fps; latest sealed-source `v34` 48-Leaper comparison (`runtime-perf-seeded-pair-v1/comparison.json`, seed `15227`) still fails `withinDirector5Percent: false` (`beforeFPS: 58.0738` vs `afterFPS: 45.3895`, `ratio: 0.7816` / `-21.8%`).

Files:
- `handoffs/2026-11-17-antigravity-AG-351.md` (this floor-only visual review report)
- Read-only inspection only; no game or review files modified and no 5080 slot runs executed.

Tests:
- Inspected existing `review/GP-20152/runtime-perf-seeded-pair-v1/comparison.json` (`beforeFPS: 58.07`, `afterFPS: 45.39`, `ratio: 0.7816`, `withinDirector5Percent: false`, `budget60Met: [false, false]`).
- Verified `runtime-final-states-after-v1/receipt.json` and `runtime-knock-continuous-v11/receipt.json` (`success: true`, `privateDrift: []`).
- Zero new game-test captures run (per D-114 and ChatGPT's request).

Screenshots:
- [statue-all-lights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-final-pair-sheets-v1/statue-all-lights.jpg) — `v27` BEFORE/AFTER statue across 4 lights (rear toes no longer pierce floor).
- [spawn-all-lights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-final-pair-sheets-v1/spawn-all-lights.jpg) — `v27` spawn across 4 lights (front palms raised cleanly onto grid).
- [idle-all-lights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-final-pair-sheets-v1/idle-all-lights.jpg) — `v27` idle across 4 lights (all 4 supports grounded).
- [walk-all-lights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-final-pair-sheets-v1/walk-all-lights.jpg) — `v27` walk across 4 lights (stance contact + swing lift).
- [hit-all-lights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-final-pair-sheets-v1/hit-all-lights.jpg) — `v27` hit across 4 lights.
- [poi-sleep-all-lights.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-final-pair-sheets-v1/poi-sleep-all-lights.jpg) — `v27` poi-sleep (carries red hit-flash tint in v27 pair).
- [forward-side.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-knock-continuous-v7/sheets/forward-side.jpg) & [back-side.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-knock-continuous-v7/sheets/back-side.jpg) — `v27` 10-step forward/back knockdown + getup strips.
- [forward-side-sheet.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-knock-continuous-v11/forward-side-sheet.jpg) & [back-side-sheet.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-knock-continuous-v11/back-side-sheet.jpg) — `v34` knockdown + getup strips.
- [all-native-frames.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-cave-native-v1/all-native-frames.jpg) — `v34` cave sleep + noise-wake getup frames (`cave-sleep` supine flat; `step 30` rigid bipedal transition).
- [all-native-frames.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-maimed-native-v5/all-native-frames.jpg) — `v34` maimed `legR` loss frames (own-side hands uncrossed, 3 supports grounded).
- [all-native-frames.jpg](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20152/runtime-normal-continuous-v4/all-native-frames.jpg) — `v34` normal hit, neutral-color `poi-sleep-29`, and walk strides.

Not verified:
- No new runtime captures executed by Antigravity on optimized source (waiting on ChatGPT's `-21.8%` v34 perf resolution first).
- Seams, flat palm/claw-tip silhouette restyle, and dusk/night lighting deferred per Director `00:40Z`.

Requests:
- Replied `DONE` to ChatGPT's `GP152 floor-only v27` request with floor-only approval across `v27` + `v34` frames, explicit note on the rigid ~83ms bipedal stand-up step (`back-110`/`cave-30`), and confirmation that `-21.8%` perf (`45.39` vs `58.07` fps) still blocks landing.
- Sent `FYI` to `chatgpt,claude` referencing `handoffs/2026-11-17-antigravity-AG-351.md`.

Contract changes:
- None.
