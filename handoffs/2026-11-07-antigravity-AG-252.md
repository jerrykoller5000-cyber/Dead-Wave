# antigravity — AG-252 Review Sets: Pistol Reshoot (Mid-Action Fire/Reloads) & Wasp SMG — 2026-11-07

Changed:          Reshot Pistol review set (set 2) and captured complete Wasp SMG review set (set 1) on Jerry's real RTX 5080 WebGPU PC via the shared test slot.
                  Pistol (set 2): Resolved Claude's review requirements: (1) 06-fire-hip and 07-fire-ads captured mid-action (1-2 steps after trigger) showing bright muzzle flash, gold tracer streak, and slide cycling; (2) 08-reload-tactical and 09-reload-empty captured mid-action using flightHold and stepFrame at u = 0.30, 0.60, 0.80 (vm.info.reloadU; tactical with 5 rounds retained, empty with 0 rounds); (3) Diagnosed and eliminated the white glare between forearms in 04-ads-still: it was the 20.0m target board's full white canvas background (#f5f7fa) viewed downfield through the lower arm opening, now backed with dark timber range board (#2b302c) with centered paper card; (4) Resolved ChatGPT's FYI: removed invalid projected sightScreen and offsetFromCenterPx telemetry from j7-timing-evidence.json and telemetry.json (visual sight centering verified directly by full-res captures).
                  Wasp SMG (set 1): Complete 11-shot review set and 24-frame motion sequence: (1) Hip idle (stockless MAC-10 framing, J11 canted in), (2) Walk (3.2 m/s), (3) Run (6.4 m/s), (4) ADS still (sights centered on 20.0m plate), (5) ADS moving (2.0 m/s), (6) Fire hip (mid-action tracer and flash), (7) Fire aimed (mid-action tracer and flash), (8) Reload tactical (10/32 rounds; u=0.30, 0.60, 0.80), (9) Reload empty (0/32 rounds; u=0.30, 0.60, 0.80; CL-306 charging pull low and ahead), (10) Switch away, (11) Switch to.
                  Assembled master contact sheets and motion GIFs in qa/fps/pistol/, qa/fps/wasp/ and mirrored to review/fps/pistol/, review/fps/wasp/. Updated docs/fps/signoff.md.
Files:            qa/fps/pistol/run-pistol-review.mjs, qa/fps/pistol/build-pistol-set.py, qa/fps/pistol/*.jpg, qa/fps/pistol/frames/*, qa/fps/pistol/telemetry.json, qa/fps/pistol/j7-timing-evidence.json, qa/fps/pistol/pistol-review-sheet.jpg, qa/fps/pistol/pistol-motion.gif, review/fps/pistol/*, qa/fps/wasp/run-wasp-review.mjs, qa/fps/wasp/build-wasp-set.py, qa/fps/wasp/*.jpg, qa/fps/wasp/frames/*, qa/fps/wasp/telemetry.json, qa/fps/wasp/wasp-review-sheet.jpg, qa/fps/wasp/wasp-motion.gif, review/fps/wasp/*, qa/fps/run-all-reviews.mjs, docs/fps/signoff.md, handoffs/2026-11-07-antigravity-AG-252.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-252 --checks "Pistol mid-action reshoot & Wasp SMG review set" -- node qa/fps/run-all-reviews.mjs`): exit code 0, 0 browser console errors, 0 screen error banners. Contact sheet and motion GIF assembly for both weapons: exit code 0.
Screenshots:      qa/fps/pistol/01-hip-idle.jpg, qa/fps/pistol/02-walk.jpg, qa/fps/pistol/03-run.jpg, qa/fps/pistol/04-ads-still.jpg, qa/fps/pistol/05-ads-moving.jpg, qa/fps/pistol/06-fire-hip.jpg, qa/fps/pistol/07-fire-ads.jpg, qa/fps/pistol/08-reload-tactical.jpg (also u03, u06, u08), qa/fps/pistol/09-reload-empty.jpg (also u03, u06, u08), qa/fps/pistol/10-switch-away.jpg, qa/fps/pistol/11-switch-to.jpg, qa/fps/pistol/pistol-review-sheet.jpg, qa/fps/pistol/pistol-motion.gif, review/fps/pistol/pistol-review-sheet.jpg, review/fps/pistol/pistol-motion.gif, qa/fps/wasp/01-hip-idle.jpg, qa/fps/wasp/02-walk.jpg, qa/fps/wasp/03-run.jpg, qa/fps/wasp/04-ads-still.jpg, qa/fps/wasp/05-ads-moving.jpg, qa/fps/wasp/06-fire-hip.jpg, qa/fps/wasp/07-fire-ads.jpg, qa/fps/wasp/08-reload-tactical.jpg (also u03, u06, u08), qa/fps/wasp/09-reload-empty.jpg (also u03, u06, u08), qa/fps/wasp/10-switch-away.jpg, qa/fps/wasp/11-switch-to.jpg, qa/fps/wasp/wasp-review-sheet.jpg, qa/fps/wasp/wasp-motion.gif, review/fps/wasp/wasp-review-sheet.jpg, review/fps/wasp/wasp-motion.gif
Not verified:     Jerry's physical mouse/gamepad tactile feel during live match play.
Requests:         All crew members (Claude, ChatGPT, Grokbot): Please review Pistol reshoot set (set 2) in qa/fps/pistol/ and Wasp SMG review set (set 1) in qa/fps/wasp/ (mirrored to review/fps/), and add your review lines to docs/fps/signoff.md.
Contract changes: none

---

## 1. Executive Summary & Defect Resolutions

Per **D-119** and Claude's review request on **AG-252**, this update delivers:
1. **Pistol Review Set (Set 2 Reshoot):**
   - **Mid-action Fire:** In `06-fire-hip.jpg` and `07-fire-ads.jpg`, captured deterministically 1–2 steps after trigger. Shows active muzzle flash, gold tracer streak travelling along bore axis, and slide cycling rearward.
   - **Mid-action Reloads:** Captured across exact milestones via `T.flightHold(true)` and `T.stepFrame(1/60)`:
     - `08-reload-tactical`: 5/15 rounds retained; captured at `u = 0.30`, `u = 0.60`, and `u = 0.80` (`08-reload-tactical.jpg` displays mid-action insertion at `u = 0.60`).
     - `09-reload-empty`: 0/15 rounds retained; slide locked open; captured at `u = 0.30`, `u = 0.60`, and `u = 0.80` (`09-reload-empty.jpg` displays fresh magazine insertion at `u = 0.60`).
   - **White Glare Investigation in `04-ads-still`:** Diagnosed and explained. In Set 1, the 20m target board created at `(42, -7.55, 0)` filled the 512x768 canvas with pure `#f5f7fa` white background. In ADS, the 38° zoomed FOV aligned above the sights, exposing the bottom of this 20m white billboard downfield directly through the V-shaped gap between the forearms. Fixed by redesigning the target plate to an authentic range backer (dark weathered timber board `#2b302c` with centered paper target card), eliminating the stark white opening.
   - **Projected Sight Telemetry (ChatGPT FYI):** Removed invalid projected `sightScreen` and `offsetFromCenterPx` coordinates from `j7-timing-evidence.json` and telemetry. Sight centering is verified visually in the capture frames.

2. **Wasp SMG Review Set (Set 1):**
   - **Configuration:** Stockless MAC-10 framing (GP-20023, J11 canted in), high noon daylight (0.50), FOB yard against 20.0m target plate.
   - **All 11 States Captured:**
     1. `01-hip-idle.jpg`: Resting carry, both gloved hands in position, stockless rear clear.
     2. `02-walk.jpg`: Forward walk cadence (3.2 m/s).
     3. `03-run.jpg`: Sprint carry (6.4 m/s).
     4. `04-ads-still.jpg`: Sights centered on 20.0m target silhouette.
     5. `05-ads-moving.jpg`: Aimed forward movement (2.0 m/s).
     6. `06-fire-hip.jpg`: Mid-action hip shot with muzzle flash and tracer.
     7. `07-fire-ads.jpg`: Mid-action aimed shot with muzzle flash and tracer down sight line.
     8. `08-reload-tactical.jpg`: Tactical reload (10/32 rounds left; captured at u=0.30, 0.60, 0.80).
     9. `09-reload-empty.jpg`: Empty reload (0/32 rounds left; captured at u=0.30, 0.60, 0.80; CL-306 charging pull low and ahead).
     10. `10-switch-away.jpg`: Lowering transition.
     11. `11-switch-to.jpg`: Raising transition.
   - **Motion Sequence:** 24-frame animated GIF `qa/fps/wasp/wasp-motion.gif` (mirrored to `review/fps/wasp/`).
   - **Master Contact Sheet:** 2x6 composite contact sheet `qa/fps/wasp/wasp-review-sheet.jpg` (mirrored to `review/fps/wasp/`).

---

## 2. Telemetry & Verification Matrix

| Weapon | Shot | State | ADS Weight | Reload Progress | Wrist Bend (R / L) | Screen Errors | Console Errors | Visual Verdict |
|---|---|---|---|---|---|---|---|---|
| **Pistol** | 01 | Hip Idle | 0.00 | None | 0.87 / 0.87 rad | None | 0 | PASS |
| **Pistol** | 02 | Walk | 0.00 | None | 0.87 / 0.87 rad | None | 0 | PASS |
| **Pistol** | 03 | Run | 0.00 | None | 0.87 / 0.71 rad | None | 0 | PASS (no elbow pop) |
| **Pistol** | 04 | ADS Still | 1.00 | None | 0.87 / 0.87 rad | None | 0 | PASS (glare resolved) |
| **Pistol** | 05 | ADS Moving | 1.00 | None | 0.87 / 0.87 rad | None | 0 | PASS |
| **Pistol** | 06 | Fire Hip | 0.00 | None | 0.87 / 0.87 rad | None | 0 | PASS (flash & tracer visible) |
| **Pistol** | 07 | Fire ADS | 1.00 | None | 0.87 / 0.87 rad | None | 0 | PASS (aimed flash & tracer) |
| **Pistol** | 08 | Reload Tac | 0.00 | u = 0.62 (tactical) | 0.75 / 0.87 rad | None | 0 | PASS (mid-action insertion) |
| **Pistol** | 09 | Reload Empty | 0.00 | u = 0.62 (empty) | 0.79 / 0.87 rad | None | 0 | PASS (slide locked, mag seating) |
| **Pistol** | 10 | Switch Away | 0.00 | None | 0.82 / 0.87 rad | None | 0 | PASS |
| **Pistol** | 11 | Switch To | 0.00 | None | 0.80 / 0.87 rad | None | 0 | PASS |
| **Wasp SMG** | 01 | Hip Idle | 0.00 | None | 0.86 / 0.24 rad | None | 0 | PASS (stockless framing) |
| **Wasp SMG** | 02 | Walk | 0.00 | None | 0.87 / 0.25 rad | None | 0 | PASS |
| **Wasp SMG** | 03 | Run | 0.00 | None | 0.87 / 0.25 rad | None | 0 | PASS |
| **Wasp SMG** | 04 | ADS Still | 1.00 | None | 0.87 / 0.19 rad | None | 0 | PASS (sights aligned) |
| **Wasp SMG** | 05 | ADS Moving | 1.00 | None | 0.87 / 0.19 rad | None | 0 | PASS |
| **Wasp SMG** | 06 | Fire Hip | 0.00 | None | 0.84 / 0.30 rad | None | 0 | PASS (flash & tracer visible) |
| **Wasp SMG** | 07 | Fire ADS | 1.00 | None | 0.87 / 0.26 rad | None | 0 | PASS (aimed flash & tracer) |
| **Wasp SMG** | 08 | Reload Tac | 0.00 | u = 0.62 (tactical) | 0.60 / 0.87 rad | None | 0 | PASS (mid-action stick mag) |
| **Wasp SMG** | 09 | Reload Empty | 0.00 | u = 0.62 (empty) | 0.70 / 0.87 rad | None | 0 | PASS (charging pull) |
| **Wasp SMG** | 10 | Switch Away | 0.00 | None | 0.87 / 0.87 rad | None | 0 | PASS |
| **Wasp SMG** | 11 | Switch To | 0.00 | None | 0.11 / 0.87 rad | None | 0 | PASS |

---

## 3. Artifact Links

- **Pistol Master Contact Sheet:** [`qa/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-review-sheet.jpg) (Mirrored to [`review/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/pistol/pistol-review-sheet.jpg))
- **Pistol Animated Motion Clip:** [`qa/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-motion.gif) (Mirrored to [`review/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/pistol/pistol-motion.gif))
- **Pistol Tactical Reload Subframes:**
  - `u = 0.30`: [`qa/fps/pistol/08-reload-tactical-u03.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/08-reload-tactical-u03.jpg)
  - `u = 0.60`: [`qa/fps/pistol/08-reload-tactical-u06.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/08-reload-tactical-u06.jpg)
  - `u = 0.80`: [`qa/fps/pistol/08-reload-tactical-u08.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/08-reload-tactical-u08.jpg)
- **Pistol Empty Reload Subframes:**
  - `u = 0.30`: [`qa/fps/pistol/09-reload-empty-u03.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/09-reload-empty-u03.jpg)
  - `u = 0.60`: [`qa/fps/pistol/09-reload-empty-u06.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/09-reload-empty-u06.jpg)
  - `u = 0.80`: [`qa/fps/pistol/09-reload-empty-u08.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/09-reload-empty-u08.jpg)
- **Pistol Raw Telemetry:** [`qa/fps/pistol/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/telemetry.json)
- **Wasp SMG Master Contact Sheet:** [`qa/fps/wasp/wasp-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/wasp-review-sheet.jpg) (Mirrored to [`review/fps/wasp/wasp-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/wasp/wasp-review-sheet.jpg))
- **Wasp SMG Animated Motion Clip:** [`qa/fps/wasp/wasp-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/wasp-motion.gif) (Mirrored to [`review/fps/wasp/wasp-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/fps/wasp/wasp-motion.gif))
- **Wasp SMG Tactical Reload Subframes:**
  - `u = 0.30`: [`qa/fps/wasp/08-reload-tactical-u03.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/08-reload-tactical-u03.jpg)
  - `u = 0.60`: [`qa/fps/wasp/08-reload-tactical-u06.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/08-reload-tactical-u06.jpg)
  - `u = 0.80`: [`qa/fps/wasp/08-reload-tactical-u08.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/08-reload-tactical-u08.jpg)
- **Wasp SMG Empty Reload Subframes:**
  - `u = 0.30`: [`qa/fps/wasp/09-reload-empty-u03.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/09-reload-empty-u03.jpg)
  - `u = 0.60`: [`qa/fps/wasp/09-reload-empty-u06.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/09-reload-empty-u06.jpg)
  - `u = 0.80`: [`qa/fps/wasp/09-reload-empty-u08.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/09-reload-empty-u08.jpg)
- **Wasp SMG Raw Telemetry:** [`qa/fps/wasp/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/telemetry.json)
- **Sign-off Matrix:** [`docs/fps/signoff.md`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/fps/signoff.md)
