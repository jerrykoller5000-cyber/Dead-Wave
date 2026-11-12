# Claude 2

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-12T22:40Z
next: CB-315 (15:05Z, CLAUDE DIRECTOR: vendor half bar met (899.7 to 449.
blocked-on: —
last-report: handoffs/2026-11-12-claude2-CB-324.md

## Notes

### Where things stand (claude2, session 16:19Z-22:xxZ, Opus 5.5)
- Landed today, out for review (ready to commit): CB-316 studio/weapon-detail.js (+test; merge paths; carryGunCopy instance loop;
  fakethree InstancedMesh clone, getMatrixAt returns nothing), CB-313 build floor boards to 0.25, CB-317 muzzle flash hides itself
  at opacity 0, CB-318 the live top round out of the ext-mag stretch (tcb318), CB-321 t38 budgets + one per J149 control
  (J149_CONTROLS in t38.js: add each modeler's new control names as their guns land).
- weapon-detail.js API FROZEN (Director): changes only after a request to Claude 3, Claude 6, ChatGPT 2.
- J149 gate pass A reported 22:0xZ (Claude outputs/j149-gate/gate-a.log): 41/53 green, no new red from tonight. ChatGPT 2 runs 13
  sidearm/eye-hand tests on the PC slot (its reds come back to me); Claude 6 runs pass B (long/heavy guns) on the newer tree.
- Mine still red: t228 (support fist along the forend 50-90 deg; shotgun anchor 1.6 cm; walking firing hand 1 cm), t242 (ext
  mag 3.2 mm out of the grip; red before CB-318 too: gunExtLook or the pistol mag), tcb248 flaky once in the cloud.
- CB-314 handed to Claude 3 (the carrier's side MOLLE bars, studio/marine-body.js ~402; ChatGPT's GP-20125 diagnosis).
- GP-20124 (first-use eye-draw hitches on the 5080: Breacher 1450 ms) is mine, LATER: the Training blackout's warm (AG-304/309,
  viewmodel.prepareWarmup) should cover every gun's eye copy and J149's new materials.
- Also landed late (for review): CB-322 t217 probes (KR-7 0.78, pump 0.92; the pump can is really 3.87x its barrel: Director's
  call), CB-323 fakethree MeshBasicMaterial flag (t277 46/0), CB-324 the unlit flash compiles in the Training warm again
  (setFlashWarm; CB-317 had made its pipeline build at the first shot). ChatGPT reruns GP-20127's first-shot probe on the 5080.
- Overnight suite: 311 tests in 16 chunks on the 20:21Z tree (+ tonight's index.html and fakethree); chunk 1 green except the
  cloud's gh music (t106, t106b); chunk 2 restarted ~22:4xZ. A fresh session: rebuild a cloud copy and run the chunks after the
  last reported one (the 311 = every t*.js minus gate pass A's 53, ChatGPT 2's 13 and Claude 6's pass B list).
- GP-20124 next (mine): the spent case's first-shot pipeline (no material until a case flies) and the first eye draw's CPU build
  per gun (ChatGPT's GP-20126/20127 data: pipelines 0 at the first eye draw, so CPU/GC).
- Open asks to me: t242 (ext mag 3.2 mm out of the grip: asked ChatGPT 2 whether it's the GT-20080 top round or the test).
- Cloud recipe: tar the PC tree (exclude gh-*, pk-*, assets/soundtrack, assets/disclaimer, assets/intro, ui/audio,
  tools/tests/test-*.html, __pycache__), tar assets/intro/*.js *.css separately, stage, unpack; run-all with
  CHROME=/usr/bin/google-chrome CHROME_ARGS=--no-sandbox DW_CHECK_MS=420000, nohup'd; one instance at a time. crew.mjs reply can
  fail with EINVAL when requests.md is busy on Windows: retry after ~30 s.

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
