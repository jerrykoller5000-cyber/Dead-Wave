# First person, rebuilt: the viewmodel (CL-281, D-101)

Claude, 2026-10-31, for Jerry's 1.1 notes J3-J6, J10-J15, J17, J19, J22-J25 and J28 (docs/jerry/2026-10-31-1.1-notes.md):
"Somebody who knows what they are doing needs to do a complete revamp of the way weapons look and are handled in first
person. The aim. The hand placement and movement. The reloads. The way that the weapons look now that they are more
visible up close. And the FOV." The baseline to beat is AG-164 (qa/2026-10-31-AG-164/: 60 GPU shots, scored).

## Why patching stopped working

First person today (CL-249, CL-250, CL-260, GB-222 to GB-245) is a camera at the third-person body's eyes, looking at
that body's own arms and gun. Everything Jerry hates follows from that one choice:
- **The hands:** the arms are solved for the third-person pose and the shoulder camera; seen from the eye, the same IK puts
  wrists at 70-90 degrees and fingers through the pistol (J3, J11, J15, J22). There are no fingers to pose, only fists.
- **The placement:** the gun sits where the body holds it, up and left of the eye, 30-45 % of the screen (J12).
- **The FOV:** the gun is drawn at the world's FOV, so a wide world stretches it and a narrow zoom pushes it into the face
  (J4, J10); the reload swings it through the near plane (J5).
- **The feel:** the eye rides the walk and the hold, smoothed after the fact; the gun jerks (J23, J24, J25).
- **Akimbo:** the body can't hold two guns where the eye can see them (J6).

## What shipped shooters do, and what we'll do

1. **A viewmodel.** First person draws its own arms and its own copy of the held gun in camera space, at a fixed
   viewmodel FOV (60, independent of the world's FOV setting), near plane 1 cm. The third-person body stays as it is (its
   shadow, the mirror of what others see); in first person its arms and gun are left out of the eye's pass, as the head
   is hidden now. **As built (CL-281 stage 1, 2026-10-31):** not a second pass but the world's one pass: the view gun's
   materials are copies whose vertex stage uses the viewmodel's projection pressed into the front 4 % of the depth range,
   so nothing comes in front of it and it never goes into a wall, and it still goes through the post chain (bloom, the
   picture grade, the goggles). A second pass after the chain would have skipped the chain; inside it, another
   full-screen target a frame (D-99). His arms and gun are skipped by a render filter in the eye's pass only, so his
   shadow keeps them (studio/marine-skin.js bakes his arms into skins of their own for it).
2. **Lighting:** the world's own lights and its sun shadow, at the eye's place (under a roof the gun is in shade; the
   flashlight and the pool lights light it where they reach). The spec's separate copied lights weren't needed once the
   gun is in the world's pass.
3. **Arms with hands:** studio/fp-arms.js: forearms in the marine's own camo sleeve and cuff, gloved hands with a thumb of
   two joints and four fingers of three, every joint a pose value. Poses: grip (the strong hand round the grip, the
   index finger along the frame or on the trigger), support (pistol: thumbs forward over the strong hand; rifle: under
   the handguard or on the vertical grip; pump: round the fore-end; minigun: the spade handles and the carry bar), mag
   (cupping a magazine), rack (pinching a slide or bolt), open (the pen, a ladder rung).
4. **Sockets on every gun:** each gun gets authored points in its own space: grip, support, magwell, charging handle or
   slide, muzzle, sight (GB-222's SIGHT), ejection port. Hands are placed on sockets, never solved from the shoulder: the
   wrist follows the forearm line the camera sees, inside a limit (no wrist past 50 degrees; AG-168 v2 showed 35 left the forearms pointing at the eye).
5. **Placement:** hip: the gun low and right (screen x about 0.25 to 0.65, y about -0.75 to -0.15), canted in 6-8
   degrees, the muzzle toward the crosshair's point at 15 m. Aimed: the sight's line on the screen's centre at its eye
   relief, the transition an eased 0.18-0.25 s by weight class. Sprint: lowered and turned in. Each weapon's numbers in
   one table (game/viewmodel-poses.js), tuned against AG-164's references.
6. **Motion as springs:** sway from the mouse (the gun lags and settles), bob from the stride (a small figure eight,
   less when aimed), landing dip, recoil as a kick back and up that a spring brings home (per weapon: the Breacher-12
   eased, J20), camera shake scaled down in first person (the flamer, J19). Nothing snaps, nothing jitters (J23-J25).
7. **Reloads in view space:** per class (pistol, SMG, rifle, AK, pump, Breacher, revolver, bolt sniper, launcher,
   minigun belt) as keyframed paths of the gun and both hands (mag out, mag in, slide or bolt), kept inside the view
   frustum and in front of the near plane (J5); the laser stays on and rides the muzzle (J8, J9, with GB-257).
8. **Akimbo:** two guns, one in each hand, low left and low right, both in view at level pitch; a two-dot crosshair that
   tightens on right-click (J6). No health pen while akimbo (J17, GB-258).
9. **The rest of first person:** the health pen (a proper injector move, J17), the blades (CL-249's paths moved onto the
   viewmodel arms), the grenade's throw, the first-person ladder climb (hands on the rungs in view, J28).
10. **The sights per weapon** (J4, J10, J13, J16, J18, J20) are Grokbot's GB-259 on this framework: the Wasp's zoom and
   sights, the GW-4's red dot, the revolver's sight picture clear of the hammer, the launcher's leaf sight and its arc, a
   minigun red dot, the Breacher's sight.

## Order (each stage: Antigravity's GPU shots against AG-164, then Jerry's eye)

1. **The framework and the pistol (J3):** the viewmodel pass, the arms with fingers, the pistol's sockets, hip and aim,
   springs, its reload. Jerry looks before the rest.
2. The GW-4, the AK and the Wasp (J4, J5, J10).
3. The shotgun, the Breacher-12, the revolver, the sniper (J13, J20).
4. The minigun, the launcher, the flamer, the chainsaw; akimbo; the pen; the blades; grenades; the ladder (J6, J16-J19,
   J28).
5. GB-259's sights on all of it.

## Measured, not guessed

- t-tests: the viewmodel draws only in first person; every hand within 1 cm of its socket at rest, aimed and through
  each reload; no viewmodel vertex in front of the near plane through any reload; the sight on the screen's centre when
  aimed (1 px at 1080p); the wrist limit held.
- Perf: the second pass is a small scene (arms + one gun, a handful of draws); night 20 measured against CU-186's numbers
  (D-99 holds for 1.2 too).
- Third person untouched: the AG-164 third-person shots unchanged.
