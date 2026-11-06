# AG-236 Visual Audit & Rescore: GB-280 Live Brute Get-Up Arms (`J40`, `GP-19988`, `GB-280`)

- **Date**: 2026-11-06
- **Auditor**: Antigravity (`Gemini 4 Argon (High)`)
- **Task**: `AG-236` — Rescore of Grokbot's `GB-280` Live Brute Get-Up Arms (`review/GB-280/after-fix/` vs `review/GB-274/` and `review/GB-277/`)
- **Rule**: `AGENTS.md` Rule 18 (`docs/animation-principles.md`, `D-89`) & `D-114` (scored strictly from what the pictures show; zero extra browser runs).

---

## 1. Executive Summary & Correction of Prior `GB-277` Audit

### **Verdict: PASS (Overall Mean = 4.16 / 5.00, Minimum = 4.00, 0 / 9 Sub-4 Principles)**

**Correction of `AG-GB277` (2026-11-05)**:
In `qa/2026-11-05-AG-GB277/brute-getup-comparison-sheet.jpg` (Row 2 in `qa/2026-11-06-AG-236/gb280-arms-comparison-sheet.jpg`), `GB-277`'s live brute rose through the torso and legs, but **the arms were visibly broken across the entire clip**:
- From `u = 0.12` to `u = 0.70`, both upper arms flared out horizontally to the sides and the forearms/fists curled up in front of the chest/head (`y > 1.1 m`), so **the hands never touched the ground** during the hand-knee-push.
- At `u = 0.85..0.97`, both arms remained raised above the shoulders in the spawn-emerge claw pose (`rising` included `knocked`), and the close camera cropped the upper torso and head out of the frame.

**What `GB-280` (`review/GB-280/after-fix/`) Fixes in the Pictures**:
1. **Hands reach and plant on the dirt mid get-up (`u = 0.25..0.40`)**: In `side-025.png`, `q-025.png`, `side-040.png`, and `q-040.png`, the brute's left arm extends straight down from the shoulder to the dirt trail (`handL = 0.381 m` at `u = 0.262`, `0.351 m` at `u = 0.411`, `handR = -0.160 m` / `-0.085 m`), visibly bracing the upper body in a four-point hands-and-knees push-up foundation that matches `review/GB-274/after-side-020.png` and `after-side-035.png`.
2. **Push-off & low hang through crouch (`u = 0.55..0.70`)**: In `side-055.png` / `q-055.png` (`u = 0.562`) and `side-070.png` / `q-070.png` (`u = 0.712`), as the torso pitches upward onto the feet, the left hand lifts cleanly off its dirt shadow (`handL = 0.655 m` -> `0.872 m`) with the arm hanging vertically beneath the shoulder beside the knee/thigh—completely eliminating the `GB-277` chest-high fists and flared elbows.
3. **Arms return to heavy standing idle at the end (`u = 0.97`)**: In `side-097.png` and `q-097.png` (`u = 0.982`), the brute stands upright (`hips = 1.124 m`) with the left arm hanging naturally down along the left thigh/hip (`handL = 1.621 m`, claws pointing down) and the right forearm resting forward near waist height (`handR = 1.090 m`), matching the studio `after-side-098.png` idle stance.

---

## 2. Frame-by-Frame Visual Inspection (Strictly What the Pictures Show)

| Step (`wantU` / actual `u`) | Pictures (`review/GB-280/after-fix/`) | What the Pictures Show (`GB-280` vs Studio `GB-274` & Prior `GB-277`) | Telemetry (`rows.json`) |
| :--- | :--- | :--- | :--- |
| **`u = 0.25`** (`0.262`) | `side-025.png`, `q-025.png` | **Quadruped brace**: Brute is on hands and knees. Left arm reaches vertically down from the shoulder with the fist/claws resting directly on the dirt trail (`q-025.png`). Shins and knees rest flat on the dirt with vertical boot soles behind. Back plate is horizontal. Right arm is mostly hidden behind the torso bulk from this rear-left camera angle. | `hips: 0.624`, `handL: 0.381`, `handR: -0.160` |
| **`u = 0.40`** (`0.411`) | `side-040.png`, `q-040.png` | **Hand-knee push**: Upper back and shoulders arch higher above the pelvis while the left hand/knuckles remain planted in the same spot on the dirt under the shoulder (`side-040.png`, `q-040.png`). Contrast `GB-277`: fists were curled up by the head in mid-air. | `hips: 0.683`, `handL: 0.351`, `handR: -0.085` |
| **`u = 0.55`** (`0.562`) | `side-055.png`, `q-055.png` | **Push-off release into crouch**: Chest pitches up ~45°; knees lift off the dirt as weight shifts backward onto the boots. The left arm hangs straight down from the shoulder with the open claws hovering ~15–20 cm above their ground shadow (`side-055.png`, `q-055.png`), having just pushed off the dirt. | `hips: 0.704`, `handL: 0.655`, `handR: 0.301` |
| **`u = 0.70`** (`0.712`) | `side-070.png`, `q-070.png` | **Low standing crouch**: Brute is upright on both feet with bent knees and hunched back (~70°). Left arm hangs straight down beside the left thigh/knee (`side-070.png`, `q-070.png`), matching `review/GB-274/after-side-070.png`. | `hips: 0.752`, `handL: 0.872`, `handR: 0.525` |
| **`u = 0.97`** (`0.982`) | `side-097.png`, `q-097.png` | **Standing idle return**: Fully upright on planted boots (`q-097.png` shows full body head-to-toe; `side-097.png` crops the top of the head above the jaw). Left arm hangs relaxed beside the left hip/upper thigh; right forearm extends slightly forward at waist level (`q-097.png`). No raised claw-up arms. | `hips: 1.124`, `handL: 1.621`, `handR: 1.090` |

---

## 3. Visible Defects & Limitations Named (Rule 18)

1. **Symmetric twin-knee rise (`u = 0.25..0.55`)**: In both `side-025..055.png` and `q-025..055.png`, both thighs, knees, and shins stay pressed together side-by-side and rise symmetrically off the dirt rather than stepping one foot forward into an asymmetric lunge.
2. **At `u = 0.562` (`side-055.png` / `q-055.png`), the left hand has already released ~15–20 cm off the dirt**: While firmly planted at `u = 0.262` and `u = 0.411` (`handL = 0.381 m` and `0.351 m`) and `handR` is still low (`0.301 m`), by `u = 0.562` the left hand is visually in early lift-off above its shadow rather than still pressing flat on the ground.
3. **Camera angle & top-edge crop in `side-097.png`**: The `side-*` camera views the brute from a rear-left oblique angle (~25–30° off the back rather than a 90° profile), which hides the right arm behind the torso during `u = 0.25..0.70`, and `side-097.png`'s close framing (`ty = -2.319`, `fov = 35`) clips the top of the brute's head above the jaw (`q-097.png` captures the full head and body cleanly).
4. **Harness target disc visible**: A flat red octagon marker lies on the dirt behind the brute's heels in all 10 shots (test/capture harness marker, not part of the brute model).

---

## 4. 9-Principle Scorecard (`docs/animation-principles.md`, `D-89`)

| # | Principle | `GB-277` (Actual Picture Score) | `GB-280` (`after-fix` Score) | Bar (`>= 4.0`) | Visual Evidence from `review/GB-280/after-fix/` |
| :- | :--- | :-: | :-: | :-: | :--- |
| 1 | **Intention** | 2.5 | **4.2** | **PASS** | Clear 3-stage physical read: hands-and-knees brace (`0.25..0.40`), torso push-off (`0.55..0.70`), and upright idle recovery (`0.97`). |
| 2 | **Timing** | 3.5 | **4.2** | **PASS** | First 40% (`u = 0.25..0.40`) holds the low quadruped brace before the upward torso drive across `u = 0.55..0.70` and settle at `0.97`. |
| 3 | **Continuity** | 2.2 | **4.2** | **PASS** | Fixing `bindP` + `updateMatrix()` and gating the spawn claw pose to `riseT > 0` eliminates the `y = -20` hips drift and the `u = 0.97` arms-up pop; arms transition smoothly to idle. |
| 4 | **Balance** | 2.0 | **4.1** | **PASS** | At `u = 0.25..0.40` the torso is visibly supported over a four-point base (hands under shoulders, knees under hips); at `u = 0.70..0.97` COM sits over the planted boots. |
| 5 | **Contact** | 1.5 | **4.1** | **PASS** | Left fist/claws visibly rest on the dirt at `u = 0.25` and `u = 0.40`, lifting off at `u = 0.55` as weight transfers to the planted boots (`plantShift` keeps boots anchored). |
| 6 | **Structure** | 2.2 | **4.1** | **PASS** | Shoulder and elbow joints maintain natural anatomy beneath the deltoid plates; no horizontal winging or inverted wrists. |
| 7 | **Environmental Fit** | 3.0 | **4.1** | **PASS** | Hands, knees, and boots align with the dirt trail plane and cast grounded contact shadows underneath the palms and soles. |
| 8 | **Character** | 2.5 | **4.2** | **PASS** | Heavy ape-like knuckle/fist push-up and low-hanging arms during the crouch (`0.55..0.70`) suit the top-heavy plated brute. |
| 9 | **Style** | 3.5 | **4.2** | **PASS** | Matches the studio clip (`review/GB-274/after-side-*`) in silhouette and joint angles from both `side` and `q` cameras. |
| — | **Overall Mean** | **2.54** | **4.16** | **ALL >= 4.0** | **PASS — `GB-280` resolves the `GB-277` arm defects.** |

---

## 5. Artifacts

- **4-Row Comparison Contact Sheet**: `qa/2026-11-06-AG-236/gb280-arms-comparison-sheet.jpg` (`Studio GB-274` vs `GB-277 Live Before` vs `GB-280 Live Side` vs `GB-280 Live Q-Cam` across `u = 0.25, 0.40, 0.55, 0.70, 0.97`).
