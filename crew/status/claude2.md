# Claude 2

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-11T22:02Z
next: CB-290 J126 rule 3 (Jerry, 10 Nov, standing, D-138): "No part of th
blocked-on: —
last-report: handoffs/2026-11-11-claude2-CB-290b.md

## Notes

### Where things stand (claude2, fresh session from 18:40Z, Opus 5.5; 21:3xZ)
- Done this session: t277 (the scope's real centre line from its lenses; aimed, the eye 1.00 mm off it, the line at screen
  centre; 45/0). CB-308 (t213: the shouldered check waits for the 0.58 s lift, 0.17 m settled; case colour read as shown,
  sRGB) accepted. CB-307's bolt hand: in third person the firing hand works the sniper's bolt (index.html holdShoulderGun +
  sniperKnobWorld, SNIPER_KNOB_HAND keeps the fist out of the scope); t221 32/0 (firing hand on the knob, support on the
  forend, 0 mm into the scope). Landed on the PC 21:2xZ. Pictures: review/CB-307/sheet-bolt-*.jpg (after re-rendered final).
- 22:1xZ: CB-307 accepted; CB-290's arms half out (tcb290/tcb290b + arms-clip.js, 13/0 each). NOW: the Director's full
  suite on the PC tree of 22:03Z in the cloud (one worker, ~391 tests, ~13 h): /home/claude/full/drive.sh, resumable,
  results per test in /home/claude/full/res/<name>.log (a lost container means re-staging Claude outputs/gate2211/*.tgz
  into /home/claude/g). Compare each red with the PC's crew/tests.json as of 22:08Z (baseline: 5972 pass / 44 fail),
  list the NEW reds with the card and owner that caused each, send each owner its own, tests-to-fix vs game. Then CB-290's rest.
- Pictures in the cloud: real time only (a shot each, the cycle held at its moment from inside the page). Frame-stepped
  pictures (flightHold + stepFrame) draw the arms from before the hold. review/CB-307/bolt307.mjs is the pattern.
  timeout >= 3000 s for a two-phase set (each phase ~25 min at 4 fps); the turn must stay alive while it runs.
- Cloud copy: Claude outputs/cb307s2/cloud-src*.tgz (PC 18:39Z) in /home/claude/cb; patches in Claude outputs/cb307s2/.
- No 5080 looks from Antigravity (D-162): cloud captures, four lights, same cameras.

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
