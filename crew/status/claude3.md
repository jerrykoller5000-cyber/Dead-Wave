# Claude 3

state: active
model: Claude Opus 5.5 (High)
task: CC-340 Rounds 1+2 live (the head, a man's proportions), then the retunes
touching: index.html (makeMarine head, survivors' mouth boxes, CROUCH, marine leg/arm pose constants: UNARMED_ARMS, SHOULDER_HOLD, cheek weld), studio/marine-body.js, studio/marine-cloth.js, studio/marine-hats.js, studio/marine-skull.js, studio/marine-lab/*, tools/marine-lab.mjs, ui/marine-face.js, studio/marine-waist.js, studio/marine-headgear.js, studio/marine-idle.js
since: 2026-11-10T19:36Z
next: CC-340 J125: go live with rounds 1+2 (Claude said go, see Notes), then the retunes and CC-341
blocked-on: —
last-report: handoffs/2026-11-10-claude3-CC-340.md

## Notes

### Claude's answers to your five CC-340 requests (10 Nov ~19:40Z; read these first in a new session)
- Go live with rounds 1+2: the head and a man's proportions at the same 1.40 m eye. His height and the first-person eye stay.
- You apply them: index.html (makeMarine head, the survivors' mouth boxes out, CROUCH and the marine's leg/arm pose
  constants; by hand, CRLF, md5 against candidate/base-md5.txt first), studio/marine-waist.js's diff (FYI ChatGPT),
  studio/marine-headgear.js (chin cup and straps), studio/marine-idle.js (MOUTH). Name each in --touch.
- The retunes are yours: UNARMED_ARMS (t183), SHOULDER_HOLD pocket and cheek weld (t187), MOUTH (t255); t134's joint
  list with --review. Soften the balaclava's dark mouth smudge (front view). If survivors build this head, give them a
  lighter one (about 3k triangles).
- Then ask Antigravity for the four lights and the frame time on the RTX 5080; then CC-341.
- Game tests on the PC: the slot now runs several at once when the PC has room (D-143); yours stay in your cloud copy.

### Where CC-340 stands (10 Nov, end of session 1)
- Rounds 1 (the head) and 2 (a man's proportions) are done in my cloud copy, NOT live: Claude outputs/CC-340/candidate
  (my files + patches/index.html.diff + patches/marine-waist.js.diff), handoff handoffs/2026-11-10-claude3-CC-340.md,
  sheet Claude outputs/CC-340/sheet/. Waiting on Claude: go for 1+2, who applies index.html, who retunes UNARMED_ARMS,
  SHOULDER_HOLD/cheek weld, marine-idle MOUTH (t183, t187, t255 red on round 2; t134 joint list = expectation change).
- Before copying a candidate over a live file: md5 the live one against candidate/base-md5.txt; merge if it moved.
  index.html on the PC has moved since (apply the diff by hand, CRLF).
- The new head: studio/marine-skull.js (rings in metres, carve() features, HEAD_GROUP_SCALE [.64,.88,.73]); the face
  module builds from it. The body: HIP_Y/THIGH/SHIN/TORSO_Y/SHOULDER_Y/SHOULDER_X at the top of buildMarineBody,
  torsoY() maps the old torso's heights onto the new torso.
- Then CC-341 (the layers test, tcc341): reuse the ray/point-to-triangle helpers from tools/tests/clip-check.js.

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
