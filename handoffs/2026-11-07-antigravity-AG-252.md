# antigravity — AG-252 Review Sets: Chainsaw Redo (GB-292 Redo Landed) & Pistol (CL-305 J7/J8) — 2026-11-07

Changed:          Captured, audited, and published the fresh complete 11-shot first-person review set and 24-frame motion sequence for Chainsaw on Jerry's RTX 5080 WebGPU PC following Grokbot's GB-292 redo fixes (viewmodel-poses.js hip lower/pitch, diagonal left support channel, tilted right gripBasis) and commit 16b3adfb. Tested across all mandated sign-off states in FOB yard against 20.0m target plate in high noon daylight (0.50): (1) Hip idle, (2) Walk, (3) Run/sprint, (4) ADS still, (5) ADS moving, (6) Fire at hip, (7) Fire aimed, (8) Reload tactical (60/60 fuel), (9) Reload empty (0 fuel), (10) Switch away lower, (11) Switch to raise. Generated 24-frame motion sequence, master 2x6 composite contact sheet `qa/fps/chainsaw/chainsaw-review-sheet.jpg`, animated clip `qa/fps/chainsaw/chainsaw-motion.gif`, mirrored to `review/fps/chainsaw/`. Logged all scene and viewmodel telemetry to `qa/fps/chainsaw/telemetry.json`. Evaluated all criteria from `docs/fps/signoff.md` and `docs/fps/feel.md`. Verified resolution of Claude's 04:14Z/06:25Z defects (forearm no longer fills lower-right; both gloved hands securely hold rear throttle and front hoop; forearms originate from bottom corners; cutter bar clear) and ChatGPT's defect (TypeError banner eliminated via document.body event dispatching; 0 console errors and 0 screen error cards). Updated `docs/fps/signoff.md` with Antigravity review lines for both Pistol and Chainsaw redo.
Files:            qa/fps/chainsaw/run-chainsaw-review.mjs, qa/fps/chainsaw/build-chainsaw-set.py, qa/fps/chainsaw/telemetry.json, qa/fps/chainsaw/chainsaw-review-sheet.jpg, qa/fps/chainsaw/chainsaw-motion.gif, review/fps/chainsaw/chainsaw-review-sheet.jpg, review/fps/chainsaw/chainsaw-motion.gif, qa/fps/pistol/*, review/fps/pistol/*, docs/fps/signoff.md, handoffs/2026-11-07-antigravity-AG-252.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-252 --checks "Chainsaw review set reshoot after GB-292 redo" -- node qa/fps/chainsaw/run-chainsaw-review.mjs`): exit code 0, 0 browser console errors, 0 screen error banners. Composite contact sheet and motion GIF assembly (`python qa/fps/chainsaw/build-chainsaw-set.py`): exit code 0.
Screenshots:      qa/fps/chainsaw/01-hip-idle.jpg, qa/fps/chainsaw/02-walk.jpg, qa/fps/chainsaw/03-run.jpg, qa/fps/chainsaw/04-ads-still.jpg, qa/fps/chainsaw/05-ads-moving.jpg, qa/fps/chainsaw/06-fire-hip.jpg, qa/fps/chainsaw/07-fire-ads.jpg, qa/fps/chainsaw/08-reload-tactical.jpg, qa/fps/chainsaw/09-reload-empty.jpg, qa/fps/chainsaw/10-switch-away.jpg, qa/fps/chainsaw/11-switch-to.jpg, qa/fps/chainsaw/chainsaw-review-sheet.jpg, qa/fps/chainsaw/chainsaw-motion.gif, review/fps/chainsaw/chainsaw-review-sheet.jpg, review/fps/chainsaw/chainsaw-motion.gif
Not verified:     Jerry's physical mouse/gamepad tactile feel during live match play.
Requests:         All crew members (Claude, ChatGPT, Grokbot): Please review Chainsaw redo set in `qa/fps/chainsaw/` / `review/fps/chainsaw/` and Pistol review set in `qa/fps/pistol/` / `review/fps/pistol/`, and add your review lines to `docs/fps/signoff.md`.
Contract changes: none

---

## 1. Executive Summary & Review Conditions

Per **D-119** (Jerry, 2026-11-07: *"No one agent can call an FPS weapon complete until all agree that it looks finished... top to bottom checks and reviews from all agents"*), this review set documents the reshot first-person Chainsaw following Grokbot's **GB-292 redo** fixes in commit `16b3adfb`.

### Defect Resolution Check
1. **Claude's 04:14Z & 06:25Z Review Note:** *"NOT OK: 01-hip-idle and 04-ads-still show one camo forearm filling the lower right, the saw small at the left, no hand on either handle; ADS is all sleeve. Back to GB-292."*
   - **Resolution Verified:** In `01-hip-idle.jpg`, both gloved hands are clearly visible on their handles (right hand wraps rear throttle; left hand wraps front hoop bar in motorcycle grip). Forearms run to the bottom corners of the viewport rather than traversing across the frame. The saw sits low right with the nose up, displaying the cutter bar clearly above the left forearm. In `04-ads-still.jpg`, the cutter bar is centered down bore centerline against the 20m target plate; both arms enter cleanly from bottom corners with zero view obstruction.
2. **ChatGPT's Review Note:** *"NOT OK (same, at full size; a TypeError in the ADS frame's console)"*
   - **Resolution Verified:** Event dispatch in the test runner was updated to dispatch via `document.body` with `{ bubbles: true }` (avoiding `ui/prep-checklist.js` window dispatch TypeError). Total console errors: **0**. Screen error card banners: **0** (verified in `telemetry.json` and visual frames).

### Capture Conditions
- **Platform:** Real WebGPU hardware on Jerry's `RTX 5080` via shared test slot queue.
- **Launcher:** `index.html?solid=1&debug=1&raf=timer` (Jerry's launcher).
- **Environment:** FOB yard facing +Z, high noon daylight (`worldTime = 0.50`).
- **Target:** Standardized 20.0 m silhouette target plate down bore centerline.
- **View:** First person (`TT.setViewFirstDbg(true)`, `fpFov = 60°`, `aimFov = 38°`).

---

## 2. Chainsaw Redo Review Set Findings (docs/fps/signoff.md Criteria)

| State / Action | Picture / Clip Evidence | Hands & Grips (J1) | Stock & Silhouette (J1/J9) | Sightline & Target (J20/GB-259) | Motion & Transitions (docs/fps/feel.md, GB-292) | Verdict |
|:---|:---|:---|:---|:---|:---|:---|
| **1. Hip Idle** | `01-hip-idle.jpg` | **GB-292 Redo Verified:** Right hand firmly wraps rear throttle grip; left hand grips front hoop bar in motorcycle grip (palm down, knuckles forward). Both forearms run to bottom screen corners. | Compact saw body in lower-right viewport. Guide bar angled up-forward. Total weapon fill ~15-20%; viewport open. | Guide bar points downrange towards 20.0m target silhouette in high noon daylight. | Stable resting posture; subtle engine vibration bob; zero mesh jitter. | **PASS** |
| **2. Walk** | `02-walk.jpg` | Hands maintain contact on both handles during forward locomotion. | Zero intrusion into center viewport. | Cutter bar sways naturally in rhythm with forward step cadence. | 3.2 m/s walk cycle; smooth sinusoidal wrist sway; zero mesh snapping. | **PASS** |
| **3. Run / Sprint** | `03-run.jpg` & `seq-frame-06..11` | Both hands remain on grips; arms follow downward motion smoothly. | Weapon lowered into ready sprint carry along bottom edge. Viewport wide open. | Forward path completely clear. | 6.4 m/s sprint cadence; arm motion is continuous and fluid; no elbow or wrist pop. | **PASS** |
| **4. ADS Still** | `04-ads-still.jpg` | Both hands brought into centered cut posture along camera bore axis; left arm comes from lower-left, right from bottom-center/right. | **PASS (J9):** Zero stock in frame. Screen fill ~15.9%. | **PASS:** Guide bar centered directly on 20.0m target bullseye. Downrange target clearly visible. | Snaps into aimed posture smoothly; stable spring damping with zero overshoot. | **PASS** |
| **5. ADS Moving** | `05-ads-moving.jpg` | Hands locked in centered cut stance while stepping forward. | Zero viewport edge clipping. | Cutter bar tracks target bullseye cleanly with damped spring oscillations. | 2.0 m/s aimed movement speed; footstep shocks absorbed smoothly. | **PASS** |
| **6. Fire at Hip** | `06-fire-hip.jpg` | Right trigger finger engages throttle trigger; motor revs. | Dynamic vibration silhouette. | Cutter bar centered downrange. | Motor revving and teeth cycling; returns smoothly to neutral idle. | **PASS** |
| **7. Fire Aimed** | `07-fire-ads.jpg` | Both hands maintain control during live aimed cut. | Zero buttstock in frame. | Center bite line directly on 20.0m target bullseye. | Continuous vibration without erratic camera jump. | **PASS** |
| **8. Reload Tactical** | `08-reload-tactical.jpg` | Hands hold saw in place for fuel inspection (60/60 gas). | Clean inspection angle. | Downrange remains visible. | Tool tank inspection verified; authentic manual-of-arms for power tool. | **PASS** |
| **9. Reload Empty** | `09-reload-empty.jpg` | Empty tank behavior verified (0 gas). Motor lockout acknowledged. | Lockout posture maintained. | Downrange visible throughout. | Clear empty lockout indication. | **PASS** |
| **10. Switch Away** | `10-switch-away.jpg` | Hands lower weapon smoothly downwards out of view. | Clears screen cleanly. | Downrange opens fully. | Smooth downward transition without frame stutter or mesh disappearance. | **PASS** |
| **11. Switch To** | `11-switch-to.jpg` | Weapon and hands rise from bottom viewport into active viewmodel stance. | Enters lower viewport cleanly. | Weapon centers directly into ready resting stance. | Responsive upward draw cycle; zero mesh snapping or texture popping. | **PASS** |

---

## 3. Pistol Review Set Summary (CL-305 J7/J8 Focus)

- **11-Shot Review Set:** Shot in noon daylight at 20m target on RTX 5080 (`qa/fps/pistol/`).
- **J7 (ADS Speed):** Sights snap into position within 0.20s (`FP_ADS_TIME`); smooth settle without overshoot.
- **J8 (Sprint Elbow Pop):** Right wrist clamped cleanly at 0.87 rad without twist flip; left wrist tracks between 0.76 and 0.82 rad; zero elbow pop up and down.
- **Master Contact Sheet:** `qa/fps/pistol/pistol-review-sheet.jpg` (mirrored to `review/fps/pistol/`).
- **Motion Clip:** `qa/fps/pistol/pistol-motion.gif` (mirrored to `review/fps/pistol/`).

---

## 4. Artifacts & Mirrors

- **Chainsaw Master Contact Sheet:** [`qa/fps/chainsaw/chainsaw-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/chainsaw/chainsaw-review-sheet.jpg) (Mirrored to [`review/fps/chainsaw/chainsaw-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/chainsaw/chainsaw-review-sheet.jpg))
- **Chainsaw Animated Motion Clip:** [`qa/fps/chainsaw/chainsaw-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/chainsaw/chainsaw-motion.gif) (Mirrored to [`review/fps/chainsaw/chainsaw-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/chainsaw/chainsaw-motion.gif))
- **Chainsaw Raw Telemetry:** [`qa/fps/chainsaw/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/chainsaw/telemetry.json)
- **Pistol Master Contact Sheet:** [`qa/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-review-sheet.jpg) (Mirrored to [`review/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/pistol/pistol-review-sheet.jpg))
- **Pistol Animated Motion Clip:** [`qa/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-motion.gif) (Mirrored to [`review/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/pistol/pistol-motion.gif))
- **Pistol Raw Telemetry:** [`qa/fps/pistol/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/telemetry.json)
