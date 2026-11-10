# Claude 3

state: active
model: Claude Opus 5.5
task: CC-343 First person: his body turns with the view (AG-288 find 1): find what stops the turn at the range console, make FP hold; a test at the console and a wall, pitched -37/-60
touching: index.html (player turning), index.html (first-person body), tools/tests/tcc343.js (new)
since: 2026-11-10T23:17Z
next: CC-341 J128 (Jerry, 10 Nov, standing, D-140; was CL-341): the marin
blocked-on: —
last-report: handoffs/2026-11-10-claude3-CC-341.md

## Notes

### Where things stand (10 Nov ~22:45Z, end of session 2: context nearly full, needs a new session)
- CC-340: live on the PC, checked out --done --review. Antigravity owes the four lights and the frame time (said LATER).
- AG-288 find 1 (the Director's URGENT): checked, not from CC-340 (same on the pre-CC-340 tree): 0.4 m from the range console
  his body won't turn to face it (player.rotation.y stays put) while the first-person view turns, so the eye looks back over
  his pack. Sent to the Director for Claude 1 / Claude 2 (shot: Claude outputs/CC-340/AG288-find1-check.jpg). On the way I
  applied FP_EYE in metres (index.html firstPersonEye: the new head's scale had moved the FP eye 2.5 cm back): LIVE, my pick,
  the Director may still say Claude 1 should own it. The file before it: Claude outputs/CC-340/before-live/index.before-fpeye.html.
- CC-341 (checked in, just started): nothing changed yet but FP_EYE. Plan: tools/tests/tcc341.js poses him (stand armed and
  unarmed, walk, run, crouch, crouch-walk, aim, reload, jump) and checks each layer pair (skin < shirt < vest/carrier, shirt <
  belt/pouches, glove cuff < sleeve, head < balaclava < helmet, trousers < boots) for any vertex > 0.5 mm through, reusing
  rayHits/distTri from tools/tests/clip-check.js. Most of the body is one baked 'rig-skin' SkinnedMesh per material group
  (RIG_SKIN, bakeRigSkin): read posed vertices with mesh.getVertexPosition(i, v) then localToWorld; open shells need the
  nearest-face signed distance, not the ray parity. The in-game mesh list and its probe: Claude outputs/CC-341/.
- Then CC-342 (after CC-341).

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
