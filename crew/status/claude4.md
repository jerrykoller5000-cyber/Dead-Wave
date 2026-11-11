# Claude 1

state: active
model: Claude Opus 5.5
task: CD-1 CD-1 pass 2: launcher firing hand, two-hand holds, chainsaw export, shotgun bead, AG-286 notes; the wrist's radial/ulnar sign (poseArm)
touching: game/viewmodel-fit.js, studio/hand-contacts.js, tools/handfit/, game/viewmodel.js (poseArm wrist)
since: 2026-11-11T00:38Z
next: CD-1 (was CL-334) J101: a new, detailed hand (first and third per
blocked-on: —
last-report: handoffs/2026-11-10-claude4-CD-1.md

## Notes

### Who you are (D-145, Jerry 10 Nov 2026)
You are **Claude 1** on the board (agent `claude4`, task ids `CD-`; Jerry named you, D-146), the crew's fourth Claude: a Claude task of your own on Claude Opus 5.5 (High). Jerry made CLAUDE DIRECTOR (agent `claude`) the game
director so he can plan, review and keep the crew moving; you take the heavy work he was doing:
**the hands and the first person**. Claude is in charge: he writes your cards, reviews your sheets before Jerry sees them
and, under D-81, answers your questions: `node crew/crew.mjs request claude4 claude "<question>" "<choices and your pick>"`
(then carry on with your pick, rule 15b). Only Jerry's own files, money, accounts and publishing go to Jerry.

### Your lane
- `studio/marine-hand.js` (the hand: bones, skin, the glove, handClipReport, the poses), `studio/marine-hand-bake.js`,
  `studio/hand-contacts.js` (generated), `studio/hand-grips.js`, `studio/fp-arms.js` (the arms and sleeves in first
  person), `game/viewmodel.js`, `game/viewmodel-poses.js`, `game/viewmodel-fit.js` (generated: VM_FIT), `tools/handfit/`
  (Claude's fitting scripts: **read its README first**), `tools/hand-bake.mjs`, `tools/hand-detail.mjs`,
  `tools/handshot/` (never copy `tools/handshot/_cloud/` to the PC); tests t240, tcl334, tcl334b/c/d,
  `tools/tests/clip-check.js`; `docs/fps/hand.md`.
- Lent out: game/viewmodel.js's view code to Claude 3 for CC-342 (the optics' recoil, the laser's bend, the scope-in):
  agree the sections with it. The third-person body builds its hands with `buildHandMeshes({ detail: 'mid' })`: Claude 3
  uses it, you keep it working.
- Not yours: the guns' models (ChatGPT 2: tell it when a hand needs room, as GT-20078 does), the body and head (Claude 3),
  index.html's shell, core/* and tools/* except yours (Claude 2), props (Antigravity), zombies and UI (ChatGPT).

### Since D-151 (10 Nov ~23:00Z)
Claude 5 (agent `claude5`) takes the motion: CD-2 is CE-1, CD-3 is CE-2, CD-5 is CE-3, CD-6 is CE-4, CD-7 is CE-5. You keep the fits (CD-1) and the eye pass (CD-4), the hand and its contacts. Your fits are its start pose: tell it when one lands.

### Your queue (the board, under Claude 1)
CD-1 (the hands on the guns, now), CD-2 (ChatGPT 2's actions in the shots, the KR-7 and Breacher refits),
CD-3 (the hands at work: the trigger finger pulling each shot), CD-4 (the eye pass, gun by gun after GT-20077),
then CD-5 (the reloads), CD-6 (the other actions: blades, the throw, the mortar, building, the ladder),
CD-7 (no gun: unarmed, the ladder). Guns in this order unless Jerry says: the pistol, the GW-4, the shotgun, the
KR-7, then the rest. For each gun: fit, test (tcl334b/c/d), then ask Antigravity (AG-286) for the four lights on the RTX
5080, then a sheet to Claude.

### Where the hands stand (Claude 4, 10 Nov ~23Z, CD-1 pass 1: handoffs/2026-11-10-claude4-CD-1.md)
- Rule 2 passes for every gun but the launcher (17.7 mm: the firing hand's back is in the receiver; my wrap start, c4/wrap2.js
  on part 43, put the palm the wrong side). Support hands wrap the handguards now. Two-hand holds still overlap: pistol 23.8,
  revolver 9.1 mm (tcl334b). Chainsaw: the test is clean but my export reads 20.9 mm (find why). tcl301 fails before and after.
- Tools: tools/handfit/README.md, section "Claude 4's pass": export from the suite page (c4/mkpage.mjs + c4/fptune4.mjs, fast),
  fields c4/sdf_c4.py (fixed: multi-body parts, 10 um corners), check c4/depth2.py (= clip-check.js), wraps, apply7, merge.
  Looking: tools/handfit/look/shoot.mjs. The cloud copy has to be made again each session (tar from the PC, ~50 MB).
- Launcher tried again (23Z): the hand has to move ~32 mm back off the grip before the palm is clear, and then the fingers
  close on nothing (30+ mm from any part): the hand is turned wrong for that grip, not just placed wrong. Start from the
  grip's own axis and side (studio/weapon-heavy.js ~366, 36 x 48 mm) or ask ChatGPT 2 (GT-20078) where the grip sits now.
- Next: the launcher's firing hand; the two-hand holds (c4/augment.py: the firing hand as a part); then CD-2.

### CD-1 pass 2 (11 Nov ~00-02Z, in progress; the cloud copy has it, nothing merged to the PC yet)
- Why hands came out turned: the game rolls each hand round its grip channel toward its elbow (twistToward, up to 0.6 rad):
  a fit's roll is the elbow's unless the twist is at its limit. tools/handfit/c4/applyoff.py applies a solve without the
  page (the page OOMs iterating: ~4 GB, the cloud's limit ~6.2 GB: run exports alone, nothing beside them) and carries the
  twist when it's at its limit (ROLL=1 holds a wanted roll there). drawn.py: hand as drawn vs VM_FIT (needs info.gunMw:
  c4/g9-steps.json exports with it and only the parts near the hands). augment2.py: the firing glove made closed.
  keepout.py / keepout_sight.py: keep-out boxes (trigger guard openings; the shotgun's sight line). transfer.js/mktransfer.py.
- Done in the cloud: launcher r 17.7 -> 0.65 mm (set from the pistol's hold on the same grip moulding, then solved);
  pistol r lower, middle finger out of the guard (Claude 5's CE-2 note), index straight for VM_TRIGGER; shotgun r clean
  (the revised stock's grip is closed now: was 10.7 mm); shotgun l under the sight line aimed (bead; ChatGPT 2's note);
  revolver r up/forward for the trigger (Claude 5's note); chainsaw r: really 15-20 mm in its rubber rear grip block (the
  test missed it by order: tcl334d takes it after the flamer), refit round the block. poseArm radial/ulnar sign fixed
  (Claude 2's proof) in the cloud copy only.
- 02:45Z: also refitted in the cloud: pistol l (round the new firing glove), m4 r+l (the revised GW-4: firing thumb was 14 mm
  in, support palm 8 mm), ak r and sniper r and revolver r with the index pad pulled to the trigger face (c4/fitT.sh, tgt.py,
  kojson.py; gun/gungrip3.mjs has KOGRID/TGT/NOX/XT): KR-7 0.8 mm, GW-4 0.5, sniper 5, revolver 10 (was 29). Breacher and
  shotgun trigger-reach fits came out worse: kept. Cloud state: /home/claude/ex*/ (gone with the box), VM_FIT in the cloud copy.
- Left: revolver l round its new firing hand; contacts (cont9.sh/encode9.mjs) for every refitted hand; tests;
  merge to the PC (VM_FIT hands only, hand-contacts, the poseArm 2-line change by a read-modify-write); sheet; tell Claude 5
  (re-solve VM_TRIGGER on pistol, revolver, shotgun, launcher, chainsaw). Then AG-286's two notes, CD-4 (aimed eye, stock).

### Jerry's rules for this work
- J126 (D-138): no part of the hand through another, no part of the hand through any part of a weapon, no part of the
  arms or legs through any game object. J127 (D-139): no joint bent or turned past what a real one can. J128 (D-140): no
  fabric through fabric (the glove inside the sleeve), nothing floating. Each rule has a test that fails on a breach.
- Rule 19: never judge from numbers; look at it at the eye, in the four lights. Reference photos and grip photos are to
  look at only: never copied, traced, imported or shipped.
- D-144: the Training Ground only until Jerry is satisfied.

### How you work
- The repo is `C:\Users\Zero\Desktop\Tiny Trek` on Jerry's PC (`$HOME/mnt/Tiny Trek` in the shell on his computer).
  UTF-8 without BOM; keep each file's line endings (index.html CRLF, the studio and game files LF).
- `node crew/crew.mjs me claude4` each session; check in with `--model "Claude Opus 5.5 (High)"` and `--touch`; out with
  `--report handoffs/YYYY-MM-DD-claude4-<task>.md`. Rule 22: a card is one line, a handoff is short. Rule 15b: take the
  next card when one is done.
- Heavy work (exports, distance fields, fits, strips) in your own cloud copy of the repo, one game instance at a time. On
  the PC, game tests only through the slot: `node crew/crew.mjs slot run claude4 <task> --checks "<what>" -- <command>`.
- No git, ever (rule 6): Claude writes the commit jobs. Never push, never enter passwords or PINs, complete CAPTCHAs or
  change system settings. Stay inside the Tiny Trek folder (Jerry's Desktop has private papers: never open them).
  Deleting his files needs his OK; kill processes by PID only. Your own files only; never revert anyone's work; never
  weaken a test (`--review` to change one).
