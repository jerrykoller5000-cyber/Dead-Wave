// game/sight-points.js - GB-222 (D-87), for Claude's CL-249 true first person. Not wired into the camera.
// Each gun's sight point in the gun's OWN local space (the held weaponMeshes[k]: bore along +z, muzzle at muzzleLocal,
// up +y, metres): `pos` is where the eye sits to look down the sights, `fwd` the line of sight (unit, near +z).
// Measured on the real renderer by tools/tests/t277.js (top of the 1.5 cm strip over the bore, rear and front).
// `kind`: 'iron' rear notch/carry handle + front post or bead, 'optic' through the scope's axis (estimated from the tube
// top, see note), 'over' a sightless gun looked over its top line. Eye relief: long guns ~0.12-0.25 m behind the rear
// sight (cheek on the stock), handguns ~0.4 m (arms out). Fine-tune in CL-249; t277 guards that each stays on its gun.
export const SIGHT = Object.freeze({
  pistol:   { kind: 'iron',  pos: [0, 0.0920, -0.40], fwd: [0, 0, 1], notch: [-0.064, 0.092], tip: [0.282, 0.092] },   // GB-259: the post raised to the ears' tops, the line level across them (was notch floor 0.082 to tip 0.087: no post in the notch)
  //        GB-233 (rule 13, Claude 2026-10-26) had: pos .0772, fwd [0, .01425, .9999], notch [-0.064, 0.082], tip [0.282, 0.087]   // GB-233 (rule 13, Claude 2026-10-26): through the rear notch (0.082 @ -0.064) to the post tip (0.087 @ 0.282); was .049 / slope .0557 on the slide's mid-top, below the bore
  revolver: { kind: 'iron',  pos: [0, 0.1073, -0.40], fwd: [0, 0.01902, 0.9998], notch: [-0.05, 0.114], tip: [0.318, 0.121] },   // GB-233 (rule 13): through the notch on the top strap (0.114 @ -0.05) to the blade tip (0.121 @ 0.318); was .085 / slope .0489 on the rib
  uzi:      { kind: 'iron',  pos: [0, 0.126, -0.25], fwd: [0, 0, 1] },                // GB-259: through the rear aperture's centre (.126 @ -0.08) to the post tip (.126 @ 0.198); GB-228 had .156, over the ears
  shotgun:  { kind: 'iron',  pos: [0, 0.105, -0.25], fwd: [0, -0.0206, 1] },          // receiver 0.087 @ -0.129, bead 0.081 @ 0.915; GB-224: was .092 (the receiver hid the bead, GB-223 fp-ads-shotgun.png), eye on the bead
  m4:       { kind: 'iron',  pos: [0, 0.134, -0.12], fwd: [0, 0, 1] },                // GB-233: through the holo's dot (0.134 @ 0.045), co-witnessed with the front post 0.138 @ 0.673 (was the iron line over the hood, .172 sloping)
  ak:       { kind: 'iron',  pos: [0, 0.0900, 0.00], fwd: [0, 0, 1] },                // GB-259: level through the new rear notch (ears 0.090 @ 0.218) to the raised post tip (0.090 @ 0.84); was .0943 over a post 1.6 cm under the rear blob
  aa12:     { kind: 'iron',  pos: [0, 0.1807, -0.25], fwd: [0, -0.0057, 1] },         // GB-228: on the line (was .183)
  launcher: { kind: 'iron',  pos: [0, 0.1370, -0.25], fwd: [0, 0, 1], notch: [-0.2, 0.137], tip: [0.29, 0.137] },   // J62: level through the leaf's first notch (.137 @ -0.2) to the new front post's tip (.137 @ 0.29); ChatGPT retunes the eye relief
  //        GB-228 had: pos .1338, fwd [0, -.0352, .9994] (on the line over the drum, with no sight to aim by)
  sniper:   { kind: 'optic', pos: [0, 0.140, -0.20], fwd: [0, 0, 1] },                // GB-259 (GP-20014): on the scope's modelled axis (the tube lathe's y 0.14, GP-19994); was .180, an estimate under the tube top 0.209
  minigun:  { kind: 'over',  pos: [0, 0.300, -0.30], fwd: [0, 0, 1] },                // no sights: over the carry handle (0.280 @ -0.072)
  flamer:   { kind: 'over',  pos: [0, 0.150, -0.25], fwd: [0, 0, 1] },                // no sights: over the tank/nozzle line (0.112-0.125)
  chainsaw: { kind: 'over',  pos: [0, 0.250, -0.25], fwd: [0, 0, 1] },                // no sights: over the top handle (0.220 @ 0.024)
});