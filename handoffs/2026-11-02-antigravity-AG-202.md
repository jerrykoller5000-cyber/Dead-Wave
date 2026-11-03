# Handoff — AG-202: The First-Person Contact Sheet from Jerry's Seat (`D-111` / `docs/specs/fps-pass.md`)

- **Date:** 2026-11-02
- **Author:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-202` (`D-111`, `J21`, `J54–J63`; `docs/specs/fps-pass.md`)
- **Downstream Owners:** ChatGPT (`GP-20016` — `game/viewmodel.js`, `game/viewmodel-poses.js`, `index.html`) and Claude (`CL-293` — `studio/fp-arms.js`, `index.html` hands/grips/models/reloads)

---

## 1. Deliverables & Artifacts (`qa/2026-11-02-AG-202/`)

Captured on Jerry's RTX 5080 WebGPU PC in `index.html?solid=1` (`&debug=1&raf=timer`), First Person (`TT.setViewFirstDbg(true)`), `fpFov = 60°`, `aimFov = 38°`, at **1080p** (`1920×1080`) and **1440p** (`2560×1440`), in the **Training Ground** (`tg`) and on a **woods trail at noon** (`woods`):

- **Master Overview Contact Sheets:**
  - `qa/2026-11-02-AG-202/Sheet-Overview-tg-1080p.jpg`
  - `qa/2026-11-02-AG-202/Sheet-Overview-tg-1440p.jpg`
  - `qa/2026-11-02-AG-202/Sheet-Overview-woods-1080p.jpg`
  - `qa/2026-11-02-AG-202/Sheet-Overview-woods-1440p.jpg`
- **Per-Weapon Stills Contact Sheets (7 poses × 3 seat/resolution rows = 19 sheets):**
  - `qa/2026-11-02-AG-202/sheets/<weapon>-stills.jpg` (`hip`, `ads`, `sprint`, `fire-peak`, `reload-out`, `reload-in`, `reload-home`)
- **Per-Weapon 3 s @ 30 fps Motion Strips + Screen-Pixel Trace Plots (19 sheets):**
  - `qa/2026-11-02-AG-202/strips/<weapon>-strips.jpg` (`walk`, `run`, `strafe`, `flick90`, `burst`, `jump` + time-series & 2D muzzle/wrist traces + hull vertex counts)
- **Animated 3 s @ 30 fps GIFs (114 GIFs):**
  - `qa/2026-11-02-AG-202/gifs/<weapon>-<strip>.gif`
- **Raw Data & Report:**
  - `qa/2026-11-02-AG-202/traces.json`
  - `qa/2026-11-02-AG-202/metrics-summary.json`
  - `qa/2026-11-02-AG-202/report.md`

---

## 2. Per-Weapon Checklist Scores (1–5 Scale per `docs/specs/fps-pass.md`)

| Weapon (`key`) | `vmActive` | Hands (`J56,J61,J62`) | Placement (`J58,J60`) | Motion (`J55`) | Fire (`J59`) | Reloads (`J57`) | Model @ 40 cm (`J21,J57,J63`) | Blocking Issues Summary |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Pistol** (`pistol`) | `true` | **2** | **3** | **2** | **4** | **3** | **3** | `1,184–1,214` hand verts inside gun hull; `wristL` overlaps `wristR` as a dark blob; elbow stumps visible in `walk`/`reload`; no sprint pose; `walk`/`run` bob is an 11–17 Hz buzz (`hpRms=8.1–10.6 px`) with identical `0.83%` amplitude (`bw` clamps at `4 m/s`). |
| **Revolver** (`revolver`) | `true` | **2** | **3** | **2** | **4** | **2** | **2** | `1,242–1,358` hand verts inside hull; `wristL` overlaps `wristR`; no swing-out cylinder or chambers/rounds during reload (`J57`); no sprint pose; 11–17 Hz walk/run buzz (`hpRms=6.7–8.8 px`). |
| **Wasp** (`uzi`) | `true` | **2** | **3** | **2** | **4** | **3** | **3** | `1,850–1,967` hand verts inside hull; parallel forearm cylinders expose capped elbow stumps at bottom; no sprint pose; 11–17 Hz walk/run buzz (`hpRms=6.6–8.7 px`, `amp=0.69%`). |
| **GW-4** (`m4`) | `true` | **1** | **3** | **2** | **4** | **2** | **3** | **Severed left forearm stump floats in mid-air** at `y ≈ 850 px` (`230 px` above bottom of 1080p frame!) because `vm-forearm` is only `0.26 m` long; `2,221–2,409` hand verts inside hull; camo UV density mismatch between `vm-forearm` (`3.0–4.5 rep/m`) and `gb152-hand` (`2.38 rep/m`, `J63`); 11–17 Hz walk/run buzz (`amp=0.36%`). |
| **AK** (`ak`) | `true` | **1** | **3** | **2** | **4** | **2** | **2** | **Severed left forearm stump in mid-air** (`wristL y = 849 px`); `2,040–2,139` hand verts inside hull; wood furniture camo/grain scale pop (`J63`); no sprint pose; 11–17 Hz walk/run buzz (`amp=0.40%`). |
| **Shotgun** (`shotgun`) | `true` | **1** | **3** | **2** | **4** | **2** | **2** | **Severed left forearm stump in mid-air** (`wristL y = 853 px`); `2,013–2,341` hand verts inside hull; reload moves whole magazine box instead of single-shell lifter insertion (`J57`); wood furniture UV scale (`J63`). |
| **Breacher-12** (`aa12`) | `true` | **1** | **3** | **2** | **4** | **2** | **3** | **Severed left forearm stump in mid-air** (`wristL y = 857 px`); `3,441–3,517` hand verts inside drum/receiver hull; no sprint pose; 11–17 Hz walk/run buzz (`amp=0.44%`). |
| **Sniper** (`sniper`) | `true` | **1** | **2** | **2** | **4** | **2** | **2** | **Severed left forearm stump in mid-air** (`wristL y = 830 px`); `2,847–2,908` hand verts inside hull; at `ads >= 0.82` when scope overlay activates (`viewmodel.js:599`), `vmEyeHide` un-hides the 3P marine arms inside the scope view (`Sheet-Overview-tg-1080p.jpg`); no bolt-handle lift/pull reload (`J57`). |
| **Launcher** (`launcher`) | `false` | **1** | **2** | **2** | **2** | **1** | **2** | **No viewmodel (`vmActive: false`)**; uses 3P-in-1P (`J54, J60`). Tube sits far bottom-left (`muzzle=[628, 645]`); both wrists off-screen (`wristR y = 1302 px`, `wristL y = 948 px`); no ADS sight picture; no 1P tube-break/round reload. |
| **Minigun** (`minigun`) | `false` | **1** | **1** | **1** | **2** | **1** | **2** | **No viewmodel (`vmActive: false`)**; sits at bottom edge (`muzzle=[800, 752]`), and during `walk` only the top few pixels of the barrel cluster peek above `y = 1080 px` (`strips/minigun-strips.jpg`); both wrists completely off-screen (`wristR y = 1379 px`, `wristL y = 1138 px`). |
| **Flamer** (`flamer`) | `false` | **1** | **1** | **1** | **1** | **1** | **2** | **No viewmodel (`vmActive: false`)**; both wrists off-screen (`wristR y = 1396 px`, `wristL y = 1126 px`); **`J59` severe 12.5 Hz camera shake (`camShakeRms = 5.191 cm`, 100× M4; `hpRms = 42.79 px`, `102.7 × 73.6 px` starburst)** during 3 s flame stream. |
| **Chainsaw** (`chainsaw`) | `false` | **1** | **1** | **1** | **2** | **1** | **2** | **No viewmodel (`vmActive: false`)**; barely peeks above bottom-left edge (`muzzle=[780, 852]`), dipping almost entirely off-screen during `walk`/`run`; both wrists off-screen (`wristR=[40089, 1944]`, `wristL=[329, 1276]`). |
| **Akimbo Pistols** (`akimbo-pistol`) | `false` | **1** | **1** | **1** | **2** | **1** | **3** | `viewmodel` disables itself when `akimboOn()` is true (`index.html:50952`); falls back to 3P-in-1P where guns sit at bottom corners and swing wildly off-screen (`run ampX = 3,870 px`, `burst hpRms = 64.2 px`). |
| **Akimbo Wasps** (`akimbo-uzi`) | `false` | **1** | **1** | **1** | **2** | **1** | **3** | `viewmodel` disabled under `akimboOn()`; falls back to 3P-in-1P barely visible at `y = 1003 px` (`run ampX = 6,195 px`, `burst hpRms = 191.4 px`). |
| **MedPen** (`medpen`) | `false`* | **1** | **1** | **1** | **1** | **1** | **2** | **Critical bug (`J54`)**: `_vmState.want` (`index.html:50952`) does **not** check `!(medPenT > 0)`. While holding any `VM_POSES` gun, `viewmodel` stays active and keeps `armLG` (where `medPenHand` is parented) hidden via `vmEyeHide = true`, so the MedPen injection is completely invisible in 1P! |
| **Knife** (`knife`) | `false`* | **2** | **2** | **2** | **2** | **3** | **3** | No standalone 1P inspect/ready pose (shows equipped gun until `triggerKnife` sets `knifeAnimT > 0`, which abruptly drops `viewmodel` for 0.25 s and causes a `907 px` screen-space jump). |
| **Machete** (`machete`) | `false`* | **2** | **2** | **2** | **2** | **3** | **3** | Same as `knife`: no standalone 1P viewmodel; `triggerKnife` drops `viewmodel` for 3P swing (`1,722 px` transition spike). |
| **Katana** (`katana`) | `false`* | **2** | **2** | **2** | **2** | **3** | **3** | Same as `knife`: no standalone 1P viewmodel; `triggerKnife` drops `viewmodel` for 3P swing (`3,523 px` transition spike). |
| **Grenade** (`grenade`) | `false`* | **1** | **1** | **1** | **1** | **1** | **2** | **Critical bug (`J54`)**: `_vmState.want` (`index.html:50952`) does **not** check `!(grenadeAnim.phase)`. While holding any `VM_POSES` gun, `viewmodel` stays active and hides `armLG` (`grenadeHand`) via `vmEyeHide = true`, so grenade pin-pull/windup/throw is completely invisible in 1P! |

---

## 3. Root-Cause Diagnosis for `GP-20016` (ChatGPT) & `CL-293` (Claude)

1. **`J55` Walk/Run 11–17 Hz Vibration & Clamped Amplitude (`game/viewmodel.js:539-545`, `game/viewmodel-poses.js:20`) — ChatGPT (`GP-20016`)**:
   - `S.bobPhase += dt * speed * VM.bob.rate * Math.PI` (`rate = 1.85`) advances `S.bobPhase` at `0.925 * speed Hz`, and `by = -Math.abs(Math.sin(S.bobPhase))` doubles it to **`1.85 * speed Hz`** (`11.1 Hz` at `6 m/s` walk, `15.9 Hz` at `8.6 m/s` run). At 30 fps (`15 Hz` Nyquist), this aliases into a rapid sawtooth buzz (`hpRmsPx = 8.09–10.56 px` on pistol, `4.07–4.70 px` on rifles).
   - `bw = Math.min(1, speed / 4)` clamps at `4 m/s`, making `walk` (`6 m/s`) and `run` (`8.6 m/s`) identical in amplitude (`0.36–0.84%` width vs spec's `1.2–2.0%` walk and `2.5–4.0%` run).
   - `_vmState` (`index.html:50942`) does not pass `sprint: moveRunning`, and `game/viewmodel.js` has no sprint pose.
   - `readSockets` (`game/viewmodel.js:491`) captures twisted 3P gait arm transforms on the first frame if `st.settled` is false when moving (`Sheet-Overview-tg-1080p.jpg` `SPRINT` col).
2. **`J59` Flamethrower 12.5 Hz Camera Shake (`index.html:52693`, `index.html:22745`) — ChatGPT (`GP-20016`)**:
   - `flamerTick()` calls `addShake(0.02)` every `0.08 s` (`12.5 Hz`), shaking `camera.position` with `camShakeRmsCm = 5.191 cm` (`100×` M4) and `hpRmsPx = 42.79 px` (`102.7 × 73.6 px` starburst), while `torsoLean -= 0.065` (`index.html:22745`) steps without a spring.
3. **`J54` / `J60` Missing Viewmodels (`launcher`, `minigun`, `flamer`, `chainsaw`, `akimbo-*`, `medpen`, `knife`, `machete`, `katana`, `grenade`) — ChatGPT (`GP-20016`)**:
   - None of the 4 heavies or 2 akimbo pairs are in `VM_POSES` (`vmActive: false`), leaving their wrists off-screen (`y = 948–1944 px`) and barrels at the bottom edge.
   - `_vmState.want` (`index.html:50952`) omits `!(medPenT > 0)` and `!(grenadeAnim.phase)`, so `vmEyeHide` hides `armLG` during MedPen and Grenade use!
   - `sniper` ADS (`st.ads >= 0.82`, `game/viewmodel.js:599`) un-hides 3P marine arms inside the sniper scope.
4. **`J56` / `J61` / `J62` Severed Left Forearm Stumps & Hand-in-Hull Intersections (`studio/fp-arms.js:18-24`) — Claude (`CL-293`)**:
   - `forearmGeo()` in `studio/fp-arms.js:18-24` is only `0.22 m` long (`0.26 m` with cuff). On all 5 long guns (`m4`, `ak`, `shotgun`, `aa12`, `sniper`), the left forearm terminates in mid-air inside the frame at `y ≈ 830–857 px` (`220–250 px` above the bottom of the 1080p screen!), exposing the flat capped elbow stump in `hip`, `ads`, `reload-out`, and `reload-in`.
   - `1,184–3,517` hand vertices intersect the gun bounding boxes across the 8 `VM_POSES` weapons, and `wristL` overlaps `wristR` on `pistol`/`revolver`.
   - `J57`: `revolver` reload lacks swing-out cylinder/chambers; `shotgun` reload moves a box mag instead of single-shell loading; `sniper` reload lacks bolt lift/pull.
