// game/viewmodel-poses.js - CL-281 (J10-J17, docs/specs/first-person-1.2.md): where the first-person view gun sits.
// Data only: game/viewmodel.js reads it. View space is the camera's: +x right, +y up, -z ahead, metres (the game's
// units; the marine is 1.655 units for 1.80 m, so these read as metres closely enough).
//
// A gun with an entry here is drawn by the viewmodel in first person (its own arms and gun, its own projection at
// VM.fov, never through a wall); one without keeps the old first person (his own arms seen from his eyes) until its
// stage lands (spec §7: 1 pistol; 2 GW-4, AK, Wasp; 3 shotgun, Breacher-12, revolver, sniper; 4 the rest).
export const VM = Object.freeze({
  fov: 60,            // degrees, vertical; the world's own field of view (the FP slider, the Aim FOV) does not touch it
  adsFov: 54,         // a little tighter down the sights, as the world narrows behind it
  near: 0.01, far: 12,
  depth: 0.04,        // the view gun's depth is pressed into the nearest 4 % of the depth range: in front of the world
  raise: 7,           // 1/s: up from below the view and back down (switching to or from it, entering first person)
  wristMax: 0.87,     // radians (50 degrees; the spec's 35 left the forearms pointing at the eye, AG-168 v2): the most a wrist bends between the forearm and the hand
  mirror: true,       // AG-168: his left-handed hold (D-75) shown mirrored, a traditional right-handed view (J12)
  twistMax: 0.6,      // radians: how far a hand may turn round the grip in its fist toward its elbow (AG-168: the forearms came at the eye)
  // The springs: k stiffness (1/s^2), z damping ratio.
  spring: { pos: { k: 260, z: 0.78 }, rot: { k: 240, z: 0.74 } },
  sway: { look: 0.022, lookMax: 0.07, move: 0.012, ads: 0.25 },   // per rad/s of the view's turn; per m/s of strafe; ADS multiplier
  bob: { rate: 1.85, x: 0.0065, y: 0.0085, roll: 0.012, ads: 0.18 },  // strides per metre; amplitudes at a 4 m/s walk
  breathe: { rate: 0.32, y: 0.0012, pitch: 0.003, ads: 0 },   // none down the sights: they stay on the centre
  land: { per: 0.006, max: 0.045 }   // metres of dip per m/s of fall
});

// Per gun, written as the eye sees it (screen terms; game/viewmodel.js turns them into his mirrored hold). hip: the grip
// point (WEAPON_HOLD.grip) in view space, the bore's turn (yaw, pitch, roll: radians; roll < 0
// cants the top to the right, > 0 in toward the centre). ads: the rear sight's distance from the eye, down the view's centre line.
// kick: recoil per shot (back m, up rad, side rad), ads multiplier. elbows: a point in view space each forearm points
// at from its wrist (MU-11: a point, not a direction; held to the wrist's bend and the hand's turn round the grip).
// slideKick: the slide's travel on a shot (gun units).
export const VM_POSES = Object.freeze({
  pistol: {
    // AG-168 (the GPU's first look): further out and a little higher, so the hand on the grip is in view.
    hip: { at: [0.17, -0.12, -0.46], yaw: 0.01, pitch: 0.02, roll: 0.12 },   // canted in 7 degrees (its top toward the centre)
    ads: { rear: 0.42 },
    kick: { back: 0.032, up: 0.11, side: 0.025, ads: 0.55 },
    slideKick: 0.055,
    elbows: { r: [0.36, -0.75, 0.06], l: [-0.34, -0.75, 0.06] },   // AG-168: low and wide, so the forearms leave the view down its corners
    reload: 'pistol'
  },
  m4: {
    hip: { at: [0.18, -0.205, -0.70], yaw: -0.065, pitch: 0.035, roll: -0.11 },
    ads: { rear: 0.54 },   // holographic window at a readable size once the shoulder stock is eye-hidden
    kick: { back: 0.044, up: 0.09, side: 0.018, ads: 0.50 },
    workKick: 0.025,
    elbows: { r: [0.33, -0.61, -0.10], l: [-0.36, -0.95, -0.26] },
    reload: 'carbine'
  },
  ak: {
    hip: { at: [0.195, -0.215, -0.75], yaw: -0.075, pitch: 0.045, roll: -0.12 },
    ads: { rear: 0.70 },   // KR-7 leaf sight and long shoulder stock; stock is omitted only from the view copy
    kick: { back: 0.063, up: 0.15, side: 0.032, ads: 0.58 },
    workKick: 0.035,
    elbows: { r: [0.35, -0.63, -0.12], l: [-0.40, -1.10, -0.27] },
    reload: 'ak'
  },
  uzi: {
    hip: { at: [0.17, -0.18, -0.54], yaw: -0.06, pitch: 0.025, roll: -0.10 },
    ads: { rear: 0.43 },   // the Wasp's tower stays legible without bringing the receiver into the face
    kick: { back: 0.025, up: 0.062, side: 0.016, ads: 0.45 },
    workKick: 0.03,
    elbows: { r: [0.27, -0.58, -0.08], l: [-0.23, -0.56, -0.18] },
    reload: 'smg'
  }
});

// Stage-2 reload paths are kept together so their beats can be tuned against one GPU filmstrip.
const VM_STAGE2_RELOADS = Object.freeze({
  carbine: {
    gun: [[0, null], [.12, { pos: [-.055, .06, .015], rot: [.12, .23, -.28] }],
      [.54, { pos: [-.055, .065, .015], rot: [.12, .23, -.28] }],
      [.62, { pos: [-.052, .075, .012], rot: [.10, .20, -.25] }],
      [.78, { pos: [-.032, .045, 0], rot: [.18, .08, -.08] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.08, 'well', 'mag'], [.19, 'below', 'mag'],
      [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.52, 'below', 'mag'],
      [.62, 'well', 'mag'], [.66, 'well', 'cup'], [.76, 'work', 'open'],
      [.82, 'work', 'open'], [.88, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .62 },
    places: { well: { z: [0, .94, .34], y: [-.55, -.34, -.76] }, below: { drop: .14 },
      work: { at: [-.038, -.03, .11], z: [-1, .05, .1], y: [-.35, -.65, -.65] },
      pouch: { at: [-.29, -.51, -.32], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  ak: {
    gun: [[0, null], [.12, { pos: [-.065, .065, .012], rot: [.15, .25, -.32] }],
      [.34, { pos: [-.07, .07, .01], rot: [.18, .26, -.36] }],
      [.50, { pos: [-.07, .07, .01], rot: [.18, .26, -.36] }],
      [.62, { pos: [-.058, .075, .008], rot: [.12, .22, -.28] }],
      [.79, { pos: [-.025, .045, 0], rot: [.20, .06, -.10] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.10, 'well', 'mag'], [.19, 'below', 'mag'],
      [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.50, 'below', 'mag'],
      [.62, 'well', 'mag'], [.66, 'well', 'cup'], [.76, 'work', 'pinch'],
      [.83, 'work', 'pinch'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .62 },
    rock: { out: [.12, .19], in: [.50, .62], angle: .27 },
    rack: [.76, .80, .83, .045],
    places: { well: { z: [.15, .90, .41], y: [-.60, -.28, -.75] }, below: { drop: .16 },
      work: { at: [.083, .042, .13], z: [.65, .25, -.72], y: [-.7, .15, -.4] },
      pouch: { at: [-.31, -.54, -.35], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  smg: {
    gun: [[0, null], [.10, { pos: [-.035, .05, .015], rot: [.10, .20, -.23] }],
      [.51, { pos: [-.035, .055, .015], rot: [.10, .22, -.23] }],
      [.58, { pos: [-.03, .065, .008], rot: [.08, .16, -.18] }],
      [.72, { pos: [-.018, .04, 0], rot: [.14, .08, -.05] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.08, 'well', 'mag'], [.17, 'below', 'mag'],
      [.32, 'pouch', 'mag'], [.36, 'pouch', 'pouch'], [.49, 'below', 'mag'],
      [.58, 'well', 'mag'], [.62, 'well', 'cup'], [.70, 'work', 'pinch'],
      [.78, 'work', 'pinch'], [.82, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .10, swapOut: .315, swapIn: .365, seat: .58 },
    rack: [.70, .74, .78, .045],
    places: { well: { z: [0, .98, .20], y: [-.7, -.2, -.68] }, below: { drop: .12 },
      work: { at: [0, .115, .11], z: [0, -1, 0], y: [-.75, 0, -.66] },
      pouch: { at: [-.24, -.46, -.29], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  }
});

// Gun-local contact points. The support point is on the handguard for the rifles and beside the grip on the Wasp.
// A magazine's foot stays in the support palm during the reload. The work point is a fixed bolt/handle target until
// the weapon builders expose moving direct-child nodes; the viewmodel then follows those nodes.
export const VM_SOCKETS = Object.freeze({
  m4: { grip: [0, -0.106, -0.076], support: [0, -0.005, 0.36], magFoot: [0, -0.278, 0.04], work: [-0.038, -0.03, 0.11] },
  ak: { grip: [0, -0.126, -0.095], support: [0, -0.025, 0.37], magFoot: [0, -0.331, 0.14], work: [0.083, 0.042, 0.13] },
  uzi: { grip: [0, -0.088, -0.027], support: [-0.055, -0.035, 0.055], magFoot: [0, -0.324, -0.043], work: [0, 0.115, 0.11] }
});

// Reloads in view space. gun: [beat, pose] keys (pose: an offset from the hold, view space: pos m, rot [yaw, pitch,
// roll] rad); hand: the support hand's keys [beat, place, fingers] (places: 'fore' its hold, 'well' palm up under the
// magazine's foot, 'below' under that, 'pouch' out of view low left, 'work' pinching the slide's rear); mag: when it
// rides the palm (the rest of the time it is seated, or out of sight in the pouch). The beats are the third-person
// reload's (index.html RELOAD_PLAN, its sounds at 0.10 release, 0.13 out, 0.52 in, 0.62 slap, 0.74 slide back, 0.89 forward).
export const VM_RELOADS = Object.freeze({
  pistol: {
    gun: [
      [0.00, null],
      [0.12, { pos: [-0.045, 0.045, 0.03], rot: [0.16, 0.34, -0.42] }],
      [0.55, { pos: [-0.045, 0.05, 0.03], rot: [0.16, 0.36, -0.42] }],
      [0.62, { pos: [-0.04, 0.062, 0.025], rot: [0.14, 0.31, -0.4] }],   // the slap lifts it
      [0.68, { pos: [-0.03, 0.04, 0.02], rot: [0.26, 0.12, 0.55] }],     // turned to present the slide, rolled in toward the support hand
      [0.80, { pos: [-0.012, 0.03, 0.045], rot: [0.28, 0.1, 0.6] }],     // pushed out against the rack (AG-171: rolled in, so the
      [0.90, { pos: [-0.018, 0.035, 0.02], rot: [0.22, 0.12, 0.42] }],   // support forearm comes up from low left, not across the gun)
      [1.00, null]
    ],
    hand: [
      [0.00, 'fore', 'fore'], [0.10, 'well', 'mag'], [0.17, 'below', 'mag'], [0.31, 'pouch', 'mag'], [0.36, 'pouch', 'pouch'],
      [0.50, 'below', 'mag'], [0.60, 'well', 'mag'], [0.64, 'well', 'cup'], [0.71, 'work', 'pinch'], [0.89, 'work', 'pinch'],
      [0.93, 'work', 'open'], [1.00, 'fore', 'fore']
    ],
    mag: { grab: 0.10, swapOut: 0.305, swapIn: 0.375, seat: 0.60 },
    rack: [0.72, 0.76, 0.89, 0.07],   // AG-168: the slide back over [0], [1], forward at [2]; travel (gun units)
    places: {
      // gun-local (the model's own units): palm normal (z) and the forearm's way (y) as directions
      well: { z: [0, 0.955, 0.296], y: [-0.55, -0.45, -0.7] },       // the support forearm toward its own side, the gun's -x
      below: { drop: 0.13 },
      work: { z: [0.15, -1, 0.05], y: [-0.7, -0.2, -0.68], grab: [0, -0.012, 0.01] },   // AG-168: the forearm down, not up over the slide
      pouch: { at: [-0.24, -0.46, -0.24], z: [0.25, 0.9, 0.3], y: [-0.4, -0.6, 0.65] }   // view space, out of sight
    }
  },
  ...VM_STAGE2_RELOADS
});
