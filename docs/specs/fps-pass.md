# The first-person pass (CL-293, D-111): systematic, from Jerry's seat

Claude, 2026-11-02, for Jerry's week order 1 ("Really nail the feel of FPS gameplay") and J54-J62
(docs/jerry/2026-11-02-1.2-notes.md). It builds on CL-281's viewmodel (docs/specs/first-person-1.2.md): stage 1 worked
("First person looks much better on pistol and I am very happy"), so the framework stays. What's left is what a
framework can't give by itself: hands that grip like a shooter's, motion that feels like a body carrying a gun, and
models that hold up at 40 cm. Jerry: "Primarily you and GPT... really give it a systematic approach."

## Who
- **Claude:** the pass, its checklist and its scoring; the motion (game/viewmodel.js: sway, bob, sprint, landing,
  aim, recoil, the camera's share); the hands (studio/fp-arms.js, the grip and support poses, the wrists).
- **ChatGPT:** every weapon in first person: its view gun, its place in the view, its reload, and its model where the
  eye sees it (studio/weapon-*.js parts seen from the eye, handed over from Grokbot for this pass; Grokbot is told).
  GP-20014 (stage 3) folds in.
- **Antigravity:** the contact sheet (below) on Jerry's GPU, before and after every round, and an independent score.
- **Grokbot:** GB-259, the sights, on this checklist. **Muse:** MU-31, the numbers as they stand.

## The seat
Every look is taken the way Jerry plays: his launcher's page (index.html?solid=1), first person, his FOV setting, 1080p
and 1440p, in the Training Ground and on a woods trail at noon. A fix is done when the sheet from that seat says so,
not when a t-test does (the J52/J53/J56/J59 lesson).

## The contact sheet (AG, qa/<date>-AG-202/)
For each weapon (pistol, revolver, Wasp, GW-4, AK, shotgun, Breacher-12, sniper, launcher, minigun, flamer, chainsaw,
akimbo pistols and Wasps, the pen, the blades, grenades):
- stills: hip at rest, aimed, sprint, the fire's peak, three reload moments (out, in, home);
- strips, 3 s at 30 fps, as contact sheets and a GIF each: walk forward, run forward, strafe, a 90-degree mouse flick
  and stop, a 1 s burst (the flamer 3 s), a jump and landing;
- a trace beside each strip: the view gun's muzzle and both wrists in screen pixels per frame (the numbers the checks
  below read).

## The checklist (each item scored 1-5 by Claude and by AG, the two shown side by side)
**Hands.** The strong hand high on the backstrap, fingers round the grip, the index on the frame or the trigger. Pistol
and revolver support (J54, J57): the support palm fills the grip's open side, its fingers over the strong hand's
fingers, both thumbs forward along the frame; rifle: palm under the handguard or on the grip; minigun (J61): the
support hand under the gun, carrying it, not through it. Wrists in line with the forearms; the forearms come in from
the screen's lower corners, so the wrists read flared out, not bent in (J54). No finger, palm or wrist inside metal
(a vertex-inside-hull check on every frame of the strips).
**Placement.** CL-281's hip numbers (screen x 0.25-0.65, y -0.75 to -0.15, canted 6-8 degrees); the chainsaw centred
and low, its bar pointing up the middle of the view (J60); the flamer's nozzle low centre-right.
**Motion (J55).** No jitter: the muzzle's frame-to-frame high-pass under 0.5 px RMS at 1080p walking straight on flat
ground (the bob's own curve taken out). The walk: a figure eight at the step rate, about 1-1.5 % of the screen side to
side; the run larger and slower to settle; the sprint pose lowered and turned in, eased 0.2 s. Sway: the gun lags a
flick by 40-80 ms and settles in 0.25-0.4 s with under 10 % overshoot; a strafe tilts it 2-4 degrees. A landing dips
it and brings it home. Aimed, all of it at a quarter or less.
**Fire.** A kick back and up, a spring home in 0.12-0.3 s by class; the camera's share small and never a shake in first
person. The flamer (J59): a steady pushback that eases in over 0.3 s and holds while it fires, the camera nearly still.
Full auto: a climb, no buzz.
**Reloads.** Hands on the parts they move; the gun inside the view and in front of the near plane; the mechanism the
real one's: the revolver's cylinder swings out toward the support hand, which is the screen's left in our view (J57).
**The model at 40 cm.** What the eye sees is real and in proportion: sights (the revolver's front post visible, J57),
the slide or receiver top, the hammer, the cylinder, the magazine against the magwell (J21), the texel density of the
view gun's materials, no z-fighting; the camo the same scale every frame (J63).

## Order
1. **Round 0, today:** AG-202's sheet of every weapon as it stands; MU-31's numbers. Claude and AG score it.
2. **Round 1, motion and hands for all (Claude):** the jitter found and gone (J55), sway, bob, sprint, landing, the
   recoil springs and the camera's share (J59), the support grip and the wrists (J54) on the pistol, then every gun's
   support pose from the same rules.
3. **Round 2, the weapons Jerry named (ChatGPT):** the revolver (cylinder, front post, J57), the minigun (J61), the
   chainsaw (J60), the flamer's place; then stage 3's guns (GP-20014) and stage 4's.
4. **Round 3, every weapon's model at 40 cm (ChatGPT) and its sights (Grokbot, GB-259).**
5. After each round: AG's sheet again, the scores side by side, and the GIFs for Jerry (he can watch them on his phone).

## Measured, not guessed
CL-281's t-tests stay (the hands on their sockets, the near plane, the sight on centre). New: tcl293 (the jitter bound
and the sway's settle from the traces, per weapon) and the hull check. D-99 holds: the pass adds no draws beyond the
view gun's.
