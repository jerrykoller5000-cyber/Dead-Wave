# Claude 2

state: idle
model: Claude Opus 5.5 (configured claude-opus-5-5)
task: —
touching: —
since: 2026-11-21T08:33Z
next: CB-369 D-216 step 4: engine matrix walk fix (static islands) review
blocked-on: —
last-report: handoffs/2026-11-21-claude2-CB-369-s4.md

## Notes

### Where things stand (claude2, 21 Nov ~08:40Z, Opus 5.5)
- D-216 hidden walk (REVIEW): review/CB-369/hidden/index.hidwalk-9f26.html 4297f233 (make-hidden.py rebases). The frame's matrix
  walk skips hidden subtrees (62% of its 4,398 nodes with 48 brutes); bones walked even hidden. Cloud: walk-exact 0 wrong,
  stale reads 0, t204/t111/t142/t164/t271/tcl288a green (t222 times out in the cloud on live too). WAITING ChatGPT 2 native
  strict ABBA (same file, ?hidwalk=0 = control). Green -> land; then next levers: marine hidden parts in the hold walks
  (Claude 3 FYI), draws.
- GU-5 restart + WebGL forest LANDED (index 9f264756). Stars wait for the Director's look.
- CD-18 A1/A5 (REVIEW): review/CB-369/cd18/index.cd18-9f26.html 6e9b5d05 + tcb337.js (cand 10/0, live 5/3, planted peg FAIL).
  WAITING Claude 1's before/after pictures, then the Director's LOOK, then land index + tcb337.
- crew.mjs signed-reply rule LANDED (crew/request-status.mjs + test). panel.html line 424 still old (Director's file).
- Cloud test page: fakethree/faketsl stubs landed (TSL.color, mat4, InterleavedBuffer); the page had stopped booting.
- Pass 3 (CB-370) notes from AH-5 in handoffs/2026-11-21-claude2-CB-369-s4.md.

### Where things stand (claude2, 21 Nov ~01:10Z, Opus 5.5)
- CB-369 (D-216): vault static batch candidate A review/CB-369/index.cb369.html 5af04a41 (live ce43865a + 4 lines;
  make-candidate.py rebases) + core/static-batch.js (NEW, landed unused, 530b3fc1). Vault 124->41 / 115->38 shadow;
  48-brute view 571->407 draws (cloud). Sheet vault-before-after.jpg. B = A + nearest-16 zombie shadow cap (5004b135,
  ?zshadowcap=999 off; cloud 48->20 casters). WAITING: Director LOOK (A, B pick, camera fix) + ChatGPT 2 native strict ABBA.
  Census: unnamed meshes = forest instanced (48), nothing to batch. Next big: marine body 50 draws (Claude 3's body).
- CB-368 HELD; copy fixed: manifest-v2.json (minus hitH A = ChatGPT 2's fb7a4591; rebased on ce43865a / e3bb0cab).
- camera.mjs stale-scene fix: review/CB-369/camera.cb369.mjs (make-camera.py), lands on the Director's OK.
- Training WebGPU zero draws: early-return list sent to ChatGPT; waiting DWOpening.active value.
- PC shell is slow: tar the tree in pieces (<170 s each); background jobs die with the call.

### Where things stood (claude2, 20 Nov ~20:40Z, Opus 5.5)
- CB-363 jaw packer seam: ACCEPTED in review (Director 19:34Z). review/CB-363 (index.cb363.html e4f928b8 on live 06f08f88, 5 lines;
  packer-probe.mjs 48/48). Lands later as ONE jaw batch (CB-363 + ChatGPT joins rebased on 3b859926 + Claude 3 s43 tags + Claude 5
  swing) after the Director's motion look. If index.html moves first: rebuild with review/CB-363/make-candidate.py (rebase).
- CB-365 CE-18c TT-ready code proof: ACCEPTED 19:34Z. Done.
- CB-367 tools/abtime.mjs (in-page A/B, diagnostic only) DONE: calibrated (+2.4 ms known -> +2.58 in PROF zombies). Cloud = --fake
  --headless (CPU only, noisy); native = no flags. Cache-on-shared-object limit: --warm-first B.
- CB-368 spider batch review copy (review/CB-368, manifest.json) built; native t111/t222/t278 asked of ChatGPT 2. hitH pick A
  does NOT fix t111 on P5 (head lower in play than at build): A2/A3 asked of the Director (my pick A3: posed head top + 0.03*s).
  t278 threw on the fake page (death finds no knee skin verts on model42). LANDED fakethree 4a024970 (Bezier/Line/CurvePath).
- CB-369 brute draws (D-216 priority): brute = 1 skin = 2 draws (96 of 584). Big lever = scene: relay vault ~100 draws, ~89
  unnamed meshes, marine body 50, 265 shadow draws. PLAN.md sent; waiting the Director's OK to build (1) the vault static batch
  (core/ helper; vault model studio/relay-vault-model.js, owner to confirm). Parts census run timed out (CDP): rerun the probe with --quick (draws-probe.mjs already has byPart/shadowByGroup); the PC copy is the current one.
- Later: CC-359 step 4 LOD1 for Claude 3. CB-343 queue.
- Cloud: tree /home/claude/tt (fresh each session). The cloud tarball MUST add assets/intro/*.js *.css in a SECOND tar
  (--exclude=assets/intro wins over explicit paths); without them TT never appears. The real page runs in the cloud headless with
  &raf=timer (WebGL, ~12 min a probe page); tests use the fake-three page.

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
