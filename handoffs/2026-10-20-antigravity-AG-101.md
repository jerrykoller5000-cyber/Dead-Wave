# antigravity — AG-101 Fix t268 trapper path leaf snap and verify GP-19940 marine waist shots — 2026-10-20
Changed:          Fixed `game/trapper-path.js` so stepping onto any `safe-stone` clears `state.escapeRow = null` (resolving `t268`'s leaf-snap failure when `(good0.lz + opp1.lz) * 0.5` rounded to row 0 after a row 0 snap), replaced `Math.hypot` with `Math.sqrt` `hypot2` per `CL-220`, verified `t268` (`20/20 pass`) through the slot, and captured 6 real-GPU Marine Inspector shots verifying `GP-19940`'s `studio/marine-waist.js` normalization (`qa/2026-10-20-AG-101/01..06.png`).
Files:            game/trapper-path.js, game/trapper-path.test.mjs, qa/2026-10-20-AG-101/run-waist-shots.mjs, qa/2026-10-20-AG-101/waist-summary.json, qa/2026-10-20-AG-101/01-waist-idle-3quarter.png, qa/2026-10-20-AG-101/02-waist-idle-side.png, qa/2026-10-20-AG-101/03-waist-walk-phase22-3quarter.png, qa/2026-10-20-AG-101/04-waist-walk-phase22-side.png, qa/2026-10-20-AG-101/05-waist-walk-phase72-3quarter.png, qa/2026-10-20-AG-101/06-waist-walk-live-m4.png
Tests:            `node --test game/trapper-path.test.mjs` → 4 pass, 0 fail; `node tools/tests/run-all.mjs t268 --agent antigravity --task AG-101 --all-fails` → 1 check: 20 pass, 0 fail (`41.8s`); new tests: added `escapeRow` clearance + mid-row leaf snap assertion in `game/trapper-path.test.mjs`
Screenshots:      qa/2026-10-20-AG-101/01-waist-idle-3quarter.png, qa/2026-10-20-AG-101/02-waist-idle-side.png, qa/2026-10-20-AG-101/03-waist-walk-phase22-3quarter.png, qa/2026-10-20-AG-101/04-waist-walk-phase22-side.png, qa/2026-10-20-AG-101/05-waist-walk-phase72-3quarter.png, qa/2026-10-20-AG-101/06-waist-walk-live-m4.png
Not verified:     None
Requests:         Replied DONE to Claude (`t268 is red (your chunk F): the trapper's path`) and DONE to ChatGPT (`shots: GP-19940 marine waist normalization`)
Contract changes: none

## Rule 16 (Game-test slot)
Both the `t268` browser check (`node tools/tests/run-all.mjs t268 --agent antigravity --task AG-101 --all-fails`) and the Marine Inspector WebGPU session (`node crew/crew.mjs slot run antigravity AG-101 --checks "GP-19940 marine waist normalization shots in inspector" -- node qa/2026-10-20-AG-101/run-waist-shots.mjs`) ran strictly one at a time (`--jobs 1`) through the machine-wide game-test slot.

## Details

### 1. `t268` / `game/trapper-path.js` Fix (`AG-93` follow-up)
- **Root cause**: In `t268.js`, the marine first snaps the wrong stone on row `0` (`state.escapeRow = 0`), waits `3.1s` for the hold to release, steps onto row `0`'s safe stone (`good0`), and then steps into the leaves at `lz = (good0.lz + opp1.lz) * 0.5`. Previously, `step()` only cleared `state.escapeRow` when `c.row !== state.escapeRow`, so stepping onto row `0`'s safe stone left `state.escapeRow = 0`. When `(rule.ROW_Z0 - lz) / rule.ROW_STEP` (`0.4999999999999995` after world/local transform) rounded to `0` (`nearestRow`), `step()` returned `{ kind: 'escaping', row: 0 }` instead of `{ kind: 'snap', reason: 'leaves' }`.
- **Fix**: Stepping onto any `safe-stone` now unconditionally clears `state.escapeRow = null` (since the marine has left the sprung trap and is safely on a stone). Also replaced `Math.hypot` with `hypot2(dx, dz) = Math.sqrt(dx * dx + dz * dz)` per `CL-220`.
- **Verification**:
  - `node --test game/trapper-path.test.mjs` → `4 pass, 0 fail`
  - `node tools/tests/run-all.mjs t268 --agent antigravity --task AG-101 --all-fails` → `ok t268 20 pass 0 fail 41.8s`

### 2. `GP-19940` Marine Waist Normalization Verification (`studio/marine-waist.js`)
- Inspected `marine` in `index.html?inspect=marine` on real WebGPU (`1920x1080`) across idle (`01-waist-idle-3quarter.png`, `02-waist-idle-side.png`), walk cycle holds at phases `0.22` and `0.72` (`03-waist-walk-phase22-3quarter.png`, `04-waist-walk-phase22-side.png`, `05-waist-walk-phase72-3quarter.png`), and live walking with the M4 (`06-waist-walk-live-m4.png`).
- `marine-flexible-shirt` (`6,720` vertices, `2,240` triangles) bends cleanly across `166` live uploads with smooth shading/UV continuity at the belt seam and exact unit-length normals (`minNormalLen = 1`, `maxNormalLen = 1`, `nanCount = 0`).
