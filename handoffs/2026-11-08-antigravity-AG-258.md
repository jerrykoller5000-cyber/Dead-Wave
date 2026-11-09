# antigravity · AG-258 GP-20059 MRAD, GP-20060 M32A1, GP-20062 M240B visual reviews · 2026-11-08

Changed:          Reviewed and verified three manual-pass weapon upgrade packages on Jerry's RTX 5080 WebGPU hardware:
                  (1) GP-20059 Barrett MRAD Sniper Rifle Manual Pass 3:
                      - MRAD chassis silhouette verified across 4 lighting conditions in live WebGPU match (56 fps live).
                      - Continuous top Picatinny rail runs over barrel extension; 3/6/9 o'clock handguard slots cut with full bore visibility.
                      - Folding stock hinge pivot at gun-local (0,0,-0.26) on Y swings -2.7 rad cleanly to +x (ejection side) with complete clearance of bolt, receiver, and chassis.
                      - Bolt action retraction (-0.09m on z) smoothly opens ejection port, exposing chambered brass round; driven cleanly by boltPoseHook.
                      - First-person support hand grips lower handguard flush; firing hand wraps pistol grip with trigger finger inside guard; 0 clipping.
                      - Heavy 3-port muzzle brake with top blast baffles aligns accurately with barrel bore.
                      - 14,290 tris (+1,904 vs prior), 0 floats, bounds [0.152, 0.295, 1.335]m, 0 console/browser errors.
                      - Composited official 9-panel master review sheet: review/GP-20059/mrad-ag-review-sheet.jpg and review/GP-20059/ag-review.json.
                  (2) GP-20060 Milkor M32A1 Grenade Launcher Manual Pass 3:
                      - Full 4-quadrant Picatinny barrel rail forend (top, bottom, left, right) verified.
                      - Matte stainless receiver steel (#858a8d, roughness 0.53) provides clean visual separation from dark gun body and olive stock.
                      - M2A1 open reflex sight hood on receiver rail: clean rectangular glass pane (opacity 0.32), sight line completely unobstructed in live first-person ADS; backup quadrant/folding leaf retained alongside.
                      - Cylinder swings open smoothly (-0.65 PI on drumHinge.rotation.z) for reload contracts with 0 geometry binding; spring cap added at drum front.
                      - Adjustable stock angles on fpStock pivot gun-local (0,0.04,-0.25) by 0.18 rad on X without moving rest pose.
                      - Support hand grips bottom rail assembly cleanly; firing hand firmly seated on pistol grip; 0 clipping.
                      - 15,840 tris (+3,152 vs prior), 0 floats, bounds [0.213, 0.277, 0.828]m, 0 console/browser errors (58 fps live WebGPU).
                      - Composited official 9-panel master review sheet: review/GP-20060/m32a1-ag-review-sheet.jpg and review/GP-20060/ag-review.json.
                  (3) GP-20062 M240B Machine Gun Manual Pass:
                      - Heavy machine gun and tubular tripod construction verified: pintle cradle, tubular legs, and T&E mechanism clear receiver with zero clipping.
                      - Carried fold: tripod legs collapse compactly underneath gun body into [0.231, 0.366, 1.334]m envelope (76% width reduction).
                      - Standard-issue PEQ-16 mounted on right handguard rail (x 0.093, y 0.875, z 0.42); clears barrel handle and gas tube completely.
                      - Top feed cover hinges at front cross pin (+1.05 rad) exposing feed tray for belt reloads; rear sight leaf flips upright (-1.25 rad); barrel handle rotates right (-1.1 rad on Z); charging handle retracts smoothly.
                      - 13,340 tris (mounted) / 11,532 (folded), 0 floats, bounds length 1.334m, 0 errors.
                      - Composited official 9-panel master review sheet: review/GP-20062/m240b-ag-review-sheet.jpg and review/GP-20062/ag-review.json.
                  (4) Replied DONE to ChatGPT's GP-20059, GP-20060, and GP-20062 requests in handoffs/requests.md.

Files:            review/GP-20059/mrad-ag-review-sheet.jpg, review/GP-20059/ag-review.json, review/GP-20060/m32a1-ag-review-sheet.jpg, review/GP-20060/ag-review.json, review/GP-20062/m240b-ag-review-sheet.jpg, review/GP-20062/ag-review.json, tools/ag-review-manual3.mjs, tools/ag-review-m240.mjs, handoffs/requests.md, handoffs/2026-11-08-antigravity-AG-258.md.
Tests:            Compositing and review checks executed via crew.mjs slot run under shared game-test slot:
                  - tools/ag-review-manual3.mjs: exit code 0, 0 browser errors, 0 floats.
                  - tools/ag-review-m240.mjs: exit code 0, 0 browser errors, 0 floats.
Screenshots:      review/GP-20059/mrad-ag-review-sheet.jpg, review/GP-20060/m32a1-ag-review-sheet.jpg, review/GP-20062/m240b-ag-review-sheet.jpg.
Not verified:     Full integration test suite (owned by Cursor/Claude).
Requests:         Claude & ChatGPT: Review master visual sheets and sign off corresponding cards.
Contract changes: none.
