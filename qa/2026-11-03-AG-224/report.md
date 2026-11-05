# AG-224 — Independent Rescore of `GB-274` Brute Get-Up (`studio/motion.js` A-vs-S Fix, `GP-19988` Part B)

- **Date**: 2026-11-03
- **Author**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-224` (Response to Grokbot's request `GB-274 rescore: brute get-up after the A-vs-S fix (GP-19988 Part B)`)
- **Reviewed Artifacts**:
  - `studio/motion.js` (`AB` un-offset standing reference array, `GETUP_KEYED_TONE = 0.7`, `GETUP_HAND_OFF = 0.5`)
  - `studio/motion/zombie/brute.json` (`fall`, `down`, `getup.keys`)
  - `review/GB-274/sheet-before-side.png` & `review/GB-274/sheet-after-side.png`
  - `review/GB-274/sheet-before-game.png` & `review/GB-274/sheet-after-game.png`
  - `review/GB-274/filmstrip-summary.json`

---

## 1. Executive Summary & Verdict

- **Engine Fix (`GB-274` `AB` Reference in `studio/motion.js`)**: **VERIFIED FIXED.**
  - Prior to `GB-274`, `follow()` overwrote `A` in-place with `getup.keys` offsets, and `apply()` computed joint rotations from `A -> S`. Because `S` was chasing `A`, the delta `A -> S` converged toward zero rotation whenever the springs caught up to the keyframe target—leaving the mesh in its upright standing bind/idle orientation (`spineUpY = 0.93..0.98`, `meshHeadY = 1.22..1.86 m`) while only the pelvis height translated upward like a rigid rod (`sheet-before-side.png`).
  - With `AB` preserving the un-offset animated standing points and `apply()` rotating joints from `AB -> S` while holding `body.weight = 1.0` through `u = 0.50` (`GETUP_HAND_OFF = 0.5`) and ramping muscle tone to full by `u = 0.70` (`GETUP_KEYED_TONE = 0.7`), the authored `getup.keys` now genuinely drive the mesh joints (`spineUpY = 0.00` at `u = 0.20`, `-0.10` at `u = 0.35`, `-0.19` at `u = 0.50`, `+0.26` at `u = 0.60`, `+0.72` at `u = 0.70`, `+0.98` at `u = 0.85`).
- **Animation Quality Gate (`docs/animation-principles.md`)**: **DOES NOT PASS `4.0` BAR YET (`Overall Mean = 3.58 / 5.00`, `Min = 3.10`).**
  - Five principles remain below `4.0`: **Structure (`3.1`)**, **Balance (`3.2`)**, **Contact (`3.2`)**, **Continuity (`3.3`)**, and **Environmental fit (`3.3`)**.
  - Now that `AB -> S` exposes what `brute.json`'s `getup.keys` and the `'down' -> 'getup'` transition are actually doing in world space, three biomechanical defects are clearly visible in `sheet-after-side.png` and `sheet-after-game.png`.
  - Additionally, live gameplay (`index.html:52993`) still uses the procedural `knockDownPitch` path rather than `studio/motion.js` for brute knockdowns, so this rise is currently visible only in the studio and inspector.

---

## 2. Independent 9-Principle Scorecard (`0–5` Scale, `docs/animation-principles.md`)

| # | Principle | Before (`motion.before.js`) | Grokbot Self-Score (`GB-274`) | Antigravity Score (`AG-224`) | Status vs `4.0` Bar | Evidence from `sheet-after-side.png`, `sheet-after-game.png`, and `filmstrip-summary.json` |
| :- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | **Intention** | `2.0` | `4.0` | **`4.0`** | **PASS** | In `sheet-after-side.png`, the phases of a heavy rise are now legible: down (`u=0.02`), curled low to the dirt (`u=0.20..0.50`), driving the chest up (`u=0.60..0.70`), and standing (`u=0.85..0.98`). Before, it read as a vertical elevator slide (`spineUpY >= 0.93`). |
| 2 | **Timing** | `2.5` | `4.0` | **`4.0`** | **PASS** | Holding `weight = 1.0` to `u = 0.50` (`0.70 s` of the `1.4 s` rise) keeps the brute low during the gather (`meshPelvisY = 0.10..0.41 m` through `u=0.50`) before pushing up across `u = 0.50..0.85`. |
| 3 | **Continuity** | `2.8` | `3.5` | **`3.3`** | **BELOW 4** | **Snap at `u = 0.02 -> 0.20`**: At `u = 0.02`, the brute is sitting bolt-upright (`spineUpY = 0.89`, `meshHeadY = 1.24 m`, `simChestY = 0.91 m`) because during the `2.2 s` `'down'` state `follow()` has no key offsets (`A` is the standing pose) and `fall.tone.spine = 0.14` pulls the torso upright. When `'getup'` starts at `u = 0`, `getup.keys[0]` suddenly yanks `chest` down by `-1.14 m`, making the brute dive *downward* from a seated upright pose into a curled ball (`meshHeadY: 1.24 m -> 0.49 m` at `u = 0.20`). |
| 4 | **Balance** | `2.0` | `3.4` | **`3.2`** | **BELOW 4** | At `u = 0.20..0.50`, the torso is curled into a ball (`spineUpY = -0.10` to `-0.19`) with no forward hand-column support; at `u = 0.50 -> 0.60`, `meshPelvisY` rises to `0.41 m -> 0.65 m` while the feet are still tucked/sliding behind COM and the hands are already lifting off the floor (`slerp` blend starting at `u = 0.50`). |
| 5 | **Contact** | `2.0` | `3.2` | **`3.2`** | **BELOW 4** | Neither hands (`u = 0.20..0.50`) nor the lead foot (`u = 0.50..0.70`) establish a stationary planted contact point on the dirt. In `sheet-after-side.png` (`u=0.20, 0.35, 0.50`), the forearms/hands curl against the chest/knees rather than planting palms on the ground, and the shins scrub backward along the floor (`z` sliding from `+Z` to `-Z`). |
| 6 | **Structure** | `2.2` | `3.3` | **`3.1`** | **BELOW 4** | **Jackknife / fetal fold (`u = 0.20..0.50`)**: At `u = 0.35` and `u = 0.50`, `spineUpY` goes negative (`-0.10` and `-0.19`) and `meshHeadY` (`0.39 m` at `u=0.35`, `0.59 m` at `u=0.50`) is lower than `simChestY` (`0.43 m`, `0.66 m`). The massive upper torso folds into the thighs/knees (`sheet-after-side.png` frames 2–4) with severe shoulder/hip mesh self-intersection. |
| 7 | **Environmental fit** | `2.2` | `3.6` | **`3.3`** | **BELOW 4** | In `sheet-after-side.png` (`u = 0.20, 0.35`) and `sheet-after-game.png` (`u = 0.35`), the bent knees/shins and the top of the hunched back/head crowd into the ground plane without reading as weight-bearing contact against the dirt. |
| 8 | **Character** | `2.3` | `4.0` | **`4.0`** | **PASS** | Once `u >= 0.60`, the heavy forward-pitched rise (`spineUpY = 0.26 -> 0.72 -> 0.98`) with the head lagging slightly behind the chest fits a `2.4`-mass plated brute much better than the old vertical rod slide. |
| 9 | **Style** | `3.5` | `4.0` | **`4.1`** | **PASS** | Silhouette and material readability in the `-game` 3/4 view (`sheet-after-game.png`) match the Dead-Wave roster style once the torso unfolds (`u >= 0.60`). |
| — | **Overall Mean** | **`2.39`** | **`3.67`** | **`3.58`** | **5 sub-4 categories** | Engine bug (`AB` vs `A`) is fixed; remaining defects are in `'down'` state target pose, supine-vs-prone key orientation, and `brute.json` `getup.keys` heights. |

---

## 3. Root-Cause Diagnosis of the 3 Biomechanical Defects

### Defect A — Seated L-Sit at `u = 0.02` Followed by Downward Dive at `u = 0.20` (`Continuity = 3.3`)
- **Telemetry**:
  - `u = 0.02`: `meshPelvisY = 0.123 m`, `simChestY = 0.909 m`, `meshHeadY = 1.239 m`, `spineUpY = +0.892` (almost vertical!).
  - `u = 0.20`: `meshPelvisY = 0.098 m`, `simChestY = 0.453 m`, `meshHeadY = 0.489 m`, `spineUpY = +0.002` (head drops `0.75 m` *downward* at the start of getting up!).
- **Root Cause in `studio/motion.js` & `brute.json`**:
  1. In `brute.json`, `fall.tone` has `{ legs: 0.05, spine: 0.14, arms: 0.25, head: 0.15 }`.
  2. During `body.state === 'down'` (`2.2 s` on the floor before `'getup'`), `follow()` (line 296: `if (body.state === 'getup' && getupKeys)`) does **not** apply `getupKeys[0]` to `A`. Thus `A` remains the upright standing pose (`chest.y = 1.24 m`, `head.y = 1.50 m`), and `fall.tone.spine = 0.14` continuously pulls the chest and head up into a seated L-sit while the brute is supposed to be lying down!
  3. Then at `u = 0.00` (`state = 'getup'`), `getupKeys[0]` suddenly turns on (`chest.dy = -1.14`, `head.dy = -1.27`), yanking the sitting brute face-first down toward the floor between `u = 0.02` and `u = 0.35`.
- **Fix**:
  - Either lower `fall.tone.spine` / `fall.tone.head` during `'down'` (or bias `A` toward `getupKeys[0]` during `'down'` once `landed` is true) so the brute stays flat on the ground during `'down'` instead of sitting bolt-upright waiting for `'getup'` to start.

### Defect B — Supine-vs-Prone Jackknife & Negative `spineUpY` at `u = 0.20..0.50` (`Structure = 3.1`, `Balance = 3.2`)
- **Telemetry**:
  - `u = 0.35`: `meshPelvisY = 0.295 m`, `simChestY = 0.432 m`, `meshHeadY = 0.391 m`, `spineUpY = -0.104`.
  - `u = 0.50`: `meshPelvisY = 0.413 m`, `simChestY = 0.659 m`, `meshHeadY = 0.594 m`, `spineUpY = -0.188`.
- **Root Cause in `studio/motion/zombie/brute.json` & `studio/motion.js`**:
  1. **Target `chest.y` is lower than `pelvis.y` at `t = 0.35`**:
     - Standing (`AB`) world heights are `pelvis.y = 0.722 m`, `waist.y = 0.93 m`, `chest.y = 1.242 m`, `head.y = 1.503 m`.
     - At `t = 0.35` (`brute.json` lines 43–48), `pelvis.dy = -0.31` gives `A[pelvis].y = 0.412 m`, while `chest.dy = -0.92` gives `A[chest].y = 0.322 m` (`9 cm` **below** the pelvis!) and `head.dy = -1.05` gives `A[head].y = 0.453 m`.
     - Because `A[chest].y < A[pelvis].y`, the spine target pitches downward (`spineUpY < 0`), stuffing the head and shoulders below the hips.
  2. **Supine fall (`+Z` legs) vs Prone `getup.keys` (`+Z` chest, `-Z` legs)**:
     - When a front hit (`dir = [0, 0, -1]` or `+Z` knockback) knocks the brute onto its back (`u = 0.02` in `sheet-after-side.png`), its legs extend forward (`+Z`) and its torso lies toward `-Z`.
     - `brute.json` `getup.keys` (`t = 0` and `t = 0.35`) hardcodes a prone orientation (`chest.dz = +0.55..+0.62`, `knee.dz = -0.50..-0.20`, `foot.dz = -0.89..-0.34`).
     - Pulling the chest toward `+Z` while the legs are still in `+Z` (and pulling the knees through the pelvis toward `-Z`) folds the torso directly into the thighs (`u = 0.20..0.35`).
- **Fix**:
  - In `brute.json` `getup.keys`:
    - At `t = 0.35` (hands-and-knees / push-up prep), keep `A[chest].y` **above** `A[pelvis].y` by at least `+0.18..+0.25 m` (e.g., if `pelvis.dy = -0.36` -> `y = 0.36 m`, set `waist.dy = -0.45` -> `y = 0.48 m`, `chest.dy = -0.64` -> `y = 0.60 m`, `head.dy = -0.78` -> `y = 0.72 m`) so `spineUpY` stays `+0.25..+0.40` (shoulders above hips, supported on planted arms) instead of dipping negative (`-0.19`).

### Defect C — Unplanted Hands/Feet & Early `u = 0.50` Rotation Blend (`Contact = 3.2`, `Environmental fit = 3.3`)
- **Telemetry & Visuals**:
  - At `u = 0.20..0.50`, `handL`/`handR` offsets (`dz = +0.315..+0.355`) are closer to the hips than `chest` (`dz = +0.55..+0.62`) and `shoulder` (`dz = +0.50..+0.60`), so the arms fold *backward* under the chest instead of reaching down vertically (`dz ≈ chest.dz`) from the shoulders to the dirt.
  - At `u = 0.50`, `GETUP_HAND_OFF = 0.5` starts blending `s.j.quaternion` back toward the standing idle pose (`q0`) while `meshPelvisY` is only `0.41 m` and `spineUpY` is `-0.19`, pulling the hands off the dirt before the legs have stepped under the pelvis.
- **Fix**:
  - Place `handL/R` directly under `shoulderL/R` at `t = 0.35` (`hand.dz ≈ shoulder.dz ≈ +0.50..+0.55`, `elbow.dz ≈ +0.42`, `hand.dy` placing hands at floor level `y ≈ 0.04 m`) so the forearms form a vertical weight-bearing column in side view.
  - Delay `GETUP_HAND_OFF` from `0.50` to `0.65` (close to `GETUP_KEYED_TONE = 0.70`) so the mesh stays 100% driven by `AB -> S` until the `t = 0.70` lunge pose has actually brought the spine upright (`spineUpY >= 0.65`).
