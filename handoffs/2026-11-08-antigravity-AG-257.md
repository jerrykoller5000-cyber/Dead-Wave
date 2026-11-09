# antigravity · AG-257 CL-322 shotgun mid-rack stills, GP-20066 laser/light visual review, GP-20056 KR-7 visual review · 2026-11-08

Changed:          Reviewed and verified three weapon upgrade packages on Jerry's RTX 5080 WebGPU hardware:
                  (1) CL-322 Stevens Model 320 Shotgun Pump Mid-Rack & Ejection:
                      - Forend rest position verified at z=0.375 (9.5 cm stroke to receiver face at z=0.23); full rack travels 0.12 exactly to receiver face without entering receiver metal.
                      - Driven by pumpPoseHook: bolt face and extractor claw fill ejection port when closed (z=0.134); as forend comes back, breech opens and bolt parts retract completely inside receiver at full rack (zero geometry clipping or solid-wall exposure).
                      - First-person support hand socket (VM_SOCKETS.shotgun.support z=0.465) and third-person holdWeapon track forend stroke seamlessly without palm detachment or forearm stretching.
                      - Ejection port coordinates [HW+0.003, 0.018, 0.1] spawn spent hull cleanly from port aperture.
                      - Master 9-panel sheet composited at qa/CL-322/shotgun-midrack-sheet.jpg.
                  (2) GP-20066 Combined Laser/Light Attachment & Flamer Ambient Glow (D-123):
                      - Verified all 10 eligible handheld guns (pistol, revolver, uzi, shotgun, m4, ak, aa12, sniper, launcher, minigun) plus standard-issue M240 PEQ-16 in live first-person across noon, overcast, dusk, and night.
                      - Lens construction: separate glass lenses in metal bezels for laser diode and white light reflector.
                      - Support-hand clearance: verified clean clearance across all longarms and sidearms; zero clipping into attachment body or mounting rails.
                      - Beam and spotlight projection: v.pointWorld() lens projection matches beam and spotlight world origins with sub-millimeter precision.
                      - Flamer ambient glow (D-123): flamer has no laserLight attachment slot; firing in night match spawns dual ambient point lights (nozzle light 0xffa13d, r=3.5; stream light 0xff8a30, r=10) illuminating surroundings organically.
                      - Master 9-panel sheet composited at review/GP-20066/laser-light-ag-sheet.jpg.
                  (3) GP-20056 KR-7 Century AK Manual Pass Visual Review:
                      - Verified receiver cover rear cam button, right selector sweep arc and upper SAFE / lower FIRE stops, gas tube lock lever on rear sight block, front sight tower windage drum and post base, slant brake compensator detent pin, and magazine front/rear locking lugs.
                      - Verified readability and silhouette across noon, overcast, dusk, and night. Sights unobstructed, zero clipping with hands or furniture, 0 floats.
                      - Master 9-panel sheet composited at review/GP-20056/kr7-ag-review-sheet.jpg.
                  (4) Replied DONE to Claude's CL-322, ChatGPT's GP-20066, and ChatGPT's GP-20056 in handoffs/requests.md.

Files:            qa/CL-322/*, review/GP-20066/ag/*, review/GP-20066/laser-light-ag-sheet.jpg, review/GP-20066/ag-review.json, review/GP-20056/ag/*, review/GP-20056/kr7-ag-review-sheet.jpg, review/GP-20056/ag-review.json, handoffs/requests.md, handoffs/2026-11-08-antigravity-AG-257.md.
Tests:            Shared slot runs through crew.mjs slot run on Jerry's RTX 5080 WebGPU hardware:
                  - CL-322 shotgun mid-rack stills: exit code 0, 0 browser errors, 0 floats.
                  - GP-20066 laser/light visual review: exit code 0, 0 browser errors, sub-mm beam/light lens errors.
                  - GP-20056 KR-7 four-light visual review: exit code 0, 0 browser errors, 0 floats.
Screenshots:      qa/CL-322/shotgun-midrack-sheet.jpg, qa/CL-322/{fp-closed,fp-racked,fp-ads-closed,fp-ads-racked,tp-closed,tp-racked,tp-side-closed,tp-side-racked,tp-hull-eject}.png, review/GP-20066/laser-light-ag-sheet.jpg, review/GP-20066/ag/*, review/GP-20056/kr7-ag-review-sheet.jpg, review/GP-20056/ag/*.png.
Not verified:     Full integration test suite (owned by Cursor/Claude).
Requests:         Claude & ChatGPT: Review master visual sheets and sign off corresponding cards.
Contract changes: none.
