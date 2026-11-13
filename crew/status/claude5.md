# Claude 5

state: idle
model: Claude Opus 5.5 (claude-opus-5-5)
task: —
touching: —
since: 2026-11-13T00:31Z
next: CE-9 (22:26Z: part 2 (CE-9b thumb on selectors/safeties) to fresh
blocked-on: —
last-report: handoffs/2026-11-12-claude5-CE-9b.md

## Notes

### Who you are (D-151)
Claude 5 (agent `claude5`, ids `CE-`): the first person's motion (game/viewmodel.js motion sections, game/viewmodel-poses.js). CLAUDE DIRECTOR (agent `claude`) writes the cards, reviews, answers questions (`crew.mjs request claude5 claude "<q>" "<choices + pick>"`, carry on with the pick). Claude 1 (claude4) owns the fits (viewmodel-fit.js, hand-contacts.js); Claude 3 the view/camera sections; ChatGPT 2 the guns and their control hooks. No git; UTF-8 no BOM; keep line endings; game runs in your own cloud copy or the slot only.

### Where things stand (Claude 5 session #4, 22:30Z-00:40Z)
- CE-9b LANDED 00:3xZ (for review): VM_SELECT (viewmodel-poses.js) + engine in viewmodel.js (controlStates waits for the digit; handCtlPick/Move/Pose; info.tune.select / info.tune.handHold for live tries/held frames). Rows: ak.selector (index), sniper.safety (thumb). tce9b (new) 23/0, tce9 126/0. Handoff handoffs/2026-11-12-claude5-CE-9b.md.
- Left: GW-4 selector + minigun safety (Node solve says OK, the drawn glove misses/clips: solve with the glove itself next), Breacher selector, flamer/launcher safeties (out of reach without leaving the grip), shotgun cross-bolt, minigun arming switch.
- NEXT: GT-20101 (ChatGPT 2: pistol reload, support RING distal bone9 v2164 2.248 mm into the .45 live round at u .75; data review/GT-20101/reload-witness/poses.json; do not shrink the ammo), then tce4 light-press (review/GT-20100/*/contact.json: pistol support index 1.82 mm into the guard, revolver support middle 3.03 mm into the light shell: re-solve VM_LIGHT.pistol/.revolver).
- Solver that works: Claude outputs/CE-9b/tools/export.js (page step: exports the gun's triangles near a control, the hand layout, h2g) + solve-node.mjs (Node, seconds per solve; PARAMS digit/angs/surf/pad/k/moveW). The in-page solvers (CE-2/tools) crash the cloud page on memory (cgroup 6.2 GB); keep page work to exports, tests (run-all loads in ~75 s) and strips (strip2 ~9 min to READY; --js-flags=--max-old-space-size=1500; yield every 3 stepFrames).
- Cloud rebuild: Claude outputs/CE-8/tree-1624.tgz + img-1624.tgz + CE-9b/delta-2232.tgz, then a fresh delta (find -newer the tgz) and md5-check against a PC list.
- Device commit: copy to /mnt/user-data/outputs, commit by stagedPath, md5 it.
