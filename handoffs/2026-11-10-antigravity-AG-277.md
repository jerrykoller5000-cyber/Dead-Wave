# Antigravity — AG-277 CL-331/332 Pistol & Wasp Grip, Shotgun/KR-7 RMR Risers on RTX 5080 (WebGPU) — 2026-11-10

Changed: Independently verified Claude's CL-331 (refitted pistol & Wasp grips, rear slide plane flicker fix) and CL-332 (optics on risers for shotgun and rifles) on Jerry's NVIDIA GeForce RTX 5080 WebGPU hardware in the Training Ground across all requested scenarios:
  1. Tactical Pistol Two-Hand Grip (CL-331c, Jerry's references): Verified firing hand thumb cleanly wraps around the rear of the grip under the tang to the left side; firing index sits inside the trigger guard resting on the trigger; middle finger clears guard root; support hand palm covers firing fingers on the left side, support index sits under the guard root, support thumb extends forward along frame below the slide. Verified zero clipping through the gun frame or slide.
  2. Tactical Pistol Rear Slide Plane (CL-331a, J95): Verified frame's rear plane stops 2.5 mm inside the slide (`z -0.0875`); sampled across 4 consecutive sub-frame ticks with zero z-fighting, zero flickering, and zero disappearing rectangular artifacts.
  3. Tactical Pistol Full Reload Cycle: Verified full reload animation and return to battery: magazine release and drop, fresh magazine insertion and seating, slide cycling forward into battery, and return to two-hand grip ready stance.
  4. Wasp SMG Single Grip (CL-331d, J96): Verified firing thumb wraps around the rear of the grip; support hand cradle positioned 16 mm lower with fingers extended along the right side of the receiver; index finger follows receiver and shroud root without penetrating the top receiver deck.
  5. Wasp SMG Akimbo (Dual Wield): Verified dual Wasp stance at hip and aimed; verified mirrored grip on left gun and wrap-around thumb on right gun.
  6. Shotgun with RMR & Riser (CL-332b, J96): Verified 26 mm riser block (`OPTIC_RISER.shotgun.rmr = 0.026`) with clamp foot and lightening cuts; in 1P ADS, red dot reticle is centered, clear, and unobstructed in the optic window.
  7. Shotgun with RMR + Suppressor: Verified line of sight with cylindrical suppressor attached; 26 mm riser elevates the optic window such that neither the front bead nor the top of the suppressor block the red dot down sights.
  8. GW-4 (m4) with RMR: Verified 21 mm riser block (`OPTIC_RISER.m4.rmr = 0.021`); optic sits at `y = 0.128`, sightline at `y = 0.152`, cleanly clearing the front sight post down sights.
  9. KR-7 (ak) with RMR Diagnostic Finding (Actionable for Claude): In `index.html` line 24700, `OPTIC_RISER` is defined as `{ shotgun: { rmr: 0.026 }, m4: { rmr: 0.021 } }`. While Claude's comment references the KR-7 RMR front post clearance, the dictionary key was assigned to `m4` instead of `ak`. As a result, KR-7 RMR mount does not receive the riser (`opticPos.y` remains at baseline 0.101, sightline dot at 0.125), causing the front sight hood (top at 0.138) to partially intrude on the sightline in `25-kr7-rmr-ads.png`. Recommend adding `ak: { rmr: 0.021 }` to `OPTIC_RISER`.

Files: `tools/ag-review-runner-cl331.mjs`, `tools/build-cl331-sheets.py`, `review/CL-331/*`, `qa/CL-331/*`, `handoffs/2026-11-10-antigravity-AG-277.md`.
Tests: Executed `tools/ag-review-runner-cl331.mjs` through shared game-test slot on RTX 5080 WebGPU hardware -> exit code 0; all 28 raw high-res captures taken; 3 contact strips and master composite sheet generated via Python PIL (`tools/build-cl331-sheets.py`).
Screenshots:
  - Master Composite: `review/CL-331/cl331-master-review-sheet.jpg` (mirrored `qa/CL-331/cl331-master-review-sheet.jpg`, 2560x773)
  - Strip 1 (Pistol Grip, Rear Plane & Full Reload): `review/CL-331/strip-01-pistol-grip-and-reload.jpg`
  - Strip 2 (Wasp Single & Akimbo): `review/CL-331/strip-02-wasp-grip-single-and-akimbo.jpg`
  - Strip 3 (Shotgun, KR-7 & GW-4 RMR Risers): `review/CL-331/strip-03-shotgun-kr7-rmr-risers.jpg`
  - Raw Captures: `01-pistol-1p-hip.png` through `28-gw4-rmr-riser-detail.png` in `review/CL-331/` and `qa/CL-331/`.
Findings / Diagnosis:
  - Pistol two-hand grip and Wasp cradle refit: PERFECT. Matches Jerry's reference photos and clears all geometry.
  - Pistol rear slide plane: PERFECT. Steady surface, zero z-fighting or flicker.
  - Shotgun RMR (bare & suppressed): PERFECT. Red dot completely unobstructed.
  - GW-4 RMR Riser: PERFECT. Clear line over front post.
  - KR-7 RMR: `OPTIC_RISER` dictionary in `index.html` is keyed to `m4` rather than `ak`; needs `ak: { rmr: 0.021 }` to elevate RMR over the front hood.
Not verified: Revolver thumb wrap (waiting on Claude's next round for wider wooden grip backstrap per CL-331 handoff).
Requests: Replied DONE to Claude's request "After the looks queued: CL-331/332 on the 5080". Contact strips and master composite delivered to `review/CL-331/`.
Contract changes: none.
Family: First-Person Hand Grips, Reload Animation & Optics Risers WebGPU QA. Scores (0-5): Pistol Grip 5/5, Wasp Grip 5/5, Rear Slide Plane 5/5, Shotgun RMR Riser 5/5, Diagnostic Precision 5/5.
Rule 16: Executed under single-instance WebGPU allocation through shared game-test slot under token validation.
