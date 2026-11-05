# Handoff: AG-229 — Our Ten Guns Against Jerry's Reference Models (tools/refview Report)

Changed:
- Completed `AG-229` (independent dimensional and visual comparison of all ten studio weapons against Jerry's reference GLB models in `tools/refview/index.html` after `CU-238`):
  1. Ran `tools/refview` across all 10 weapons (`minigun`, `m4`, `ak`, `uzi`, `shotgun`, `aa12`, `revolver`, `sniper`, `launcher`, `chainsaw`) on Jerry's PC under the shared test slot (`task-152`). Captured side and top views at matched scale along with orbit views (`qa/2026-11-03-AG-229/stills/`).
  2. Extracted quantitative bounding boxes, lengths, heights, widths, bore-over-grip distances, grip rake angles, and sight heights (`qa/2026-11-03-AG-229/metrics.json`).
  3. Identified the biggest structural and ergonomic differences vs Jerry's reference models:
     - **GW-4 (`m4`)**: Ours has `+24.2%` length (`1.043 m` vs `0.840 m` via `look=1.35, hand=0.92, UPM`). Ref has sloped Crane SOPMOD cheekweld, prominent T-charging handle, forward assist, brass deflector, and vertical foregrip vs our stepped block stock and boxy reflex sight.
     - **KR-7 (`ak`)**: Ours is `+58.1%` wider (`98 mm` vs `62 mm`). Ref features steeper downward comb drop on wooden buttstock, stamped horizontal dust-cover ribs, stepped rear tangent sight block, and deeper curved steel magazine.
     - **Wasp (`uzi`)**: Height matches reference within `2 mm` (`0.257 m` vs `0.259 m`). Ref gains deep stamped horizontal side ribs, folded steel under-folding stock struts, and top cocking knob slot cutout between sight protective ears.
     - **Shotgun (`shotgun`)**: Reference `shotgun.glb` is a hunting/field 870 with a continuous drop-comb semi-pistol grip stock and long corncob forend, whereas our shotgun is a tactical pistol-grip pump with ventilated barrel rib (`GP-20021`'s new cross-pins and relief slab break up the receiver face at 40 cm).
     - **Breacher-12 (`aa12`)**: Closest match in the roster: `boreOverGrip` matches exactly (`0.148 m` vs `0.148 m`), height and drum width within `6%`. Ref features continuous monoblock polymer shell flowing into trigger guard and full-length carry-handle sight tunnel.
     - **Sniper (`sniper`)**: Ref (`AWM/L96`) features distinctive **thumbhole chassis cutout**, high dual-ring scope mount, and slimmer forend exposing `~55%` barrel; ours uses solid stepped stock and wider footprint (`156 mm` vs `77 mm`).
     - **Revolver (`revolver`)**: Ref is a slim service `.38 Special` (`42 mm` cylinder, unshrouded barrel); ours is a heavy full-underlug magnum (`78 mm` wide, tall ventilated rib, `look=1.4`).
     - **Launcher (`launcher`)**: Ref (`M32`) has narrower cylinder (`157 mm` vs `200 mm`), taller quadrant sight (`0.139 m` vs `0.082 m`), and downward telescoping stock vs our wide drum and horizontal olive slab stock.
     - **Minigun (`minigun`)**: Omitted from `WEAPON_SIZE` in `index.html` (`oursScale = 0.88`, `1.276 m` vs `0.800 m`, `+59.5%` L, `+163%` H) due to large underslung ammo drum and top sight housing vs ref's bare barrel/motor core.
     - **Chainsaw (`chainsaw`)**: Ref has a bulkier, rounder motor housing (`~48%` of length) with tall chain brake guard (`0.205 m`) and deep D-handle loop; ours has a boxier motor block (`~36%` of length) and longer bar (`~64%` of length).
  4. Generated high-resolution composite comparison contact sheets:
     - `qa/2026-11-03-AG-229/all-10-side-top-sheet.jpg`: complete 10-weapon side & top comparison matrix.
     - `qa/2026-11-03-AG-229/sheet-1-rifles-smg-shotguns.jpg`: Rifles, SMG & Shotguns (`m4`, `ak`, `uzi`, `shotgun`, `aa12`).
     - `qa/2026-11-03-AG-229/sheet-2-sniper-sidearm-heavies.jpg`: Sniper, Sidearm & Heavies (`sniper`, `revolver`, `launcher`, `minigun`, `chainsaw`).
  5. Published full report to `qa/2026-11-03-AG-229/report.md`. Ready to feed ChatGPT's `GP-20021`.

Files:
- `qa/2026-11-03-AG-229/report.md`
- `qa/2026-11-03-AG-229/metrics.json`
- `qa/2026-11-03-AG-229/all-10-side-top-sheet.jpg`
- `qa/2026-11-03-AG-229/sheet-1-rifles-smg-shotguns.jpg`
- `qa/2026-11-03-AG-229/sheet-2-sniper-sidearm-heavies.jpg`
- `qa/2026-11-03-AG-229/run-ag229.mjs`
- `qa/2026-11-03-AG-229/build-sheets.py`
- `qa/2026-11-03-AG-229/stills/` (30 individual captures)
- `handoffs/2026-11-03-antigravity-AG-229.md`

Tests:
- Real-browser automated capture in `tools/refview/index.html` via Chrome DevTools Protocol (`node qa/2026-11-03-AG-229/run-ag229.mjs`): PASS (10/10 weapons rendered, 0 page errors, all GLB meshes and studio guns aligned).
- Offline GLB parser & Three.js geometric validation: PASS (all 10 reference GLBs parsed, triangle counts verified from `2,647` on chainsaw to `44,672` on M4).
- Composite contact sheet generation (`python qa/2026-11-03-AG-229/build-sheets.py`): PASS (`all-10-side-top-sheet.jpg`, `sheet-1-rifles-smg-shotguns.jpg`, `sheet-2-sniper-sidearm-heavies.jpg` created).

Screenshots:
- `qa/2026-11-03-AG-229/all-10-side-top-sheet.jpg`
- `qa/2026-11-03-AG-229/sheet-1-rifles-smg-shotguns.jpg`
- `qa/2026-11-03-AG-229/sheet-2-sniper-sidearm-heavies.jpg`
- `qa/2026-11-03-AG-229/stills/m4-side.jpg`
- `qa/2026-11-03-AG-229/stills/m4-top.jpg`
- `qa/2026-11-03-AG-229/stills/ak-side.jpg`
- `qa/2026-11-03-AG-229/stills/ak-top.jpg`
- `qa/2026-11-03-AG-229/stills/uzi-side.jpg`
- `qa/2026-11-03-AG-229/stills/uzi-top.jpg`
- `qa/2026-11-03-AG-229/stills/shotgun-side.jpg`
- `qa/2026-11-03-AG-229/stills/shotgun-top.jpg`
- `qa/2026-11-03-AG-229/stills/aa12-side.jpg`
- `qa/2026-11-03-AG-229/stills/aa12-top.jpg`
- `qa/2026-11-03-AG-229/stills/sniper-side.jpg`
- `qa/2026-11-03-AG-229/stills/sniper-top.jpg`
- `qa/2026-11-03-AG-229/stills/revolver-side.jpg`
- `qa/2026-11-03-AG-229/stills/revolver-top.jpg`
- `qa/2026-11-03-AG-229/stills/launcher-side.jpg`
- `qa/2026-11-03-AG-229/stills/launcher-top.jpg`
- `qa/2026-11-03-AG-229/stills/minigun-side.jpg`
- `qa/2026-11-03-AG-229/stills/minigun-top.jpg`
- `qa/2026-11-03-AG-229/stills/chainsaw-side.jpg`
- `qa/2026-11-03-AG-229/stills/chainsaw-top.jpg`

Not verified:
- `pistol` and `flamer` (not part of the 10-gun `tools/refview` set).
- `naders_grenade_launcher.glb` missing tail bytes (acknowledged in `CU-238` and `metrics.json` `binShort: true`).

Requests:
- Feeds ChatGPT's `GP-20021` for close-model visual fidelity pass.

Contract changes:
- None (report only; no game code edited).
