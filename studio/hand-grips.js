// GB-153 (GB-152 Phase B; Jerry, 2026-10-09 16:57 CT: "Make them manipulate the weapons accurately."): how each hand's
// fingers close on each gun. One number per finger, its curl c (the knuckle turns c, the middle joint 1.15c, the end
// joint 0.95c, the way a finger closes round a bar), and the thumb's [base curl, swing (- across the palm), end curl].
// The table was fitted on the real renderer (handoffs/2026-10-09-grokbot-GB-153/fit-probe.mjs): with the hold settled,
// aiming level, each finger was curled from straight until it first touched the gun (within 2 mm); the pistol's and the
// revolver's support fingers until they touched the gun or the firing hand they wrap. Fitted is a finger that touched; a
// finger that met nothing within a full curl keeps a closed fist (listed in `free`).
// fire: the firing hand (its index finger the one that will take the trigger, GB-152 Phase C); support: the other hand on
// the forend, the pump, the foregrip, the handle, or wrapped over the firing fingers; offhand: the akimbo second gun's hand.
export const CURL = [1.0, 1.15, 0.95];
export function digit(c, spread = 0) { return [c * CURL[0], c * CURL[1], c * CURL[2], spread]; }
// An entry ({ f: [c x4], t: [curl, swing, end?], s?: [spread x4] }) as a hand pose (studio/marine-hand.js).
export function gripPose(e, out) {
  const p = out || { f: [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], t: [0, 0, 0] };
  for (let i = 0; i < 4; i++) { const d = digit(e.f[i], e.s ? e.s[i] : 0); for (let j = 0; j < 4; j++) p.f[i][j] = d[j]; }
  p.t[0] = e.t[0]; p.t[1] = e.t[1]; p.t[2] = e.t[2] != null ? e.t[2] : e.t[0] * 0.6;
  return p;
}
// Where each thumb swings before it curls onto the gun, by the kind of hold.
export const THUMB_SWING = { fire: -0.3, firePistol: -0.6, support: -0.15, wrap: -0.45, handle: -0.3 };
// Hands holding something other than the gun (GB-145 / GB-146 plans): a magazine cupped by its foot, a shell or the
// revolver's loader pinched by thumb and fingers, the slide or the bolt knob pinched, a part (cylinder, drum) cupped.
export const ITEM_POSES = {
  mag:   { f: [0.75, 0.8, 0.85, 0.9], t: [0.7, -0.2, 0.4] },
  shell: { f: [0.6, 0.95, 1.05, 1.1], t: [0.95, -0.45, 0.35] },
  pinch: { f: [0.7, 1.0, 1.05, 1.1], t: [0.85, -0.35, 0.35] },
  cup:   { f: [0.55, 0.6, 0.65, 0.7], t: [0.5, -0.15, 0.3] },
  pouch: { f: [0.35, 0.4, 0.45, 0.5], t: [0.4, 0.0, 0.2] }   // reaching into the pouch, fingers open to take it
};
// A closed fist for a hand with no fitted entry (and fingers that met nothing).
export const FIST = { f: [1.05, 1.05, 1.05, 1.08], t: [1.0, -0.3, 0.55] };
export const HAND_GRIPS = {};   // filled from the fit below
export const FIT_INFO = {};
