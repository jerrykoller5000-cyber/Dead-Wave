# antigravity — AG-130 GPU review of GP-19971 (Screamer arms and face) — 2026-10-26
Changed:          Verified GP-19971 (Screamer uncrossed arms, three-beat drift/scream/exposed transitions, and compact oval face rebuild) on RTX 5080 across unit/real-renderer tests, a 420-frame continuous vertex-clearance sweep, and live first/third-person captures: 0 torso/skull intersections (`minSideM = 0.1200 m`), 12/12 live `zombieRoundHit` headshots, 60 fps (`avg 3.04 ms`, `p99 7.60 ms`), and `4/5` night flashlight facial readability at `1280×720` (no further face-value lift needed).
Files:            qa/2026-10-26-AG-130/run-ag130-review.mjs, qa/2026-10-26-AG-130/ag130-telemetry.json, qa/2026-10-26-AG-130/ag130-screamer-review-sheet.jpg, qa/2026-10-26-AG-130/unit.log
Tests:            node --test (screamer-behavior, zombie-concepts, zombie-headshots, zombie-hit-surface, GP-19971/skull-clearance) → 56 pass, 0 fail; node tools/run-tests.mjs --jobs 1 (t108, t119, t270) → 3 checks: 30 pass, 0 fail
Screenshots:      handoffs/GP-19971/before/sheet.jpg (before), handoffs/GP-19971/after/sheet.jpg (after), handoffs/GP-19971/live/sheet.jpg (after), handoffs/GP-19971/live/night-sheet.jpg (after), qa/2026-10-26-AG-130/ag130-screamer-review-sheet.jpg (after), qa/2026-10-26-AG-130/tp-lit-scream.png (after), qa/2026-10-26-AG-130/tp-lit-exposed.png (after), qa/2026-10-26-AG-130/fp-dark-close.png (after)
Not verified:     Full npm test suite (left to Cursor/Claude at commit time per Rule 16).
Requests:         Replied DONE to ChatGPT's GP-19971 review request; sent FYI to Claude with night facial readability verdict.
Contract changes: none

## Rule 16 Compliance
All browser/GPU checks (`t108`, `t119`, `t270`, and `qa/2026-10-26-AG-130/run-ag130-review.mjs`) ran in a single queued batch via `node crew/crew.mjs slot run antigravity AG-130 --checks "t108,t119,t270,ag130-screamer-gpu-review"` with `--jobs 1`.

---

## 1. Automated & Real-Renderer Test Verification

- **56 Node Unit & Geometry Checks (`qa/2026-10-26-AG-130/unit.log`):**
  - `game/screamer-behavior.test.mjs`, `studio/zombie-concepts.test.mjs`, `game/zombie-headshots.test.mjs`, `studio/zombie-hit-surface.test.mjs`, `handoffs/GP-19971/skull-clearance.test.mjs` → **`56 pass, 0 fail`**.
- **Real-Renderer Browser Checks (`--jobs 1`):**
  - `t108`: **`9 pass, 0 fail`** (Screamer behavior, sonic scream, shroud shield, exposed retreat window).
  - `t119`: **`20 pass, 0 fail`** (zombie look & archetype visual invariants).
  - `t270`: **`1 pass, 0 fail`** (zombie joint skinning & limb envelope continuity).

---

## 2. Three Arm Beats, Transitions & 420-Frame Clearance Sweep

We inspected the before/after four-light sheets (`handoffs/GP-19971/before/sheet.jpg` vs `handoffs/GP-19971/after/sheet.jpg`) and ran a live 420-frame (`7.0 s` at `60 Hz`) continuous sweep across the full `drift` → `1.2 s scream` → `2.4 s exposed` → `drift` recovery cycle on the RTX 5080 (`qa/2026-10-26-AG-130/ag130-telemetry.json`):

| Beat | Live Arm Rotations (`armLG.rot` / `armRG.rot`) | Shroud Shield | Visual & Clearance Verdict |
| --- | --- | --- | --- |
| **1. Drift (`pursue`)** | `[0.28, 0.06, -0.32]` / `[0.35, -0.06, 0.32]` | `shield: true` | **Pass (`4/5`).** Arms trail down and back along her flanks (`handoffs/GP-19971/after/sheet.jpg`, `qa/2026-10-26-AG-130/tp-lit-scream.png`), completely eliminating the old crossed-forearm bind pose across the chest. |
| **2. Scream (`1.2 s` committed)** | `[-0.17, 0.07, -0.96]` / `[-0.17, -0.07, 0.94]` | `shield: true` | **Pass (`5/5`).** Arms are thrown wide and back (`±0.95 rad` roll) with chest open and head tilted back into a full howl (`qa/2026-10-26-AG-130/tp-lit-exposed.png`). |
| **3. Exposed (`2.4 s` retreat)** | `[-1.14, 0.14, -0.93]` / `[-1.12, -0.14, 0.95]` | `shield: false` | **Pass (`4/5`).** Shroud drops cleanly and both hands rise beside her ears in a defensive flinch (`qa/2026-10-26-AG-130/fp-dark-close.png`) before recovering smoothly back into `drift`. |

- **Continuous Vertex-Clearance Telemetry (`420 frames`, `1,834,560` sampled arm vertices):**
  - **Midline clearance:** `minSideM = 0.12001 m` (left arm stays strictly on `-X ≤ -0.120 m`, right arm stays strictly on `+X ≥ +0.120 m`; zero midline crossing in any frame).
  - **Torso clearance:** `bodyIntersections = 0` across all `420` frames (`minTorsoRadM = 0.2564 m`).
  - **Skull clearance:** `skullIntersections = 0` across all `420` frames (`minSkullClearanceM = -0.0044 m`, cleanly clear of the `-0.012 m` skull penetration threshold).
  - **Headshot hit registration:** `12/12` live `T.zombieRoundHit` rays aimed at `headCenterWorld` registered `headHit: true` across every beat (`drift`, `scream`, `exposed`, `recovery`, third-person and first-person).

---

## 3. Face Construction & Night Flashlight Readability Verdict

ChatGPT scored night facial readability `3/5` from the scaled-down contact sheet (`handoffs/GP-19971/live/night-sheet.jpg`) and asked Claude and Antigravity whether the charcoal face value needs a further lift or works as-is in live play.

- **Close-up & Full-Resolution Inspection (`1280×720`):**
  - Examining the full-resolution first-person night flashlight shots ([first-person-night-drift.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19971/live/first-person-night-drift.png), [first-person-night-scream.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19971/live/first-person-night-scream.png), [first-person-night-exposed.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19971/live/first-person-night-exposed.png)) alongside our close-up GPU captures ([tp-lit-scream.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-130/tp-lit-scream.png), [tp-lit-exposed.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-130/tp-lit-exposed.png), [fp-dark-close.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-130/fp-dark-close.png)), the compact oval jaw, upper/lower teeth, shorter bruised tongue, drawn charcoal cheeks/brow ridge, strained neck cords, smooth hair sweep, and recessed pale-green eyes (`#a8e4a0`) read at **`4/5`** in live gameplay.
  - **Why `drift` and `scream` look darker in thumbnail sheets:** During `drift` and `scream`, the active sonic shroud (`shield: true`) wraps the upper body in a dark translucent cloud that intentionally absorbs light ("withdrawn light" uncanny family, `docs/art-direction.md` §1.4). The moment the shroud drops in the `2.4 s` `exposed` window ([first-person-night-exposed.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/handoffs/GP-19971/live/first-person-night-exposed.png) and [fp-dark-close.png](file:///c:/Users/Zero/Desktop/Tiny%20Trek/qa/2026-10-26-AG-130/fp-dark-close.png)), the player's flashlight lights up the charcoal face, teeth, bruised tongue, and raised arms with strong contrast against her dark torso, reinforcing the gameplay cue ("shroud gone → face exposed → shoot now").
  - **Recommendation:** **Keep as-is — no further face-value lift needed.** Lifting the charcoal face value further would make her skin look chalky/washed-out under the flashlight during the unshielded `exposed` window and weaken the uncanny withdrawn-light contrast.

---

## 4. Load & Frame-Time Telemetry (`qa/2026-10-26-AG-130/ag130-telemetry.json`)

- **Cold Training Ground boot:** `26.19 s` (`0` page errors).
- **Live 120-frame (`2.0 s`) step benchmark in first-person with active Screamer + shroud + flashlight:**
  - `liveStepAvgMs`: **`3.04 ms`** (well inside the `16.67 ms` 60 fps budget)
  - `liveStepP99Ms`: **`7.60 ms`**
  - Renderer load: `194–224` draw calls, `87,518–97,534` triangles.
