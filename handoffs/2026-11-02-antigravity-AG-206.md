# Antigravity — AG-206 GP-20016 First-Person Pass Outdoor Four-Light Visual Gate & J57 Recapture — 2026-11-02

Changed: Executed independent real-hardware visual, geometric, ergonomic, lighting, and animation QA gate on NVIDIA GeForce RTX 5080 WebGPU hardware for ChatGPT's GP-20016 first-person viewmodel pass (`game/viewmodel-poses.js`, `studio/weapon-heavy.js`, `studio/weapon-sidearms.js`). Evaluated all five heavy/revolver view guns (Revolver, Chainsaw, Minigun, Flamer, Launcher) from the outdoor woods-trail gameplay seat `(0.48, -3.17, 13.91)` across Four Lighting Models (Noon Daylight, Overcast Storm, Dusk Twilight, Night Ops) across Hip carry, ADS sights, and reload staging. Specifically audited Jerry J57, J60, J61, and J62 findings.

- **Jerry J57 Revolver Real-Time GPU Settle Recapture**:
  - Executed continuous real-time rendering settle (400–450 ms per state with live animation loop, avoiding immediate CDP capture after `T.stepFrame` under `flightHold(true)`). Trace telemetry and visual captures match 100%.
  - **Cylinder Swing Side**: Revolver crane hinge sits at gun-local `x = -0.0335` (left). During `reloadOut` (u=0.22, ejector beat), the cylinder swings outward to gun-local `x = -0.1051` (negative x, toward the support hand on screen-LEFT). Confirms Jerry J57 cylinder swing direction is fully resolved.
  - **Arm Ergonomics & Support Hand**: Left wrist sits at NDC `x = -0.1828` in ADS and right wrist at NDC `x = +0.1633`. During reload beats (`reloadOut` u=0.22, `reloadIn` u=0.58, `reloadHome` u=0.82), the support hand approaches the cylinder from screen-left without crossing over the revolver frame.
  - **ADS Sights**: In ADS, the muzzle is perfectly centered at NDC `x = 0.000` (screen pixel `x = 960.00` on 1920x1080). The front sight blade tip (`y = 0.121`) is clearly visible through the top strap rear notch.

- **Launcher Sight Line & 0.60m ADS Eye Relief (J62)**:
  - Verified `VM_POSES.launcher.ads.rear = 0.60` (0.60 m eye relief).
  - Grokbot's `fp-stock` direct-child group (`gun.userData.fpStock`) is completely excluded from the first-person eye pass (`stockExcluded: true`), eliminating receiver/stock occlusion in ADS while preserving third-person and shadows.
  - Grokbot's folding rear leaf on the datum (`z = -0.20`, first notch `y = 0.1370`) and front frame post (`z = 0.29`, tip `y = 0.1370`) provide a perfectly level bore sight line (`y = 0.1370`). In 0.60 m ADS, the front post tip reads clearly through the first leaf notch above the drum rim.

- **Chainsaw 22 Moving Teeth & Centered Bar (J60)**:
  - One `InstancedMesh` with `count: 22` verified on both source and viewmodel copies (`teethMatches22: true`). Instance transforms mirror correctly across frame updates.
  - Bar is centered along view: NDC `x = 0.0000`, `y = +0.1111` (elevated along centerline). Rear throttle and wrap-around top handle sockets remain firmly connected.

- **Minigun Underside Support Bearing (J61)**:
  - Support wrist sits at NDC `x = -0.021`, `y = -0.863` (view-space `y = -0.16`), bearing directly underneath the drive housing rather than inside metal or through the barrel cluster.
  - Right hand controls the top trigger carry grip.

- **Flamer Nozzle & Orientation**:
  - Nozzle sits low right at NDC `x = +0.133`, `y = -0.144`.
  - Fuel tank and rear grip are clearly legible; support hand stays on the forward grip.

- **Four Outdoor Lighting Models (Woods-Trail Seat)**:
  - Player positioned outdoors on the woods trail (`trainingActive: false`).
  - Evaluated across Noon (0.50 / cloud 0.15), Overcast (0.52 / cloud 0.95), Dusk (0.77 / cloud 0.15), and Night (0.95 / cloud 0.15).
  - WebGPU PBR materials ground cleanly with outdoor environmental sky, directional sunlight/moonlight, ambient diffuse lighting, horizon specular rim, and weapon light beam in night ops.

- **Art Principles Scores (0–5, all >= 4)**:
  - Revolver: Geo 4.90, Mat 4.80, Context 4.85, Readability 4.85 => Overall **4.85** / 5.0 (PASS)
  - Chainsaw: Geo 4.90, Mat 4.80, Context 4.85, Readability 4.80 => Overall **4.84** / 5.0 (PASS)
  - Minigun: Geo 4.80, Mat 4.80, Context 4.85, Readability 4.75 => Overall **4.80** / 5.0 (PASS)
  - Flamer: Geo 4.80, Mat 4.80, Context 4.85, Readability 4.80 => Overall **4.81** / 5.0 (PASS)
  - Launcher: Geo 4.85, Mat 4.80, Context 4.85, Readability 4.80 => Overall **4.83** / 5.0 (PASS)
  - Total defects detected: 0. Visual gate is green across all criteria.

Files: `qa/2026-11-02-AG-206/` (`run-ag206.mjs`, `build-sheet.py`, `ag206-telemetry.json`, `sheet-j57-settle.jpg`, `sheet-gp20016-outdoor.jpg`, 5 J57 real-time settle shots, and 20 outdoor lighting shots across 5 weapons).
Tests: Executed `qa/2026-11-02-AG-206/run-ag206.mjs` on NVIDIA GeForce RTX 5080 WebGPU via `crew.mjs slot run` (exit 0).
Not verified: Third-person multiplayer animations and external asset exports.
Requests: Answered ChatGPT's "GP-20016 final independent visual gate: outdoor lights and J57" with DONE.
Contract changes: None.
