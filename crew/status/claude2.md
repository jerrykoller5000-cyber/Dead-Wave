# Claude 2

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-11T13:09Z
next: CB-290 J126 rule 3 (Jerry, 10 Nov, standing, D-138): "No part of th
blocked-on: —
last-report: handoffs/2026-11-11-claude2-CB-291.md

## Notes

### context nearly full, needs a new session (claude2, 11 Nov 13:10Z; session from 08:53Z)
- CB-291 DONE, checked out twice with --review (handoffs/2026-11-11-claude2-CB-291.md): landed 10:50Z (patch291 + 291b), 12:35Z
  (patch291c: the natural elbow; tools/tests/fakethree.mjs real Matrix4.transpose: the harness's arm IK was wrong everywhere),
  13:07Z (patch291d: the IK marks every arm, blends held, the idle's pinched hand kept). tcb291 3/0 (before 620 out).
  Open for the Director: t187 aim-follow 1.96/1.50 deg (limit 1.5) and t229 akimbo forearm line are new reds; the harness fix
  shows old reds (t195, t218, t229, tcc341 shirt/gloves) for their owners. AG's GPU look: review/CB-291/ag/ (PASS on elbows,
  carrier, turns).
- CLAUDE DIRECTOR 13:2xZ: CB-291 accepted; the 3 new reds (t187 shotgun/launcher aim-follow, t229 akimbo forearm line) are to be fixed in the hold (index.html holdShoulderIK / holdFreeShoulders), now part of CB-290. This session stopped at 13:31Z.
- NEXT: CB-290 whole (CC-343 came back): the arms/gun ease back near walls and props (a ray from the shoulder along the aim), then
  the legs (foot IK on ground/stairs/ramps/crates, knees out, t184's boot slide), a walking test past walls, doors, crates,
  stairs, ramps in every stance and weapon class, worst five before/after in the four lights. Training Ground first (D-144).
  Check in naming only your parts (the Director: core/clip-exceptions.js (body rules) if you touch it; ChatGPT 2 holds the
  weapon section).
- Then: t217's Wasp flash visual anchor (ChatGPT 2), Training HUD units + CIF copy (ChatGPT, GP-20097), ChatGPT 2's fakethree
  asks (Object3D.copy keeps name/visible; material type + data defaults for foldStatic), my reds t213, t225. Not mine: crew.mjs
  reply matching and t17 (ChatGPT, GP-20096).
- Cloud recipe that worked: tar on the PC into Claude outputs/<task>/cloud-src.tgz (see Working notes) + a second tar for
  assets/intro/*.js *.css and assets/soundtrack/*.json *.mid; DW_CHECK_MS=420000; a killed run-all can leave the cloud slot
  held: kill its game-test-slot.mjs and chrome by PID. The marine lab (Claude outputs/cb291/ has no driver; /home/claude/w291/
  lab291.mjs was cloud-only) renders joints in four lights but the harness joints are not the game's: use Antigravity for looks.

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
