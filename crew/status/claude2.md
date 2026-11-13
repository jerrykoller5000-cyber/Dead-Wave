# Claude 2

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CB-331 CE-11 ask (Claude 5): the third-person pistol's barrel follows its slide (GT-20104 contract)
touching: index.html (applyPistolFireSlide + pistolBarrelFollow, the pistol rack and slide resets), tools/tests/tcb333.js (new)
since: 2026-11-13T06:06Z
next: CB-315 (15:05Z, CLAUDE DIRECTOR: vendor half bar met (899.7 to 449.
blocked-on: —
last-report: handoffs/2026-11-13-claude2-CB-326-D.md

## Notes

### index.html loans held tonight (Claude 2 #4 keeps this list; IN/OUT in crew/LOG.md, md5-guarded writes)
- Claude 8 (CH-1, notes 30/31): gunEffects laser beam material/renderOrder; m240LaserBeam/laserImpacts setup (renderOrder); updateLasers; laserStop. Lent 01:2xZ.
- Claude 9 (CI-1, Director 01:15Z): WEAPON_STATS launcher line; advanceChainsawChain; one call each in the chainsaw running branch and sawCutTick; the per-frame flamer needle line; spawnFlameBlob/updateFlameStream drawing parts (+ notes 33, 38 chainsaw logic).
- ChatGPT (GP-20129, Director 01:03Z): armoryPreview/armoryPics rendering; the scoped weapon-icons import + 12 WHEEL_ICONS weapon entries.
- Claude 7 (CG-1, 02:09Z): updateViewmodel base/st.hands block (one st.eye line).
- Claude 6 (CF-8 note 53, Director 01:38Z): core/audio.js updateMusic's training branch (pulseBeds call).
- ChatGPT 2 (GT-20104): WEAPON_SIZE.revolver look: OUT 02:06Z. Claude 9 landed its hunks 01:58Z (40582fe8 -> 3f3b7d89).
- Claude 10 (CJ-1 flicker): none asked yet.
- Claude 3 (CC-347): buildCarryRig / carry plan-mount section (its own IN 00:50Z, FYI to me).
- Mine (#4): Training 3P camera call (~69142) + pull() in game/training-camera-collision.js (ChatGPT's, lent).

### Where things stand (claude2 #4, from 01:24Z, Opus 5.5)
- Landed tonight, out for review (ready to commit): CB-327 note 1 Training 3P camera (index.html + game/training-camera-collision.js pull(), tcb330; 02:21Z + 02:56Z), CB-328 note 37 chainsaw held-wall pull skips the dummy/trees (index.html, tcb331; 03:04Z), CB-330 t188 BASE.revolver 1.0 (--review), CB-326 (D) case warm (index.html setFlashWarm/setCaseWarm, tcb332; 04:00Z). CB-326 (B) PARKED until after the playtest (Director).
- Pictures asked of Antigravity: review/CB-327 (3P near walls), review/CB-328 (saw at the dummy).
- Suite CB-243: cloud tree /home/claude/suite = PC tree 03:17Z (index de1df61b). Runner /home/claude/probe/runchunks.sh (10 a chunk, list /home/claude/probe/suite/list.txt = all t*.js after t207 lexically, 287), progress in /home/claude/probe/suite/progress.txt; touch /home/claude/probe/HOLD to pause between chunks. Reds so far: t209 12/1 (maimed hop arms, zombie motion; red on 3d2b9 too per #3), t224 timed out (180 s).
- Open lead for ChatGPT GP-20129 (3P cursor shots miss the dummy): weaponAimPoint adds AIM_CHEST on ground aims; told it LATER.
- Claude 5 FYI: fakethree lacks getMaxScaleOnAxis, Quaternion.dot, Box3.setFromObject/distanceToPoint (permissive stubs): add them (my file) when there's a slot.
- Final gate before ~15:00Z with the Director: the tests of everything landed tonight on a fresh PC tree.

### Where things stand (claude2 #3, session 23:01Z-01:2xZ, Opus 5.5)
- Landed tonight, out for review (ready to commit): CB-325 rune pistol finish (index.html makeRunePistol; t173 12/0 cloud+native,
  pictures review/GT-20103), CB-327 note 13 birdshot 18 x 3.5 spread 0.16 (index.html WEAPON_STATS.shotgun, combat/ammo-types.js +
  test, tcb248 --review), CB-329 t334 AK card (29/0, --review).
- CB-327 still open: note 1 (Training 3P camera: walls' tall solids catch the overhead eye, 33% of spots/yaws, 21% pulled under half;
  fix = collide only with what the cutaway doesn't fade, ease the release; needs a loan of game/training-camera-collision.js pull()
  from ChatGPT/Director: asked 01:0xZ) and note 12 (no trigger pull in FP; the shotgun's slide-lock paddle behind the trigger is
  pressed on EVERY unloaded shell: Claude 5's VM_CONTROLS row, press on the first shell only; asked the Director). Then CB-328.
- GP-20124 / CB-326 (approved AFTER CB-327/328): (B) compile a new gun copy's multi-instance parts (revolver rounds, launcher inserts,
  chainsaw chain: three keys InstancedMesh count>1 by uuid) in an idle slice when the copy is made; (D) one spent case per caliber in
  the Training warm. Proof: per-gun first draw/shot gaps; no visible hitch at purchase. The 'warm at count 2' idea was measured and
  rejected (copies made after the entry). Numbers: Claude outputs/cb326/*.json. Cloud first eye draws: 0 node builds on 11/12 guns.
- Suite CB-243 (cloud, tree 3d2b9a623 = PC code at 23:02Z): chunks 1-5 done, chunk 6 (t207..) running 01:09Z, 16 chunks of the
  312 (all t*.js minus gate A, ChatGPT 2's 13 and Claude 6's pass B; lexical order, 20 a chunk). Reds so far: t14 flaky (random
  site, 2 of 4 red on this tree, 0 of 3 on da92ba276), t164 once (guardian head column; green on da92ba276 rerun), t173 (fixed:
  CB-325), t209 12/1 in chunk 6 ('arms out for balance' on the maimed hop: zombie motion; not yet checked on da92ba276), t106/t106b/t172/t178 (the cloud has no gh music). Nothing new from da92ba276 -> 3d2b9a623 (only index.html flash warm +
  TP flex cap, fakethree flag, t217). My cloud restarted once (00:2xZ): check processes; runner = /home/claude/runchunks2.sh,
  side jobs /home/claude/probe/queue.sh (jobs/*.sh, HOLD file between chunks). A fresh session rebuilds the cloud copy anyway.
- CE-9b (Claude 5) not landed yet: then rerun tce9 tcl334 tcl334b/c/d t240 tcb295 in the cloud on a fresh copy of the PC tree, tell the Director.
- The PC device shell has no Chrome: browser tests only in the cloud (or ask ChatGPT 2/Antigravity for native runs).
- Lent to Claude 8 (CH-1, 01:2xZ): gunEffects' laser lines, m240LaserBeam/laserImpacts setup, updateLasers, laserStop.
- LATER: ChatGPT 2's camera --inspect black PNGs on the 5080 (tools lane, review/GT-20104).

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
