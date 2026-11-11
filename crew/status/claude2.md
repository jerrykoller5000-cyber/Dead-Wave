# Claude 2

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CB-307 t221's last red (Director's (a), 19:1xZ): the third-person firing hand leaves the grip and works the sniper's bolt between shots, the gun held where it is; t221 checks the firing palm on the knob (--review); pictures after
touching: index.html (holdShoulderGun, sniper bolt cycle), tools/tests/t221.js
since: 2026-11-11T19:19Z
next: CB-307 GT-20081's returns to me: fakethree Group.copy keeps name/vi
blocked-on: —
last-report: handoffs/2026-11-11-claude2-CB-308.md

## Notes

### context nearly full, needs a new session (claude2, 11 Nov 17:5xZ; session from 15:13Z, Opus 5.5)
- Done: GP-20100 gate PASS. CB-290 (CB-291's reds) out 17:04Z --review: holdFreeShoulders keeps a held gun's aim (heldGunOn);
  t229's akimbo carries the pair. CB-306 done (t213 burst, t225: game-time waits). CB-307 out --review, NOT done: fakethree
  copy + material defaults (+ tools/tests/fakethree-copy.test.mjs), t334 rack seed, gunHeavyLook sleeve painted (markPaintSurface).
- NEXT (in order): (1) CB-307's pictures DONE (review/CB-307/ sheets, 18:3xZ). (2) t221/t277 under CB-307 (Director OK'd,
  --review): t221 the bolt knob on the shooter's right in first person AND on the marine's right in third, the case thrown
  right (views disagree = report a mirrored-eye defect); t277 the scope tube's real centre line at screen centre when aimed
  (3 mm), never the camera's own anchor. Then CB-307 --done.
  (3) t213 (a) approved by the Director: re-seat CARRY_M240.at [0.41,1.14,0.05] (updateCarryPose) on CC-340's shoulder (receiver
  < 0.3 m from armRG), nothing into his head or pack, before/after pictures; (b) the folded legs went to ChatGPT.
  (4) caseLook for the launcher (metalness 0.18/roughness 0.78, reset pool defaults on reuse; ChatGPT 2's request, my LATER).
- A background job in the cloud dies when the turn ends: keep long runs inside one turn (poll with sleeps).
- Cloud pictures WORK now: review/CB-290/lights290.mjs pattern (real index.html via tools/cdp launch headless, ?debug=1&raf=timer,
  wait for DWOpening.active === false up to 500 s; ~6 min load, ~30 s a shot). Run it with crew.mjs slot run in the cloud.
- Cloud recipe: tar on the PC into Claude outputs/<task>/cloud-src.tgz (Working notes below) + cloud-src2.tgz (assets/intro
  *.js *.css, assets/soundtrack *.json *.mid); CHROME_ARGS=--no-sandbox DW_CHECK_MS=420000; ~2-4 min a test.

### Who you are (D-137, Jerry 10 Nov 2026)
You are **Claude 2**, the crew's second Claude: a Claude task of your own, on Claude Sonnet 5.5 (Extra). You took
Cursor's lane when Jerry cancelled Cursor on 10 Nov. CLAUDE DIRECTOR (agent `claude`) leads: he writes your cards, reviews your
work and, under D-81, answers your questions:
`node crew/crew.mjs request claude2 claude "<the question>" "<the choices and your pick>"`. Only Jerry's own files,
money, accounts and publishing go to Jerry (`crew.mjs ask`).

### Your lane
- Files: the `index.html` shell (boot, the frame loop, the TT export, HUD wiring; name your part in `--touch`),
  `core/*`, `tools/*`, `vendor/*`, `package.json`, and `combat/*` (not the zombie looks).
- Integration and the full suite, run in your own cloud workspace (rule 16, D-135: Jerry's PC slot is for Jerry,
  Antigravity's GPU looks and targeted checks).
- Your queue is on the board under **Claude 2**: CB-243, CB-247..CB-251 (Cursor's open cards, renumbered).

### How you work (the way Claude does)
- The repo is on Jerry's PC (`C:\Users\Zero\Desktop\Tiny Trek`). With his computer linked and this folder
  connected, your device shell sees it at `$HOME/mnt/Tiny Trek`. Read, search and edit there, in place: a short python
  read-modify-write, never retyping a file from tool output; keep a file's CRLF if it has it; UTF-8, no BOM.
- Crew commands run there: `cd "$HOME/mnt/Tiny Trek"; timeout 45 node crew/crew.mjs me claude2` (retry once if it
  times out). Check in with `--model "<the model this session runs on>"`.
- Game tests run in your cloud workspace on a copy of the tree, never on the PC while Jerry plays. Leave out of the copy:
  `gh-*` and `pk-*` files anywhere (they never leave the PC), `.git`, `node_modules`, `assets/soundtrack`. Then:
  `node tools/tests/run-all.mjs <tests> --jobs 1 --no-retry --all-fails --agent claude2 --task <id>` (set CHROME to the
  container's Chromium; one instance at a time). WebGPU does not run in the cloud (SwiftShader); the WebGL path does.
  Anything that needs Jerry's 5080 goes to Antigravity: `crew.mjs request claude2 antigravity "shots: <what>" "<setup>"`.
- You cannot commit: your device shell is a Linux sandbox with no Windows git and no GitHub sign-in. Never run git on
  the PC. Write "ready to commit" and the files in your handoff; Claude writes the commit job and Antigravity (or Jerry)
  runs `Claude Commit.bat`.

### Jerry's standing rules
- Never push. Never enter passwords or PINs, complete CAPTCHAs, change system or security settings, or approve your
  own permission prompts.
- `gh-*` and `pk-*` files (and recordings of them) never leave his PC.
- Reference models and his reference photos are to look at only: never copied, traced, imported or shipped. No logos
  or markings on models.
- His Desktop has private papers (bank statements, password databases, tax and VA files): never open, list or stage
  anything outside the Tiny Trek folder.
- Deleting his files needs his OK. Kill processes by PID only, never by name.
- Your own files only; never revert anyone's work; never weaken a test (to change what a test expects, check out with
  `--review`).
- One game test at a time per computer, Jerry first; never close his windows.

### Working notes (claude2, 10 Nov)
- Cloud copy (6.5 MB): in the PC shell `tar czf "Claude outputs/<task>/cloud-src.tgz" --exclude='gh-*' --exclude='pk-*' --exclude=assets/soundtrack --exclude=assets/disclaimer --exclude=assets/intro --exclude=ui/audio index.html package.json assets combat core game studio ui world vendor tools/*.mjs tools/*.js tools/sweep crew/*.mjs tools/tests/*.js tools/tests/*.mjs docs/*.md`, plus `assets/intro/*.js assets/intro/*.css` (the page needs them or TT never appears); device_stage_files; unpack in /home/claude/cb.
- Run: `CHROME=/usr/bin/google-chrome CHROME_ARGS="--no-sandbox" node tools/tests/run-all.mjs <tests> --jobs 1 --no-retry --all-fails --agent claude2 --task <id>`; 1-2.5 min a test. The tool call limit is 10 min: start long batches with nohup in the background and poll the log.
- index.html is CRLF on disk now (checked 10 Nov 08:30Z, 66318 CRLF, 0 LF-only): patch the PC file with python read-modify-write and match \r\n; restage it for the cloud.
- PC shell: one heavy command at a time (du, grep -r and parallel calls time out at 90-120 s). New file to the PC: write it under /mnt/user-data/outputs/<task>/<fresh name>, device_commit_files, then md5sum on the PC.
- Tests: take the next tcbNNN.js (tcb249 is mine). To prove a test catches a bug, patch the old behaviour into a scratch copy of the tree and show it fails there.
- GP-20074 (ChatGPT, uncommitted) is in the tree: it fixed J118's cause (applyArmoryLoadout no longer restores the locker snapshot) and turned t103, t214, t328 red (CB-249 handoff).
