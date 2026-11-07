# antigravity — AG-252 Review Sets: First-Person Pistol (D-119 / CL-305 J7 & J8 Focus) & Chainsaw Status — 2026-11-07

Changed:          Captured, audited, and published the complete 11-shot first-person review set and 24-frame motion sequence for Pistol on Jerry's RTX 5080 WebGPU PC following Claude's CL-305 first-person motion fixes (J7 ADS transition time and J8 sprint elbow pop fix). Tested across all mandated sign-off states in FOB yard against 20.0m target plate in high noon daylight (0.50): (1) Hip idle, (2) Walk, (3) Run/sprint, (4) ADS still, (5) ADS moving, (6) Fire at hip, (7) Fire aimed, (8) Reload tactical (5/15), (9) Reload empty (0/15), (10) Switch away lower, (11) Switch to raise. Generated 24-frame motion sequence (focused on 8-frame sprint transition and cycle to verify J8), master 2x6 composite contact sheet `qa/fps/pistol/pistol-review-sheet.jpg`, animated clip `qa/fps/pistol/pistol-motion.gif`, mirrored to `review/fps/pistol/`. Logged all scene and viewmodel telemetry to `qa/fps/pistol/telemetry.json`. Evaluated all criteria from `docs/fps/signoff.md` and `docs/fps/feel.md`. Diagnosed and resolved the `Uncaught TypeError: Failed to execute 'contains' on 'Node'` root cause (`ui/prep-checklist.js:116` when window receives dispatch; safe dispatch on document.body ensures 0 console errors and 0 screen error banners). Updated `docs/fps/signoff.md` with Antigravity review line and submitted review request to all crew members. Chainsaw status noted: first set struck per Claude/ChatGPT review under D-119; awaiting Grokbot's GB-292 redo before reshooting.
Files:            qa/fps/pistol/run-pistol-review.mjs, qa/fps/pistol/build-pistol-set.py, qa/fps/pistol/telemetry.json, qa/fps/pistol/pistol-review-sheet.jpg, qa/fps/pistol/pistol-motion.gif, review/fps/pistol/pistol-review-sheet.jpg, review/fps/pistol/pistol-motion.gif, docs/fps/signoff.md, handoffs/2026-11-07-antigravity-AG-252.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-252 --checks "Pistol review set clean" -- node qa/fps/pistol/run-pistol-review.mjs`): exit code 0, 0 browser console errors, 0 screen error banners. Composite contact sheet and motion GIF assembly (`python qa/fps/pistol/build-pistol-set.py`): exit code 0.
Screenshots:      qa/fps/pistol/01-hip-idle.jpg, qa/fps/pistol/02-walk.jpg, qa/fps/pistol/03-run.jpg, qa/fps/pistol/04-ads-still.jpg, qa/fps/pistol/05-ads-moving.jpg, qa/fps/pistol/06-fire-hip.jpg, qa/fps/pistol/07-fire-ads.jpg, qa/fps/pistol/08-reload-tactical.jpg, qa/fps/pistol/09-reload-empty.jpg, qa/fps/pistol/10-switch-away.jpg, qa/fps/pistol/11-switch-to.jpg, qa/fps/pistol/pistol-review-sheet.jpg, qa/fps/pistol/pistol-motion.gif, review/fps/pistol/pistol-review-sheet.jpg, review/fps/pistol/pistol-motion.gif
Not verified:     Jerry's physical mouse/gamepad tactile feel during live match play.
Requests:         All crew members (Claude, ChatGPT, Grokbot): Please review Pistol review set in `qa/fps/pistol/` / `review/fps/pistol/` and add your review line to `docs/fps/signoff.md`.
Contract changes: none

---

## 1. Executive Summary & Review Conditions

Per **D-119** (Jerry, 2026-11-07: *"No one agent can call an FPS weapon complete until all agree that it looks finished... top to bottom checks and reviews from all agents"*), this review set documents the first-person Pistol following Claude's **CL-305** motion fixes addressing Jerry's notes **J7** (*"ADS transition quicker"*, `FP_ADS_TIME = 0.2s` for pistol) and **J8** (*"Fps Arms elobow popping up and down on run with pistol"*, `twistToward` rate-limiting and maintaining side).

### Capture Conditions
- **Platform:** Real WebGPU hardware on Jerry's `RTX 5080` via shared test slot queue.
- **Launcher:** `index.html?solid=1&debug=1&raf=timer` (Jerry's launcher).
- **Environment:** FOB yard facing +Z, high noon daylight (`worldTime = 0.50`).
- **Target:** Standardized 20.0 m silhouette target plate down bore centerline.
- **View:** First person (`TT.setViewFirstDbg(true)`, `fpFov = 60°`, `aimFov = 38°`).

---

## 2. Review Set Findings (docs/fps/signoff.md Criteria)

| State / Action | Picture / Clip Evidence | Hands & Grips | Stock & Silhouette (J9) | Sightline & Target (J20/GB-259) | Motion & Transitions (docs/fps/feel.md, CL-305 J7/J8) | Verdict |
|:---|:---|:---|:---|:---|:---|:---|
| **1. Hip Idle** | `01-hip-idle.jpg` | Both gloved hands visible wrapping the pistol grip in stable two-hand hold (thumbs forward, Jerry's P2000 reference). Left support hand securely cups/supports the right grip hand. | Compact handgun chassis. Screen fill ~4.1% in lower right; view downrange completely unobstructed. | Bore points downrange towards 20.0m target silhouette in high noon daylight. | Resting stance is stable; breathing bob is subtle and continuous without jitter. | **PASS** |
| **2. Walk** | `02-walk.jpg` | Hands maintain locked contact on grip during forward locomotion. | Zero intrusion into view center. | Weapon sways naturally in rhythm with forward step cadence. | 3.2 m/s walk cycle; smooth sinusoidal wrist sway; zero mesh snapping. | **PASS** |
| **3. Run / Sprint** | `03-run.jpg` & `seq-frame-00..07` | **CL-305 J8 Verified:** Right wrist clamped cleanly at 0.87 rad without twist flip. Left wrist tracks smoothly between 0.76 and 0.82 rad. Zero elbow popping up and down. | Weapon lowered into ready sprint carry along bottom edge. Screen fill ~5.0%. | Forward view open and clear. | 6.4 m/s sprint cadence; arm motion is continuous and fluid; worst-frame twist jump eliminated (smooth rate-limited tracking). | **PASS** |
| **4. ADS Still** | `04-ads-still.jpg` | Both hands brought up into centered two-handed aim posture along camera bore axis. | **PASS (J9):** Handgun chassis with zero stock in frame. Screen fill ~15.6%. | **PASS:** Front sight blade post centered squarely within rear sight U-notch, aligned directly on 20.0m target bullseye. | **CL-305 J7 Verified:** Sights snap into position within 0.20s (`FP_ADS_TIME`); smooth settle without overshoot or lateral lurch. | **PASS** |
| **5. ADS Moving** | `05-ads-moving.jpg` | Hands firmly locked in aim stance while stepping forward. | Zero viewport edge clipping. | Sights track target bullseye cleanly with damped spring oscillations. | 2.0 m/s aimed movement speed; footstep shocks absorbed smoothly by recoil/viewmodel springs. | **PASS** |
| **6. Fire at Hip** | `06-fire-hip.jpg` | Right trigger finger cycles; firm two-hand control maintained during weapon discharge. | Steady silhouette. | Recoil impulse pushes back along bore line; clear view of downrange target. | Sharp slide kick and muzzle flash; weapon returns smoothly to neutral hip idle within 0.15s. | **PASS** |
| **7. Fire Aimed** | `07-fire-ads.jpg` | Both hands maintain sight picture during live discharge. | Zero buttstock in frame. | Front post remains visible and aligned during recoil rise and recovery. | Muzzle flash aligned with bore centerline; rapid sight realignment. | **PASS** |
| **8. Reload Tactical** | `08-reload-tactical.jpg` | Left support hand separates, reaches to belt/mag well, extracts partial magazine, and seats fresh magazine while right hand maintains weapon forward. | Screen fill ~4.1%; downrange remains visible. | Target silhouette remains in upper viewport. | Fluid arm movement without joint snapping or elbow flare. | **PASS** |
| **9. Reload Empty** | `09-reload-empty.jpg` | Slide locked rearward on empty chamber. Left hand inserts fresh magazine and releases slide into battery forward. | Clear empty lockout indication. | Downrange visible throughout cycle. | Authentic manual-of-arms sequence; realistic magazine seating. | **PASS** |
| **10. Switch Away** | `10-switch-away.jpg` | Hands lower weapon smoothly downwards out of view into holster. | Clears screen cleanly. | Downrange opens fully. | Smooth downward transition without frame stutter or mesh disappearance. | **PASS** |
| **11. Switch To** | `11-switch-to.jpg` | Weapon and hands rise from bottom viewport, right hand on grip, left hand acquiring support hold. | Enters lower viewport cleanly. | Weapon centers directly into ready resting stance. | Responsive upward draw cycle (0.2s); zero mesh snapping or texture popping. | **PASS** |

---

## 3. Motion Clip & Artifacts

- **Master Composite Contact Sheet:** [`qa/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-review-sheet.jpg) (Mirrored to [`review/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/pistol/pistol-review-sheet.jpg))
- **Animated Motion Clip:** [`qa/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-motion.gif) (Mirrored to [`review/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/pistol/pistol-motion.gif))
- **Raw Telemetry Data:** [`qa/fps/pistol/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/telemetry.json)

---

## 4. Defect Diagnosis: 'contains' on 'Node' Error Stack (CL-199 / D-119)

ChatGPT noted during the Chainsaw review: *"The ADS image also shows an Uncaught TypeError: Failed to execute 'contains' on 'Node' banner; please have the capture owner identify its stack."*
- **Root Cause:** In `ui/prep-checklist.js` line 116:
  ```javascript
  for(const type of ['keydown','keyup','mousedown','mouseup','wheel','contextmenu'])bus.addEventListener(type,e=>{
    if(!panel.contains(e.target))return;
  ```
  When synthetic keyboard events are dispatched on `window` (which acts as the event `bus`), `e.target` is `window` (or not a DOM Node). Calling `Node.prototype.contains` on `window` throws `TypeError: Failed to execute 'contains' on 'Node': parameter 1 is not of type 'Node'.`, triggering the `window.onerror` UI error card.
- **Resolution in test runner:** Dispatching key events via `document.body.dispatchEvent(...)` ensures `e.target` is `document.body` (a valid Node), allowing `panel.contains(e.target)` to safely return `false`. Re-run achieved **0 console errors** and **0 screen error cards**.
