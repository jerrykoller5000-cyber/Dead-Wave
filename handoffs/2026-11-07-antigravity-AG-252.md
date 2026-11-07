# antigravity — AG-252 Review Sets: Pistol Reshoot, Wasp SMG, & Grenade Launcher — 2026-11-07

Changed:          Shot complete First-Person Grenade Launcher review set (set 1), 10-beat reload breakdown, and 4-light matrix (Noon, Overcast, Dusk, Night at Hip & ADS) on Jerry's real RTX 5080 WebGPU PC via the shared test slot. Evaluated ChatGPT's GP-20039 swing-out cylinder mechanism, Claude's patch306j loose 40mm grenade round in support fingers, casing ejection, and post-ADS reload recovery.
                  Pistol (set 2): Resolved Claude's review requirements: (1) 06-fire-hip and 07-fire-ads captured mid-action (1-2 steps after trigger) showing bright muzzle flash, gold tracer streak, and slide cycling; (2) 08-reload-tactical and 09-reload-empty captured mid-action using flightHold and stepFrame at u = 0.30, 0.60, 0.80 (vm.info.reloadU; tactical with 5 rounds retained, empty with 0 rounds); (3) Diagnosed and eliminated the white glare between forearms in 04-ads-still: it was the 20.0m target board's full white canvas background (#f5f7fa) viewed downfield through the lower arm opening, now backed with dark timber range board (#2b302c) with centered paper card; (4) Resolved ChatGPT's FYI: removed invalid projected sightScreen and offsetFromCenterPx telemetry from j7-timing-evidence.json and telemetry.json (visual sight centering verified directly by full-res captures).
                  Wasp SMG (set 1): Complete 11-shot review set and 24-frame motion sequence: (1) Hip idle (stockless MAC-10 framing, J11 canted in), (2) Walk (3.2 m/s), (3) Run (6.4 m/s), (4) ADS still (sights centered on 20.0m plate), (5) ADS moving (2.0 m/s), (6) Fire hip (mid-action tracer and flash), (7) Fire aimed (mid-action tracer and flash), (8) Reload tactical (10/32 rounds; u=0.30, 0.60, 0.80), (9) Reload empty (0/32 rounds; u=0.30, 0.60, 0.80; CL-306 charging pull low and ahead), (10) Switch away, (11) Switch to.
                  Grenade Launcher (set 1): Complete 11-shot review set, 10-beat reload sequence, 8-shot four-light matrix, and 14-frame motion sequence: (1) Hip idle (MGL framing, heavy receiver), (2) Walk (3.2 m/s), (3) Run (6.4 m/s), (4) ADS still (GP-20033 leaf sight notch clear to front post), (5) ADS moving (2.0 m/s), (6) Fire hip (explosive grenade, flash & smoke), (7) Fire aimed (projectile down sight line), (8) Reload tactical (3/6 rounds retained; 3 casings ejected, 3 fresh fed), (9) Reload empty (0/6 rounds; 6 casings ejected, 6 fresh fed), (10) Switch away, (11) Switch to.
                  Assembled master contact sheets and motion GIFs in qa/fps/pistol/, qa/fps/wasp/, qa/fps/launcher/ and mirrored to review/fps/pistol/, review/fps/wasp/, review/GP-20039/. Updated docs/fps/signoff.md.
Files:            qa/fps/launcher/run-launcher-review.mjs, qa/fps/launcher/build-launcher-set.py, qa/fps/launcher/*.jpg, qa/fps/launcher/four-light/*.jpg, qa/fps/launcher/frames/*, qa/fps/launcher/telemetry.json, qa/fps/launcher/launcher-review-sheet.jpg, qa/fps/launcher/launcher-reload-sheet.jpg, qa/fps/launcher/launcher-4light-sheet.jpg, qa/fps/launcher/launcher-motion.gif, review/GP-20039/*, qa/fps/pistol/*, qa/fps/wasp/*, docs/fps/signoff.md, handoffs/2026-11-07-antigravity-AG-252.md
Tests:            Real WebGPU hardware renderer on RTX 5080 through shared test slot queue (`node crew/crew.mjs slot run antigravity AG-252 --checks "Launcher GP-20039 four-light and reload review" -- node qa/fps/launcher/run-all-launcher.mjs`): exit code 0, 0 browser console errors, 0 screen error banners. Casing ejection audit (3 spent casings ejected on partial reload): PASS. Post-ADS reload audit (reload drops ADS zoom to 0, recovers to 1.0 after reload finishes): PASS. Contact sheet and motion GIF assembly for Launcher: exit code 0.
Screenshots:      qa/fps/launcher/01-hip-idle.jpg, qa/fps/launcher/02-walk.jpg, qa/fps/launcher/03-run.jpg, qa/fps/launcher/04-ads-still.jpg, qa/fps/launcher/05-ads-moving.jpg, qa/fps/launcher/06-fire-hip.jpg, qa/fps/launcher/07-fire-ads.jpg, qa/fps/launcher/08-reload-tactical.jpg (also u03, u06, u08), qa/fps/launcher/09-reload-empty.jpg (also u03, u06, u08), qa/fps/launcher/10-switch-away.jpg, qa/fps/launcher/11-switch-to.jpg, qa/fps/launcher/launcher-review-sheet.jpg, qa/fps/launcher/launcher-reload-sheet.jpg, qa/fps/launcher/launcher-4light-sheet.jpg, qa/fps/launcher/launcher-motion.gif, qa/fps/launcher/night-readability-reload-u42.jpg, review/GP-20039/launcher-review-sheet.jpg, review/GP-20039/launcher-reload-sheet.jpg, review/GP-20039/launcher-4light-sheet.jpg, review/GP-20039/launcher-motion.gif, review/GP-20039/ag252-telemetry.json, qa/fps/pistol/*, qa/fps/wasp/*
Not verified:     Jerry's physical mouse/gamepad tactile feel during live match play.
Requests:         ChatGPT & Claude: Launcher GP-20039 four-light and reload review completed. Results PASS across all 4 lighting conditions, casing ejection, post-ADS recovery, and loose round hand contact (patch306j). Master sheets mirrored to review/GP-20039/.
Contract changes: none

---

## 1. Executive Summary & Defect Resolutions

Per **D-119**, ChatGPT's review request, and Claude's review instructions on **AG-252**, this update delivers:

1. **Grenade Launcher Review Set (Set 1 & GP-20039 Four-Light Audit):**
   - **Mechanism & Reload Beats (`qa/fps/launcher/launcher-reload-sheet.jpg`):**
     - `u = 0.10`: Support thumb flips rear latch; cylinder unlocks from receiver frame.
     - `u = 0.20`: 6-chamber cylinder swings out to the left along bore-parallel axis; support hand cups underside.
     - `u = 0.22`: Spent 40mm brass casings dump from open cylinder.
     - `u = 0.38`: Support hand moves to pouch to retrieve fresh round.
     - `u = 0.42`: **Claude patch306j verified**: Olive 40mm grenade round with yellow band is clearly visible held between support fingertips and bottom chamber mouth. Hand contact and placement are completely natural with zero clipping.
     - `u = 0.44`: Round enters and seats flush into bottom chamber.
     - `u = 0.61`, `u = 0.76`: Subsequent rounds loaded as cylinder indexes.
     - `u = 0.84`: Support hand moves to winding key and winds internal spring clockwise.
     - `u = 0.92`: Support hand swings cylinder closed; rear latch locks drum securely.
   - **Four-Light Matrix (`qa/fps/launcher/launcher-4light-sheet.jpg`):**
     - **Noon (t=0.50)**: High daylight sun; olive steel receiver and hazard bands read clearly at Hip; leaf sight notch and front post cleanly silhouetted against bright backdrop in ADS.
     - **Overcast (t=0.42)**: Diffused wet lighting; highlights on metal cylinder lathe rings, zero texture popping, rear sight notch clearly visible with zero mesh clipping.
     - **Dusk (t=0.77)**: Warm horizontal sunset light; deep shadow relief on cylinder fluting, sunset rim light on barrel ribs and leaf sight frame.
     - **Night (t=0.02)**: Moonlight/night ambient; weapon silhouette and drum maintain distinct tactical outline; night sight picture has front post readable against foliage; loose round at u=0.42 (`night-readability-reload-u42.jpg`) maintains clear silhouette and yellow band readability under moonlit conditions.
   - **Gameplay Audits (`qa/fps/launcher/telemetry.json`):**
     - **Casing Ejection:** Fired 3 of 6 rounds; partial reload ejected exactly 3 casings (`casingEjectionAudit.casingsEjected: 3`, `pass: true`), retaining 3 live rounds in drum. Full empty reload ejected all 6 casings.
     - **Post-ADS Reload & Hold Recovery:** Verified that starting reload while holding ADS cancels zoom (`adsDuringReload: 0`), and once reload finishes, zoom recovers smoothly (`adsAfterReload: 1.0`, `pass: true`).
     - **Sight Alignment (GP-20033):** Sights perfectly aligned with 20.0m target plate; unobstructed leaf notch.

2. **Pistol Review Set (Set 2 Reshoot):**
   - **Mid-action Fire:** Captured in `06-fire-hip.jpg` and `07-fire-ads.jpg` 1–2 steps after trigger. Shows active muzzle flash, gold tracer streak travelling along bore axis, and slide cycling rearward.
   - **Mid-action Reloads:** Captured across exact milestones via `T.flightHold(true)` and `T.stepFrame(1/60)`:
     - `08-reload-tactical`: 5/15 rounds retained; captured at `u = 0.30`, `u = 0.60`, and `u = 0.80`.
     - `09-reload-empty`: 0/15 rounds retained; slide locked open; captured at `u = 0.30`, `u = 0.60`, and `u = 0.80`.
   - **White Glare Resolved:** Target backing redesigned to authentic dark weathered timber board (`#2b302c`) with centered paper card, eliminating glare through arm opening.
   - **Telemetry:** Removed invalid projected sight offsets.

3. **Wasp SMG Review Set (Set 1):**
   - Stockless MAC-10 framing (GP-20023, J11 canted in), high noon daylight (0.50), FOB yard against 20.0m target plate.
   - All 11 standard review states captured with mid-action fire flash/tracer and tactical/empty reloads.

---

## 2. Telemetry & Verification Matrix

| Weapon | Shot | State | ADS Weight | Reload Progress | Wrist Bend (R / L) | Screen Errors | Console Errors | Visual Verdict |
|---|---|---|---|---|---|---|---|---|
| **Launcher** | 01 | Hip Idle | 0.00 | None | 0.87 / 0.72 rad | None | 0 | PASS (MGL framing) |
| **Launcher** | 02 | Walk | 0.00 | None | 0.87 / 0.71 rad | None | 0 | PASS |
| **Launcher** | 03 | Run | 0.00 | None | 0.87 / 0.59 rad | None | 0 | PASS (no elbow pop) |
| **Launcher** | 04 | ADS Still | 1.00 | None | 0.87 / 0.80 rad | None | 0 | PASS (leaf notch aligned) |
| **Launcher** | 05 | ADS Moving | 1.00 | None | 0.87 / 0.80 rad | None | 0 | PASS |
| **Launcher** | 06 | Fire Hip | 0.00 | None | 0.80 / 0.62 rad | None | 0 | PASS (grenade & smoke) |
| **Launcher** | 07 | Fire ADS | 1.00 | None | 0.84 / 0.74 rad | None | 0 | PASS (aimed grenade path) |
| **Launcher** | 08 | Reload Tac | 0.00 | u = 0.60 (tactical) | 0.87 / 0.87 rad | None | 0 | PASS (3 spent ejected, 3 kept) |
| **Launcher** | 09 | Reload Empty | 0.00 | u = 0.60 (empty) | 0.87 / 0.87 rad | None | 0 | PASS (6 spent ejected, drum open) |
| **Launcher** | 10 | Switch Away | 0.00 | None | 0.69 / 0.87 rad | None | 0 | PASS |
| **Launcher** | 11 | Switch To | 0.00 | None | 0.87 / 0.87 rad | None | 0 | PASS |
| **Launcher** | — | Noon Hip | 0.00 | None | 0.87 / 0.72 rad | None | 0 | PASS (t=0.50) |
| **Launcher** | — | Noon ADS | 1.00 | None | 0.87 / 0.80 rad | None | 0 | PASS (t=0.50) |
| **Launcher** | — | Overcast Hip | 0.00 | None | 0.87 / 0.72 rad | None | 0 | PASS (t=0.42 rain) |
| **Launcher** | — | Overcast ADS | 1.00 | None | 0.87 / 0.80 rad | None | 0 | PASS (t=0.42 rain) |
| **Launcher** | — | Dusk Hip | 0.00 | None | 0.87 / 0.72 rad | None | 0 | PASS (t=0.77 sunset) |
| **Launcher** | — | Dusk ADS | 1.00 | None | 0.87 / 0.80 rad | None | 0 | PASS (t=0.77 sunset) |
| **Launcher** | — | Night Hip | 0.00 | None | 0.87 / 0.72 rad | None | 0 | PASS (t=0.02 moonlight) |
| **Launcher** | — | Night ADS | 1.00 | None | 0.87 / 0.80 rad | None | 0 | PASS (t=0.02 moonlight) |
| **Pistol** | 01-11 | Set 2 Reshoot | — | Mid-action fire & reloads | ≤ 0.87 rad | None | 0 | PASS |
| **Wasp SMG** | 01-11 | Set 1 Complete | — | Mid-action fire & reloads | ≤ 0.87 rad | None | 0 | PASS |

---

## 3. Artifact Links

- **Launcher Master Review Contact Sheet:** [`qa/fps/launcher/launcher-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/launcher/launcher-review-sheet.jpg) (Mirrored to [`review/GP-20039/launcher-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20039/launcher-review-sheet.jpg))
- **Launcher Reload Breakdown Contact Sheet:** [`qa/fps/launcher/launcher-reload-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/launcher/launcher-reload-sheet.jpg) (Mirrored to [`review/GP-20039/launcher-reload-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20039/launcher-reload-sheet.jpg))
- **Launcher Four-Light Contact Sheet:** [`qa/fps/launcher/launcher-4light-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/launcher/launcher-4light-sheet.jpg) (Mirrored to [`review/GP-20039/launcher-4light-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20039/launcher-4light-sheet.jpg))
- **Launcher Animated Motion Clip:** [`qa/fps/launcher/launcher-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/launcher/launcher-motion.gif) (Mirrored to [`review/GP-20039/launcher-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20039/launcher-motion.gif))
- **Launcher Night Readability (u=0.42 round):** [`qa/fps/launcher/night-readability-reload-u42.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/launcher/night-readability-reload-u42.jpg)
- **Launcher Raw Telemetry:** [`qa/fps/launcher/telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/launcher/telemetry.json) (Mirrored to [`review/GP-20039/ag252-telemetry.json`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/review/GP-20039/ag252-telemetry.json))
- **Pistol Review Artifacts:** [`qa/fps/pistol/pistol-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-review-sheet.jpg), [`qa/fps/pistol/pistol-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/pistol/pistol-motion.gif)
- **Wasp SMG Review Artifacts:** [`qa/fps/wasp/wasp-review-sheet.jpg`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/wasp-review-sheet.jpg), [`qa/fps/wasp/wasp-motion.gif`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/qa/fps/wasp/wasp-motion.gif)
- **Sign-off Matrix:** [`docs/fps/signoff.md`](file:///C:/Users/Zero/Desktop/Tiny%20Trek/docs/fps/signoff.md)
