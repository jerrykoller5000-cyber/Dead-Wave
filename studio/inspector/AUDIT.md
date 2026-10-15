# Audit: AG-75's Marine Inspector (tools/marine-inspector.html / .js), CL-196, 2026-10-14

Jerry asked for "a massive audit" of the inspector Antigravity built (AG-65, AG-75) before it becomes the tool for every
visual check. This is it, and why the new inspector (studio/inspector/, index.html?inspect) is built the other way.

## What it got right (kept)

- **The idea:** one page to look at the marine in every kit and every animation without playing to it. Jerry: "It got a
  lot done here and I can definitely see some major areas where this will be beneficial."
- **The controls worth keeping**, all carried over: the camera bookmarks on keys 1 to 7 (full, three-quarter, head,
  torso, hands, back, boots, same angles); `[` `]` to cycle the animations; `,` `.` to step; a speed control and a
  scrubber; CIF presets; the issue logger (now notes that reach the owner); a searchable list.
- **Its builders came from the game's modules where it could import them** (studio/marine-body.js, the weapon
  builders, the gait clips), so the parts that are modules matched.

## What is wrong with it

1. **It is a copy of the game, and the copy has already drifted.** About 3,500 lines of index.html were copied into
   tools/marine-inspector.js (the marine, the materials and camo, the gun kit and sizing, the carry rig, the IK, the
   weapon holds, the reloads, the blades, the grenade, the locomotion, the crouch and the dive poses). Measured this
   afternoon, function by function, against the game as it is now (line similarity, 1.00 = the same):

   | function | similarity | lines (copy / game) |
   |---|---|---|
   | holdWeapon (every weapon hold) | 0.28 | 149 / 235 |
   | makeMarine | 0.43 | 192 / 360 |
   | holdShoulderGun (the shoulder aim) | 0.61 | 53 / 56 |
   | buildCarryRig | 0.68 | 111 / 108 |
   | applyCarryPlan | 0.10 | 41 / 21 |
   | camoTile | 0.07 | 15 / 15 |
   | poseHands | 0.07 | 14 / 14 |
   | solveArmIK | 0.81 | 45 / 34 |
   | holdHand · cheekWeld | 0.76 · 0.72 | |
   | dressParts · applyWardrobe · gunKit | 1.00 | (unchanged since the copy) |

   AG-75 landed this morning; ChatGPT's dive work (GP-19915 to 19918) has changed holdWeapon several times since. Every
   change to the marine's code makes the copy wrong again, silently, and someone has to notice and port it by hand.
   For a tool whose job is to show what the game does, that is the wrong way round: a pose that looks right in the
   inspector may be wrong in the game, and the other way round.
2. **"1:1" and "Not verified: None" were not true.** The AG-75 handoff says every piece is "100% verbatim with
   index.html". The table above says otherwise, and some of it was invented:
   - **Katana combo cuts 1 and 2** cite `bladeSwingPose(katana=true, combo=0/1)` as their source; the game's
     `bladeSwingPose(u, heavy)` has no combo, and there is no katana combo in the game (one cut, `KATANA_ANIM_DUR`
     0.30 s, CL-184). The copy makes cut 2 by mirroring cut 1 itself.
   - **Animation timings are its own:** each of the 52 entries has a hand-set `duration` (a reload of 2.0 s, a dive of
     1.1 s...). The game's come from its weapon stats, the studio clips and its state machines, with eases, cross-fades,
     the gun lag, the turn steps and the idle that the copy does not have.
   - **Poses are evaluated as a pure function of one number** (`evaluateMarinePose(ctx, anim, u)`), a stand-in for the
     game's frame-by-frame state machine, so blends between moves, the reload's magazine hand-off, the dive's contact
     and floor clearance (GP-19918) and the shoulder roll are approximations, not the game.
   - **Light and image:** its own scene with its own lights, no post-processing, no game shadows, so materials and
     colours do not read as in the game.
3. **One 190 KB file**, a fixed list of 52 marine animations, and no way to show anything that is not the marine:
   no zombies, no other weapons on their own, no animals, survivors, props or vehicles. Adding any of them meant porting
   more of index.html.
4. **Agents could not use it** beyond loading it: no API (a partial `window.__marineInspector`), no pictures from the
   command line, no check that it still works. No tests.

## The fix (CL-196)

The inspector is now the game. `index.html?inspect` boots the real game without its intro and warm-up and puts it in a
studio; the marine is the player, a zombie is one the game spawns and runs, every model is made by its own builder,
the light is the game's own sun and shadows through its post-processing. A move is the player's input to the game, at
the game's own timing. There is nothing to drift: when the game changes, the inspector shows the change.

What made it robust: the catalog is built from the game's own tables (zombie types, guns, build tiers...), so new
things appear by themselves; a builder that goes missing is reported, by name, in the list and in `DWInspect.check()`
and `node tools/camera.mjs check`; agents drive it through `window.DWInspect` or the camera's `--inspect` mode; notes
reach the owner through the crew's review folders. The guide: studio/inspector/README.md.

tools/marine-inspector.html is left in place, untouched, for comparison until Jerry retires it; `Open Marine
Inspector.bat` now opens the new one.

## GP-19919 follow-up qualification (2026-10-14)

Using the real builders removes duplicated model/pose implementations. The catalog remains curated, and input recipes,
host adapters and environment assumptions still require maintenance when the game changes. Some variants derive from game
tables; new model kinds, world scenes and valley-only moves do not all appear automatically. Rewind is visual rig history,
and saved setups restart their moves rather than restoring simulation state.

The current operating/extension guide is `studio/inspector/README.md`. The later robustness audit, fixes and proof are in
`review/inspector-audit-GP19919/AUDIT.md`, including startup, input cancellation, resource ownership, captures and agent contracts.
