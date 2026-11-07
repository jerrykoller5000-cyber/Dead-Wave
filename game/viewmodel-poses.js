// game/viewmodel-poses.js - CL-281 (J10-J17, docs/specs/first-person-1.2.md): where the first-person view gun sits.
// Data only: game/viewmodel.js reads it. View space is the camera's: +x right, +y up, -z ahead, metres (the game's
// units; the marine is 1.655 units for 1.80 m, so these read as metres closely enough).
//
// A gun with an entry here is drawn by the viewmodel in first person (its own arms and gun, its own projection at
// VM.fov, never through a wall); one without keeps the old first person (his own arms seen from his eyes). Stage 4
// adds launcher, minigun, flamer and chainsaw; non-gun actions still use the body's hands.
export const VM = Object.freeze({
  fov: 60,            // degrees, vertical; the world's own field of view (the FP slider, the Aim FOV) does not touch it
  adsFov: 54,         // a little tighter down the sights, as the world narrows behind it
  near: 0.01, far: 12,
  depth: 0.04,        // the view gun's depth is pressed into the nearest 4 % of the depth range: in front of the world
  raise: 7,           // 1/s: up from below the view and back down (switching to or from it, entering first person)
  wristMax: 0.87,     // radians (50 degrees; the spec's 35 left the forearms pointing at the eye, AG-168 v2): the most a wrist bends between the forearm and the hand
  mirror: true,       // AG-168: his left-handed hold (D-75) shown mirrored, a traditional right-handed view (J12)
  twistMax: 0.6,      // radians: how far a hand may turn round the grip in its fist toward its elbow (AG-168: the forearms came at the eye)
  // The springs: k stiffness (1/s^2), z damping ratio. CL-293 (MU-31): 0.74-0.78 rang for 0.3 s after every shot and
  // stacked at automatic rates; nearer critical now, still a touch of overshoot so a flick settles with life in it.
  spring: { pos: { k: 260, z: 0.86 }, rot: { k: 240, z: 0.84 } },
  // per rad/s of the view's turn (the turn rate low-passed over tau seconds first: CL-293, a mouse at 60 fps is a
  // staircase of deltas); per m/s of strafe; ADS multiplier. CL-293 (J55: "no real fps sway"): a third more than stage 1.
  sway: { look: 0.03, lookMax: 0.09, move: 0.018, moveMax: 0.04, tau: 0.045, ads: 0.25 },
  // CL-293 (J55: "the hands and gun almost vibrate when running or walking"): the bob rides his stride (index.html's
  // walkPhase: one cycle a stride, two steps), side to side and a roll once a stride, down once a step. It used to run on
  // its own clock at speed x 1.85 a metre: 3.7 Hz side to side and 7.4 Hz up at 4 m/s, 11 and 22 Hz in a sprint.
  // [walk, run] amplitudes (metres, radians), blended by his run weight; cadence [walk, run] rad/s only if no phase is given.
  bob: { x: [0.011, 0.018], y: [0.007, 0.012], roll: [0.016, 0.03], yaw: [0.006, 0.012], cadence: [9.5, 14], ads: 0.15 },
  // CL-293: the sprint: the gun down and turned in toward the middle (screen terms), eased in over in s, out over out s.
  // (AG-202 round 1: turned in 0.32 the guns sat in the middle of the view pointing ahead; the cloud look, 2026-11-02: lowered,
  //  the muzzle down 0.55 and canted 0.45 reads as a carry, the pistol and the GW-4 both)
  sprint: { down: 0.06, across: 0, back: 0.03, yaw: 0.08, pitch: -0.55, roll: 0.45, in: 0.18, out: 0.14 },
  breathe: { rate: 0.32, y: 0.0012, pitch: 0.003, ads: 0 },   // none down the sights: they stay on the centre
  land: { per: 0.006, max: 0.045 },   // metres of dip per m/s of fall
  // CL-293 (the pass's Fire line: "the camera's share small and never a shake in first person"): each shot turns the
  // view up by `share` of the gun's own up-kick (and `side` of its side-kick), as a spring kicked from rest (k, z), so it
  // peaks after ~60 ms and is home in ~0.2 s; a full-auto string holds a little climb and lets go when it stops. Only
  // the drawn view turns (index.html fpPunchApply): the aim and the shots don't move. `max`: radians, the most it holds.
  camera: { share: 0.07, side: 0.5, k: 300, z: 0.82, max: 0.03 },
  // CL-301 (Jerry, 3 Nov: the akimbo panel was one big pistol at the bottom left and no hands): a pair. Per gun, the right
  // gun's hip (as VM_POSES hip: the grip point, yaw/pitch/roll; yaw > 0 turns its muzzle in toward the middle); the left
  // gun is its mirror across the view. elbowRel as VM_POSES (each from its own wrist). aim: right-click (no sights on a
  // pair) brings both in, up and out a little (metres). kick: each shot's recoil x this (one hand on each). dip: the reload,
  // both guns down and turned down out of the view and back up (metres, radians).
  akimbo: {
    pistol: { at: [0.19, -0.155, -0.46], yaw: 0.05, pitch: 0.02, roll: 0.07 },     // MW (Jerry's refs, 3 Nov): low, nearly upright, muzzles nearly ahead
    revolver: { at: [0.23, -0.165, -0.54], yaw: 0.30, pitch: 0.025, roll: 0.05 },  // Warzone: further out, turned in (the outer sides show)
    uzi: { at: [0.20, -0.13, -0.40], yaw: 0.40, pitch: 0.04, roll: 0 },           // MW3: big, close, high, turned in
    // The forearms up from below behind the grips (the refs; the cloud look, 3 Nov: the body's hold has them out flat to
    // the sides, and run on along the hand they still came in flat from the sides, by perspective): each hand first turns
    // round its grip toward `behind` (from its wrist, out to its side), at most twistMax, then its elbow hangs at elbowRel.
    // follow [length, drop] would run the forearm on along the hand instead (null: off).
    elbowRel: { r: [0.06, -0.30, 0.17], l: [-0.06, -0.30, 0.17] },
    behind: [0.04, -0.25, 0.20], twistMax: 1.1,
    follow: null,
    aim: { in: 0.04, up: 0.035, fwd: 0.02 },
    kick: 1.2,
    dip: { down: 0.14, back: 0, pitch: 0.35, roll: 0.6 }   // muzzles up and canted in: muzzle down turned the forearms up into the eye (the cloud look)
  }
});

// Per gun, written as the eye sees it (screen terms; game/viewmodel.js turns them into his mirrored hold). hip: the grip
// point (WEAPON_HOLD.grip) in view space, the bore's turn (yaw, pitch, roll: radians; roll < 0
// cants the top to the right, > 0 in toward the centre). ads: the rear sight's distance from the eye, down the view's centre line.
// kick: recoil per shot (back m, up rad, side rad), ads multiplier. elbows: a point in view space each forearm points
// at from its wrist (MU-11: a point, not a direction; held to the wrist's bend and the hand's turn round the grip).
// slideKick: the slide's travel on a shot (gun units).
export const VM_POSES = Object.freeze({
  pistol: {
    // Jerry's 3 Nov P2000 reference: nearly upright above both hands, rear notch low in the view.
    hip: { at: [0.17, -0.15, -0.46], yaw: 0.01, pitch: 0.02, roll: 0.09 },
    ads: { rear: 0.42 },
    kick: { back: 0.032, up: 0.11, side: 0.025, ads: 0.55 },
    slideKick: 0.055,
    elbows: { r: [0.36, -0.75, 0.06], l: [-0.34, -0.75, 0.06] },   // AG-168: low and wide, so the forearms leave the view down its corners
    // CL-293 (Jerry, 3 Nov: "elbow flared in the wrong direction... looks inverted": elbowFollow ran the forearms out flat
    // from the sides, elbows up): each elbow hangs below and behind its wrist, so the forearms come up from the bottom corners.
    elbowRel: { r: [0.10, -0.30, 0.16], l: [-0.10, -0.30, 0.16] },
    reload: 'pistol'
  },
  m4: {
    hip: { at: [0.18, -0.21, -0.40], yaw: -0.07, pitch: 0.035, roll: -0.11 },
    ads: { rear: 0.54 },   // holographic window at a readable size once the shoulder stock is eye-hidden
    kick: { back: 0.044, up: 0.09, side: 0.018, ads: 0.50 },
    workKick: 0.025,
    elbows: { r: [0.33, -0.61, -0.10], l: [-0.36, -0.95, -0.26] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'carbine'
  },
  ak: {
    hip: { at: [0.18, -0.21, -0.40], yaw: -0.07, pitch: 0.045, roll: -0.12 },
    ads: { rear: 0.70 },   // KR-7 leaf sight; the shoulder stock shows at hip and is hidden down the sights
    kick: { back: 0.063, up: 0.15, side: 0.032, ads: 0.58 },
    workKick: 0.035,
    elbows: { r: [0.35, -0.63, -0.12], l: [-0.40, -1.10, -0.27] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'ak'
  },
  uzi: {
    hip: { at: [0.16, -0.17, -0.40], yaw: 0.03, pitch: 0.025, roll: -0.10 },
    ads: { rear: 0.43 },   // the Wasp's tower stays legible without bringing the receiver into the face
    kick: { back: 0.025, up: 0.062, side: 0.016, ads: 0.45 },
    workKick: 0.03,
    elbows: { r: [0.27, -0.58, -0.08], l: [-0.23, -0.56, -0.18] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'smg'
  },
  shotgun: {
    hip: { at: [0.18, -0.21, -0.40], yaw: -0.12, pitch: 0.045, roll: 0.105 },
    ads: { rear: 0.35 },
    kick: { back: 0.075, up: 0.19, side: 0.035, ads: 0.58 },
    elbows: { r: [0.36, -0.64, -0.10], l: [-0.40, -1.02, -0.24] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'tube'
  },
  aa12: {
    hip: { at: [0.19, -0.22, -0.40], yaw: -0.12, pitch: 0.035, roll: 0.095 },
    ads: { rear: 0.43 },
    kick: { back: 0.032, up: 0.075, side: 0.015, ads: 0.48 },
    elbows: { r: [0.37, -0.66, -0.10], l: [-0.42, -1.18, -0.25] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'drum'
  },
  revolver: {
    hip: { at: [0.20, -0.19, -0.49], yaw: 0.20, pitch: 0.025, roll: 0.12 },
    ads: { rear: 0.43 },
    kick: { back: 0.055, up: 0.20, side: 0.032, ads: 0.55 },
    elbows: { r: [0.37, -0.76, 0.07], l: [-0.35, -0.76, 0.07] },
    elbowRel: { r: [0.10, -0.30, 0.16], l: [-0.10, -0.30, 0.16] },   // CL-293 (3 Nov): as the pistol, elbows below the wrists (was elbowFollow, J57)
    reload: 'cylinder'
  },
  sniper: {
    hip: { at: [0.21, -0.28, -0.55], yaw: 0, pitch: 0.025, roll: 0.09 },
    ads: { rear: 0.17 },
    kick: { back: 0.09, up: 0.24, side: 0.018, ads: 0.58 },
    elbows: { r: [0.38, -0.67, -0.11], l: [-0.44, -1.40, -0.27] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'sniper'
  },
  // J60: the bar runs up the middle, with both hands on the two real handles.
  chainsaw: {
    hip: { at: [0.26, -0.23, -0.62], yaw: 0.25, pitch: 0.45, roll: 0.4 },   // GB-292 redo: saw low right, nose up so the bar shows above the left forearm; both hands on their handles in view
    ads: { rear: 0.90 },
    kick: { back: 0, up: 0, side: 0, ads: 1 },
    elbows: { r: [0.35, -0.94, -0.10], l: [-0.35, -0.97, -0.24] },
    elbowFollow: [0.28, 0.04]   // CL-301 (the motorcycle grip): each forearm on along its hand's line, the wrists straight
  },
  // J61: the carrying hand holds the top trigger and the other palm bears the
  // underside of the drive housing, away from the spinning barrel cluster.
  minigun: {
    hip: { at: [0.228, -0.433, -0.411], yaw: 0.12, pitch: 0.015, roll: -0.09 },   // CL-301 (Jerry's L4D2 and render refs, 3 Nov): the barrels nearer the middle; GP-20022: placed by the rear grip (the gun where it was)
    ads: { rear: 0.76 },
    kick: { back: 0.012, up: 0.012, side: 0.004, ads: 0.45 },
    elbows: { r: [0.40, -0.86, -0.09], l: [-0.43, -1.00, -0.25] },
    elbowRel: { r: [0.12, -0.28, 0.22], l: [-0.22, -0.25, 0.25] },   // CL-301 (GP-20022/24): the right forearm up from below to the rear grip, the left from the lower left to the side peg, outside the gun
    reload: 'minigunBox'
  },
  flamer: {
    hip: { at: [0.18, -0.21, -0.40], yaw: -0.05, pitch: 0.025, roll: -0.08 },
    ads: { rear: 0.58 },
    kick: { back: 0.005, up: 0.004, side: 0.002, ads: 0.5 },
    elbows: { r: [0.37, -0.72, -0.12], l: [-0.39, -1.02, -0.25] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'flamerTank'
  },
  launcher: {
    hip: { at: [0.21, -0.21, -0.55], yaw: 0, pitch: 0.035, roll: 0.09 },
    ads: { rear: 0.82 },   // GP-20037: more eye relief shrinks the rear receiver without moving the leaf/front sight line
    kick: { back: 0.11, up: 0.20, side: 0.025, ads: 0.58 },
    elbows: { r: [0.39, -0.74, -0.11], l: [-0.44, -1.10, -0.27] },
    elbowRel: { r: [0.16, -0.26, 0.24], l: [-0.04, -0.34, 0.14] },   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'launcherDrum'
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
      [.72, { pos: [-.08, -.10, -.08], rot: [.10, -.10, -.42] }],   // CL-306: for the pull the gun goes down and ahead, rolled left, so the arm crosses low
      [.84, { pos: [-.08, -.10, -.08], rot: [.10, -.10, -.42] }],
      [.92, { pos: [-.025, .03, 0], rot: [.18, .04, -.10] }], [1, null]],
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
    // CL-306 (the audit): for the rack the gun goes out and down (ahead 9 cm, down 4) so the top knob is away from the eye
    // and the support forearm comes up to it from the lower left instead of across the view.
    gun: [[0, null], [.10, { pos: [-.035, .05, .015], rot: [.10, .20, -.23] }],
      [.51, { pos: [-.035, .055, .015], rot: [.10, .22, -.23] }],
      [.58, { pos: [-.03, .065, .008], rot: [.08, .16, -.18] }],
      [.66, { pos: [-.07, -.12, -.10], rot: [.04, -.12, -.30] }],   // (rolled 63 degrees was tried: the forearm filled the centre of the view instead)
      [.80, { pos: [-.07, -.12, -.10], rot: [.04, -.12, -.30] }],
      [.90, { pos: [-.018, .02, -.01], rot: [.12, .06, -.05] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.08, 'well', 'mag'], [.17, 'below', 'mag'],
      [.32, 'pouch', 'mag'], [.36, 'pouch', 'pouch'], [.49, 'below', 'mag'],
      [.58, 'well', 'mag'], [.62, 'well', 'cup'], [.70, 'work', 'pinch'],
      [.78, 'work', 'pinch'], [.82, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .10, swapOut: .315, swapIn: .365, seat: .58 },
    rack: [.70, .74, .78, .045],
    places: { well: { z: [0, .98, .20], y: [-.7, -.2, -.68] }, below: { drop: .12 },
      work: { at: [0, .115, .11], z: [0, -1, 0], y: [-.72, -.38, -.58] },   // CL-306: the forearm from the lower left
      pouch: { at: [-.24, -.46, -.29], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  }
});

// Stage 3: the game reloads the pump one shell per .42 s cycle, so each tube
// sequence below is one shell; the source gun still owns the pump/cylinder/bolt
// motion. The view hands follow those copied moving parts.
const VM_STAGE3_RELOADS = Object.freeze({
  drum: {
    gun: [[0, null], [.12, { pos: [-.065, .075, .025], rot: [.12, .24, -.27] }],
      [.52, { pos: [-.065, .075, .025], rot: [.12, .24, -.27] }],
      [.62, { pos: [-.055, .085, .018], rot: [.10, .19, -.22] }],
      [.78, { pos: [-.035, .05, .01], rot: [.13, .08, -.09] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.12, 'well', 'mag'], [.19, 'below', 'mag'],
      [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.53, 'below', 'mag'],
      [.62, 'well', 'mag'], [.66, 'well', 'cup'], [.76, 'work', 'pinch'],
      [.83, 'work', 'pinch'], [.88, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .62 },
    places: { well: { z: [0, .94, .34], y: [.62, -.28, -.73] }, below: { drop: .19 },
      work: { at: [-.08, .05, .18], z: [-.6, .25, -.75], y: [.65, -.35, -.67] },
      pouch: { at: [-.32, -.60, -.38], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  sniper: {
    gun: [[0, null], [.16, { pos: [-.055, .065, .025], rot: [.11, .20, -.23] }],
      [.54, { pos: [-.06, .07, .025], rot: [.11, .20, -.23] }],
      [.62, { pos: [-.045, .07, .02], rot: [.08, .16, -.20] }],
      [.78, { pos: [-.035, .055, .02], rot: [.17, .06, -.10] }],
      [.94, { pos: [-.025, .035, .01], rot: [.11, .03, -.05] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.10, 'well', 'mag'], [.17, 'below', 'mag'],
      [.30, 'pouch', 'mag'], [.34, 'pouch', 'pouch'], [.45, 'below', 'mag'],
      [.54, 'well', 'mag'], [.58, 'well', 'cup'], [.62, 'work', 'pinch'],
      [.72, 'work', 'pinch'], [.83, 'work', 'pinch'], [.94, 'work', 'pinch'],
      [1, 'fore', 'fore']],
    mag: { grab: .10, swapOut: .295, swapIn: .345, seat: .54 },
    places: { well: { z: [0, .96, .28], y: [.60, -.28, -.75] }, below: { drop: .14 },
      work: { part: 'bolt', grab: [-.075, .012, .02], z: [-.8, .1, -.6], y: [.6, -.25, -.76] },
      pouch: { at: [-.32, -.54, -.34], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  tube: {
    kind: 'shell',
    gun: [[0, null], [.12, { pos: [-.025, .055, .015], rot: [-.14, .10, .04] }],
      [.78, { pos: [-.025, .055, .015], rot: [-.14, .10, .04] }],
      [.90, { pos: [-.02, .04, .015], rot: [-.08, .05, .02] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.14, 'pouch', 'pouch'], [.29, 'pouch', 'cup'],
      [.50, 'port', 'cup'], [.56, 'port', 'cup'], [.74, 'port', 'open'],
      [.81, 'pump', 'cup'], [.94, 'pump', 'cup'], [1, 'fore', 'fore']],
    places: { port: { at: [.02, -.05, .22], z: [0, .9, .43], y: [.68, -.22, -.70] },
      pump: { part: 'pump', at: [0, -.015, 0], z: [0, .5, .866], y: [.65, -.42, -.64] },
      pouch: { at: [-.28, -.52, -.30], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  cylinder: {
    kind: 'part',
    gun: [[0, null], [.14, { pos: [-.025, .04, .025], rot: [-.06, .13, .05] }],
      [.78, { pos: [-.025, .04, .025], rot: [-.06, .13, .05] }],
      [.96, { pos: [-.015, .025, .012], rot: [-.03, .07, .02] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.08, 'part', 'open'], [.16, 'ejector', 'open'],
      [.20, 'ejector', 'pinch'], [.28, 'pouch', 'open'], [.36, 'pouch', 'pinch'],
      [.46, 'loader', 'pinch'], [.76, 'loader', 'open'],
      [.82, 'part', 'cup'], [.94, 'fore', 'fore'], [1, 'fore', 'fore']],
    places: { part: { part: 'cylinder', at: [0, -.035, -.04], z: [0, .95, .31], y: [.65, -.3, -.7] },
      ejector: { part: 'cylinder', at: [0, -.004, .123], z: [0, .8, .6], y: [.65, -.3, -.7] },
      loader: { part: 'cylinder', at: [0, 0, -.06], z: [0, .9, .44], y: [.65, -.3, -.7] },
      pouch: { at: [-.24, -.49, -.27], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  // The source gun opens and closes its ammo box. Follow that direct child
  // with the support palm while the trigger hand stays on the carry grip.
  minigunBox: {
    gun: [[0, null], [.16, { pos: [0, .025, 0], rot: [0, -.08, .025] }],
      [.78, { pos: [0, .025, 0], rot: [0, -.08, .025] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.12, 'box', 'cup'], [.28, 'box', 'cup'],
      [.38, 'pouch', 'pouch'], [.48, 'pouch', 'cup'], [.62, 'box', 'cup'],
      [.80, 'box', 'open'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    places: { box: { part: 'mag', at: [0, -.065, 0], z: [-.2, -.8, .56], y: [-.6, -.4, -.69] },
      pouch: { at: [-.32, -.52, -.35], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  flamerTank: {
    gun: [[0, null], [.30, { pos: [-.015, -.04, .02], rot: [0, .24, -.05] }],
      [.80, { pos: [-.015, -.04, .02], rot: [0, .24, -.05] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.20, 'tank', 'cup'], [.35, 'tank', 'cup'],
      [.45, 'pouch', 'pouch'], [.55, 'pouch', 'cup'], [.70, 'tank', 'cup'],
      [.86, 'tank', 'open'], [.96, 'fore', 'fore'], [1, 'fore', 'fore']],
    places: { tank: { part: 'mag', at: [0, -.10, .08], z: [0, -.8, .6], y: [-.6, -.45, -.66] },
      pouch: { at: [-.29, -.50, -.31], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  launcherDrum: {
    gun: [[0, null], [.13, { pos: [-.035, .045, .025], rot: [-.05, .16, .06] }],
      [.78, { pos: [-.035, .045, .025], rot: [-.05, .16, .06] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.18, 'pouch', 'pouch'], [.30, 'pouch', 'cup'],
      [.50, 'drum', 'cup'], [.76, 'drum', 'open'], [.91, 'fore', 'fore'], [1, 'fore', 'fore']],
    places: { drum: { part: 'mag', at: [0, -.03, .055], z: [0, .8, .6], y: [.55, -.4, -.72] },
      pouch: { at: [-.29, -.51, -.32], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  }
});

// Gun-local contact points. The support point is on the handguard for the rifles and beside the grip on the Wasp.
// A magazine's foot stays in the support palm during the reload. The work point is a fixed bolt/handle target until
// the weapon builders expose moving direct-child nodes; the viewmodel then follows those nodes.
export const VM_SOCKETS = Object.freeze({
  // CL-293 (J54: "the left hand should grip the pistol the way a real shooter would"): the support hand comes in off the body's
  // hold (its fist sat 16 cm out from the grip, beside it) onto the grip's front, its fingers over the strong hand's (the
  // cloud look, 2026-11-02: in from -0.03 to -0.012 the fingers wrap without coming through the far side).
  pistol: { support: [-0.012, -0.10, -0.02] },
  m4: { grip: [0, -0.106, -0.076], support: [0, -0.005, 0.36], magFoot: [0, -0.278, 0.04], work: [-0.038, -0.03, 0.11] },
  ak: { grip: [0, -0.126, -0.095], support: [0, -0.025, 0.37], magFoot: [0, -0.331, 0.14], work: [0.083, 0.042, 0.13] },
  uzi: { grip: [0, -0.088, -0.027], support: [-0.055, -0.035, 0.055], magFoot: [0, -0.324, -0.043], work: [0, 0.115, 0.11] },
  shotgun: { grip: [0, -0.088, -0.056], support: [0, -0.035, 0.28], port: [0.02, -0.05, 0.22] },
  aa12: { grip: [0, -0.145, -0.166], support: [0, -0.035, 0.36], magFoot: [0, -0.415, 0.05], work: [-0.08, 0.05, 0.18] },
  revolver: { grip: [0, -0.07, -0.04], support: [-0.012, -0.10, -0.014] },   // J57: palm cups the grip, not air beside it
  sniper: { grip: [0, -0.088, -0.117], support: [0, -0.005, 0.35], magFoot: [0, -0.203, 0.02], boltKnob: [-0.13, 0.067, -0.16] },
  // CL-301 (GP-20022): rear throttle + front hoop. GB-292 (J1): contacts were already R=rear/L=front but the left fist
  // sat on the cowling behind the hoop (basis too steep) and the right hand had no gripBasis so the rear throttle read empty.
  // Right: vertical throttle, palm inward, elbow back; left: motorcycle on the hoop top, palm down, forearm mostly back.
  // GB-292 redo (Claude's 04:14Z review: one forearm filled the view): elbowFollow runs each forearm along its hand's y, which
  // the code keeps square to the channel x. With x along the hoop the left forearm could only run back, so it crossed the view
  // over the rear hand. The left channel now crosses the bar on a diagonal and the forearms run out to the bottom corners.
  chainsaw: { grip: [0, -0.014, -0.43], gripBasis: { x: [0, -1, 0], y: [0.5, -0.1, -0.85] },
    support: [-0.01, 0.250, -0.035], supportBasis: { x: [-0.4, 0.2, 0.7], y: [-0.85, -0.3, -0.4] },
    supportPose: { f: [[1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [1.0, -0.3, 0.55] } },   // HAND_POSES.fist
  // CL-301 (Jerry, 3 Nov: "Right hand is sticking through minigun"; GP-20022 rebuilt it to his refs): the rear firing grip
  // behind the housing and the front vertical post on top (ChatGPT's handle centres).
  // Jerry, 4 Nov: "create a grip that juts off to the side. Something like a peg to hold into. That way his arm will not clip
  // through the gun": GP-20024's side peg (centre (-0.304, 0.012, 0.16), axis vertical), the left hand round it from outside.
  minigun: { grip: [0, -0.017, -0.52], support: [-0.304, 0.012, 0.16], supportBasis: { x: [0, -1, 0], y: [-0.6, -0.3, -0.74] },
    supportPose: { f: [[1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [1.0, -0.3, 0.55] } },   // HAND_POSES.fist
  flamer: { grip: [0, -0.078, -0.157], support: [0, -0.07, 0.28] },
  // The frame stays anchored on the grip centre; the trigger glove closes lower
  // and on the visible side of that same grip (GP-20037, J4).
  launcher: { grip: [0, -0.088, -0.046], gripContact: [-0.05, -0.15, -0.10], support: [0, -0.075, 0.42] }
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
      [0.68, { pos: [-0.04, 0.0, -0.03], rot: [0.22, 0.0, 0.42] }],      // CL-306 (the audit: it rolled 90 degrees): a 25-degree tilt in toward the support hand, the gun a little ahead
      [0.80, { pos: [-0.03, -0.005, -0.02], rot: [0.24, 0.0, 0.45] }],   // pushed out against the rack
      [0.90, { pos: [-0.02, 0.0, 0.0], rot: [0.2, 0.06, 0.3] }],
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
  ...VM_STAGE2_RELOADS,
  ...VM_STAGE3_RELOADS
});
