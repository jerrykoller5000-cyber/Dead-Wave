# Claude 3

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CC-343 tcc341's vest-over-shirt red (7.5 mm), then part 3 stairs gait + marine-turn boot + sandbags, then the kit's J128
touching: studio/marine-body.js, studio/marine-cloth.js, index.html (legs + CROUCH/FOOT scratch), studio/marine-turn.js (apply, turnBoot, crouchSole: loan)
since: 2026-11-12T00:13Z
next: CC-343 (15:06Z: Jerry OK'd fresh sessions (15:03Z): back to Claude
blocked-on: —
last-report: handoffs/2026-11-11-claude3-CC-343d.md

## Notes

### Where things stand (11 Nov 21:45Z, end of session 7: context nearly full, needs a new session)
- CC-343 part 2 LANDED 21:30Z (handoffs/2026-11-11-claude3-CC-343c.md; Claude outputs/CC-343c/patch343c2.py + patch343e2.py;
  the plain patch343c.py/e.py there are stale). tcc343b 30/7, t184 29/0. AG asked for the 5080 after-shots (review/CC-343c): review them.
- tcc341 sleeve over the glove LANDED 21:43Z (handoffs/2026-11-11-claude3-CC-343d.md, patch341s.py): tcc341 15/1.
- NEXT: the vest-over-shirt red (7.5 mm kit crouch; 4-6 mm other kit poses) at the front plate's outer corner x .16-.18, z .17-.25:
  the shirt shows in the gap between the plate (.35 wide at z .151) and the cummerbund panel (x .169, depth .22). Widen the plate
  or deepen the panel AND move torsoG.userData.carrierShape (carrierClearance: Claude 2's hold) with it; tell Claude 2.
- Then CC-343 part 3 (a stair-stepping gait; marine-turn's boot one tread up at stairs 0.2 facing down; deck edge crouched;
  sandbags 5.2 mm) and the kit's J128. Asked the Director 21:35Z which first (my pick: tcc341, then part 3).
- The cloud camera --match --soft never loads (twice): pictures from Antigravity (D-164).
- 21:55Z: AG's review/CC-343c sheets reviewed: deck edge standing OK in 4 lights; crouched facing off the edge, the front boot steps down onto the ground below the deck (looks like a step down; part 3).

### Session 6 notes (18:12Z)
- CC-343 (CB-290's legs) PART 1 LANDED 18:05Z, card open: handoffs/2026-11-11-claude3-CC-343b.md. index.html (legs + CROUCH/FOOT
  scratch) and studio/marine-turn.js (lent) patched by Claude outputs/CC-343b/patch343.py + patch343turn.py (anchored; the
  files before are beside them). New tools/tests/tcc343b.js: 29/37 (was 10/37). Regressions clean (tcb291 3/0, tcb289 5/0,
  t184 28/1 better, t187/t229/tcc341 the same reds as before).
- Left on CC-343: stairs walking DOWN 228 mm in; stairs 0.2 standing facing down 298 mm over (marine-turn footing);
  crouch-walk up 45 mm; deck edge crouched 36 mm over/56 off flat; deck edge side-on 26 off flat; stairs 0.7 crouched
  17 mm over; flat crouch-walk 8.6 mm; t184 slide 40%. PICTURES NOT TAKEN: the cloud camera (--match --soft) never finished
  loading in 20 min; batch maker Claude outputs/CC-343b/mkbatch.py (target player, yaw 65, pitch 18, dist 2.7; overcast
  = T.weather.raining). Try --training or ask Antigravity for the 5080 shots.
- Test tips: tcc343b holds the game (T.flightHold) and steps T.stepFrame(1/30); face with T.setAimYawDbg (the mouse aim is
  off with no pointer); marine.userData.feet = {on, lift, [L,R] offsets} from the feet pass. In fakethree the Euler does
  not follow quaternion writes (read quaternions). Cloud: DW_CHECK_MS=1500000 (the test is ~450 s there).
- Then: tcc341's two cloth reds, then the J128 kit card.

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
