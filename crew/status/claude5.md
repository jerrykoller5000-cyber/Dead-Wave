# Claude 5

state: active
model: Claude Opus 5.5 (unsure of effort level)
task: CE-2 the hands at work, the pistol then the GW-4: the trigger finger pulling each shot, the fire selector and controls worked by the fingers, the slide racked in view
touching: game/viewmodel.js (the action cycle and the firing hand's finger motion in update), game/viewmodel-poses.js (action poses)
since: 2026-11-11T00:06Z
next: CE-2 (was CD-3) (was CL-336) J103, J110, J112, J114-J116, J119, J
blocked-on: —
last-report: handoffs/2026-11-11-claude5-CE-1.md

## Notes

### Who you are (D-151, Jerry 10 Nov 2026)
You are **Claude 5** (agent `claude5`, task ids `CE-`), a Claude task on Claude Opus 5.5 (High). Jerry moved to a bigger plan
and let CLAUDE DIRECTOR (agent `claude`) add an agent: you take **the first person's motion** from Claude 1 (agent
`claude4`), whose queue was the longest on the board. CLAUDE DIRECTOR is in charge: he writes your cards, reviews your
sheets before Jerry sees them and, under D-81, answers your questions:
`node crew/crew.mjs request claude5 claude "<question>" "<choices and your pick>"` (then carry on with your pick, rule 15b).

### Your lane
- In `game/viewmodel.js`: the motion (the trigger pull each shot, the controls worked by hand, the actions driven by
  ChatGPT 2's pose hooks, the reloads, the ammo change's unload and load, the other actions, unarmed and the ladder),
  and `game/viewmodel-poses.js`'s action poses. By section: Claude 1 keeps the hold and fit code there (VM_FIT reading,
  contacts, the wrist), and Claude 3 has the view code for CC-342 (the optics' recoil, the laser, the scope-in). Name
  your sections in --touch; agree a shared one with its owner first.
- Your start pose is Claude 1's fit for each gun (game/viewmodel-fit.js, studio/hand-contacts.js: Claude 1's). Your
  motion must keep J126 (no part of the hand through another or through the gun: tcl334, tcl334b/c/d, every frame you
  add) and J127 (no joint past its limits: the rig clamps; check your keyframes against JOINT_LIMITS).
- ChatGPT 2 (agent `chatgpt2`) makes each gun's controls separate moving parts with pose hooks (`userData.controls`) and
  the actions (`doubleActionPose`, `recoilBoltPose`); Claude 2 (agent `claude2`) builds the ammo system (CB-294) and
  gives you its unload/load hook. Antigravity (agent `antigravity`) shoots your work in the four lights on the RTX 5080.

### Your queue (the board, under Claude 5)
CE-1 (the actions driven in the shots), CE-2 (the hands at work: the trigger finger each shot, J110 fire selection,
J130 every safety, selector, charging handle, bolt catch, slide stop and pump worked by hand), CE-3 (the reloads
redone, J76-J83, and J133's unload-then-load on an ammo change), CE-4 (the other actions: blades, the throw, the
mortar, building, the ladder), CE-5 (no gun: unarmed, the ladder). Gun by gun, the pistol and the GW-4 first (both
have their controls hooked: ChatGPT 2's 22:22Z FYI).

### Jerry's words for this work (docs/jerry/2026-11-09-playtest-notes.md)
- J103 "Do not see hand racking slide for reload, need to see ... Trigger finger needs to be in actual trigger guard when
  firing"; J110 fire selection "Needs animation and manual manipulation by player fingers for each weapon"; J112 the
  Uzi's "trigger finger is clipping through the trigger guard and not actually pulling the trigger"; J130 "Make sure
  safety's, selector switches, and actions on guns are physically manipulated by player"; J133 "If the player changes
  ammunition types he will first have to unload the current ammunition and put in the new ones."
- Rule 19: judge by looking at it at the eye, in motion, in the four lights; frame strips or clips as proof.

### How you work
- The repo is `C:\Users\Zero\Desktop\Tiny Trek` on Jerry's PC (`$HOME/mnt/Tiny Trek` in the shell on his computer). Heavy
  work and game tests in your own cloud copy of the repo, one game at a time; on the PC only through the slot
  (`node crew/crew.mjs slot run claude5 <task> --checks "<what>" -- <command>`). UTF-8 without BOM; keep line endings.
- `node crew/crew.mjs me claude5` each session; check in with `--model "Claude Opus 5.5 (High)"` and `--touch`; out
  with `--report handoffs/YYYY-MM-DD-claude5-<task>.md`. Rule 15b: the heartbeat (`crew.mjs note claude5 "..."` every
  15 minutes, then answer what it lists), the next card at once, `standby` when nothing can start.
- No git, ever. Never push, never enter passwords or change system settings. Stay inside the Tiny Trek folder. Your own
  files and sections only; never revert anyone's work; never weaken a test (`--review` to change one).
