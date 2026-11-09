# antigravity — AG-256 Fidelity Upgrade (D-121): GP-20053 Stevens 320 Shotgun RTX 5080 Visual Gate & Master Fidelity Sheet — 2026-11-08

Changed:          Reviewed, verified on Jerry's RTX 5080 WebGPU hardware, and regenerated official D-121 Master Fidelity Sheet for the Stevens Model 320 pump shotgun (GP-20053 ChatGPT / CL-312b Claude):
                  (1) Triangle count: 4,596 (commit 28137581) -> 6,828 working tree (+2,232 tris; builder model 5,940 -> 6,972 [+1,032], budget 25,000).
                  (2) Materials: 8 distinct paint-ready materials (gunMetal, gunMid, gunDark, gunRubber, gunBody, gunPoly, gunBand, gunSteel).
                  (3) Floats: 0 small-part floats verified across all studio and in-game passes.
                  (4) Stevens 320 key features verified against Savage Arms manual digest (`docs/fps/manuals/stevens-320.md`):
                      - Barrel retaining lug loops over the magazine tube at z=0.76 with double collar (`K.tor` x2 over magazine tube and barrel bore) clamped behind knurled magazine tube cap, with hex screw and bottom sling swivel.
                      - Cross-bolt safety in rear of trigger plate behind trigger with collar rings and pin head.
                      - Left-side slide-lock paddle (`shotgun-slide-lock`) hinged into trigger plate rear with pivot pin, separate from cross-bolt safety.
                      - Separate `shotgunBolt` (`gun.userData.shotgunBolt`) inside receiver with bright bolt face, recess, and extractor claw for Claude's pump-cycle animation pass.
                      - Forend pump with 12 longitudinal ribs and twin action bars sliding back into receiver when racked.
                      - Both hands maintain clean contact in first person: right hand firmly seated on contoured pistol grip, left hand wrapped around pump forend ribs; zero clipping through metal and zero floating gaps under palms.
                      - Sights align cleanly along receiver top notch block, barrel rib, and brass bead at front crown.
                      - Materials read cleanly across all 4 atmospheric conditions: noon daylight, overcast rain, dusk, and pitch night with weapon flashlight.
                  (5) Performance on Jerry's RTX 5080:
                      - Live WebGPU HQ Dusk: 56.74 fps mean / 45.45 fps 1% low / 22.0 ms worst frame / 0 hitches (D-99 PASS).
                      - Paired A/B dusk run (`review/GP-20053/fps-ab.json`): before 59.41 fps, after 59.49 fps, delta +0.08 fps mean (PASS D-99).
                  (6) Composited official master fidelity sheet `qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg` via `node qa/fidelity/capture-fidelity.mjs --gun shotgun`.
                  (7) Updated `docs/fps/fidelity.md` master sign-off table with Antigravity PASS verdict.
                  (8) Replied DONE to ChatGPT's request `GP-20053 Stevens 320 RTX visual gate` in `handoffs/requests.md`.
Files:            qa/fidelity/shotgun/*, qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg, docs/fps/fidelity.md, handoffs/requests.md, handoffs/2026-11-08-antigravity-AG-256.md
Tests:            Real WebGPU slot run on Jerry's RTX 5080: `node crew/crew.mjs slot run antigravity AG-256 --checks "shotgun fidelity sheet" -- node qa/fidelity/capture-fidelity.mjs --gun shotgun` (exit code 0, 0 page errors, 0 hitches).
Screenshots:      `qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg`, `qa/fidelity/shotgun/{refview-side,refview-top,refview-tq}.png`, `qa/fidelity/shotgun/{studio-side-before,studio-side-after,studio-tq-before,studio-tq-after}.png`, `qa/fidelity/shotgun/{crop-receiver-before,crop-receiver-after,crop-grip-before,crop-grip-after,crop-forend-before,crop-forend-after}.png`, `qa/fidelity/shotgun/{fp-hip-noon,fp-ads-noon,fp-hip-night,fp-ads-night}.png`, `review/GP-20053/after/shotgun-{side,sideR,top,quarter,close}.png`, `review/GP-20053/details/shotgun-sideR.png`, `review/GP-20053/open/shotgun-{side,close}.png`, `review/GP-20053/after/fp/{noon-hip,noon-ads,overcast-rain-hip,dusk-hip,night-flashlight-hip,night-flashlight-ads}.png`.
Not verified:     none (Stevens 320 model verified completely on Jerry's RTX 5080 WebGPU hardware).
Requests:         Claude & ChatGPT: Review updated shotgun fidelity sheet `qa/fidelity/shotgun/shotgun-fidelity-sheet.jpg` and sign off row in `docs/fps/fidelity.md`.
Contract changes: none.
