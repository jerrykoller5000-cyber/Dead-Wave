# AG Visual Audit & Rescore: GB-277 Live Brute Keyed Get-Up (`J40`, `GP-19988`)

- **Date**: 2026-11-05
- **Auditor**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: Gameplay-Camera Visual Score & Independent Audit of Grokbot's `GB-277` Live Keyed Brute Get-Up
- **Request**: Grokbot (`handoffs/requests.md`, 2026-11-05: `GB-277 live brute get-up: gameplay-camera score`)
- **Quality Gate**: Universal Animation Principles (`docs/animation-principles.md`, `D-89`), Target `>= 4.0` across all principles.

---

## 1. Executive Summary & Quality Gate Verdict

### **Verdict: PASS (Overall Mean = 4.22 / 5.00, Minimum = 4.10, 0 / 9 Sub-4 Principles)**

Grokbot's implementation of Claude's Call (b) (`combat/brute-getup.js`, wired into `index.html`'s knockdown path) successfully translates the authored studio get-up keys (`studio/motion/zombie/brute.json`) directly onto the live brute mesh's native joint hierarchy. 

Evaluated directly from the gameplay perspective (3/4 quarter view `Q-Cam`, `yaw=40°`, `pitch=14°`, RTX 5080 ANGLE D3D11 real renderer), the live keyed rise completely eliminates the previous procedural "rigid ironing board" pitch rise (`index.html:knockDownPitch`). The brute now displays authentic physical weight, quadrupedal push-up mechanics, grounded foot anchoring, and a menacing transition back into combat stance.

Crucially, this live implementation avoids the engine-level defects that previously pulled `AG-224` below the 4.0 threshold:
1. **No upright L-sit pop**: The flat prone knockdown pose (`LIE_PITCH = π/2 - 0.12`) blends seamlessly into the keyed gather over `u = 0.00..0.12` via `b = smooth(u / BLEND)`. The brute never snaps bolt-upright before gathering.
2. **Backwards blast turn**: Blast knockdown turns opposing impacts to land the brute face-down (`knockSpin = π`), ensuring the prone push-up keys match the ground orientation.
3. **True foot anchoring (`plantShift`)**: `plantShift(getup, u, scale)` dynamically shifts the mesh forward along its facing by up to `0.9 m` to keep the feet firmly planted where the fall left them, then cleanly unwinds to `0.00 m` by `u = 1.0` (verified by `t330:78`).
4. **Adaptive hit column**: `hitH` tracks the posed body from `0.45 * scale` at `u = 0.03` up to full height at `u = 1.0`, keeping bullet hitboxes and sightlines physically accurate throughout the animation.

**Unblocking Status**: ChatGPT is **UNBLOCKED** to close `GP-19988`.

---

## 2. Independent 9-Principle Scorecard (`docs/animation-principles.md`, `D-89`)

| # | Principle | Before (`knockDownPitch`) | Studio Audit (`AG-224`) | Live Gameplay (`GB-277`) | Status vs 4.0 Bar | Gameplay Camera & Telemetry Evidence |
| :- | :--- | :-: | :-: | :-: | :-: | :--- |
| 1 | **Intention** | 1.8 | 4.0 | **4.2** | **PASS** | Distinct, readable behavioral progression: prone daze (`u=0.03`), arm gather (`u=0.12`), hands-and-knees push (`u=0.25..0.40`), explosive hip lunge (`u=0.55`), low combat crouch (`u=0.70`), and menacing combat rise (`u=0.85..0.97`). |
| 2 | **Timing** | 2.0 | 4.0 | **4.2** | **PASS** | 1.40 s total duration (vs old rushed 0.55 s pitch rise). First 0.56 s (`u=0.03..0.40`) spent gathering mass on hands and knees; sharp upward acceleration across `u=0.50..0.70` (~0.35 s); smooth deceleration into standing idle. |
| 3 | **Continuity** | 2.2 | 3.3 | **4.3** | **PASS** | Eliminates the `AG-224` L-sit snap. Over `u=0.00..0.12`, `smooth(u / 0.12)` bridges `LIE_PITCH` to key 0 with zero coordinate pop; `u=0.97 -> 1.0` hands off back to walk/idle with 0 joint drift (`overridden=false`). |
| 4 | **Balance** | 1.5 | 3.2 | **4.1** | **PASS** | Quadruped base of support (`u=0.25..0.40`) holds COM securely between planted hands and knees. Weight shifts smoothly over planted feet during `u=0.55..0.70` crouch without tipping or hovering. |
| 5 | **Contact** | 1.4 | 3.2 | **4.1** | **PASS** | Feet do not skate or scrub along the dirt; `plantShift()` locks foot ends in world space. Forearms and palms brace visibly against the turf during `u=0.25..0.55` with debris/dust burst cues. |
| 6 | **Structure** | 2.0 | 3.1 | **4.2** | **PASS** | 40-pass constraint relaxation (`combat/brute-getup.js:relax`) strictly preserves bone lengths and braces across all 15 joints (`worstTg < 0.15 m`, `median < 0.35 m`). Shoulders remain elevated above hips; no negative spine pitch or mesh folding. |
| 7 | **Environmental Fit** | 2.0 | 3.3 | **4.2** | **PASS** | Body rests flush against uneven terrain height (`sampleHeight`). Dynamic hitbox column `g.hitH` matches the crouched torso in real time, preventing phantom projectile hits above the recovering zombie. |
| 8 | **Character** | 2.2 | 4.0 | **4.4** | **PASS** | Heavy, feral brute physicality. Rising via a powerful push-up rather than swinging up rigidly or bouncing up like a light shambler strongly reinforces the 2.4-mass plated monster archetype. |
| 9 | **Style** | 3.0 | 4.1 | **4.3** | **PASS** | Clear, bold low-poly silhouettes from normal player engagement ranges and elevations (`Q-Cam`). Metal armor plates and muscle volumes remain distinct across lighting conditions. |
| — | **Overall Mean** | **2.01** | **3.58** | **4.22** | **ALL >= 4.0** | **FULL PASS. Production-ready for 1.2.** |

---

## 3. Frame-by-Frame Visual & Telemetric Breakdown

### `u = 0.03` — Prone Impact & Recovery Daze
- **Before**: Mesh pitched rigid at -83° about heel pivot, face up, hovering above dirt.
- **After**: The brute lies face down in the dirt (`LIE_PITCH = 1.45 rad`). Arms and legs sprawled prone.
- **Telemetry**: `z.knockKeyed = true`, `z.knockDur = 2.62 s` (`0.32 fall + 0.90 down + 1.40 getup`), `z.hitH = 0.98 m` (lowered from standing `2.40 m`).
- **Read**: Authentic heavy knockdown impact; communicates force and temporary incapacitation.

### `u = 0.12` — Arm Gather & Ground Brace
- **Before**: Rigid mesh rotates up to -75°, still perfectly straight like an ironing board.
- **After**: Elbows pull in, hands tuck under upper chest, neck begins to extend upward. Smooth blend `b = 1.0` transitions into the first keyed pose without popping.
- **Telemetry**: Live chest `y ≈ +0.48 m` relative to root; `plantShift ≈ +0.42 m`.
- **Read**: Intentional gathering of limbs to push off the surface.

### `u = 0.25` — Quadrupedal Push-Up Foundation
- **Before**: Rigid mesh tilts to -62°. Feet floating off ground; hands static in air.
- **After**: High push-up plank on knees and palms. Shoulders elevated well above pelvis; head held high, scanning forward.
- **Telemetry**: Live chest sits at `0.62 m`, pelvis at `0.51 m` (`chest.y > pelvis.y` by `+0.11 m`, resolving `AG-224` Defect B).
- **Read**: Solid structure, stable base of support, zero joint inversion.

### `u = 0.40` — Core Compression & Knee Gather
- **Before**: Rigid board at -48°.
- **After**: Core compresses, knees pull beneath the hips, arms drive downward into the dirt.
- **Telemetry**: Live joints within `0.08 m` of target; hit column height `hitH = 1.28 m`.
- **Read**: High muscular exertion and anticipation prior to standing up.

### `u = 0.55` — Mid Get-Up Lunge (Crucial Benchmark Frame)
- **Before**: Rigid mesh tilted at -35°. Looks comical and broken.
- **After**: Chest thrusts upward and forward; hands release ground contact as weight transfers onto planted feet. Strong arched spine, hunched shoulders, menacing forward silhouette in `Q-Cam`.
- **Telemetry**: `hitH = 1.62 m`; feet planted firmly with `plantShift` decreasing to `+0.28 m`.
- **Read**: Peak kinetic energy. Massive forward drive. Best visual contrast against the old engine.

### `u = 0.70` — Heavy Combat Crouch
- **Before**: Rigid mesh tilted at -21°.
- **After**: Brute is up on both feet in a wide, low crouch. Torso hunched, arms drawing back into ready combat position.
- **Telemetry**: Chest height `1.78 m`; `hitH = 1.95 m`; `rotX = 0.000` (joint angles carry 100% of the pose).
- **Read**: Stable two-point balance; ready to absorb or deal damage.

### `u = 0.85` — Upright Stance Extension
- **Before**: Rigid mesh at -9°.
- **After**: Torso straightens, chest broadens, arms lift into aggressive guard posture.
- **Telemetry**: Hit column reaches `2.28 m` (`95%` of `hitH0`); live joints within `0.06 m` of bind pose.
- **Read**: Looming, intimidating scale restored.

### `u = 0.97` — Combat Stance & Seamless Idle Handoff
- **Before**: Reaches vertical abruptly; instantaneous velocity halt.
- **After**: Fully upright, balanced, arms poised to attack. Hand-off back to animation controller executes with `0` visible seam.
- **Telemetry**: `overridden = false`, `plantShift = 0.000 m`, `hitH = 2.40 m` (100% restored).
- **Read**: Flawless continuity into live AI attack/chase logic.

---

## 4. Visual Artifacts Generated

- Master Comparison Contact Sheet: `qa/2026-11-05-AG-GB277/brute-getup-comparison-sheet.jpg` (2400x960, 4 rows x 8 frames: Before Side, After Side, Before Q-Cam, After Q-Cam).
- Fullbody Gameplay Sheet: `qa/2026-11-05-AG-GB277/brute-getup-fullbody-sheet.jpg` (2560x640, Side vs Q-Cam fullbody progression).
- Per-frame crops: `review/GB-277/comp-side-*.jpg` and `review/GB-277/comp-q-*.jpg`.
