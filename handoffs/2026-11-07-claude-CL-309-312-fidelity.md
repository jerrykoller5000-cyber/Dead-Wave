# claude - CL-309 the shared detail helpers; CL-312 the shotgun at a real pump gun's proportions (D-121, the fidelity upgrade) - 2026-11-07
Changed:          CL-309: studio/gun-detail.js: gunDetail(ctx) -> D.screw (slot/hex/button/torx heads), D.rivet, D.pin (through,
                  both ends proud), D.ribs (serrations), D.vents (a row of dark slots cut in), D.groove (a panel line), D.row,
                  D.checkering (GP-164's checkeredPanel, shared), D.mats (the paint-ready set). Every part takes the surface
                  point and the outward axis and sinks its base 0.6 mm into the parent: nothing can float (J14). floatingParts(
                  THREE, root) lists a model's loose parts for a handoff's own check. studio/gun-detail.test.mjs 4/4.
                  tools/gunshot (index.html + shoot.mjs): a builder's own look loop without the game: one of our guns at the
                  game's scale from side/top/quarter/close/rear/sideR at 1280, noon or night, the triangle count and the box;
                  node tools/gunshot/shoot.mjs <gun> <outDir> [views] [--can] [--night]. 40 s a gun in the cloud.
                  CL-312: studio/weapon-longarms.js makeShotgunModel rebuilt. Before: a 106-unit-wide receiver (83 mm at the
                  game's scale: twice a real 870's), a 47 mm barrel, a 34 mm tube, an 80 mm forend: the "flat grey block"
                  of the audit. Now, at the game's scale: the barrel 24 mm on the bore (unchanged axis y 0.03), the tube 23 mm
                  under it (y -0.006), the receiver 40 mm wide and 62 mm tall with flat sides and a rolled top running back
                  into the stock's wrist, the chamber step, the ejection port on the right with the bolt and extractor in it,
                  the loading port underneath with the carrier and shell latch, the two trigger-plate pins, the stamping lines,
                  the barrel-band screws, the safety's cross bolt, the trigger plate hung under the new bottom, the stock's
                  moulding seam, the grip's checkering, the forend 44 mm across on the tube with twelve ribs and the two
                  action bars running back into the receiver, the barrel band and its hex screw, the sling swivel, a vent rib
                  with 13 posts and the bead, the tube cap with its knurl, the muzzle crown. 5,384 tris (was 4,732).
                  The hold: the grip, trigger, guard and stock are where they were (the firing hand unchanged); the forend's
                  middle moved up 2 cm with the tube: VM_SOCKETS.shotgun support [0,-0.016,0.37] (was [0,-0.035,0.28]) and
                  port [0,-0.034,0.12]; VM_RELOADS.tube places port/pump follow; the body's WEAPON_HOLD follows the pump part
                  (fore: 'pump', pumpDy) so its support hand rides along. game/sight-points.js shotgun: the eye 1.8 cm over
                  the new receiver top (0.0515), the line to the bead's top (0.0595 @ 0.91).
Files:            studio/gun-detail.js, studio/gun-detail.test.mjs, tools/gunshot/index.html, tools/gunshot/shoot.mjs,
                  studio/weapon-longarms.js (makeShotgunModel; imports gunDetail), game/viewmodel-poses.js (the shotgun's
                  socket and the tube's places; Claude outputs/cl312/patch312.py), game/sight-points.js (shotgun).
Tests:            gun-detail.test.mjs 4/4; node --check all; tcl281 + t277 running in the cloud after the rebuild (the sight
                  line and the hold's wrists). Cloud strips: fpshot gs-shotgun-before/v1/v2 (gunshot), p21-sg (first person:
                  hip, ADS, the shell reload: the shell now seen in the hand at the port).
Screenshots:      /home/claude/fpshot/gs-shotgun-before.jpg (the soap bar), gs-shotgun-v2.jpg, p21-sg.jpg (cloud). AG-256's
                  sheet on the 5080 is the record.
Not verified:     the hand curls on the slimmer forend (GB-153's fit was to the 80 mm forend: the fingers may wrap air or
                  pass through it; Grokbot's fit probe refits them: asked); the 5080 look; D-99 fps (no change expected: +650
                  tris); the suppressor's size against the slimmer barrel (Jerry's big can, CL-95: left as it is).
Requests:         Grokbot: refit the shotgun's hand curls (GB-153's probe) for the 44 mm forend and check WEAPON_HOLD.shotgun
                  pumpDy against the new forend bottom (-0.034). AG-256: the shotgun's sheet (first of the fidelity sheets).
                  All: review the row in docs/fps/fidelity.md from the sheet.
Contract changes: studio/gun-detail.js (new, shared); tools/gunshot (new); the shotgun's reloadShell rest [0,-0.034,0.12];
                  SIGHT.shotgun moved (the sight-points file, rule 13: the line follows the model, the bars hold).
