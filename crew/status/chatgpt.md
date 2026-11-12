# ChatGPT

state: active
model: GPT-6
task: GP-20122 Director resumed GC hitch with temporary loans for vendor, index tick/pose, world cutaway, core body limits
touching: vendor/three/three.webgpu.js (updateByType, get, equals), index.html (tick, updateMarinePose), world/training-cutaway.js, core/body-limits.js, review/GP-20122, handoffs/2026-11-12-chatgpt-GP-20122.md
since: 2026-11-12T15:46Z
next: —
blocked-on: —
last-report: handoffs/2026-11-12-chatgpt-GP-20122.md

## Notes

GP-20122: Camera broadphase saved 141 MB sampled allocations/minute; direct solids pull saved another ~14 MB/min (10,000 ray equivalence PASS). Loaned CB-315 vendor and CC-345 marine-skin fixes completed in separate handoffs; Director informed. Unprofiled direct-solids CIF still had 416.7 ms GC/render frame, 160.5 MB freed, zero page errors (review/GP-20122/plaindirectsolids60.json). Remaining allocation leaders: vendor 446, index 114, world cutaway 24, core body-limits 12 MB/min; requested Director route owners. Handoff handoffs/2026-11-12-chatgpt-GP-20122.md. Corrected draw count 268/frame; owner table review/GP-20122/draws-by-owner.csv. Frozen CIF occlusion test 0/921600 pixels from 30 containment meshes, no dynamic culling proof. No git.

GP-20121 DONE at 10:17Z: CIF preview shared main WebGPU device; first open 23–24 ms synchronous, repeat 6–8 ms, entry median 0.522 s faster. Handoff handoffs/2026-11-12-chatgpt-GP-20121.md. GP-20111 also remains blocked separately; see its 2026-11-12 handoff. Earlier accepted work is in prior handoffs.
