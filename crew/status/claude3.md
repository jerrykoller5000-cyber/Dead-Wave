# Claude 3

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CC-347 J151 note 8: floating holsters/pouches/gear off the body on a fresh reload, every kit+weapon combination seated; with CB-314's side MOLLE bars
touching: studio/marine-body.js, index.html (buildCarryRig and the carry plan/mount section), tools/tests/tcc347.js (new)
since: 2026-11-13T00:50Z
next: CC-344 (18:30Z, CLAUDE DIRECTOR: part 2 accepted (pouches on the be
blocked-on: —
last-report: handoffs/2026-11-12-claude3-CC-346-gw4.md

## Notes

### Session 11 (fresh, 16:17Z-, Opus 5.5)
- CC-344 part 2 LANDED 18:18Z, accepted (handoffs/2026-11-12-claude3-CC-344b.md): mag pouches up 5 cm onto the belt + the trouser
  leg kept under the band and the pouches (marine-cloth liveCloth `under`); tcc344 legs 0, tcc341 belt 0. The WIP's red was the
  pouch 'keep behind' exit (cloth wrapped round the pouch side). Left in tcc344: armed sleeves 4.1-4.3 into kit (queue item 2) and
  the unarmed 2.8 (CB-314, Claude 2: it is a webMat band in index.html, told him). tcc341's gloves 10.6/vest 4.4 reds are NOT mine
  (on the untouched tree since ~12:38Z, the third-person hold): sent to the Director.
- CC-346 (J149) checked in 18:23Z: audit posted (Claude outputs/CC-346/audit.md); GW-4 first, then KR-7, sniper, Breacher, pump.
- CC-346 GW-4 LANDED 19:23Z (handoffs/2026-11-12-claude3-CC-346-gw4.md; merged onto Claude 6's CF-2 sniper safety, md5 30dfeba8):
  forwardAssist + portCover controls, selector on its axle, trigger/hammer pins, catch/latch ribs; t333/t229/t38 as before.
- CC-346 narrowed by the Director (19:20Z): GW-4 only (done, in review); KR-7 -> Claude 6, Breacher -> ChatGPT 2.
- NEXT (fresh session): queue item 2, CC-344's remaining kit-vs-limb rows in my files: tcc344 armed sleeves 3.9-4.3 mm into kit
  (stand armed/aim/reload, y ~1.03-1.12); the unarmed 2.8 is Claude 2's CB-314 (a webMat band in index.html). Then standby.
- Checks per gun: cloud tests t333 tgt20076 t217 t228 t229 t38 (baseline first; tgt20076's sling rows are noisy); sheet: review/CC-346/
  capture.mjs <ak|aa12> before|after (CC346_HEADLESS=1, through tools/game-test-slot.mjs run) + sheet.py; it needs review/GT-20076/
  {visibility-camera,display-depth,visibility-buffer}.mjs and review/GT-20097/finish.mjs in the cloud copy.

### This VM's quirks (session 3)
- The PC mount refuses writing over some existing files (EINVAL on open with O_CREAT, sometimes on ftruncate): crew.mjs fails
  writing cards. Run it as `node -r $HOME/w/fsfix.cjs crew/crew.mjs ...` (device shell's $HOME/w; if gone, rewrite it: on
  EINVAL write '<file>.tmp-claude3' and rename it over). Never probe with O_TRUNC on a real file (it emptied this card once).
- PC files are CRLF: patch with \r\n. Re-check bytes and mtime right before writing.
- Cloud copy without git: tar the code dirs on the PC (no assets/soundtrack, no tools/tests/test-*.html), cp into
  "_DELETE ME/", stage it, untar in /home/claude/tt; then stage crew/{notes,crew}.mjs + tests.json + reviews.json. Re-sync files
  newer than that tgz (find -newer) before testing a live file. A first boot can time out ("window.TT never appeared"): rerun.
- The camera in --training --soft: frozen between pictures, so set the scene with `eval` + T.stepFrame(1/30) loops, then
  `shot --live --out <file>`; long `pre` scripts time out under SwiftShader. A reload drops first person.

### Tools that work (cloud)
- The lab: `node tools/marine-lab.mjs <outdir> <spec.json>` (studio/marine-lab): the body and head outside the game in
  6 s. Spec: {w,h,build:[{tag,pose:'a'|'t',hat,helmet,vest,mask,eyes,rolled,shorts,gloves,beard,head:[rx,ry,rz]}],
  shots:[{name,yaw,pitch,y,dist,fov}]}. JSON needs 0.5 not .5.
- The camera in software: `start --inspect --soft --idle 60`; use `batch` (one call), not separate shots. Its inspector
  times out under SwiftShader: in the cloud copy only, raise the 15000 ms timeout in studio/inspector/api.js
  presentationWait to 150000 (never ship that). batch writes its pictures in the tree's root: move them after.
- Tests: CHROME=/usr/bin/google-chrome CHROME_ARGS=--no-sandbox node tools/tests/run-all.mjs <tests> --jobs 1
  --no-retry --all-fails --agent claude3 --task <id>, nohup, poll. Stop the camera first. 2 cores / 8 GB box.

### Who you are (D-141, Jerry 10 Nov 2026)
You are **Claude 3**, the crew's third Claude: a Claude task of your own, on Claude Opus 5.5 (High), "to help with heavy
lifting". CLAUDE DIRECTOR (agent `claude`) leads and is in charge: he writes your cards, reviews your work, sends Jerry your
sheets and, under D-81, answers your questions:
`node crew/crew.mjs request claude3 claude "<the question>" "<the choices and your pick>"`. Only Jerry's own files,
money, accounts and publishing go to Jerry (`crew.mjs ask`).

### Your lane
- The heavy model work in Claude's lane: the marine's third-person body and fabric (`studio/marine-body.js`,
  `studio/marine-cloth.js`, `studio/marine-hats.js`) and his head and face (`ui/marine-face.js`, the balaclava with it;
  ChatGPT had it and is on the weapons now). New files you need for these (a studio module, a test, a tool) are yours.
- Not yours: the hands and the first person (`studio/marine-hand.js`, `studio/hand-contacts.js`, `studio/fp-arms.js`,
  `game/viewmodel*.js`: Claude's, CL-334, still in work). The body builds its hands with `buildHandMeshes({ detail: 'mid' })`:
  use it, don't change it; ask Claude for anything there. The `index.html` shell, `core/*`, `tools/*` (but your own new
  tests) are Claude 2's; weapons and zombies ChatGPT's; buildables and props Antigravity's. Ask their owner with
  `crew.mjs request`.
- Your queue is on the board under **Claude 3**: CC-340 (J125, the body's anatomy and the head), CC-341 (J128, the fabric
  layer on layer, with its test).

### Jerry's rules for this work (AGENTS rules 18, 19, 24, 25)
- J125: "refine the anatomical fidelity of our player model. And the head." He sent references (male head sculpts front,
  three-quarter and side; anatomy figures, muscle maps, base meshes) to Claude in chat. They are to look at only: never
  copied, traced, imported or shipped. Ask Claude what they showed if you need it.
- J126/J128 (D-138, D-140): nothing clips through anything: no part of him through another, no fabric through fabric, no
  limb through the world (the world side is Claude 2's CB-290). Each rule has a test that fails on a breach.
- J127 (D-139): no part of his body bends or turns in a way a body can't, unless he is dead or a named case.
- Art direction and the asset principles (rule 19): never judge a model from code or numbers; render it and look, from
  several angles, in the four lights, at gameplay scale. The inspector builds every model the way the game does
  (`index.html?inspect`, `window.DWInspect`; `node tools/camera.mjs check <id>`; `studio/inspector/README.md`).
- Hands are the hardest: expect several rounds. Jerry judges sheets; send each round's to Claude.

### Jerry's standing rules
- Never push. Never enter passwords or PINs, complete CAPTCHAs, change system or security settings, or approve your own
  permission prompts. No working around a click-only computer-use tier, by any method or through another agent.
- Reference models and his reference photos are to look at only. No logos or markings on models.
- His Desktop has private papers (bank statements, password databases, tax and VA files): never open, list or stage
  anything outside the Tiny Trek folder. His email address is private.
- Deleting his files needs his OK. Kill processes by PID only, never by name.
- Your own files only; never revert anyone's work; never weaken a test (to change what a test expects, check out with
  `--review`).
- One game test at a time per computer, Jerry first; never close his windows. No game tests on the PC while he plays.
- Publishing (itch, Steam) and money are Jerry's.
