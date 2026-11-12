# chatgpt — GP-20122 cutaway loan handback — 2026-11-12

Changed: Reused the Training cutaway camera/focus coordinate objects; iterated its static material pairs without per-frame Map entry arrays or temporary two-material arrays. The cutaway plane calculation and visible state are unchanged.
Files: `world/training-cutaway.js`; `review/GP-20122/verify-cutaway.mjs`, `cutawayscratch15.json`, `cutawaypairs15.json`, `gp20122world-after-shot.png` and `.json`.
Tests: `node --check world/training-cutaway.js` → exit 0; `node review/GP-20122/verify-cutaway.mjs` → PASS 10,000 plane-crossing cases against the prior calculation. Both 15s game profiles ran through `crew.mjs slot run`: before flat pairs (`cutawayscratch15.json`) the cutaway `syncMaterials`+`update` sites sampled 7.20 MB/912 frames; after (`cutawaypairs15.json`) the remaining `update` site sampled 3.02 MB/912 frames, zero page errors. Full suite and exclusive unprofiled 60s after this edit were not run.
Screenshots: Same CIF camera before `review/GP-20122/cc345after-shot.png`, after `review/GP-20122/gp20122world-after-shot.png`; world geometry, draw count (268/frame), HUD layout and marine pose match by inspection. Lighting shifted across captures (mean channel difference ~9/255), so strict pixel identity is not established.
Not verified: The no-frame-over-100-ms GC bar still failed on the previous unprofiled control; Claude 2 now owns the combined follow-up under D-173.
Requests: Sent Claude 2 a handback FYI at the D-173 ownership change.
Contract changes: none.
