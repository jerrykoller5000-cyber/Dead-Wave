# AG-381 — Spider17 Corrected INWARD Corpse Curl Filmstrip Look (Supersedes UPtips)

- **Date:** 2026-11-18
- **Scope:** Intermediate crew `D-191` / `D-204` visual QA of `review/GT-20111/d204/spider-death-retarget-owner-v9-world-limited-inward/` (`before-native-inward-filmstrip-v1.png`, `plan-native-inward-filmstrip-v1.png`, and all `12` RAW keyframe PNGs `before/death-frame-{00,10,20,30,43,60}.png` & `plan/death-frame-{00,10,20,30,43,60}.png`), answering ChatGPT 2's request (`LOOK Spider corrected INWARD corpse curl supersedes UPtips: actual61 contact0/range159.5`). Supersedes `AG-377` (`v5` UPtips). Zero game launches, zero code/test/bar edits; not whole-animation/gameplay-camera/live-floor verified.
- **Sheets Built:**
  - `qa/2026-11-18-AG-381/sheet-spider-inward-frames.jpg` (`1160x1480`, `BEFORE` UPtips vs `PLAN` inward curl across `f00, 10, 20, 30, 43, 60`)
  - `qa/2026-11-18-AG-381/sheet-spider-inward-closeup.jpg` (`1280x1360`, zoomed comparison of `f30, 43, 60`)

## Verified Checks & Counts (Read-Only from `v9-world-limited-inward` Receipts)
- **`receipt.json`:** `sourceStable: true`, `Spider17` sockets + `death6` inward retarget vs `UPtips` baseline, `61` corpse frames, fixed `4 m` `3/4` QA camera.
- **`NATIVE-EVERY-WORLD-LIMITED-INWARD-CONTACT-v5.json` (`61` frames both phases):**
  - `before` (`UPtips`): `58/58` rooted (`0` floating), `maxNonAdjacentContacts: 0`.
  - `plan` (`INWARD curl`): `58/58` rooted (`0` floating), `maxNonAdjacentContacts: 0`.
- **`native-death.json` (`61` samples both phases):**
  - `before`: `minFloorGap: +0.000117 m` (`+0.117 mm`), `maxWrappedDeg: 121.061 deg`, `maxRawDeg: 330.614 deg`.
  - `plan`: `minFloorGap: +0.000032 m` (`+0.032 mm`), `maxWrappedDeg: 159.500 deg` (`159.49999998`), `maxRawDeg: 159.500 deg` (`<= 160 deg` limit; raw C5 double-cover rule not waived).

## Visual Assessment (`PLAN INWARD curl` vs `BEFORE UPtips`)
1. **Dead-Curl Motion Read PASS (`f30..f60`):**
   - **Where:** `plan/death-frame-{30,43,60}.png` and `qa/2026-11-18-AG-381/sheet-spider-inward-closeup.jpg`.
   - **What is visible:** Unlike `BEFORE` (`UPtips`, where `f30..f60` dropped knees to the floor and pointed all six tibias vertically up like coat-hooks), `PLAN f30` transitions cleanly downward/inward and `PLAN f43..f60` raise the knees beside the carapace while folding all six lower tibias and black claws **inward and downward** under/along the body flanks (`0` non-adjacent contacts, `58/58` connected, `+0.032 mm` floor). Reads credibly as a curled dead spider.
2. **Concrete Visual Notes (`Spider17` Intermediate Geometry & Fixed Trajectory):**
   - **Pre-`Spider19` root cuff tags & proximal femur notch (`f43..f60`):** Because this run uses `Spider17`, the `AG-378` ventral brown triangular root-cuff shards and sharp cervical collar border remain visible (`f10..f60`), and lifting the front femur tightly backward in `f43/60` exposes a slight flat/pinched cuff seam just behind the collar (checked on `Spider19` in `AG-382`).
   - **Hovering level forebody & flat `f43..f60` hold:** Due to the preserved `.72 s` torso trajectory, the body stays upright/hovering slightly above the folded legs and `f43`/`f60` remain nearly identical.
   - **Retained D-204 items:** Angular thin claws, thin proximal tibias, matte lateral eyes (`Spider19`), and unwaived live feet-floor defects (`walk`/`spit-snap`).
