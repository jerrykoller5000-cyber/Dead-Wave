# Claude 6

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-13T04:10Z
next: CF-10 (00:50Z: MOVED to Claude 9 as CI-1 (weapon-heavy.js for J151
blocked-on: —
last-report: handoffs/2026-11-13-claude6-CF-9.md

## Notes
- Joined 12 Nov (D-177): the heavy guns detail pass (minigun, Watchman MG, launcher, Breacher, pump shotgun).
- 12 Nov 18:13Z: CF-1 done (all five; handoffs 2026-11-12-claude6-CF-1-<gun>.md, sheets review/CF-1/). Asked Director for one of Claude 3's guns.
- Cloud: tar code dirs -> "_DELETE ME/claude6-tt-HHMM.tgz" (+ assets tgz), stage, untar /home/claude/tt. Sheet harness (cloud only, never to PC): x6/run.mjs <gun> <out.png> x6/cams-<gun>.json [camo] [controls|closeups.json] via tools/game-test-slot.mjs run claude6 ...; HEAVY_SRC picks a before module.
- Detail heads: use plain meshes from fastenerGeometry (heads()/pinEnds() at the top of weapon-heavy.js), not InstancedMesh: gunExtLook feedY and carry/sling fits read geometry.boundingBox (unit size on an instanced head). Mark shared cached geometry userData.shared (build disposal).
- tgt20076 is red at baseline (75 fails); compare per-line against a baseline run, not pass/fail.
- 12 Nov: CF-2 (sniper safety part; pump audited no change) and CF-3 (KR-7 grip rebuilt, J150) landed; handoffs 2026-11-12-claude6-CF-2.md / CF-3-grip.md; review/CF-2, review/CF-3. KR-7 rest audited: no change proposed.
- weapon-longarms.js is shared by function block (Claude 3 GW-4, ChatGPT 2 Breacher, me sniper/KR-7): stage the PC copy, apply my hunks by anchor onto it, md5-guard, tmp + os.replace.
- AK side-render camera: x6/cl-akgrip.json (true side, FOV 13); Jerry's before = Claude outputs/ak-grip/.
- 12 Nov 22:13Z: CF-4 gate pass B done (handoffs/2026-11-12-claude6-CF-4.md): no open red in my files. KR-7 grip = 577fb2d2 (Jerry-approved); flamer igniter on the collar face (weapon-heavy 9a7fd325).
- Cloud tests: export DW_CHECK_MS=420000. commit_files may reuse an old upload for the same stagedPath: new file name per version, md5-check the tmp.
- 12 Nov 22:50Z: CF-5 (t217 can reds = stale PROBE, not the guns) and CF-6 (the KR-7 lost 16% length between 7 Nov and 12 Nov 15:52Z, not J149) reported. Queue empty; session context near full: next session starts from this card + the project doc claude/cf1-heavy-guns-2026-11-12.md.
- 13 Nov (session #2): CF-8 landed 02:31Z (chainsaw heat = dark exhaust shield; Training reaps pulse beds via core/audio.js loan line; tcf8). CF-9 landed 04:05Z (KR-7 Draco fore end akForeEndGeometry, dovetail side rail + bracket clamp, can r .033/len .25 in index SUPPRESSOR ak, mag + synthetic paint roles, guard tang, setKr7Furniture; tcf9). Pictures review/CF-8, review/CF-9. CF-10 is Claude 9's (CI-1).
- Cloud: run-all in the foreground with < /dev/null, under 10 min per call (nohup runs hung); inspector camera: start (title) then reload --inspect; jobs ignore zoom/pan (use CLI shot); title shelf shows hidden parts. index.html is CRLF (one LF line at 'mountArmory'): edit it in binary.
- Open: tcl334d chainsaw 6.4 mm right glove (ChatGPT 2, answered LATER); tcl334c AK glove 5.1 mm until Claude 1 refits the fat fore end.
