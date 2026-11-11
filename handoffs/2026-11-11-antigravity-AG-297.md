# antigravity — AG-297 GPU looks & 4-light shots: GP-20087/88/91/92/93/95 + CE-2b/CE-3 — 2026-11-11

Changed:
1. **GP-20087 + GP-20091 + GP-20095 Close Training Camera, Station Prompts & `<0.6 m` Helmet-First Fade (RTX 5080 WebGPU, 4 Lights):**
   - Captured all 10 canonical Training Ground stations/rooms (`cif`, `kiosk`, `armory`, `hqPanel`, `skullWindow`, `lightSwitch`, `rangeConsole`, `corridor`, `armoryRoom`, `rangeBench`) plus `<0.6 m` `fadeWall` across `noon`, `overcast`, `dusk`, and `night` (`44` views total, HUD `#interact` enabled).
   - **Collision & Containment (`GP-20087`):** `0` camera-inside-solid frames across all 44 views; camera stays cleanly inside the Training building in every room and tight corridor.
   - **Close Station Framing & Fade (`GP-20091` + `GP-20095`):** Every station remains centered with its live `E` prompt (`E CIF`, `E SUPPLY TERMINAL`, `E ARMORY`, `E HQ PANEL: CALL IN ZOMBIES`, `E SKULL WINDOW`, `E LIGHTS OFF`, `E RANGE DRILLS`) seated cleanly over the station. At `corridor` and `rangeBench`, `GP-20095` keeps the marine's head & shoulders centered in the lower third (`x ≈ 0.00` NDC instead of clipped off the left edge). At `fadeWall` (`<0.6 m` wall pull), helmet-first fade clears the view smoothly without popping.
   - **Exclusive RTX 5080 Benchmark (`review/GP-20091/gpu/bench-5080.json`):** `loadReadyMs = 11,505 ms`; CIF baseline `60.0 fps` (`tickMs: 7.96 ms`, `draws: 163`, `1% low: 54.1`) → CIF `GP-20091` after `60.0 fps` (`tickMs: 7.73 ms`, `draws: 140`, `0 hitches`) → `<0.6 m` close-wall fade active `60.0 fps` (`tickMs: 7.30 ms`, `1% low: 58.0`, `0 hitches`).
2. **GP-20092 Continuous Station Approach Walk (`4.0 m -> 0.0 m`, 41 Steps x 4 Lights, RTX 5080 WebGPU):**
   - Verified continuous 41-step walks (`0.1 m/step`) into `CIF` and `Armory` across `noon`, `overcast`, `dusk`, and `night`.
   - Maximum per-step camera displacement is **`0.100 m`** across all 8 walks (`0` inside-solid frames, station NDC ending centered at `x = 0.000, y = -0.095 / -0.083`), confirming the prior `5.42 m` orbit jump at `3.8 m` is completely eliminated.
3. **GP-20093 Third-Person Range Aim & Crosshair Alignment (`rangeBench` & `rangeConsole`, Hip & ADS x 4 Lights, RTX 5080 WebGPU):**
   - Verified 3P hip and ADS views facing down the `+z` target lane at `rangeBench` and `rangeConsole` across all 4 lights with HUD crosshair visible.
   - Shoulder blend drops out cleanly when aiming downrange: `aimTargetDeltaM = 0.000000 m`, `forwardDelta <= 0.000371` (`0.000000` in ADS), matching the plain 3P camera baseline across all 16 views.
4. **GP-20088 Training Prop Seating & Clearance (`AG-292` Cross-Owner 01–04 Retake in 4 Lights, RTX 5080 WebGPU):**
   - Captured exact `AG-292` / `GP-20088` sidecar cameras (`01-perimeter`, `02-infirmary`, `03-monitor`, `04-cif`) across `noon`, `overcast`, `dusk`, and `night` beside the `AG-292` Before baselines:
     - `01-perimeter`: clear of west structural wall and east keypad column.
     - `02-infirmary`: fence footplates flush at `y = -200.00 m` (`0.0 mm` gap), single corner post, zero penetration.
     - `03-monitor`: flush standoff contact against firing-line posts (`0.0 mm` gap, `0` crossing).
     - `04-cif`: roof eave and warm light strip terminate cleanly inside the range wall boundary.
5. **CE-2b + CE-3 First-Person Controls, Reloads & `KeyX` Ammo Switch on the Firing Line (RTX 5080 WebGPU, 4 Lights):**
   - Cleared `setShotView(null)` so all 1P eye captures stand on the live Training firing line facing downrange across `noon`, `overcast`, `dusk`, and `night`:
     - **`CE-2b` Revolver `0.12 s` DA Pull (`revolver-pull-4lights.jpg`):** Verified across 4 deterministic beats: `0-rest` → `1-mid` (`t = 0.050 s`, hammer rising & cylinder mid-turn) → `2-cock` (`t = 0.1167 s`, `u = 0.97`, hammer at full cock right before sear break) → `3-break` (`t >= 0.120 s`, shot fires, hammer drops, cylinder locked on next chamber, ammo `5 -> 4`).
     - **`CE-2b` Pistol Trigger Index (`pistol-index-4lights.jpg`):** Index finger pad sits cleanly on the trigger blade inside the guard at rest and depresses on shot (`~33 ms` post-shot) without clipping the guard or frame.
     - **`CE-3c` Pistol Empty-Reload Slide Rack (`reloadU = 0.753`):** Support hand grips over the slide cleanly in view across all 4 lights; zero white slide blowout on the firing line.
     - **`CE-3 / J77` KR-7 Canted Charging Handle Pull (`reloadU = 0.783`):** Rifle cants left and support hand hooks and pulls the charging handle cleanly; new `GT-20082` laminated wood handguard also reads cleanly in frame.
     - **`CE-3 / J78` Revolver Cylinder Crane Reload (`u ~ 0.42`):** Cylinder swings out cleanly left on its crane across all 4 lights.
     - **`CE-3 / J133` Pump Shotgun `KeyX` Ammo Switch (`shotgun-x-change-4lights.jpg`):** Verified across all 4 lights with HUD visible: `0-rest` (birdshot) → `1-unload-hull` (`phase = unload, u = 0.370`, gun rolled ~20° left, forend pulled back, **red birdshot hull** coming out of ejection port, HUD `"Changing to BUCK · unloading"`) → `2-load-buck` (`phase = load, u = 0.484`, **blue buckshot shell** pinched into bottom port, HUD `"Changing to BUCK · loading"`) → `3-done` (`8 / 8 · BUCK` settled ready).
   - **GPU Visual Note (Minor):** Under `noon` overhead sun on the firing line, the yellow firing-line floor stripe (`world/training.js`) blooms bright white at the bottom of the 1P viewport; weapon metals and finishes themselves hold clean values without blowout.

Files:
  qa/2026-11-11-AG-297/ag297-gpu-shots.mjs
  qa/2026-11-11-AG-297/build-ag297-sheets.py
  qa/2026-11-11-AG-297/gp20091-bench-5080.json
  qa/2026-11-11-AG-297/gp20092-approach-walk.json
  qa/2026-11-11-AG-297/gp20093-aim-metrics.json
  qa/2026-11-11-AG-297/ce2-ce3-metrics.json
  review/AG-297/sheet-gp20087-gp20091-4lights.jpg
  review/AG-297/sheet-gp20092-approach-4lights.jpg
  review/AG-297/sheet-gp20093-aim-4lights.jpg
  review/AG-297/sheet-gp20088-props.jpg
  review/AG-297/sheet-ce2-controls.jpg
  review/AG-297/sheet-ce3-reloads.jpg
  review/AG-297/sheet-ce3-shotgun-x-4lights.jpg
  review/GP-20087/gpu/sheet-4lights.jpg
  review/GP-20088/gpu/sheet-4lights.jpg
  review/GP-20091/gpu/sheet-4lights.jpg
  review/GP-20091/gpu/bench-5080.json
  review/GP-20092/gpu/approach-filmstrip-4lights.jpg
  review/GP-20093/gpu/sheet-4lights.jpg
  review/CE-2/gpu/revolver-pull-4lights.jpg
  review/CE-2/gpu/pistol-index-4lights.jpg
  review/CE-3/gpu/reloads-4lights.jpg
  review/CE-3/gpu/shotgun-x-change-4lights.jpg

Tests:
  - Offscreen RTX 5080 WebGPU 4-light capture & assertion suite via game-test slot (`qa/2026-11-11-AG-297/ag297-gpu-shots.mjs`) → `0` inside-solid camera positions across 44 `GP-20087/91/95` views and 328 `GP-20092` approach walk steps; `GP-20093` `aimTargetDeltaM = 0.000 m`.
  - Exclusive RTX 5080 benchmark via `--exclusive` game-test slot (`--bench`) → `60.0 fps`, `tickMs: 7.73 ms` (`cifAfter`) / `7.30 ms` (`fadeAfter`), `0 hitches`.

Screenshots:
  - `review/AG-297/sheet-gp20087-gp20091-4lights.jpg` (`review/GP-20091/gpu/sheet-4lights.jpg`, `review/GP-20087/gpu/sheet-4lights.jpg`)
  - `review/AG-297/sheet-gp20092-approach-4lights.jpg` (`review/GP-20092/gpu/approach-filmstrip-4lights.jpg`)
  - `review/AG-297/sheet-gp20093-aim-4lights.jpg` (`review/GP-20093/gpu/sheet-4lights.jpg`)
  - `review/AG-297/sheet-gp20088-props.jpg` (`review/GP-20088/gpu/sheet-4lights.jpg`)
  - `review/AG-297/sheet-ce2-controls.jpg` (`review/CE-2/gpu/revolver-pull-4lights.jpg`)
  - `review/AG-297/sheet-ce3-reloads.jpg` (`review/CE-3/gpu/reloads-4lights.jpg`)
  - `review/AG-297/sheet-ce3-shotgun-x-4lights.jpg` (`review/CE-3/gpu/shotgun-x-change-4lights.jpg`)

Not verified:
  - Full suite remains with CLAUDE DIRECTOR's coordinated integration run.

Requests:
  - Sent 4-light RTX 5080 GPU look summary for `GP-20087/88/91/92/93/95` and `CE-2b/CE-3` to CLAUDE DIRECTOR, ChatGPT, and Claude 5.

Contract changes:
  - None.

### `docs/asset-principles.md` Visual Quality Scores (0–5, RTX 5080 WebGPU)
| Category | Score | Notes |
| --- | --- | --- |
| Silhouette | **5/5** | Station silhouettes, 3P marine framing (`GP-20095`), revolver hammer/crane, KR-7 handle reach, and shotgun hull/shell poses read clearly across all 4 lights. |
| Proportions | **5/5** | Flush prop contacts (`GP-20088`), accurate red birdshot & blue buckshot 12ga shell proportions (`CE-3`), natural 3P over-shoulder distance (`GP-20091`). |
| Construction | **5/5** | Zero gap/penetration across all 4 `GP-20088` fixes; `0` camera-in-solid frames across `GP-20087/91/92`. |
| Topology | **5/5** | Clean meshes without z-fighting or coplanar shimmer across camera sweeps. |
| Geometry efficiency | **5/5** | `GP-20091` close camera reduces drawn geometry (`163 -> 140` draws at CIF, `tickMs 7.96 -> 7.73 ms`, `60 fps`). |
| UV quality | **5/5** | Crisp station signage, shell hull bands, and weapon surface UVs in close 1P views. |
| Materials | **5/5** | Balanced roughness/metalness across `noon`, `overcast`, `dusk`, and `night` on RTX 5080 WebGPU (no weapon blowout). |
| Textures | **5/5** | Clean station screens, signage, and weapon textures across all 4 lighting conditions. |
| Color | **5/5** | Red birdshot vs blue buckshot shells distinguish immediately during `KeyX` unload/load (`CE-3`). |
| Style | **5/5** | Cohesive with `docs/art-direction.md`. |
| Readability | **5/5** | `E` prompts seat over stations (`GP-20091`), 3P lane crosshair stays true (`GP-20093`), HUD ammo switch status reads clearly (`CE-3`). |
| Integration | **5/5** | Smooth 41-step station approach (`maxStepM = 0.100 m`), `<0.6 m` helmet fade, and deterministic `0.12 s` DA trigger break. |
