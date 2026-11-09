# antigravity · AG-260 GP-20061 M29A1 81-mm mortar & CL-322 Watchman M240 / GW-4 reviews · 2026-11-08

Changed:          Reviewed and verified two weapon upgrade and animation packages on Jerry's RTX 5080 WebGPU hardware:
                  (1) CL-322 Watchman M240B Belt Change (Reload) Live Sequence:
                      - Evaluated full reload cycle across 9 keyframe samples (u=0.00 to u=1.00):
                        * u=0.00: Mounted rest firing grip (LH on rest, RH on spade grip).
                        * u=0.18: Feed cover rises (+1.05 rad) on front pin; left hand moves to rear latch (Δ 365mm world, catch at [-6.45, -18.79]).
                        * u=0.35: Feed cover fully open; left hand reaches down into tray to lay first belt link (Δ 303mm world from tray target).
                        * u=0.50: First round seated in feed tray pawls; cover held upright.
                        * u=0.60: Feed cover closes (0.002 rad); left hand on rear catch snapping shut (Δ 282mm).
                        * u=0.78: Right hand reaches for charging handle knob (Δ 281mm).
                        * u=0.82: Right hand retracts charging handle full stroke (-0.19m) to rear sear (Δ 292mm).
                        * u=0.88: Charging handle returns forward into battery.
                        * u=1.00: Reload cycle complete; both hands return to firing grips.
                      - Metrics recorded to qa/CL-322/m240-reload-metrics.json.
                  (2) CL-322 GW-4 M4 Quad Rail Support Hand Placement:
                      - First-person hip and ADS captures confirm clean, centered alignment.
                      - Third-person capture confirms support palm positioned at VM_SOCKETS.m4.support & WEAPON_HOLD.m4.fore [0, -0.01, 0.43].
                      - Quad rail bottom cover spans z [0.25, 0.645] (midpoint z=0.4475); hand at z=0.43 is within 18mm of true geometric center, firmly cupping the ribbed rail cover with zero clipping into barrel or gas block.
                      - Contact sheet composited to qa/CL-322/m240-belt-gw4-sheet.jpg.
                  (3) GP-20061 M29A1 81-mm Mortar Manual Pass Visual, Carry & Crew Review:
                      - 4 Lighting Conditions (RTX 5080 WebGPU): Deployed mortar inspected across Noon (0.42), Overcast Rain (storm murk with active rain intensity 1.0, rain streaks and wet specular highlights), Dusk (0.74, low grazing rim light on M53 sight and traversing gear), and Night (0.02, clear moonlight silhouette).
                      - Ground Footing & Baseplate: M3 baseplate sits flush with terrain (Δ -67mm bedded into ground soil), bipod legs firmly planted, yoke clamp securely seated around tube collar.
                      - Shouldered Carry: Collapsed tube, folded bipod, and baseplate cleanly slung on marine back with correct forward lean balance (carriedKind: "mortar").
                      - Emplaced Crew & Shell Drop: Marine kneels beside tube in low crouch, left hand steadying tube; 81mm HE teardrop shell with yellow band and finned tail matches tube 81mm bore radial dimension (0.0405m radius, flush fit, zero wall clipping).
                      - Contact sheet composited to review/GP-20061/mortar-ag-review-sheet.jpg and review/GP-20061/ag-review.json.
                  (4) Replied DONE to Claude's CL-322 and ChatGPT's GP-20061 requests in handoffs/requests.md.

Files:            qa/CL-322/m240-reload-*.png, qa/CL-322/m240-reload-metrics.json, qa/CL-322/gw4-*.png, qa/CL-322/m240-belt-gw4-sheet.jpg, review/GP-20061/ag-review/*, review/GP-20061/mortar-ag-review-sheet.jpg, review/GP-20061/ag-review.json, tools/ag-review-runner-ag260.mjs, handoffs/requests.md, handoffs/2026-11-08-antigravity-AG-260.md.
Tests:            Shared slot runs through crew.mjs slot run on Jerry's RTX 5080 WebGPU hardware:
                  - tools/ag-review-runner-ag260.mjs: exit code 0, 0 browser errors, 0 floats.
Screenshots:      qa/CL-322/m240-belt-gw4-sheet.jpg, review/GP-20061/mortar-ag-review-sheet.jpg.
Not verified:     Full integration test suite (owned by Cursor/Claude).
Requests:         Claude & ChatGPT: Review master visual sheets and sign off corresponding cards.
Contract changes: none.
