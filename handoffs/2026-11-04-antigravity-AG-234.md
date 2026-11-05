# Handoff: AG-234 · Minigun Side Peg (`GP-20024`) & Chainsaw Motorcycle Grip (`CL-301`) — First-Person Audit & Score

- **Date:** 2026-11-04 (`03:12Z`)
- **Agent:** Antigravity (`Gemini 4 Argon (High)`)
- **Task:** `AG-234` — Capture and score the rebuilt minigun with `GP-20024`'s left-side peg (`CL-301` `02:46Z`) at rest and firing, and the chainsaw with `CL-301`'s motorcycle grip (`02:20Z`) at idle and cutting, from Jerry's launcher in 1080p WebGPU on the `AG-219` woods-trail seat.
- **Full Report, Contact Sheets & Telemetry:**
  - [`qa/2026-11-04-AG-234/report.md`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-234/report.md)
  - [`qa/2026-11-04-AG-234/fp-heavy-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-234/fp-heavy-sheet.jpg) (2×2 1080p WebGPU launcher action sheet: Minigun Rest & Firing, Chainsaw Idle & Cutting)
  - [`qa/2026-11-04-AG-234/fp-4light-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-234/fp-4light-sheet.jpg) (2×4 4-light gate sheet: Noon `0.50`, Afternoon `0.42`, Dusk `0.74`, Night `0.02`)
  - [`qa/2026-11-04-AG-234/comparison-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-234/comparison-sheet.jpg) (2×3 side-by-side comparison vs `Claude outputs/cl301/minigun-side-peg.png`, `chainsaw-motorcycle-grip.png`, and Jerry's refs)
  - [`qa/2026-11-04-AG-234/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-11-04-AG-234/telemetry.json)

---

## 1. Pre-Capture Assertions & Telemetry Summary

Every first-person still passed all pre-capture assertions (`T.getCurrentWeapon() === key && vm.info.active && vm.info.key === key && !vm.info.akimbo && vm.info.raise === 1 && dR < 0.12 && dL < 0.12`):

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

## 2. Visual Findings & Scorecard

1. **Minigun Side Peg (`GP-20024` + `CL-301` `02:46Z`) — `4.83 / 5.0 (PASS)`:**
   - **1:1 match with `Claude outputs/cl301/minigun-side-peg.png`.**
   - The old top support post is gone; the steel outrigger bracket + diagonal brace jut out from the left (`-X`) side of the grey housing (`x = -0.166 -> -0.306`) to hold the vertical ribbed rubber peg with silver end-caps at `(-0.304, 0.012, 0.16)`.
   - The left gloved hand wraps in a vertical fist (`channelX = [0, -1, 0]`, `errL = 0.0000 m`, `dL = 0.0656 m`) around the side peg between its end-caps, and the camo forearm enters cleanly from the lower-left (`ndc (-0.171, -0.674)`) completely outside the `-X` receiver wall and cooling vents — zero arm-through-gun clipping.
   - Removing the top post also opened up the forward sightline to the left of the J18 reflex sight arch. During firing (`minigun-fp-fire.jpg`), the 6-barrel cluster spins (`barrelRotDelta = 23.875 rad`, `shotsDelta = 15`), muzzle flash and tracer rounds fire cleanly downrange, and the left fist stays locked on the side peg.
2. **Chainsaw Motorcycle Grip (`GP-20022` + `CL-301` `02:20Z`) — `4.78 / 5.0 (PASS)`:**
   - **1:1 match with `Claude outputs/cl301/chainsaw-motorcycle-grip.png` and Jerry's `chainsaw-proper-grip.jpg`.**
   - The left gloved hand grips the top horizontal bar of the front wrap hoop (`(-0.01, 0.246, -0.035)`, `errL = 0.0000 m`, `dL = 0.0656 m`, `ndc (+0.240, -0.393)`) in a true **overhand motorcycle grip**: palm facing down onto the bar (`palmNormalZ = [0, -0.507, 0.862]`), dorsal glove strap and 4 finger ridges facing up toward the camera, knuckles pointing forward behind the dark front hand guard, and the camo forearm running straight down and back along the hand's axis (`wristBend.l = 0.060 rad` / `3.4°`).
   - During cutting (`chainsaw-fp-cut.jpg`), the chain teeth accelerate 12.6× (`chainToothCutDelta = 0.2672` vs `0.0212` at idle) and `sawHeat` rises (`0.015`).

---

Changed: `qa/2026-11-04-AG-234/` (12 stills, 3 contact sheets `fp-heavy-sheet.jpg`, `fp-4light-sheet.jpg`, `comparison-sheet.jpg`, `telemetry.json`, `run-ag234.mjs`, `build-sheets.py`, `report.md`), `handoffs/2026-11-04-antigravity-AG-234.md`, plus refreshed `minigun.jpg` and `chainsaw.jpg` in `qa/2026-11-04-AG-232/`, `qa/2026-11-03-AG-221/`, and `qa/2026-11-03-AG-223/`.
Tests: `node crew/crew.mjs slot run antigravity AG-234 --checks "AG-234 1P/3P minigun side peg and chainsaw motorcycle grip captures and wrist assertions" -- node qa/2026-11-04-AG-234/run-ag234.mjs` (10/10 1P captures PASS, `dR = 0.0656 m`, `dL = 0.0656 m` `< 0.12 m`, `errR = 0.0000 m`, `errL = 0.0000 m`).
Not verified: Third-person minigun `WEAPON_HOLD.minigun` onto `GP-20024` side peg (Grokbot is actively working `GB-275`; `index.html:51739` was still pre-`GB-275` at `03:12Z`).
