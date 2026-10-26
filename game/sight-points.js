// game/sight-points.js - GB-222 (D-87), for Claude's CL-249 true first person. Not wired into the camera.
// Each gun's sight point in the gun's OWN local space (the held weaponMeshes[k]: bore along +z, muzzle at muzzleLocal,
// up +y, metres): `pos` is where the eye sits to look down the sights, `fwd` the line of sight (unit, near +z).
// Measured on the real renderer by tools/tests/t277.js (top of the 1.5 cm strip over the bore, rear and front).
// `kind`: 'iron' rear notch/carry handle + front post or bead, 'optic' through the scope's axis (estimated from the tube
// top, see note), 'over' a sightless gun looked over its top line. Eye relief: long guns ~0.12-0.25 m behind the rear
// sight (cheek on the stock), handguns ~0.4 m (arms out). Fine-tune in CL-249; t277 guards that each stays on its gun.
export const SIGHT = Object.freeze({
  pistol:   { kind: 'iron',  pos: [0, 0.049, -0.40], fwd: [0, 0.0557, 0.9984] },     // GB-228: on the rear-front line (was .090 flat: rear sat 4.6% of the screen below the post)
  revolver: { kind: 'iron',  pos: [0, 0.085, -0.40], fwd: [0, 0.0489, 0.9988] },     // GB-228: on the rear-front line (was .123 flat)
  uzi:      { kind: 'iron',  pos: [0, 0.156, -0.25], fwd: [0, 0, 1] },                // GB-228: level with the rear tower top (was .160)
  shotgun:  { kind: 'iron',  pos: [0, 0.105, -0.25], fwd: [0, -0.0206, 1] },          // receiver 0.087 @ -0.129, bead 0.081 @ 0.915; GB-224: was .092 (the receiver hid the bead, GB-223 fp-ads-shotgun.png), eye on the bead
  m4:       { kind: 'iron',  pos: [0, 0.134, -0.12], fwd: [0, 0, 1] },                // GB-233: through the holo's dot (0.134 @ 0.045), co-witnessed with the front post 0.138 @ 0.673 (was the iron line over the hood, .172 sloping)
  ak:       { kind: 'iron',  pos: [0, 0.0943, 0.00], fwd: [0, 0.0032, 1] },           // GB-228: on the line (was .100)
  aa12:     { kind: 'iron',  pos: [0, 0.1807, -0.25], fwd: [0, -0.0057, 1] },         // GB-228: on the line (was .183)
  launcher: { kind: 'iron',  pos: [0, 0.1338, -0.25], fwd: [0, -0.0352, 0.9994] },     // GB-228: on the line (was .126, under it)
  sniper:   { kind: 'optic', pos: [0, 0.180, -0.20], fwd: [0, 0, 1] },                // scope tube top 0.209 @ 0.069; axis taken ~3 cm below (estimate)
  minigun:  { kind: 'over',  pos: [0, 0.300, -0.30], fwd: [0, 0, 1] },                // no sights: over the carry handle (0.280 @ -0.072)
  flamer:   { kind: 'over',  pos: [0, 0.150, -0.25], fwd: [0, 0, 1] },                // no sights: over the tank/nozzle line (0.112-0.125)
  chainsaw: { kind: 'over',  pos: [0, 0.250, -0.25], fwd: [0, 0, 1] },                // no sights: over the top handle (0.220 @ 0.024)
});