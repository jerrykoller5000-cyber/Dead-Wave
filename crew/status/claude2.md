# Claude 2

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CB-379 land CB-379 when A/B natives in; D-244 colossus throw loop side (pickup/throw/flight/hit/dodge) with Claude 7+5; watch named loans
touching: review/CB-379/, review/D-244-loop/
since: 2026-11-23T18:42Z
next: CB-373 D-237 #1-2 hitches + 10-of-each cost: tools/hitchhunt.mjs (n
blocked-on: —
last-report: handoffs/2026-11-23-claude2-CB-379.md

## Notes

### Where things stand (claude2, 23 Nov ~18:25Z, Opus 5.5)
- CB-379 (D-240 R4 #1 opening stall): review copy review/CB-379/index.cb379.html f137269d on live 22afb368 (make-cb379.py, 5 hunks):
  Training warms every part of one pooled body per kind + a Feral echo in its own lights (warm-up + call-in countdown).
  Cloud: pipelines built mid-fight 3 -> 0; tcb332/tcb340/t215 green. WAITING: Director LOOK; ChatGPT native diagnostic (live) + copy A/B.
  Probe review/CB-379/opening.mjs (PC copy d549f1bc; my cloud copy adds enterMs). Handoff handoffs/2026-11-23-claude2-CB-379.md.
- Next levers: render objects for death parts (~100 ms cloud per first kill); big GCs (1.2-1.6 GB heap) if natives show heap drops.
- Training light set differs 1P vs 3P (4 ceiling point lights): any warm covers only the view it ran in.

### Where things stand (claude2, 23 Nov ~04:30Z, Opus 5.5)
- LANDED CB-378 (D-240 #1): vendor/three/three.webgpu.js d2ab34b5 -> da292668 (shadow pass rebuilt every caster's material key every frame;
  native 30-zombie fight 33 -> 16.7 ms median). Backup _DELETE ME/CB-378-backup/. NEW tools/fightprof.mjs (ChatGPT's mixed rig + PROF + CPU
  profile + census + --vendor/--page A/B). Handoff handoffs/2026-11-23-claude2-CB-378.md.
- READY, Director ACCEPTED, waiting ChatGPT natives: CB-375 (CD-24 D reload-end fire buffer, tcb342 NEW) + CB-376 (rounds through drums,
  tcb343 NEW): combined copy review/CB-375/index.cb375-376.html baecd0e6 on live c695ae97; scripts review/CB-375/make-cd24d.py,
  review/CB-376/make-cb376.py (md5-guarded, rebase on newest live). Cloud on the copy 99/0. Land both + tests into tools/tests, then ask
  ChatGPT for D-240 round 3. Revolver stays J118 (Director).
- Next lever (B-prof after CB-378: shadow pass 41% -> 16%): holdWeapon 9% (holdFrameMatrices/updateMatrixWorld), carry fit on swaps 7% (Claude 1 CD-25), shadow casters ~470, main-pass per-draw cost. CB-373 D (getKeys memo) worth less
  now: re-measure before landing. Item 4 (launcher hexagons) is Claude 10's CJ-8 part C. CF-24 A (3P gun scale K) mine after CI-3 step 1.
- Cloud: fake-three tests need DW_CHECK_MS=900000 (tcb341/tcb342 run 4-8 min); Training starts him holstered (draw before setWeapon).
- Older notes: handoffs/claude2-card-history-to-2026-11-22.md.

### Where things stand (claude2, 22 Nov ~18:10Z, Opus 5.5)
- LANDED: GP-20234 Armory async read + GP-20235 Guardian + Bomber vendor key: index 26656706, studio/zombie-concepts.js 2d4f4b32, vendor d2ab34b5;
  t343 into tools/tests; hitchhunt c6d11406 (waits out a KO wake). Backups _DELETE ME/CB-373-s3-backup/. Report handoffs/2026-11-22-claude2-CB-373-s3.md.
- WAITING ChatGPT native (review/CB-373/native-s3/): postland originals; B = review/CB-373/s3/index.cand1b.html (make-cb373b2.py); D only = index.cand1d.html.
- HOLD: CE-23 v3 (Claude 5 on v4; bar in my 17:10Z request). At its landing: warmNeckStump(THREE) (Claude 3, 76e4b38a) into B's step 2 + the import.
- CI-3 step 1: Claude 9 still fixing native reds. Next own: spawnDust hexagon motes (index ~15904) -> soft round, LOOK first.

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
ed J118's cause (applyArmoryLoadout no longer restores the locker snapshot) and turned t103, t214, t328 red (CB-249 handoff).
 (applyArmoryLoadout no longer restores the locker snapshot) and turned t103, t214, t328 red (CB-249 handoff).
