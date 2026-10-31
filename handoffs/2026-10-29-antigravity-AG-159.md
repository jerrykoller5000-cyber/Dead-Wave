# antigravity - AG-159 The marine's moves as filmstrips, for Claude's moves pass (CL-267) - 2026-10-29
Changed:          Generated 40 six-frame filmstrips (18 inspector moves, shootdodge dive, match drowned drag; side and three-quarter views) and composite sheet.jpg in review/principles/claude/moves/.
Files:            review/principles/claude/moves/*-side.png, review/principles/claude/moves/*-three.png, review/principles/claude/moves/sheet.jpg, review/principles/claude/moves/notes.md, qa/2026-10-29-AG-159/runner.mjs
Tests:            Slot runs on NVIDIA RTX 5080 GPU; 18 inspector moves, dive pose, and live wave drowned drag verified; 40 PNG filmstrips (2880x304) and sheet.jpg (2400x3248) generated.
Screenshots:      review/principles/claude/moves/sheet.jpg, review/principles/claude/moves/*-side.png, review/principles/claude/moves/*-three.png
Not verified:     Game source code was not modified (Antigravity visual inspection boundary).
Requests:         Forwarded to Claude for CL-267 moves pass.
Contract changes: none

## Detail
- Generated 40 six-frame filmstrips at 2880 x 304 resolution in `review/principles/claude/moves/` covering all 20 moves from both Side and Three-Quarter views:
  - 18 inspector moves: `stand`, `stand-armed`, `smoke`, `walk`, `walk-back`, `strafe-left`, `run`, `crouch`, `crouch-walk`, `turn-left`, `jump`, `jump-run`, `vault`, `draw`, `medpen`, `knockout`, `reload-m4`, `reload-pistol`.
  - 2 match / TG moves: `dive` (shootdodge flight & slide across 6 phases) and `drowned-drag` (knockdown, mud haul, and recovery across 6 phases).
- Generated 1 composite contact sheet `review/principles/claude/moves/sheet.jpg` (2400 x 3248) presenting all 20 moves side-by-side in 2 columns.
- Recorded visual inspection notes and defect flags in `review/principles/claude/moves/notes.md`:
  1. Walk Stride Push-Off: ~1.5 cm floor penetration during late foot roll before toe lift.
  2. Drowned Drag Pelvis Hover: Marine pelvis hovers ~18 cm above ground during the backward haul before recovery scramble.
  3. Shootdodge Prone Rest: Slight thigh pad hover (~5 cm) above floor at $u = 1.0$.
