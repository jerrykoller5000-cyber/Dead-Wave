# Claude 3

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CC-352 pack handgun stations to the pack's back-face low corners (Director's pick b), re-sweep
touching: studio/marine-carry.js, index.html (carry part)
since: 2026-11-14T04:06Z
next: CC-348 J151 P3 (D-179), notes 11, 20, 42, 44 (the pump and the snip
blocked-on: —
last-report: handoffs/2026-11-14-claude3-CC-351.md

## Notes

### Session 13 (fresh, 00:53Z- 14 Nov, Opus 5.5): CC-350 p2, KR-7 stud, CC-351
- Cloud tree /home/claude/tt from repo5 (00:58Z PC); repl: review/CC-350/repl.mjs through the cloud slot
  (node tools/game-test-slot.mjs run claude3 CC-350 -- node review/CC-350/repl.mjs). In-page module swap for quick looks:
  await import('/studio/marine-carry.js?v=<new>') then re-seat (probe reseat.js); index uses the boot-time module.
- Director picked (b) for two bulky slung guns: tight stack (PAIR_CARRY.mode 'stack'); the saw lies on its BOTTOM (CARRY_FACE).
  Bulky+thin: thin first flat on the pack, the bulky one on it. Pair limits: lowest .66 (mid-thigh), slide to the tightest air.
- tcc347 strap rows fixed (FRONT_NB 2 cm, no chest lift over the shoulder, strap above the 40 mm bandolier: BAND_ABOVE).
- tcc347's 10 holster rows (pistol shell lowest third 4.2) were red on the untouched tree too (the bigger pistol, GT-20106):
  HIP_FIT y .87 / splay .1 / n [.36,-.933] in index (patch review/CC-350p2/cc350p2_pairs.py, md5-free exact-text patch).
- KR-7 front ring on GT-20106's stud (+x only: SLING_STUD_SIDE/SLING_WRAP, the strap wraps the handguard top when +x faces out).
- CC-351: PGB shoulder patch + right placeholder and the chest flag patch (shirt + carrier) removed in marine-body.js.

- 03:00Z LANDED + checked out: CC-350 p2 (handoffs/2026-11-14-claude3-CC-350p2.md) and CC-351 (…-CC-351.md); review request sent
  with the 4-light sheets (review/CC-350/sheet-cc350p2-*.jpg, review/CC-351/sheet-cc351-patches.jpg).
- CC-352 (IN, open): note-20 3P clipping sweep. Probe = cloud /home/claude/sweep*.js (gun triangles hashed vs sleeve/arm/hand/leg/
  seat/boot/held-gun vertices, 6 stances x 5 frames; rebuild it if the cloud box is gone). Result: all clear except the pack-side
  handgun stations (Uzi first) brushed by the sleeve in run/crouch; moving them 2-3.5 cm back / 5-8 cm down didn't clear it.
  Asked the Director (a) thigh first, (b) pack BACK-face low corners [my pick], (c) leave. Do his pick, then re-sweep with
  CE-12 part 2 when Claude 5 lands it.
- Pending reviews: CC-350 p2 + CC-351 (Director). Open on tgt20076: flamer slot2 rear ring 1 pair (pre-existing).

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
