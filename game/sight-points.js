// game/sight-points.js - GB-222 (D-87), for Claude's CL-249 true first person. Not wired into the camera.
// Each gun's sight point in the gun's OWN local space (the held weaponMeshes[k]: bore along +z, muzzle at muzzleLocal,
// up +y, metres): `pos` is where the eye sits to look down the sights, `fwd` the line of sight (unit, near +z).
// Measured on the real renderer by tools/tests/t277.js (top of the 1.5 cm strip over the bore, rear and front).
// `kind`: 'iron' rear notch/carry handle + front post or bead, 'optic' through the scope's axis (estimated from the tube
// top, see note), 'over' a sightless gun looked over its top line. Eye relief: long guns ~0.12-0.25 m behind the rear
// sight (cheek on the stock), handguns ~0.4 m (arms out). Fine-tune in CL-249; t277 guards that each stays on its gun.
export const SIGHT = Object.freeze({
  pistol:   { kind: 'iron',  pos: [0, 0.090, -0.40], fwd: [0, 0, 1] },                // front post 0.087 @ z 0.287, rear 0.075 @ 0.072
  revolver: { kind: 'iron',  pos: [0, 0.123, -0.40], fwd: [0, 0, 1] },                // front 0.121 @ 0.326, rear 0.109 @ 0.081
  uzi:      { kind: 'iron',  pos: [0, 0.160, -0.25], fwd: [0, 0, 1] },                // rear tower 0.156 @ -0.087; front post not distinct in the strip
  shotgun:  { kind: 'iron',  pos: [0, 0.105, -0.25], fwd: [0, -0.0206, 1] },          // receiver 0.087 @ -0.129, bead 0.081 @ 0.915; GB-224: was .092 (the receiver hid the bead, GB-223 fp-ads-shotgun.png), eye on the bead
  m4:       { kind: 'iron',  pos: [0, 0.172, -0.12], fwd: [0, -0.0448, 0.999] },      // carry-handle rear 0.168 @ 0.004, front post 0.138 @ 0.673
  ak:       { kind: 'iron',  pos: [0, 0.100,  0.00], fwd: [0, 0.003, 1] },            // rear leaf 0.095 @ 0.218, front 0.097 @ 0.840
  aa12:     { kind: 'iron',  pos: [0, 0.183, -0.25], fwd: [0, -0.006, 1] },           // rear 0.180 @ -0.120, front 0.175 @ 0.750
  launcher: { kind: 'iron',  pos: [0, 0.126, -0.25], fwd: [0, -0.035, 0.999] },       // ladder 0.123 @ 0.053, front 0.102 @ 0.650
  sniper:   { kind: 'optic', pos: [0, 0.180, -0.20], fwd: [0, 0, 1] },                // scope tube top 0.209 @ 0.069; axis taken ~3 cm below (estimate)
  minigun:  { kind: 'over',  pos: [0, 0.300, -0.30], fwd: [0, 0, 1] },                // no sights: over the carry handle (0.280 @ -0.072)
  flamer:   { kind: 'over',  pos: [0, 0.150, -0.25], fwd: [0, 0, 1] },                // no sights: over the tank/nozzle line (0.112-0.125)
  chainsaw: { kind: 'over',  pos: [0, 0.250, -0.25], fwd: [0, 0, 1] },                // no sights: over the top handle (0.220 @ 0.024)
});