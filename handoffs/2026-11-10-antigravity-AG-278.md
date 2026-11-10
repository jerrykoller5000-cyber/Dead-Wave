# Antigravity — AG-278 J104: Security Door Keypads Flush on Door Trim on RTX 5080 (WebGPU) — 2026-11-10

Changed: Moved the Training Ground security doors' keypads flush onto the yellow-and-black hazard striped door trim post on both the Range side and Build room side (Jerry's J104, `world/training.js`):
  1. Z-Positioning: Keypads centered at `z = D.minZ` (`-9.5` relative / `-649.5` world), exactly matching the center of the 0.14 m deep hazard-striped post. Removed the old 32 cm offset into the wall (`D.minZ - .32` = `-649.82`) and the 9 cm air gap between the keypad backing and the trim post.
  2. X-Positioning: Keypad housing (`steelLight`, depth 0.14 m, height 0.16 m, thickness 0.04 m) mounted directly flush on the outer face of the hazard door trim post (`D.x + side * .25` -> `-7.75` Range side / `-8.25` Build room side). Front face sits at `x = D.x + side * (.25 + .04)` (`-7.71` Range side / `-8.29` Build room side), eliminating the previous 7.5 cm recessed sink behind the post.
  3. Keypad Face & Lamp: Keypad face (`new T.PlaneGeometry(.13, .15)`) mounted with 0.5 mm standoff on the housing front with rotation `side * Math.PI / 2`. Door indicator lamp (`doorLamp`, depth 0.14 m, height 0.08 m, thickness 0.025 m) mounted at `y = 1.42` flush on the post directly above the keypad housing.
  4. Cleanup: Removed the obsolete 0.32 m wide wall-backing steel box (`box(.15, .46, .32, steel, ...)`) that previously caused visual overhang and clipping.
  5. Interaction & Walkability: Updated interaction coordinates to `k.x = O.x + D.x + side * (.25 + .04)`, `k.y = O.y + 1.28`, `k.z = O.z + D.minZ`, with standing front at `W(D.x + side * 1.0, D.minZ)`. Player stands cleanly on walkable floor (`clampToRects.moved === false`) at 1.80 m distance from door center (> 1.5 m check). Tested door toggle via keypad interaction (toggled true, shutter moves 3.12 m).

Files: `world/training.js`, `tools/ag-review-runner-ag278.mjs`, `tools/build-ag278-sheets.py`, `qa/AG-278/*`, `review/AG-278/*`, `handoffs/2026-11-10-antigravity-AG-278.md`.
Tests:
  - Unit tests: `node world/training.test.mjs` (6/6 pass, including CL-146 keypad reach and standoff assertion).
  - Related suites: `node world/training-ballistics.test.mjs` (5/5 pass), `node world/training-wear.test.mjs` (10/10 pass), `node world/training-build-wear.test.mjs` (3/3 pass).
  - Hardware WebGPU test: Executed `tools/ag-review-runner-ag278.mjs` twice (before baseline and after fix) in shared game-test slot on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware -> exit code 0; door toggle interaction verified (`{ initialAmount: 3.12, toggled: true, newAmount: 3.12 }`).
Screenshots:
  - Master Comparison Sheet: `qa/AG-278/ag278-keypad-comparison-sheet.jpg` and `review/AG-278/ag278-keypad-comparison-sheet.jpg` (side-by-side Before vs After across 5 views: Range overview, Range closeup, Build overview, Build closeup, Door shutter toggle).
  - Before Captures: `qa/AG-278/before-01-range-door-overview.png` through `before-05-door-shutter-toggled.png`.
  - After Captures: `qa/AG-278/after-01-range-door-overview.png` through `after-05-door-shutter-toggled.png`.
  - Metrics JSON: `qa/AG-278/before-metrics.json` and `qa/AG-278/after-metrics.json`.
Findings / Numbers:
  - Before: Keypads located at `z = -649.82` (32 cm displaced into wall), `x = -7.81` (Range) / `-8.19` (Build), recessed behind the hazard post face (`-7.75` / `-8.25`) with a 9 cm visible gap to the trim post.
  - After: Keypads centered at `z = -649.50` (0.00 mm displacement from trim post center `minZ = -649.50`), outer face at `x = -7.71` (Range) / `-8.29` (Build), mounted 100% flush on the 0.14 m wide yellow-and-black striped trim post with 0 mm gap.
Not verified: Flames higher fidelity and char (AG-279) and chainsaw effects (AG-280), which are subsequent cards in queue.
Requests: Replied DONE to Claude's request "AG-278..280 (J104, J120, J121)" for item AG-278 (J104); acknowledged requests 2 and 3.
Contract changes: none.
Family: Props / Training Ground Geometry & Collision. Score: 5/5.
Rule 16: Executed under single-instance WebGPU allocation through shared game-test slot under token validation.
