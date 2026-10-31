# CL-281 stage 1: first person's view gun, with the pistol (J3; the framework for J4-J20)

Claude, 2026-10-31. Spec: docs/specs/first-person-1.2.md (§1-§2 updated to what was built, below).

## What's in

- **game/viewmodel.js** (new): the view gun. In first person, once the camera is at his eyes and he holds a gun that
  game/viewmodel-poses.js lists (stage 1: the pistol), the view has its own forearms and hands on a copy of that gun,
  placed in the camera's space every frame.
- **game/viewmodel-poses.js** (new): the numbers. VM (field of view 60, near 1 cm, depth, raise rate, the 35-degree
  wrist limit, the springs, sway, bob, breathing, landing), VM_POSES (per gun: the hip pose, the eye's distance to the
  rear sight, the recoil, the slide's kick, the elbows), VM_RELOADS (per class: the gun's moves and the support hand's
  places through the reload, on the third-person reload's beats).
- **studio/fp-arms.js** (new): the lower arm as studio/marine-body.js builds it, from the elbow down: the sleeve's
  forearm and cuff, or the rolled sleeve's bare forearm and ChatGPT's wrist bridge, and GB-152's jointed hand in the
  glove or bare, on a wrist that turns.
- **studio/marine-skin.js**: bakeRigSkin takes `split` (roots whose parts get skins of their own). The player's arms are
  split, so first person can leave them out of the eye's pass; `?vm=0` doesn't split them.
- **index.html** (14 anchored hooks, marked CL-281): the import; `updateViewmodel(realDt)` before the draw (the state:
  first person settled, the gun, the aim weight, his velocity, the ground, the reload's beat); `viewmodel.place()` in
  renderFrame; down the sights the eye stays at his eyes when the view gun is up (the old eye-to-the-sight move is for
  the guns without one); CL-250's support-arm hide skipped with the view gun; the shot counter in triggerMuzzleFlash
  (`gun.userData.shots`); the laser leaves the view gun's muzzle (GB-257's function, only its origin and line change);
  `TT.viewmodelDbg()`, `TT.vmStateDbg()`; a `PROF.mark('viewmodel')`.
- No garbage on the frame's path (scratch objects throughout).
- **tools/tests/tcl281.js** (new), **tools/vmsheet.mjs** (new: GPU shots of the hip, down the sights, four reload
  beats, a look down and up, a turn, and `?vm=0`'s old first person for comparison).

## How it draws (changed from the spec's second pass)

One pass. The view gun's and arms' materials are copies of his (the gun's, the sleeve's camo, the glove, the skin)
whose vertex stage uses the view gun's own projection (60 degrees, near 1 cm, the screen's aspect) pressed into the
front 4 % of the depth range: nothing in the world can come in front of them, so they never go into a wall, and the
world's field of view (the FP slider, the Aim FOV) doesn't change them. They are lit by the world's own lights and its
sun shadow (at the eye's place: under a roof the gun is in shade), and go through the post chain like everything else
(bloom on the flash, the picture grade, the goggles' green). A second pass after the chain would have skipped all three;
inside the chain it is another full-screen target every frame (D-99). The materials follow his: a camo change at the
CIF reaches the view's sleeves.

His own arms and gun are posed and drawn as before for his shadow; only the eye's pass leaves them out (a render filter
on objects flagged `userData.vmEyeHide`, on only while the view gun is up). The lasers' beams are not left out.

## The hands

Each wrist's place on the pistol is read off his body while the hold is settled (GB-152/153's fit: the grip in the
fist's channel, the support hand round the firing fingers) and eased; the fingers are his fingers every frame. The
forearms run from the wrists toward elbows below the view, the wrist bend held to 35 degrees. Through the reload the
support hand goes to the well (palm up under the magazine's foot), takes the magazine down out of view, comes back with
it (it rides the palm as it was taken), seats it, slaps it, pinches the slide's rear for the rack and returns; the
magazine's states and the beats are the third-person reload's (and its sounds).

## Placement and motion

Hip: the grip low right (ndc 0.38, -0.68; the muzzle 0.23, -0.21), canted in 6.9 degrees. Down the sights: the rear
notch 34 cm ahead of the eye on the view's centre line, the front post on it. Springs on the view's turn (the gun lags
and settles), a strafe, the walk's figure-eight bob (much less aimed), breathing (none aimed), a landing's dip, the
recoil (back and up, a little side) and the slide's kick on each shot; up from below when it comes in (entering first
person, switching to it) and down before it goes.

## Tests

- tcl281 (test page): 34/0: both wrists on their sockets (0.00 cm, at the hip and aimed), the bend at most 35 degrees,
  nothing on screen nearer than 32 cm, the notch and the post on the centre (0.000 ndc), the eye at his eyes aimed, a
  shot 2.8 cm back and settled again, the magazine in the palm (0.00 cm) and seated after, the view gun's muzzle for the
  laser 0.61 m out, his arms back in the eye's pass with the m4 and in third person; 27 meshes. The firing hand's grip
  through the pistol's grip is real-renderer only (the stand-in three's arm poses are wrong, its own hand 38-46 cm off
  the grip there), as are the wrists' bends (both at the 35-degree limit on the stand-in, from those wrong sockets).
- The first-person batch on the cloud's 2-CPU box: t240 17/0, t246 24/0, t253 15/0, t279 17/0, t280 13/0, t289 13/0,
  t293 6/0, t284 INFO (test page), tcl283 5/0; t276 one red in the batch (5 again: the shoulder camera at w 0.011, not
  yet 0, after 6 s of wall clock on the box's slow frames) and 20/0 alone; t291 didn't load in the batch, 13/0 alone;
  tcl280 one red (it waited 2.5 s of wall clock; now 2.5 s of game time, 10/0); t281, t287, t299 hit the box's 180 s
  limit: AG-168 runs those on the PC's test page.
- **t284 (Grokbot's)** measures his own pistol's sights through the camera. With the view gun the eye stays at his eyes,
  so on the real renderer t284's pistol line will fail. GB-262 asks Grokbot to measure, for a gun the view gun draws,
  the view gun's sights through its own projection (TT.viewmodelDbg(): viewPoint, ndc), the same bars. tcl281 checks
  the same thing at a pixel at 1080p.

## Not yet (later stages, or noted)

- The other guns keep the old first person until their stage. Sprinting doesn't lower the gun yet.
- Tracers and brass still leave his own gun (out of the eye's pass, about where the view gun is drawn).
- Looking down, his chest shows without arms (his arms are out of the eye's pass).
- The cloud box can't run the real renderer at any speed: AG-168 (GPU) runs tcl281 and vmsheet on Jerry's 5080,
  against AG-164's sheet, and benches night 20 (third person and first person with the pistol) with and without ?vm=0.

## After the GPU's first look (AG-168's shots, qa/2026-10-31-AG-168/) and Muse's read (MU-11), 2026-10-31 20:30Z

- The shots: the pistol sat right, the sights centred, but the right forearm came in across the body and both forearms
  came at the eye, hiding the hand on the grip; in the reload the support forearm came in from the wrong side (the
  gun's +x is the view's left; its places had it on the right).
- Now: each hand first turns round its grip channel toward its elbow (at most 0.6 rad; the channel stays put, so the
  grip stays in the fist), then the wrist bends (35 degrees at most); the elbows are low and wide; the sleeves are 85 %
  of his girth; the pistol further out at the hip (0.46 m) and down the sights (the notch 0.42 m); the support hand's
  places in the reload mirrored to the right side. tcl281 34/0 (the grip at ndc 0.36, -0.45; nearest 40 cm).
- MU-11's fixes: his gun's nodes counted once every 15th frame (was twice a frame); a part's geometry swapped in place
  reaches the copy; the palm ride and the slide's grab only for a magazine and slide straight off the gun's root; his
  arm's parts looked up again only when he's baked again (and every 10 s); nothing to hold it with yet, no view gun
  (no throw); the elbows are points (the table's comment fixed). Muse's findings 4 (skinned parts) and 10 (a depth-
  reading effect would see the gun at centimetres) are stage 2's notes.
- AG-168 shoots it again (qa/2026-10-31-AG-168/v2/).

## 21:25Z: v3, the view gun the right way out (AG-168 v2's shots)

AG-168 v2 (qa/2026-10-31-AG-168/v2/) showed the arms fat, the hands dark blobs and a ringed disc at each cuff. Cause: the
mirror (VM.mirror, `space.scale.x = -1`) turns every triangle's winding over on screen, and three r175's WebGPU backend
doesn't flip the front face for a mirrored mesh (WebGPUPipelineUtils._getPrimitiveState reads material.side only; the
WebGL backend checks the determinant). So on WebGPU every outer face was culled and the far inside walls drawn, lit from
behind. Fix: game/vm-flip.js, a twin of each mirrored mesh's geometry wound the other way, on the WebGPU backend only
(it shares every attribute, so the hand rig and the wrist bridge still write into it; computeVertexNormals on a twin runs
on its original). `viewmodelDbg().info.flip` says whether it's on. game/vm-flip.test.mjs 4/0 (real three in node).

The forearms also pointed at the eye: the hand's unbent forearm line on the grip points up and back, and a 35 degree wrist
clamped short of the elbow targets. VM.wristMax is 0.87 (50 degrees; the spec says so now). tcl281 (36/0 in the cloud):
the wrist line reads VM.wristMax and caps it at 50; new real-renderer lines: each forearm 40+ degrees off the wrist's line
to the eye with its elbow below the view, and flip on WebGPU. AG-171 shoots v3.
