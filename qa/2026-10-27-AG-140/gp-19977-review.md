# Antigravity — GP-19977 Whiffed Shambler Recovery Motion Review — 2026-10-27

## 1. Scope & Evidence Inspected
- **Module**: `game/shambler-recovery.js` (`beginShamblerWhiffRecovery`, `stepShamblerWhiffRecovery`, `poseShamblerWhiffRecovery`)
- **Gameplay-Scale Filmstrip (`10.2 m` camera, gameplay pitch)**:
  - `handoffs/GP-19977/gameplay/proof.json` (`duration: 1.25 s`, `lunged: true`, `playerHit: false`, `minAttackCd: 1.25`, `minLungeCd: 1.25`, `frames: 25`, `maxYawStep: 0.115 rad`, `maxForwardStep: 0.114 m`, `endGap: 0.88 m`)
  - `handoffs/GP-19977/gameplay/recovery-012.png` (`t = 0.12 s`, stumble deceleration, `pace = 1.67 m/s`, `gap = 2.139 m`)
  - `handoffs/GP-19977/gameplay/recovery-038.png` (`t = 0.38 s`, angry head-shake + pivot start, `pace = 0 m/s`, `gap = 2.53 m`)
  - `handoffs/GP-19977/gameplay/recovery-058.png` (`t = 0.58 s`, facing re-aligned, shuffle start, `pace = 2.118 m/s`, `gap = 2.388 m`)
  - `handoffs/GP-19977/gameplay/recovery-086.png` (`t = 0.86 s`, closing shuffle + arm flail, `pace = 2.28 m/s`, `gap = 1.762 m`)
  - `handoffs/GP-19977/gameplay/recovery-116.png` (`t = 1.16 s`, arrived at `0.88 m` contact ring, cooldown gated with `attackCd = 0.22 s`)
- **Close Inspection Filmstrip (`3.55 m` camera)**:
  - `handoffs/GP-19977/close/proof.json`
  - `handoffs/GP-19977/close/recovery-{012,038,058,086,116}.png`
- **Historical Baseline**:
  - `review/shambler-miss-GP19853/after.png` (static post-whiff hold at fixed distance)

---

## 2. Gameplay-Scale Review (`handoffs/GP-19977/gameplay/*`) — **PASS**

At gameplay camera distance and pitch, the three-beat recovery (`0.00–0.36 s` stumble carry-through, `0.24–0.92 s` angry head-shake and frustrated arm flail, `0.36–1.25 s` re-orient and shuffle back into the `0.88 m` melee ring while `attackCd`/`hzLungeCd` remain locked to `1.25 s`) fixes the old frozen statue hold cleanly:
1. **Readable Physical Consequence (`012 → 038`)**: Forward momentum carries the Shambler past the sidestepped marine (`gap` widens from `1.883 m` to `2.53 m`) with a heavy forward torso pitch (`torso.rotation.x += 0.28 * stumble + 0.14 * settle`) and low head drop before braking.
2. **Frustration Tell (`038 → 086`)**: The 2.5-cycle head shake (`head.rotation.y += sin(beat) * 0.34 * angry`) and asymmetric alternating arm flail read immediately at gameplay height as a telegraphed punishment window while cooldowns stay gated (`minAttackCd = 1.25 s`).
3. **Active Pursuit Without Free Hit (`058 → 116`)**: Re-acquiring the marine and shuffling back to `0.88 m` keeps pressure on the player without granting an early swing (`playerHit: false`).

### Gameplay-Scale Score Table (`docs/animation-principles.md` §6)

| Category | Score (0–5) | Gameplay-Scale Notes |
| --- | :---: | --- |
| **Pose** | **4 / 5** | Distinct silhouette arc from over-extended lunge (`012`) to hunched brake (`038`) to wide-armed frustrated pursuit (`058–116`). |
| **Timing** | **4 / 5** | `0.36 s` braking window + `0.56 s` angry turn/shuffle + `0.33 s` settle fills the `1.25 s` punish window with clear beat separation. |
| **Weight** | **4 / 5** | Heavy forward pitch and knees-bent sink (`-0.055 * stumble`) sell the mass of a missed lunge. |
| **Secondary** | **4 / 5** | Asymmetric arm flail (`L/R` phase-shifted) and head shake follow the torso brake naturally. |
| **Contact** | **4 / 5** | At gameplay camera distance (`10.2 m`), foot plant and shuffle read cleanly against the ground grid. |
| **Continuity** | **4 / 5** | Max yaw step `0.115 rad` and max forward step `0.114 m` per `50 ms` frame; no pops. |
| **Blend** | **4 / 5** | Enters smoothly from lunge overshoot and settles cleanly (`settle` bell curve) into the standard chase state at `1.25 s`. |
| **Structure** | **4 / 5** | Shoulder, elbow, hip, and knee rotations stay within anatomical limits throughout the recovery. |

---

## 3. Close-Inspection Review (`handoffs/GP-19977/close/*`) — **2 Close-Range Polish Items**

At `3.55 m` close inspection (`handoffs/GP-19977/close/recovery-{012,038,058,086,116}.png`), two close-range issues are visible:

1. **In-Place Pivot Foot Skate & Low-Amplitude Shuffle (`close/recovery-038.png → 058.png → 086.png`) — `Contact: 3 / 5` (close)**:
   - In `game/shambler-recovery.js` lines 48–49 and 84–88, during `t = 0.36..0.48 s` while the marine is behind the Shambler's facing cone (`alignment <= 0.3`), `s.pace = 0`, which sets `walk = 0` and stops `s.walkPhase` from advancing while `s.yaw` rotates at `2.3 rad/s` (`~0.115 rad` per frame). As a result, both boots stay planted side-by-side (`lift = 0`, `rz` offset `0`) and rotational-skate on the floor grid (`038 → 058`).
   - Once forward shuffle begins (`058 → 116`), `lift = max(0, sin(stride)) * 0.065 * walk` and fore-aft `rz` (`±0.12 * walk`) are subtle enough that both boots still read nearly parallel in close-up.
   - **Suggested Fix**: Advance `s.walkPhase` from angular turn rate as well (`s.walkPhase += (s.pace * 3.6 + Math.abs(turn) / Math.max(dt, 1e-4) * 1.1) * dt`), let `walk` include a turn contribution (`Math.min(1, s.pace / 2.1 + turnRateRatio * 0.55)`), and bump recovery stride amplitude slightly (`0.12 -> 0.18` on `rz`, `0.065 -> 0.095` on `lift`).

2. **Outstretched Flailing Hands Intersecting the Marine at the `0.88 m` Contact Ring (`close/recovery-116.png`)**:
   - At `t = 1.16 s` (`close/recovery-116.png`), the Shambler has reached the `0.88 m` contact stop directly behind the marine with `0.22 s` of `attackCd` still remaining. Because `angry` is still active (`u = 0.928`) and adds `(-0.48 + sin(beat) * 0.40) * angry` to `arm.rotation.x` on top of the zombie's base forward arm reach, both hands/forearms reach forward into the back of the marine's helmet and shoulders while waiting for cooldown expiry.
   - **Suggested Fix**: Attenuate the forward arm pitch (`-0.48 * angry`) when `gap < 1.15 m` (or pull the elbows/shoulders slightly wider/higher into a chambered guard as the Shambler reaches `stopGap = 0.88 m`) so the hands don't clip through the marine's upper body before the next swing starts.
