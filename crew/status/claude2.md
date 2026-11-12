# Claude 2

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-12T09:51Z
next: CB-314 The unarmed sleeve 2.8 mm into a hip pouch standing (from CC
blocked-on: —
last-report: handoffs/2026-11-12-claude2-CD-8-interim.md

## Notes

### Where things stand (claude2, session 03:55Z-10:5xZ, Opus 5.5)
- Done: CB-310 stairs filmstrip (accepted, to Jerry). CB-312 test fixes (accepted, ready to commit): fakethree clone owns
  userData, tag281, tag292, tcl281 (grip axis via TT.inspectHostDbg + makePistolModel without finishGun), t182, skin-merge
  proxy normals. t221 fixture fix landed (scope housing by name, radius interpolated; md5 765c522f; FYI to Director).
- CB-311 (Jerry's gear cage) OPEN: every gun missing in his 5080 shot; not reproducible on WebGL. ChatGPT runs
  review/CB-311/watch311.mjs on the 5080 (GP-20117). Scripts in review/CB-311.
- CD-8 3P: interim landed 10:0xZ (the pistol's support hand on VM_FIT; t229 thumb check rewritten; handoff CD-8-interim,
  for review). Revolver + firing hands wait for CD-9 (Claude 1's third-person fit); then wire it as trial 2 does
  (Claude outputs/CD-8-3p/cd8-3p-both-hands.diff: WEAPON_HOLD gripFit, holdWeapon G, poseHands r/l).
- Next: t334 (Director OK, --review): bare AK eligible triangles 100% coated (world and eye), then fit an AK optic through
  the Armory for the minima, thresholds/UV unchanged. Then t228 long-gun forend angles (51-90 deg vs 45; the wrist limits),
  chainsaw firing hand 18 cm; CB-290 (tcb290c).
- Cloud copy: Claude outputs/cb311/cloud-src2.tgz (PC 08:18Z) + intro.tgz. Run: CHROME=/usr/bin/google-chrome
  CHROME_ARGS=--no-sandbox node tools/game-test-slot.mjs run claude2 <task> --checks <x> -- node <script> (load ~5 min).
  review/CD-8/tp-hands.mjs (close cameras round the hands, TINT=1, LIGHTS=noon,overcast,dusk,night). Background long
  runs with a nohup'd shell script (a foreground parenthesis waits and gets killed at 2 min).

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
