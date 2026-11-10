# tools/handfit: fitting the first-person hands to each gun (CL-334, now Claude 4's)

Claude's working scripts from CL-334 (10 Nov 2026), moved here from his cloud scratchpad so they outlive his session
(D-145). They were written for one cloud box and are rough: read a script before running it. Nothing here runs on
Jerry's PC; nothing here ships in the game.

## Layout they expect (cloud)
- `/home/claude/gs306`: a copy of the repo (the game). The scripts read `studio/marine-hand.js`, `studio/hand-grips.js`,
  `game/viewmodel-poses.js`, `game/viewmodel-fit.js` from it.
- `/home/claude/fpshot`: the strip tool (`fpshot/` here: `fptune2.mjs` and its step files) and its exports (`g3/`, `g4/`).
- `/home/claude/handfit-work`: the `hand/` and `gun/` folders here, plus the grids (`gun/out4/`, made by step 3).
Make those (copies or symlinks), or change the three prefixes.

## The loop
1. **The hand as a module.** `hand/mkmod.sh` builds `hand/mh-tool.mjs` from the repo's `studio/marine-hand.js`
   (exports `_bf _fp _tp _J _hf _hs _BUILD _mul _inv _ap`: the bones, the posed hand, the joints, the fit helpers).
   Rebuild it whenever marine-hand.js changes.
2. **Export each gun from the game.** Through the slot, one instance:
   `node tools/game-test-slot.mjs run claude4 <task> --checks "hand export" -- node /home/claude/fpshot/fptune2.mjs <out>/shots fpshot/g3-steps.json`
   (create `<out>/queue/stop` first so the strip exits after the steps). A step returning `__file: {name: data}` writes
   `shots/<gun>.json`: the gun's closed parts (triangles, in the hand's frame) and the hand's pose as the game draws it
   (with VM_FIT). **Export with the attachments on** (the uzi's laser-light module was off in g3: the test and the
   export disagreed). One shot per step. The page takes 4-5 GB in software: never run step 3 beside it.
3. **Distance fields.** `gun/runall4.sh <gun>-r <gun>-l ...` runs `python3 -I gun/sdf_fast.py shots/<gun>.json <hand> out4/<gun>-<hand> 0.001`
   (trimesh; a 5.5 mm band; chunks of 3000; the deep inside of each part filled per connected component with
   `contains`, because fill_holes failed where the hand's box cut a big part). Minutes per hand. `gun/grid.mjs` reads
   them (trilinear).
4. **The fit.** `gun/pipe4.sh <gun>-r ...`: `touch4.mjs` (where the hand must touch), `gungrip3.mjs` (a wide scan, then the
   fine solve: fingers, thumb, the hand's move within ±MV and turns about y/z/x, spreads; env SCAN, SCANR, START,
   FREEZE_T), `thumbgun.mjs` (the thumb). Results in `res5/<gun>-<hand>.txt` (`RESULT {...}` lines).
5. **Into the game.** `gun/writefit.py` (ALL=1 writes every hand, even where the elbow's twist undoes part of an x turn;
   the re-export checks it) writes `game/viewmodel-fit.js` (VM_FIT: per gun and hand `{basis:{x,y}, p, pose}`);
   `gun/contact.mjs` / `contactall.sh` / `encode.mjs` write `studio/hand-contacts.js` (the glove's give where it
   presses: keyed by pose, fading over 0.12 rad of pose distance); `fixself.mjs` for the hand on itself.
6. **Proof.** Re-export (g4) and recheck; then the tests: `tcl334` (rule 1: no part of the hand through another, every
   pose and blend, bare and gloved), `tcl334b/c/d` (rule 2: no part of the hand through any part of the gun, by gun
   group; `tools/tests/clip-check.js`, which also checks the hands into each other and the sleeve), `t240` (the hand's
   build). And pictures at the eye (rule 19): Antigravity's AG-286 on the RTX 5080.

## Where it stands (10 Nov ~20:00Z, from Claude's CL-334 handoff)
- Rule 1 passes (tcl334). The sleeve passes at rest and most bends. Revolver, AK, AA-12 and chainsaw pass rule 2.
- Left: (a) re-export with the attachments on; (b) the two-hand holds (the support hand round the firing hand:
  pistol 32.5 mm into it, revolver 11.7); (c) the long guns' support hands are flat cradles: give them a real wrap;
  (d) the minigun's and launcher's firing palms in the housings (ChatGPT 2 is making room, GT-20078, then refit);
  (e) small ones: pistol 2.8 mm, sniper 2.7, m4 1.3, flamer 1.1, shotgun 0.7.
- `gun/res5`, `gun/best5`: the last fits, for reference. `gun/fitposes.txt`: the poses written.
