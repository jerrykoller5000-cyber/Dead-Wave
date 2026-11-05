# AG-234 · Minigun Side Peg (`GP-20024`) & Chainsaw Motorcycle Grip (`CL-301`) — First-Person Audit & Score

- **Date:** 2026-11-04 (`03:12Z`)
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Seat:** `AG-219` woods-trail seat (`x = 42, y = -7.5468, z = -20, yaw = 0.000152`)
- **Launcher & Renderer:** Jerry's launcher (`index.html?solid=1&debug=1&raf=timer`, `startMatch(T, 'JERRY')`), 1920×1080 real WebGPU on RTX 5080
- **Build Inspected:**
  - `GP-20024` (`studio/weapon-heavy.js` `makeMinigunModel`: top post removed; steel side bracket from `x = -0.166` to `-0.306` + vertical ribbed rubber side peg at `(-0.304, 0.012, 0.16)`, diameter `0.036 m`, height `0.116 m` along `+Y`).
  - `CL-301` (`02:20Z` & `02:46Z` in [`game/viewmodel.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/game/viewmodel.js) and [`game/viewmodel-poses.js`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/game/viewmodel-poses.js#L140-L156)):
    - `VM_SOCKETS.minigun = { grip: [0, -0.017, -0.52], support: [-0.304, 0.012, 0.16], supportBasis: { x: [0, -1, 0], y: [-0.6, -0.3, -0.74] }, supportPose: HAND_POSES.fist }`, `elbowRel: { r: [0.12, -0.28, 0.22], l: [-0.22, -0.25, 0.25] }`.
    - `VM_SOCKETS.chainsaw = { grip: [0, -0.014, -0.46], support: [-0.01, 0.246, -0.035], supportBasis: { x: [-1, 0, 0], y: [0, -0.85, -0.5] }, supportPose: HAND_POSES.fist }`, `elbowFollow: [0.28, 0.04]`.

---

## 1. Pre-Capture Assertion & Telemetry Table (First Person)

Every first-person still asserted before capture:
1. `T.getCurrentWeapon() === key && vm.info.active === true && vm.info.key === key && vm.info.akimbo === false && vm.info.raise === 1.0000`
2. `dR = vm.wrists.r.p.distanceTo(vm.viewPoint(VM_SOCKETS[key].grip)) < 0.12 m`
3. `dL = vm.wrists.l.p.distanceTo(vm.viewPoint(VM_SOCKETS[key].support)) < 0.12 m`

| Shot File | Weapon | State / Light | `raise` | `dR` (`wrist.r` to `grip`) | `dL` (`wrist.l` to `support`) | Gun-Local Palm Grip `cR` vs `VM_SOCKETS.grip` | Gun-Local Palm Support `cL` vs `VM_SOCKETS.support` | Support Hand Basis `(channelX, forearmY, palmNormalZ)` | Support Socket NDC `(x, y)` | Left Wrist NDC `(x, y)` | Wrist Bend `(r, l)` rad | Action Proof |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `minigun-fp-rest.jpg` | `minigun` | Hip Rest (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.304, 0.012, 0.16]` (`err = 0.0000 m`) | `([0,-1,0], [-0.63,0,-0.777], [0.777,0,-0.63])` | `(-0.106, -0.667)` | `(-0.171, -0.674)` | `(0.105, 0.694)` | `holdFrames = 60` |
| `minigun-fp-fire.jpg` | `minigun` | Firing (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.304, 0.012, 0.16]` (`err = 0.0000 m`) | `([0,-1,0], [-0.63,0,-0.777], [0.777,0,-0.63])` | `(-0.110, -0.659)` | `(-0.176, -0.668)` | `(0.103, 0.682)` | `barrelRotDelta = 23.875 rad`, `shotsDelta = 15` |
| `minigun-fp-042.jpg` | `minigun` | Hip Rest (`0.42`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.304, 0.012, 0.16]` (`err = 0.0000 m`) | `([0,-1,0], [-0.63,0,-0.777], [0.777,0,-0.63])` | `(-0.106, -0.670)` | `(-0.171, -0.678)` | `(0.106, 0.696)` | 4-light gate |
| `minigun-fp-dusk.jpg` | `minigun` | Hip Rest (Dusk `0.74`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.304, 0.012, 0.16]` (`err = 0.0000 m`) | `([0,-1,0], [-0.63,0,-0.777], [0.777,0,-0.63])` | `(-0.106, -0.672)` | `(-0.171, -0.679)` | `(0.106, 0.697)` | 4-light gate |
| `minigun-fp-night.jpg` | `minigun` | Hip Rest (Night `0.02`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.017, -0.52]` (`err = 0.0000 m`) | `[-0.304, 0.012, 0.16]` (`err = 0.0000 m`) | `([0,-1,0], [-0.63,0,-0.777], [0.777,0,-0.63])` | `(-0.106, -0.670)` | `(-0.171, -0.677)` | `(0.106, 0.696)` | 4-light gate |
| `chainsaw-fp-idle.jpg` | `chainsaw` | Hip Idle (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `([-1,0,0], [0,-0.862,-0.507], [0,-0.507,0.862])` | `(+0.240, -0.393)` | `(+0.315, -0.572)` | `(0.129, 0.060)` | `chainToothIdleDelta10f = 0.0212` |
| `chainsaw-fp-cut.jpg` | `chainsaw` | Cutting (Noon `0.50`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `([-1,0,0], [0,-0.862,-0.507], [0,-0.507,0.862])` | `(+0.239, -0.399)` | `(+0.314, -0.578)` | `(0.129, 0.060)` | `chainToothCutDelta = 0.2672`, `heat = 0.015` |
| `chainsaw-fp-042.jpg` | `chainsaw` | Hip Idle (`0.42`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `([-1,0,0], [0,-0.862,-0.507], [0,-0.507,0.862])` | `(+0.240, -0.394)` | `(+0.315, -0.572)` | `(0.129, 0.060)` | 4-light gate |
| `chainsaw-fp-dusk.jpg` | `chainsaw` | Hip Idle (Dusk `0.74`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `([-1,0,0], [0,-0.862,-0.507], [0,-0.507,0.862])` | `(+0.240, -0.397)` | `(+0.314, -0.575)` | `(0.129, 0.060)` | 4-light gate |
| `chainsaw-fp-night.jpg` | `chainsaw` | Hip Idle (Night `0.02`) | `1.0000` | **`0.0656 m`** PASS | **`0.0656 m`** PASS | `[0, -0.014, -0.46]` (`err = 0.0000 m`) | `[-0.01, 0.246, -0.035]` (`err = 0.0000 m`) | `([-1,0,0], [0,-0.862,-0.507], [0,-0.507,0.862])` | `(+0.239, -0.400)` | `(+0.314, -0.578)` | `(0.129, 0.060)` | 4-light gate |

---

## 2. Visual Comparison Against `Claude outputs/cl301/` & Jerry's References (`comparison-sheet.jpg`)

### 2.1 Minigun Side Peg (`minigun-fp-rest.jpg`, `minigun-fp-fire.jpg`)
- **Against `Claude outputs/cl301/minigun-side-peg.png`:**
  - 1:1 visual match in weapon placement, peg bracket geometry, fist wrap, and forearm entry angle.
  - `GP-20024` removed the old top front post (`(-0.075, 0.263, 0.16)`) and replaced it with a horizontal steel outrigger bar + diagonal gusset jutting off the left (`-X`) side of the receiver (`x = -0.166 -> -0.306`) supporting a vertical ribbed rubber peg with metallic end-caps at `(-0.304, 0.012, 0.16)`.
  - The marine's **left gloved fist** wraps vertically around the rubber side peg (`channelX = [0, -1, 0]`, `errL = 0.0000 m`, `dL = 0.0656 m`, `ndc (-0.106, -0.667)`), with the fingers curled cleanly around the cylinder between its top and bottom end-caps.
  - The **left camo forearm** (`elbowRel.l = [-0.22, -0.25, 0.25]`, `forearmY = [-0.630, 0, -0.777]`) enters from the bottom-left completely outboard of the `-X` receiver wall and cooling vents — zero arm-through-housing clipping.
  - Removing the top post also opened up the forward sightline to the left of the J18 reflex sight arch. During firing (`minigun-fp-fire.jpg`), the 6-barrel cluster spins (`barrelRotDelta = 23.875 rad`, `shotsDelta = 15`), muzzle flash and tracer rounds fire cleanly downrange, and the left fist stays locked on the side peg.
- **Against Jerry's References (`docs/jerry/2026-11-03-fp-refs/heavy-models/` & live side-peg note):**
  - Directly fulfills Jerry's live direction (*"create a grip that juts off to the side. Something like a peg to hold into. That way his arm will not clip through the gun"*), while keeping the rear trigger grip (`(0, -0.017, -0.52)`, `dR = 0.0656 m`) behind the housing below the frame.

### 2.2 Chainsaw Motorcycle Grip (`chainsaw-fp-idle.jpg`, `chainsaw-fp-cut.jpg`)
- **Against `Claude outputs/cl301/chainsaw-motorcycle-grip.png`:**
  - 1:1 visual match in hand orientation, knuckles-forward posture, and sleeve alignment.
  - With `supportBasis: { x: [-1, 0, 0], y: [0, -0.85, -0.5] }`, `supportPose: HAND_POSES.fist`, and `elbowFollow: [0.28, 0.04]`, the marine's **left gloved hand** grips the top horizontal bar of the front wrap hoop (`(-0.01, 0.246, -0.035)`, `errL = 0.0000 m`, `dL = 0.0656 m`, `ndc (+0.240, -0.393)`) in a true **overhand motorcycle grip**:
    - The **palm faces down** onto the rubber hoop bar (`palmNormalZ = [0, -0.507, 0.862]`).
    - The **back of the glove** (dorsal strap and 4 finger ridges) faces upward toward the camera.
    - The **knuckles point forward** over the bar behind the dark front hand guard.
    - The **camo forearm** runs straight down and back along the hand's axis (`forearmY = [0, -0.862, -0.507]`) with a virtually straight wrist (`wristBend.l = 0.060 rad` / `3.4°`, compared to `0.69+ rad` before `supportBasis` + `elbowFollow`).
- **Against Jerry's References (`chainsaw-proper-grip.jpg`, `chainsaw-held-up.jpg`):**
  - Matches the overhand front-hoop hold in `chainsaw-proper-grip.jpg` (*"Left hand should have a motorcycle grip on chainsaw palm facing down"*): left hand palm-down over the top bar behind the hand guard, right hand on the rear in-line throttle handle (`(0, -0.014, -0.46)`, `dR = 0.0656 m`), worn orange engine housing low-right, and pale steel guide bar (`SAW_CHAIN_L = 0.40`) angled up-left across the lower-center view.
  - During cutting (`chainsaw-fp-cut.jpg`), the chain teeth accelerate 12.6× (`chainToothCutDelta = 0.2672` vs `0.0212` at idle) and `sawHeat` rises (`0.015`).

---

## 3. D-89 Visual Scorecard (1080p WebGPU Launcher Across 4 Lights)

| Subject | Silhouette & Proportion | Material & 4-Light Read (`noon`, `0.42`, `dusk`, `night`) | Functional Hand Contact & Ergonomics | Framing & Sightline | Mean Score |
|---|---|---|---|---|---|
| **Minigun (`GP-20024` Side Peg + `CL-301` 02:46Z)** | **4.8 / 5** (clean `-X` outrigger bracket + diagonal brace + ribbed vertical peg; top post removed; `0.84 m` barrel cluster) | **4.7 / 5** (clear contrast between steel bracket, dark rubber peg, metallic end-caps, camo sleeve, and grey receiver in all 4 lights) | **4.9 / 5** (`0.0 mm` palm-to-socket error, `dR = 0.0656 m`, `dL = 0.0656 m`; vertical fist round side peg; forearm completely outside housing) | **4.9 / 5** (removing top post opens sightline left of J18 reflex arch; red dot unobstructed at rest and firing) | **4.83 / 5.0 (PASS)** |
| **Chainsaw (`GP-20022` + `CL-301` 02:20Z Motorcycle Grip)** | **4.8 / 5** (orange engine cowling, rear throttle handle, front wrap hoop, hand guard, `z = 0.93` guide bar with chain round nose) | **4.7 / 5** (dorsal glove ridges/strap, orange housing `#a85225`/`#c66b2e`, and pale steel bar `#b1b9b2` read crisply across all 4 lights) | **4.9 / 5** (`0.0 mm` palm-to-socket error, `dR = 0.0656 m`, `dL = 0.0656 m`; true palm-down motorcycle grip, knuckles forward, straight wrist `0.060 rad`) | **4.7 / 5** (L4D2 low-right body, bar angled up-left; note: 1P cutting pose remains static in translation `muzzleSwingDispM = 0.0018 m`) | **4.78 / 5.0 (PASS)** |
