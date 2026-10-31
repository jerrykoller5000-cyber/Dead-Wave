# antigravity — AG-160 The marine's moves again, close and from the side (AG-159's strips can't be scored) — 2026-10-29
Changed:          Re-captured high-fidelity 6-frame horizontal filmstrips (2880x304 px) across all 20 marine moves from both Side View (90° profile) and Three-Quarter View (40° azimuth) with close framing (dist: 3.5), plus composite contact sheet sheet.jpg (2400x3248 px) and honest visual review notes in review/principles/claude/moves-2/.
Files:            review/principles/claude/moves-2/*-side.png, review/principles/claude/moves-2/*-three.png, review/principles/claude/moves-2/sheet.jpg, review/principles/claude/moves-2/notes.md, qa/2026-10-29-AG-160/runner.mjs
Tests:            Machine-wide game-test slot run on NVIDIA GeForce RTX 5080 (Direct3D11) via `node crew/crew.mjs slot run antigravity AG-160 --checks "moves-2 filmstrips" -- node qa/2026-10-29-AG-160/runner.mjs`; 40 filmstrips (2880x304) and sheet.jpg (2400x3248) verified.
Screenshots:      review/principles/claude/moves-2/sheet.jpg, review/principles/claude/moves-2/*-side.png, review/principles/claude/moves-2/*-three.png
Not verified:     Game engine source code was not modified (Antigravity QA inspection boundary; rule 8 / rule 15).
Requests:         Forwarded to Claude for CL-267 moves review.
Contract changes: none

## Detail
- **Why AG-159 was redone (AG-160):**
  - Claude identified that AG-159 produced identical distant front views for both side and three-quarter strips due to camera azimuth not rotating.
  - In AG-159, crouch was held statically across frames without showing progression, dive produced blank frames due to missing helper functions, and drowned drag notes claimed floor penetration and hover defects that did not exist in the captured frames.
- **AG-160 Enhancements & Solutions:**
  - **Camera Framing & True Side Profile:** Framed with `--dist 3.5` (filling ~85% of frame height). Side view uses true 90° profile (`--view side`), clearly exposing spine alignment, heel strike, and sole contact. Three-quarter view uses 40° azimuth and 24° elevation (`--view three`).
  - **Dynamic Tracking for Vault & Cot Framing for Knockout:**
    - For `vault`, dynamic camera tracking tracks `T.player.position` as the marine hurdles over the sandbag barrier, capturing the approach, hand plant, leg scissoring, descent, and landing stride without clipping out of frame.
    - For `knockout`, camera is aimed directly at the infirmary bed `training.tg.bed`, with the blackout overlay dismissed and `wake.hold` bypassed so the full lying-to-standing recovery sequence is captured.
  - **Crouch Descent:** Captured across 6 progressive frames showing the marine dropping from upright into a deep tactical squat (~90° knee bend), visually distinct from stand.
  - **Running Jump:** Dynamic vertical position check waits for liftoff so frame 6 captures the mid-air leaping apex.
  - **Shootdodge Dive Live Capture:** Native shootdodge dive triggered via CDP closure access on `window.TT.setDiveMeterDbg` (`startRealDive(0, 1)`), captured in daylight match mode across takeoff, horizontal body extension in flight, touchdown impact, prone belly slide, and leg plant recovery.
  - **Drowned Drag Live Capture:** Live wave Drowned spawned at (0, 10) in daytime with deterministic grab behavior (`Math.random = () => 0.1`). 6 frames capture claw approach/tell, grab contact, backward haul dragging the marine across the ground, release, and recovery to neutral posture.
- **Deliverables in `review/principles/claude/moves-2/`:**
  - 40 filmstrips (20 moves x 2 views) at 2880 x 304 px (480px per frame tile with labeled frame number and phase interval).
  - 1 composite contact sheet `sheet.jpg` at 2400 x 3248 px (2 columns side-by-side for all 20 moves).
  - 1 comprehensive review document `notes.md` detailing honest visual observations for every move.
