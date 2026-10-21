# antigravity — AG-79 Buildables, part 1: Skeletal Marine, Bone Raft, Wood wall (all 5 tiers), Wood floor (all 3 tiers), Barricade (all 3 tiers), and Sandbag Wall (all 3 tiers) — 2026-10-18
Changed:          Completed the game-test slot verification and contact sheet capture for all 16 AG-79 model variants on Jerry's RTX 5080 (`person.skeletal-marine` compacted `325 -> 54` meshes via `mergeStatic`, `prop.bone-raft` compacted `294 -> 35` meshes via `mergeStatic`, `build.wall` Tiers 0–4, `build.floor` Tiers 0–2, `build.barricade` Tiers 0–2, and `build.sandbag` Tiers 0–2). Note: `build.sandbag:2` (Gabion wall) is scheduled for triangle reduction from `6,216` to `<= 1,500` in `AG-84`.
Files:            index.html, qa/2026-10-15-AG-79/verify-node.mjs, qa/2026-10-15-AG-79/after-job.json, qa/2026-10-15-AG-79/run-slot-checks.mjs, qa/2026-10-15-AG-79/after/sheet.jpg, qa/2026-10-15-AG-79/after/check.json
Tests:            `node qa/2026-10-15-AG-79/verify-node.mjs` → 18/18 pass; `DWInspect.contactSheet` via `node crew/crew.mjs slot run` → 16/16 variants ok, 0 broken.
Screenshots:      qa/2026-10-15-AG-79/after/sheet.jpg, qa/2026-10-15-AG-79/after/person-skeletal-marine-three.png, qa/2026-10-15-AG-79/after/prop-bone-raft-three.png, qa/2026-10-15-AG-79/after/build-wall-three.png .. qa/2026-10-15-AG-79/after/build-sandbag-2-three.png (all 16 PNGs)
Not verified:     Full suite remains the coordinated integration job per `AGENTS.md` Rule 16; `build.sandbag:2` triangle budget (`<= 1.5k`) is addressed in `AG-84`.
Requests:         none
Contract changes: none
