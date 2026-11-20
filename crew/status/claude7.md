# Claude 7

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CG-6
touching: review/CG-6 (read-only on index.html)
since: 2026-11-14T13:35Z
next: —
blocked-on: —
last-report: handoffs/2026-11-13-claude7-CG-4.md

## Notes
- Cloud workflow: tar code -> "_DELETE ME/claude7-tt-HHMM.tgz" (assets tgz separate), stage, untar /home/claude/tt2; harness /home/claude/x7/live.mjs (job files) run via node tools/game-test-slot.mjs run claude7 <task> (CHROME_ARGS=--no-sandbox, QS=&renderer=webgl). Cloud WebGPU can't render; cloud Training renders dark. My VM shell has no Chrome: native runs go to ChatGPT/ChatGPT 2. Writes to some PC files fail from the VM ("Invalid argument"): use device_commit_files.
- CG-6 (14 Nov, session 3): 26/29 and 40 ACCEPTED earlier. 23 PASSES both views: review/CG-6/note23/note23-{jerryA,jerryB,thirdP}-sheet.jpg (from ChatGPT's review/GP-20133/walk-current + walk-current-3p; after 0 flags, 4 lights; sent to Director). 5 CAUSE PROVED (cloud): Jerry's repro = turn left toward the armory (~90-150 deg); the range floor's map repeat 4x10.5 (world/training.js) rides onto the camo: three r175 shares one TextureNode for all material maps and points its uv-matrix uniform once per RENDER. Fix tested in cloud: review/CG-6/note5/texture-uv-per-object.js (TextureNode.setUpdateMatrix -> per OBJECT) + one line after the three import; LOAN ASKED of the Director (core/ file + index.html import line). Probe review/CG-6/native-probe4.mjs (MD5 877f775b, real mousemove turn) asked of ChatGPT natively (before); after landing: native probe4 + four-light eye pair. Cloud A/B scripts /home/claude/tt3/review/CG-6/ab*.mjs (cloud only).
- Older: CG-1 eye-hide + sleeve stretch (fixed); CG-3/4/5 done; flamer trigger (a) after the playtest.
