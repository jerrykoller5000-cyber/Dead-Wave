# Claude 3

state: active
model: Claude Opus 5.5 (claude-opus-5-5)
task: CC-343 part 3: stairs crouch-walk up, deck edge crouched, step tuned to treads at half speed (J141)
touching: index.html (legs + CROUCH/FOOT), studio/marine-body.js, studio/marine-turn.js
since: 2026-11-12T03:21Z
next: CC-343 (15:06Z: Jerry OK'd fresh sessions (15:03Z): back to Claude
blocked-on: —
last-report: handoffs/2026-11-12-claude3-CC-343f.md

## Notes

### Session 8: context nearly full, needs a new session (03:12Z)
- Fresh session: build a NEW cloud copy (the PC now has CB-310 STAIR_SPEED_SCALE 0.5 and my CC-343f guard), then
  (1) the crouch-walk-up 18.5-20 mm red: the clampBodyPose (CB-291) hip-flex suspect (see below); (2) the stairs step
  tuned to the treads at half speed, tcc343b at walk and sprint, a side filmstrip for Jerry; (3) the kit's J128 measure.
- Claude 2 FYI (requests.md 14616): with CB-310 alone tcc343b stays 30/7 (values moved); mine was measured without it.

### Where things stand (12 Nov 02:40Z, session 8, Opus 5.5)
- LANDED 00:54Z tcc341's last red (handoffs/2026-11-12-claude3-CC-343e.md): tcc341 16/0.
- LANDED 02:38Z CC-343 part 3 (A) the boots' last guard + stairs drop (handoffs/2026-11-12-claude3-CC-343f.md, patch343f/g.py):
  tcc343b 35/2. Left: stairs crouch-walking up 18.5 mm in; deck edge crouched facing off 35.6 over / 56.3 not flat.
- KEY FINDING: the legs are posed BEFORE the frame's ground snap (index.html ~68364, after updateMarinePose): anything that
  measures the soles at pose time must add lag = rootGY - root.y (footGuard does). Moving the body by the lag is WRONG (tried).
- NEXT (Jerry chose C, J141): when Claude 2's CB-310 (STAIR_SPEED_SCALE 0.5) lands, tune the step so a boot lands on each
  tread (stride = tread 0.286 m), tcc343b up/down at walk and sprint, side filmstrip for Jerry. Meanwhile the kit's J128
  (item 3): found unarmed kit run: arm swing sleeve 4.7 mm into the cummerbund side (x -.18), the swing is Claude 2's.
- PAUSE (02:20Z, Jerry playing): no PC game-file edits or runs until the Director's RESUME. I edited index.html at 02:26Z
  by mistake (told the Director, request 'I edited index.html during PAUSE'; my pick: leave it).
- Crouch-walk up 18.5-20 mm: tzc3cw.js (cloud) shows the guard's soles on the treads at pose time but the lead boot 20 mm
  in after the frame: suspect clampBodyPose (CB-291) clamping hip flex (125 deg) after the pose; ankle sits at -0.86.
- Probes (cloud only, never to the PC): tools/tests/tzc3st2.js (tcc343b with per-frame log for the stairs),
  tzc3probe.js (tcc341 shirt<vest with part names). Pictures: Claude outputs/CC-343e/c3render/ (tzc3dump.js /
  tzc3stdump.js dump the posed geometry; c3render-index.html + -shoot.mjs into <tree>/_c3render/ as index.html, shoot.mjs:
  node _c3render/shoot.mjs <log> <outdir> b|a '<views json>' (cam.rel = target relative to the dumped root); sheet.py).
- Cloud copy: tar on the PC to $HOME/w, cp into "_DELETE ME/", stage, untar in /home/claude/tt; include assets/intro (no mp4)
  or TT never boots. node imports of studio/*.js need a 'three' shim in node_modules. A full tcc343b is ~8 min here.

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
