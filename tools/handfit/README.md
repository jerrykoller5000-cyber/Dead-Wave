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

## Claude 4's pass (CD-1, 10 Nov ~21-23Z): `c4/` and `look/`
- **Exports from the suite's page** (`c4/mkpage.mjs` writes `tools/tests/test-4444.html` in the cloud copy, as run-all builds it;
  `c4/fptune4.mjs` drives it): the same geometry the gate tests see, the laser-light modules on (the real page's export had the
  uzi's module hidden), no GPU, under 2 minutes. `c4/g7-steps.json` adds each glove's index and the camera.
- **The fields** (`c4/sdf_c4.py`): a part made of several closed bodies is split into them (trimesh's sign read the uzi's
  fingers outside its grip, which clip-check.js reads inside) and the corners are keyed to 10 um as clip-check.js keys them
  (a part it calls closed was open here: the revolver's support hand read 0 where the test read 25 mm). `BAND=0.015` for a wrap.
- **The check** (`c4/depth2.py <export> [r|l]`): rule 2 and the hands into each other exactly as clip-check.js measures them, in
  a second. `c4/where.py`: which parts a hand is in, in the hand's frame.
- **Wraps**: `c4/wrap.js` sets a support hand round the handguard (the channel on the bore, the palm kept on its side);
  `c4/wrap2.js` round one part (a grip or a handle, its axis from the part's vertices near the hand). Then `c4/fit8.sh <name>
  wrap <export>` (all the fingers' pads and the palm to touch) and `c4/apply7.js` (the apply with the wrap start, `%INIT%`).
- **Two hands**: `c4/augment.py` adds the firing hand (the wrist capped) to the gun as a part, for the support hand's field.
- **Apply**: `c4/apply6.js` (apply2 with `invert()` for `transpose()`, a no-op in fakethree; and the glove's index); merge into
  VM_FIT with `c4/mergefit.py` (keeps every other hand); contacts `c4/cont9.sh` + `c4/encode9.mjs` (keeps the others').
- **Looking** (`look/`): `node look/shoot.mjs <export.json> <out.png> left,right,below,front [part to show red]` with
  `FOCUS=r|l ZOOM=1.5`: the gun and both gloves from any side, three.js on swiftshader, no game. For finding what is wrong;
  the judgment is in the game (Antigravity's pictures).
- Left after this pass: the launcher's firing hand (17.7 mm: its back inside the receiver; the wrap start put the palm the
  wrong side), the pistol's and revolver's two-hand holds (23.8 and 9.1 mm), the chainsaw's rear hand (clean in the test,
  20.9 in the export: check why).

## Claude 4's pass 2 (CD-1, 11 Nov ~00-04Z)
- **The twist.** The game rolls each hand round its grip channel toward its elbow (game/viewmodel.js twistToward, up to
  VM.twistMax 0.6 rad). A fit's roll is the elbow's unless the twist is at that limit; x and the grip point are drawn exactly.
  `c4/drawn.py <export> <gun>` shows a hand as drawn against VM_FIT (`FIT=` the fit file the export was made with).
- **Exports**: `c4/g9-steps.json` (g7 plus `info.gunMw` and only the parts within 6 cm of the hands). The page takes ~4 GB:
  one export page at a time, nothing else running (the cloud's limit is ~6.2 GB: the m4/ak/shotgun pages die with two guns).
  Careful: a part outside the 6 cm window at the export is outside the fit too (the KR-7's magazine once): re-export and check.
- **Apply without the page**: `c4/applyoff.py <export> <gun> <r|l> '<RESULT>'` (apply7's move on the drawn hand; carries the
  twist where it's at its limit; `ROLL=1` holds a wanted roll at the limit); `c4/setfit.py` writes one hand into VM_FIT;
  `c4/fixroll.py` when a carried twist left its limit. Re-export and check with depth2/drawn every time.
- **Solve extras** (gun/gungrip3.mjs): `NOX=1` (no turn about x: the twist owns it), `XT` (a wider x turn), `KOGRID` (a keep-out
  field for every bone but the index: a trigger guard's opening, `c4/keepout.py`, `c4/kojson.py`), `TGT` (the index pad to the
  trigger's face, `c4/tgt.py`); `c4/fitT.sh` runs it. `c4/keepout_sight.py`: the aimed sight line as a keep-out.
- **Two hands**: `c4/augment2.py` (the firing glove welded and capped: closed). Fitting the support hand round it is slow (the
  field takes ~10 min). The firing hand's contact dents change the firing glove: fit the support hand after the contacts.
- **Placing on a new grip**: `c4/transfer.js` / `mktransfer.py` (a hand's hold on one grip carried to another).
- **Contacts**: `c4/cont10.sh <gun-side> <export>` then `node c4/encode9.mjs cont10 studio/hand-contacts.js` (`CLEAR=` in
  gun/contact.mjs for a margin). After pass 2 tcl334b is green (the revolver's two hands 0.5 mm, right at the line).

## Claude 1's fixes, part 2 (CD-1, 11 Nov ~09-13Z)
- **Exports with the arms**: `c4/mkst3.py` (step files from g9: setup, take, raise, export; one gun a page) and `c4/mkst4.py`
  (ex4-*: the export also carries the sleeves, cuffs and bare forearm as drawn); `c4/exp4.sh <out> <gun>...` runs them through
  the cloud's slot. `look/view.html` draws the arms and has a **`cam` view: the game's own camera** (square crop). Judge every
  hold there before landing: a fit can be clean on the gun and still put the forearm across the screen (the GW-4, 10:00Z).
- **Placing**: `c4/gripaxis.py` NEAR=1 (NEARMIN) picks the closed body nearest the grip point (a grip moulded into the stock),
  RAD limits it; `c4/roll.py` (about the bore), `c4/yaw.py` (about the gun's vertical); `c4/slide.py` / `slide2.py` (along a
  grip, out of named bodies; slide2 leaves the thumb out of the measure); `c4/pushgrid.py` (the smallest rigid push out of
  every body, for a hand wedged where two bodies meet); `gun/thumbside.mjs` (the thumb on a chosen side of a bar: SIDEV, WANT,
  MWANT; RAND for a random search).
- With the stricter clip-check (bodies split), parts that used to read open are now in the fields: several hands were found
  inside receivers (flamer, AA-12): slide them down their grips first, then fit8.

## Claude 1's fixes, part 4 (CD-1, 11 Nov ~18:40-21Z): the fists under the guards
- **Exports on the heavier tree**: the page crashed at the raise (the old take cycled through every gun). `c4/exp5.sh` /
  `expr5.sh` use `ex6-<gun>.json` (from ex4: the gun taken directly, the raise stepped in 40-frame chunks with pauses).
  `c4/after.sh <out> <guns>` waits for any running export, then exports in turn (one lease per agent: never two at once).
- **The field's box (bug)**: sdf_c4.py's grid was the hand's own box + 10 mm, and grid.mjs reads 10 mm (clean) outside it, so
  an index straightened out of the box read clean (a false AA-12 'fix'). `PAD=0.035` widens it (fitT.sh/fitS.sh pass PAD).
- **Bones out of the cost**: gungrip3.mjs `SKIPB='[2,3]'` (an index Claude 5's VM_TRIGGER poses); contact.mjs `SKIPB='[1,2,3]'`
  (no give made on the index). `c4/fitS.sh <gun-r> <export> "<keep-out box>"`: fitT's fields, no trigger target, SKIPB.
- **Looking at what is where**: `c4/diag.py <export> r` (every body the hand is in: part, depth, bones), `bodies.py` (closed
  bodies with gun-space boxes), `slice.py <export> <bodies> <x mm>` (an ascii side map of bodies at a plane, the index/middle/
  ring/palm overlaid), `hh.py` (the two gloves into each other by bone), `posechk3.py <export> r '<pose>'` (a re-posed hand
  against every body), `c2g.py` (hand points into gun space), `lookr.sh <export> <name> [parts]` (cam/eye/4 sides, red parts).
- **The index's reach**: `gun/idxgrid.mjs <field> '<pose>' '<TGT>'` (every index angle, the hand fixed: clean poses by pad
  distance; `CLR=-100` for all), `idxgrid2.mjs` (RG ranges), `idxmove.mjs` (hand moves x index; B2/A1 turns).
- **The loop that held**: fitT/fitS -> `applyoff.py` -> setfit -> re-export -> diag/depth3. NOT pretwist after applyoff here: with
  the twist at its limit ("carried") applyoff's fit already draws as solved (pretwist turned it 34 deg off).
