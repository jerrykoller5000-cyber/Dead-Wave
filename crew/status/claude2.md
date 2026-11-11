# Claude 2

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-11T06:12Z
next: CB-290 J126 rule 3 (Jerry, 10 Nov, standing, D-138): "No part of th
blocked-on: —
last-report: handoffs/2026-11-11-claude2-CB-304.md

## Notes

### context nearly full, needs a new session (claude2, 11 Nov 06:15Z)
The 00:05Z session is near its limit; start a fresh Claude 2 session. Everything is on the PC (the cloud copies go with the session).
- Done tonight, checked out (handoffs/2026-11-11-claude2-CB-*.md): CB-295, CB-296, CB-289 (b), CB-294 (tcb248 --review), CB-297, CB-299, CB-243 (the reds list: 33 reds, each owner asked), CB-301, CB-302, CB-303, CB-304.
- Next, in order: (1) CB-305 (ChatGPT's GP-20090 asks, my tests and rack): t262 and tcl301 take the pair through the Armory (the second gun in a secondary slot: pairInLoadout), every pose check kept; t138 asserts the same 4 magazines before the stow, on the shelf and after, without clearing the live ledger (+ a workbench buy case); t180: armoryDisplayKinds (index.html ~28073) shows the carried guns on the rack again within t38's mesh budget. (2) CB-291 step 1: Claude outputs/cb291/patch291.py (the neck, hips, knees, ankles held after the pose; the spine left out) + body-limits.draft.js (copy over core/body-limits.js: it keeps every CB-289 export) + tcb291.draft.js -> tools/tests/tcb291.js; node --test core/body-limits.test.mjs (body-limits.test.draft.mjs) 9/9. Audit on the 02:52Z tree: only the shoulders (twist read raw, CLAUDE DIRECTOR wants it against where the elbow points, held inside the IK with Claude 3's carrierClearance(ud): asked of Claude 3) and the spine's turn (63 deg aimed: asked CLAUDE DIRECTOR (a) hips follow / (b) exception / (c) leave) stay outside with step 1. (3) CB-290, CB-292 (Antigravity's AG-292 found the kiosk/armory past the range wall x=8.0: on CB-292's list). (4) my reds: t213 (minigun burst 9 cases 9 links), t225 (grenade arc), t184 (boot slide: CB-290), t17 is FLAKY (green/red/green on three trees).
- Open with others: ChatGPT 2 (offhand Wasp clone lacks setMagazineRounds), CLAUDE DIRECTOR (crew.mjs reply collision fix; spine), Antigravity (tag289 import path), Claude 3 (carrierClearance shape).
- Cloud copy recipe: Working notes' tar PLUS assets/intro/*.js *.css and assets/soundtrack/*.json *.mid (an --exclude of a dir drops files named under it); set DW_CHECK_MS=420000 in the cloud; run-all now prints each FAIL as it happens. Patch tools: Claude outputs/cb295/syncheck.mjs (node --check of index.html's module scripts). A cloud reds run of ~120 tests takes ~2.5 h at one worker.

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
  times out). Check in with `--model "Claude Sonnet 5.5 (Extra)"`.
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

### Start here
1. `node crew/crew.mjs me claude2`; read `AGENTS.md` and `crew/BOARD.md` (Orders from Jerry; decisions D-133..D-137).
2. Cursor's last handoffs: `handoffs/2026-11-10-cursor-CU-24*.md` and `-CU-25*.md` (CU-247..251 were handed over not
   started; CU-243 has the 9 Nov suite's reds).
3. Set up your cloud copy, then CB-249 first (a clear bug with a test), CB-247, CB-251, CB-250, CB-248; CB-243 (the
   full suite on the current tree, reds by owner) once your copy runs.

### Working notes (claude2, 10 Nov)
- Cloud copy (6.5 MB): in the PC shell `tar czf "Claude outputs/<task>/cloud-src.tgz" --exclude='gh-*' --exclude='pk-*' --exclude=assets/soundtrack --exclude=assets/disclaimer --exclude=assets/intro --exclude=ui/audio index.html package.json assets combat core game studio ui world vendor tools/*.mjs tools/*.js tools/sweep crew/*.mjs tools/tests/*.js tools/tests/*.mjs docs/*.md`, plus `assets/intro/*.js assets/intro/*.css` (the page needs them or TT never appears); device_stage_files; unpack in /home/claude/cb.
- Run: `CHROME=/usr/bin/google-chrome CHROME_ARGS="--no-sandbox" node tools/tests/run-all.mjs <tests> --jobs 1 --no-retry --all-fails --agent claude2 --task <id>`; 1-2.5 min a test. The tool call limit is 10 min: start long batches with nohup in the background and poll the log.
- index.html is CRLF on disk now (checked 10 Nov 08:30Z, 66318 CRLF, 0 LF-only): patch the PC file with python read-modify-write and match \r\n; restage it for the cloud.
- PC shell: one heavy command at a time (du, grep -r and parallel calls time out at 90-120 s). New file to the PC: write it under /mnt/user-data/outputs/<task>/<fresh name>, device_commit_files, then md5sum on the PC.
- Tests: take the next tcbNNN.js (tcb249 is mine). To prove a test catches a bug, patch the old behaviour into a scratch copy of the tree and show it fails there.
- GP-20074 (ChatGPT, uncommitted) is in the tree: it fixed J118's cause (applyArmoryLoadout no longer restores the locker snapshot) and turned t103, t214, t328 red (CB-249 handoff).
