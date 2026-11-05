# Handoff: AG-224 — Independent Rescore of `GB-274` Brute Get-Up After `studio/motion.js` A-vs-S Fix (`GP-19988` Part B)

Changed: Completed the independent visual and telemetry rescore of Grokbot's `GB-274` brute get-up fix (`AB` un-offset standing reference in `studio/motion.js`) against `review/GB-274/sheet-before-side.png`, `sheet-after-side.png`, `sheet-before-game.png`, `sheet-after-game.png`, `review/GB-274/filmstrip-summary.json`, and `studio/motion/zombie/brute.json`. Confirmed that `GB-274` resolves the engine-level upright-rod bug (`spineUpY` now pitches down to `0.00..-0.19` at `u = 0.20..0.50` and rises to `0.26 -> 0.72 -> 0.98` across `u = 0.60..0.85`, raising `Intention` `2.0 -> 4.0`, `Timing` `2.5 -> 4.0`, `Character` `2.3 -> 4.0`, `Style` `3.5 -> 4.1`), while 5 of 9 principles remain below the `4.0` bar (`Overall Mean = 3.58 / 5.00`, `Min = 3.10`: `Structure = 3.1`, `Balance = 3.2`, `Contact = 3.2`, `Continuity = 3.3`, `Environmental fit = 3.3`) with exact keyframe/code root causes isolated in `qa/2026-11-03-AG-224/report.md`.
Files: qa/2026-11-03-AG-224/report.md, handoffs/2026-11-03-antigravity-AG-224.md
Tests: Visually inspected all 32 RTX 5080 WebGPU frames across `review/GB-274/sheet-before-side.png`, `review/GB-274/sheet-after-side.png`, `review/GB-274/sheet-before-game.png`, and `review/GB-274/sheet-after-game.png`, cross-referenced with `review/GB-274/filmstrip-summary.json`, `studio/motion.js` (lines 276-314, 470-565), and `studio/motion/zombie/brute.json` (`fall`, `down`, `getup.keys`).
Screenshots: review/GB-274/sheet-before-side.png, review/GB-274/sheet-after-side.png, review/GB-274/sheet-before-game.png, review/GB-274/sheet-after-game.png
Not verified: Live in-game knockdown (`index.html:52993` still uses procedural `knockDownPitch` rather than `studio/motion.js`).
Requests: DONE on Grokbot's request `GB-274 rescore: brute get-up after the A-vs-S fix (GP-19988 Part B)`.
Contract changes: none

---

## 1. Independent 9-Principle Scorecard (`docs/animation-principles.md`, `0–5` Scale)

| Principle | Before (`motion.before.js`) | Grokbot (`GB-274`) | Antigravity (`AG-224`) | Gate (`>= 4.0`) | Summary of Findings |
| :--- | :-: | :-: | :-: | :-: | :--- |
| **Intention** | `2.0` | `4.0` | **`4.0`** | **PASS** | `AB -> S` eliminates the vertical-rod levitation; low gather (`u = 0.20..0.50`) and chest push-up (`u = 0.60..0.85`) are now distinct. |
| **Timing** | `2.5` | `4.0` | **`4.0`** | **PASS** | `GETUP_HAND_OFF = 0.5` and `GETUP_KEYED_TONE = 0.7` keep the mass low for the first `0.70 s` before rising across `u = 0.50..0.85`. |
| **Continuity** | `2.8` | `3.5` | **`3.3`** | **BELOW 4** | At `u = 0.02`, the brute sits bolt-upright (`spineUpY = 0.89`, `meshHeadY = 1.24 m`) because `'down'` has no key offsets on `A` while `fall.tone.spine = 0.14` pulls the chest toward the standing pose; entering `'getup'` at `u = 0` snaps `A[chest]` down by `-1.14 m`, making the torso dive *downward* (`meshHeadY = 1.24 m -> 0.49 m` at `u = 0.20`). |
| **Balance** | `2.0` | `3.4` | **`3.2`** | **BELOW 4** | Curled ball at `u = 0.20..0.50` lacks a forward hand support column; pelvis lifts to `0.41..0.65 m` (`u = 0.50..0.60`) before a foot is planted under COM. |
| **Contact** | `2.0` | `3.2` | **`3.2`** | **BELOW 4** | Forearms fold backward under the chest (`hand.dz = +0.355 < shoulder.dz = +0.60` at `t = 0.35`) instead of planting palms vertically under the shoulders, and shins scrub along the ground from `+Z` to `-Z`. |
| **Structure** | `2.2` | `3.3` | **`3.1`** | **BELOW 4** | At `t = 0.35`, `pelvis.dy = -0.31` (`A.y = 0.41 m`) while `chest.dy = -0.92` (`A.y = 0.32 m`, `9 cm` *below* pelvis), driving `spineUpY` negative (`-0.10` at `u = 0.35`, `-0.19` at `u = 0.50`, `meshHeadY = 0.39 m < simChestY = 0.43 m`) and folding the torso into the thighs. |
| **Environmental fit** | `2.2` | `3.6` | **`3.3`** | **BELOW 4** | Knees/shins and hunched upper back crowd into the floor plane at `u = 0.20..0.35` without reading as planted support columns. |
| **Character** | `2.3` | `4.0` | **`4.0`** | **PASS** | From `u = 0.60..0.98`, the heavy forward-pitched rise (`spineUpY = 0.26 -> 0.72 -> 0.98`) with lagging head matches a `2.4`-mass brute. |
| **Style** | `3.5` | `4.0` | **`4.1`** | **PASS** | Clean silhouette and material readability in `-game` 3/4 view from `u = 0.60` onward. |
| **Mean** | **`2.39`** | **`3.67`** | **`3.58`** | **5 sub-4** | Full root-cause diagnosis and recommended keyframe numbers in `qa/2026-11-03-AG-224/report.md`. |

---

## 2. Actionable Fixes for the 5 Sub-4 Categories

1. **Prevent the upright L-sit during `'down'` (`Continuity: 3.3 -> 4.0+`)**:
   - During `body.state === 'down'`, `follow()` leaves `A` at the standing pose while `fall.tone.spine = 0.14` and `fall.tone.head = 0.15` pull the torso upright (`spineUpY = 0.89`, `meshHeadY = 1.24 m` at `u = 0.02`). Either drop `spine`/`head` tone to `<= 0.02` once `body.state === 'down'` (or bias `A` with `getupKeys[0]` during `'down'` after landing) so the brute stays flat on the dirt until `getup` begins.
2. **Keep `A[chest].y > A[pelvis].y` at `t = 0.35` in `brute.json` (`Structure: 3.1 -> 4.0+`, `Balance: 3.2 -> 4.0+`)**:
   - In `studio/motion/zombie/brute.json` at `t = 0.35`, `pelvis.dy = -0.31` (`A.y = 0.41 m`) and `chest.dy = -0.92` (`A.y = 0.32 m`) puts the chest target `9 cm` below the pelvis, pitching the spine downward (`spineUpY = -0.19`). Raising `chest.dy` to `~ -0.64` (`A.y ≈ 0.60 m`), `waist.dy` to `~ -0.45` (`A.y ≈ 0.48 m`), and `head.dy` to `~ -0.78` (`A.y ≈ 0.72 m`) keeps the shoulders above the hips (`spineUpY ≈ +0.25..+0.35`) in a true quadruped push-up plank.
3. **Place hands under shoulders at `t = 0.35` and delay `GETUP_HAND_OFF` to `0.65` (`Contact: 3.2 -> 4.0+`, `Environmental fit: 3.3 -> 4.0+`)**:
   - At `t = 0.35`, set `handL/R.dz ≈ +0.52..+0.56` (directly beneath `shoulderL/R.dz = +0.50..+0.60` instead of tucked back at `+0.355`) so the arms form a vertical support pillar to the floor, and raise `GETUP_HAND_OFF` from `0.50` to `0.65` so `slerpQuaternions` does not pull the arms toward the standing idle pose while the torso is still horizontal.
