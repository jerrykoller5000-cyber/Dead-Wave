// game/viewmodel-poses.js - CL-281 (J10-J17, docs/specs/first-person-1.2.md): where the first-person view gun sits.
// Data only: game/viewmodel.js reads it. View space is the camera's: +x right, +y up, -z ahead, metres (the game's
// units; the marine is 1.655 units for 1.80 m, so these read as metres closely enough).
//
// A gun with an entry here is drawn by the viewmodel in first person (its own arms and gun, its own projection at
// VM.fov, never through a wall); one without keeps the old first person (his own arms seen from his eyes). Stage 4
// adds launcher, minigun, flamer and chainsaw; non-gun actions still use the body's hands.
export const VM = Object.freeze({
  fov: 54,            // degrees, vertical; the world's own field of view (the FP slider, the Aim FOV) does not touch it. CL-324 (J88: "FOV should be closer"): 54 (was 60)
  adsFov: 48,         // a little tighter down the sights, as the world narrows behind it (CL-324: 48, was 54)
  near: 0.01, far: 12,
  depth: 0.04,        // the view gun's depth is pressed into the nearest 4 % of the depth range: in front of the world
  raise: 7,           // 1/s: up from below the view and back down (switching to or from it, entering first person)
  reloadElbowL: [-0.04, -0.34, 0.14],
  // CL-328 (D-125): the hand-over on a view change. time/out: seconds in and out; across: how far over his other side
  // it starts (1: the mirrored pose); low, dip: metres lower there and at the middle of the way; hand: the part of the way
  // over which the firing hand comes up onto the grip, from handDrop below and handOut out
  swap: { time: 0.35, out: 0.2, across: 0.85, low: 0.05, dip: 0.07, hand: [0.45, 0.95], handDrop: 0.28, handOut: 0.08 },
  // CL-326 (J82): the chainsaw's pull-start: the firing elbow's hint from the starter's handle (out, down, back as the eye
  // sees it) and the palm's facing in the saw's own axes
  sawStart: { elbow: [0.16, -0.26, 0.24], palm: [-0.3, -0.9, -0.3] },
  boltElbowR: [0.14, -0.24, 0.22],   // CL-326: the firing elbow's hint working a bolt, from the knob (as the eye sees it: out, down, back)   // CL-326: the support elbow's hint during a reload, from the hold's wrist (as the eye sees it: out, down, back)
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
    pistol: { at: [0.19, -0.155, -0.46], yaw: 0.032, pitch: 0.02, roll: 0.07 },     // MW (Jerry's refs, 3 Nov): low, nearly upright, muzzles nearly ahead
    revolver: { at: [0.23, -0.165, -0.54], yaw: 0.038, pitch: 0.025, roll: 0.05 },  // Warzone: further out, turned in (the outer sides show)
    uzi: { at: [0.20, -0.13, -0.40], yaw: 0.033, pitch: 0.04, roll: 0 },           // GB-294 J11: less inward than MW3 0.40
    // The forearms up from below behind the grips (the refs; the cloud look, 3 Nov: the body's hold has them out flat to
    // the sides, and run on along the hand they still came in flat from the sides, by perspective): each hand first turns
    // round its grip toward `behind` (from its wrist, out to its side), at most twistMax, then its elbow hangs at elbowRel.
    // follow [length, drop] would run the forearm on along the hand instead (null: off).
    elbowRel: { r: [0.08, -0.065, 0.30], l: [-0.08, -0.065, 0.30] },   // CL-325 (J73: "palm of hand to be parallel with arms"): the forearms in line with the hands, the wrists 0.19-0.22 rad (was [.05,-.16,.27], before that [.06,-.30,.17])
    behind: [0.03, -0.14, 0.27], twistMax: 1.1,   // CL-325 (was [.04,-.25,.20])
    sprint: { down: 0.025, across: 0, back: 0.015, yaw: 0.02, pitch: -0.12, roll: 0.06, in: 0.18, out: 0.14 }, runBob: 1.7,   // CL-325 (J73): a jog, not the long guns' lowered carry
    follow: null,
    aim: { in: 0.04, up: 0.035, fwd: 0.02 },
    kick: 1.2,
    dip: { down: 0.14, back: 0, pitch: 0.35, roll: 0.6 },  // muzzles up and canted in: muzzle down turned the forearms up into the eye (the cloud look)
    // CL-306: each gun's own dip in turn (the right 0.06-0.50 of the reload, the left 0.48-0.92, the body's windows). A
    // pistol or a Wasp drops out of the view to the pouch (the mag change happens below the frame, as Warzone's pair
    // does); a revolver stays in the view, muzzle up and rolled in, so its cylinder (GB-300) swings out to the eye.
    dipBy: {
      pistol: { down: 0.42, back: 0.10, out: 0.03, pitch: 0.30, roll: 0.5 },
      uzi: { down: 0.54, back: 0.10, out: 0.03, pitch: 0.18, roll: 0.45 },   // long: a muzzle sliver showed at the bottom edge at .46/.28
      revolver: { down: 0.10, back: 0.02, out: 0, pitch: 0.45, roll: 0.95 }
    }
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
    hip: { at: [0.156, -0.138, -0.42], yaw: 0.026, pitch: 0.023, roll: 0.09 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.17, -0.15, -0.46], yaw: 0.01, pitch: 0.02, roll: 0.09 }); ads rear 0.38 (was 0.42): the sights close to the eye, shouldered
    ads: { rear: 0.38 },
    kick: { back: 0.032, up: 0.11, side: 0.025, ads: 0.55 },
    slideKick: 0.055,
    elbows: { r: [0.36, -0.75, 0.06], l: [-0.34, -0.75, 0.06] },   // AG-168: low and wide, so the forearms leave the view down its corners
    // CL-293 (Jerry, 3 Nov: "elbow flared in the wrong direction... looks inverted": elbowFollow ran the forearms out flat
    // from the sides, elbows up): each elbow hangs below and behind its wrist, so the forearms come up from the bottom corners.
    elbowRel: { r: [0.076, -0.024, 0.308], l: [-0.101, -0.074, 0.293] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.07, -0.17, 0.26], l [-0.07, -0.17, 0.26])
    sprint: { down: 0.025, across: 0, back: 0.015, yaw: 0.02, pitch: -0.12, roll: 0.06, in: 0.18, out: 0.14 }, runBob: 1.7,   // CL-325 (J73)
    reload: 'pistol'
  },
  m4: {
    hip: { at: [0.27, -0.235, -0.41], yaw: 0.045, pitch: 0.039, roll: -0.11 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.30, -0.26, -0.50], yaw: 0.37, pitch: 0.08, roll: -0.11 }); ads rear 0.24 (was 0.54): the sights close to the eye, shouldered
    ads: { rear: 0.24 },   // holographic window at a readable size once the shoulder stock is eye-hidden
    kick: { back: 0.044, up: 0.09, side: 0.018, ads: 0.50 },
    workKick: 0.025,
    elbows: { r: [0.33, -0.61, -0.10], l: [-0.36, -0.95, -0.26] },
    elbowRel: { r: [0.218, -0.083, 0.31], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'carbine'
  },
  ak: {
    hip: { at: [0.25, -0.235, -0.41], yaw: 0.042, pitch: 0.039, roll: -0.12 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.27, -0.26, -0.50], yaw: 0.32, pitch: 0.09, roll: -0.12 }); ads rear 0.3 (was 0.70): the sights close to the eye, shouldered
    ads: { rear: 0.3 },   // KR-7 leaf sight; the shoulder stock shows at hip and is hidden down the sights
    kick: { back: 0.063, up: 0.15, side: 0.032, ads: 0.58 },
    workKick: 0.035,
    elbows: { r: [0.35, -0.63, -0.12], l: [-0.40, -1.10, -0.27] },
    elbowRel: { r: [0.22, -0.086, 0.308], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'ak'
  },
  uzi: {
    hip: { at: [0.147, -0.156, -0.4], yaw: 0.024, pitch: 0.026, roll: -0.10 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.16, -0.17, -0.40], yaw: 0.03, pitch: 0.025, roll: -0.10 }); ads rear 0.3 (was 0.43): the sights close to the eye, shouldered
    ads: { rear: 0.3 },   // the Wasp's tower stays legible without bringing the receiver into the face
    kick: { back: 0.025, up: 0.062, side: 0.016, ads: 0.45 },
    workKick: 0.03,
    elbows: { r: [0.27, -0.58, -0.08], l: [-0.23, -0.56, -0.18] },
    elbowRel: { r: [0.255, -0.091, 0.279], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    sprint: { down: 0.025, across: 0, back: 0.015, yaw: 0.02, pitch: -0.12, roll: 0.06, in: 0.18, out: 0.14 }, runBob: 1.7,   // CL-325 (J74: "Running suffers from the same problem as the pistols")
    reload: 'smg'
  },
  shotgun: {
    hip: { at: [0.27, -0.245, -0.4], yaw: 0.045, pitch: 0.041, roll: 0.105 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.35, -0.31, -0.50], yaw: 0.27, pitch: 0.10, roll: 0.105 }); ads rear 0.26 (was 0.35): the sights close to the eye, shouldered
    ads: { rear: 0.26 },
    kick: { back: 0.075, up: 0.19, side: 0.035, ads: 0.58 },
    elbows: { r: [0.36, -0.64, -0.10], l: [-0.40, -1.02, -0.24] },
    elbowRel: { r: [0.215, -0.056, 0.318], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'tube'
  },
  aa12: {
    hip: { at: [0.28, -0.255, -0.4], yaw: 0.047, pitch: 0.042, roll: 0.095 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.34, -0.31, -0.50], yaw: 0.32, pitch: 0.11, roll: 0.095 }); ads rear 0.26 (was 0.43): the sights close to the eye, shouldered
    ads: { rear: 0.26 },
    kick: { back: 0.032, up: 0.075, side: 0.015, ads: 0.48 },
    boltStroke: 0.10,   // CL-322: the constant-recoil bolt's stroke per shot (model units; recoilBoltPose)
    elbows: { r: [0.37, -0.66, -0.10], l: [-0.42, -1.18, -0.25] },
    elbowRel: { r: [0.216, -0.058, 0.318], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'drum'
  },
  revolver: {
    hip: { at: [0.184, -0.175, -0.42], yaw: 0.031, pitch: 0.029, roll: 0.12 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.20, -0.19, -0.49], yaw: 0.20, pitch: 0.025, roll: 0.12 }); ads rear 0.38 (was 0.43): the sights close to the eye, shouldered
    ads: { rear: 0.38 },
    kick: { back: 0.055, up: 0.20, side: 0.032, ads: 0.55 },
    elbows: { r: [0.37, -0.76, 0.07], l: [-0.35, -0.76, 0.07] },
    elbowRel: { r: [0.07, -0.025, 0.31], l: [-0.103, -0.077, 0.291] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.07, -0.17, 0.26], l [-0.07, -0.17, 0.26])
    sprint: { down: 0.025, across: 0, back: 0.015, yaw: 0.02, pitch: -0.12, roll: 0.06, in: 0.18, out: 0.14 }, runBob: 1.7,   // CL-325 (J73)
    reload: 'cylinder'
  },
  sniper: {
    hip: { at: [0.23, -0.28, -0.57], yaw: 0, pitch: 0.025, roll: 0.09 },
    ads: { rear: 0.17 },
    kick: { back: 0.09, up: 0.24, side: 0.018, ads: 0.58 },
    elbows: { r: [0.38, -0.67, -0.11], l: [-0.44, -1.40, -0.27] },
    elbowRel: { r: [0.204, -0.056, 0.326], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'sniper'
  },
  // J60: the bar runs up the middle, with both hands on the two real handles.
  chainsaw: {
    hip: { at: [0.30, -0.27, -0.60], yaw: 0.75, pitch: 0.40, roll: 0.55 },   // CL-322 (9c): the nose left, the bar and teeth out beside the engine (was [0.26,-0.23,-0.62] 0.25/0.58/0.4);   // CL-322: pitch 0.45 -> 0.58, GP-20063's shorter bar up out of the forearm;   // GB-292 redo: saw low right, nose up so the bar shows above the left forearm; both hands on their handles in view
    ads: { rear: 0.90, pose: { at: [0.24, -0.26, -0.64], yaw: 0.40, pitch: 0.75, roll: 0.30 } },   // CL-322 (AG-261: the bar hidden down the sights): raised, centred, the bar up the middle (J60)
    kick: { back: 0, up: 0, side: 0, ads: 1 },
    elbows: { r: [0.35, -0.94, -0.10], l: [-0.35, -0.97, -0.24] },
    elbowFollow: [0.28, 0.04]   // CL-301 (the motorcycle grip): each forearm on along its hand's line, the wrists straight
  },
  // J61: the carrying hand holds the top trigger and the other palm bears the
  // underside of the drive housing, away from the spinning barrel cluster.
  minigun: {
    hip: { at: [0.198, -0.363, -0.42], yaw: 0.033, pitch: 0.06, roll: -0.09 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.215, -0.395, -0.43], yaw: 0.12, pitch: 0.015, roll: -0.09 }); ads rear 0.45 (was 0.76): the sights close to the eye, shouldered;   // CL-322: up 4 cm, in 1 cm, forward 2 cm for GP-20063's 0.70 gun (was [0.228, -0.433, -0.411]);   // CL-301 (Jerry's L4D2 and render refs, 3 Nov): the barrels nearer the middle; GP-20022: placed by the rear grip (the gun where it was)
    ads: { rear: 0.45 },
    kick: { back: 0.012, up: 0.012, side: 0.004, ads: 0.45 },
    elbows: { r: [0.40, -0.86, -0.09], l: [-0.43, -1.00, -0.25] },
    elbowRel: { r: [0.092, -0.083, 0.355], l: [-0.246, -0.143, 0.304] },   // CL-325 l: the wrists straighter (was r [0.12, -0.28, 0.22], l [-0.22, -0.25, 0.25]);   // CL-301 (GP-20022/24): the right forearm up from below to the rear grip, the left from the lower left to the side peg, outside the gun
    reload: 'minigunBox'
  },
  flamer: {
    hip: { at: [0.166, -0.193, -0.4], yaw: 0.028, pitch: 0.032, roll: -0.08 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.18, -0.21, -0.40], yaw: -0.05, pitch: 0.025, roll: -0.08 }); ads rear 0.4 (was 0.58): the sights close to the eye, shouldered
    ads: { rear: 0.4 },
    kick: { back: 0.005, up: 0.004, side: 0.002, ads: 0.5 },
    elbows: { r: [0.37, -0.72, -0.12], l: [-0.39, -1.02, -0.25] },
    elbowRel: { r: [0.329, -0.123, 0.165], l: [-0.146, -0.191, 0.279] },   // CL-325 l: the wrists straighter (was r [0.16, -0.26, 0.24], l [-0.04, -0.34, 0.14]);   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
    reload: 'flamerTank'
  },
  launcher: {
    hip: { at: [0.19, -0.19, -0.42], yaw: 0.032, pitch: 0.032, roll: 0.09 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.21, -0.21, -0.55], yaw: 0, pitch: 0.035, roll: 0.09 }); ads rear 0.32 (was 0.82): the sights close to the eye, shouldered
    ads: { rear: 0.32 },   // GP-20037: more eye relief shrinks the rear receiver without moving the leaf/front sight line
    kick: { back: 0.11, up: 0.20, side: 0.025, ads: 0.58 },
    elbows: { r: [0.39, -0.74, -0.11], l: [-0.44, -1.10, -0.27] },
    elbowRel: { r: [0.213, -0.056, 0.32], l: [-0.141, -0.29, 0.181] },   // CL-325 l: the wrists straighter (was r [0.16, -0.26, 0.24], l [-0.04, -0.34, 0.14]);   // CL-293: the strong arm from the lower right, the support forearm up from the bottom (Jerry's CS references, 3 Nov)
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
      work: { at: [-.03, -.03, .105], z: [-1, .05, .1], y: [-.35, -.65, -.65] },   // CL-310: the bolt catch on the slim lower
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
    // CL-322 (the AK manual, GP-20056's lugs): out, the catch pressed, the magazine rocks forward on its front lug at the
    // well (.12-.17) and only then comes down; in, it arrives tilted with the front lug in the well (.555) and rocks back
    // on it until the rear lug catches (.585-.64). The palm turns about the lug with it (rock.pivot, mag-local).
    hand: [[0, 'fore', 'fore'], [.10, 'well', 'mag'], [.17, 'well', 'mag'], [.22, 'below', 'mag'],
      [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.50, 'below', 'mag'],
      [.555, 'well', 'mag'], [.64, 'well', 'mag'], [.67, 'well', 'cup'], [.76, 'work', 'pinch'],
      [.83, 'work', 'pinch'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .64 },
    rock: { out: [.12, .17], in: [.585, .64], angle: .27, pivot: [0, .012, .066] },
    rack: [.76, .80, .83, .045],
    places: { well: { z: [.15, .90, .41], y: [-.60, -.28, -.75] }, below: { drop: .16 },
      work: { at: [.041, .02, .13], z: [.65, .25, -.72], y: [-.7, .15, -.4] },   // CL-311: the knob on the slim receiver
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
      [.62, 'well', 'mag'], [.66, 'well', 'cup'], [.745, 'work', 'cup'],
      [.80, 'work', 'cup'], [.83, 'workBack', 'open'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .62 },
    // CL-326 (J77): the handle hooked from the gun's left, pulled back along its slot and let fly (the hand stays back)
    rack: [.75, .80, .825, .11],
    places: { well: { z: [0, .94, .34], y: [.62, -.28, -.73] }, below: { drop: .19 },
      work: { at: [-.078, .012, .185], z: [.9, -.2, -.3], y: [-.35, -.75, -.55] },   // CL-313: the handle on the slim receiver; CL-326: the palm to the gun under the handle, the fingers hooked up over it, the forearm from the lower left (it pointed to the gun's right, through the receiver)
      workBack: { at: [-.078, .012, .075], z: [.9, -.2, -.3], y: [-.35, -.75, -.55] },
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
    // CL-306 (the audit: the load happened unseen behind the receiver): the gun rolls 30 degrees to the left and lifts, so
    // the loading port under the receiver turns toward the eye and the shell is seen going in
    // CL-326 (J76): a little up and rolled 17 degrees toward the support hand (was 43); the shell pinched from the pouch,
    // up from the lower left into the port, pushed in, the hand straight back to the forend (no pump beat)
    gun: [[0, null], [.12, { pos: [-.03, .04, .02], rot: [-.16, .08, .50] }],
      [.76, { pos: [-.03, .04, .02], rot: [-.16, .08, .50] }],
      [.90, { pos: [-.015, .02, .01], rot: [-.08, .04, .25] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.12, 'pouch', 'pouch'], [.24, 'pouch', 'pinch'],
      [.44, 'port', 'pinch'], [.60, 'port', 'pinch'], [.70, 'port', 'open'],
      [.84, 'fore', 'fore'], [1, 'fore', 'fore']],
    shell: { inHand: [.24, .52], push: [.52, .62], depth: .05 },
    places: { port: { at: [-.015, -.08, .07], z: [0, .9, .43], y: [-.62, -.30, -.72] },   // CL-312: the port under the receiver's front; CL-326: the forearm from the lower left (y was +x)
      pump: { part: 'pump', at: [0, -.022, .09], z: [0, .5, .866], y: [.65, -.42, -.64] },
      pouch: { at: [-.28, -.52, -.30], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  cylinder: {
    kind: 'part',
    gun: [[0, null], [.14, { pos: [-.025, .04, .025], rot: [-.06, .13, .05] }],
      [.78, { pos: [-.025, .04, .025], rot: [-.06, .13, .05] }],
      [.96, { pos: [-.015, .025, .012], rot: [-.03, .07, .02] }], [1, null]],
    // CL-326 (J78): the ejector's press throws the fired cases out first; then the cupped palm comes under the cylinder's
    // back for the unfired rounds ('catch') and takes them to the pouch
    hand: [[0, 'fore', 'fore'], [.08, 'part', 'open'], [.16, 'ejector', 'open'],
      [.20, 'ejector', 'pinch'], [.225, 'ejector', 'pinch'], [.265, 'catch', 'cup'], [.305, 'catch', 'cup'], [.34, 'pouch', 'cup'], [.38, 'pouch', 'pinch'],
      [.46, 'loader', 'pinch'], [.76, 'loader', 'open'],
      [.82, 'part', 'cup'], [.94, 'fore', 'fore'], [1, 'fore', 'fore']],
    // the fired cases (st.rounds.spent of them) slide out of the back and are the game's own brass from there (index.html
    // drops them from the view's cylinder at .212); the unfired (st.rounds.live) out into the palm, gone at the pouch
    live: { out: [.262, .29], toPalm: [.285, .305], gone: .35, travel: .05 },
    // CL-306 (GB-302's parts): the six empties show once the cylinder is out, slide out of its back under the ejector's
    // press (.18-.26) and are gone (the body drops the real ones); the loader comes up in the palm from the pouch (.38),
    // goes onto the cylinder's back (.46-.52), pushes the rounds home (.58-.70) and is gone with the hand's release.
    empties: { show: .10, out: [.18, .212], travel: .05, gone: .212 },
    loader: { show: .38, toPart: [.44, .52], back: .085, seat: .045, push: [.58, .70], gone: .76 },
    // CL-326 (J78): the forearm from the lower left (y was +x: from the right, across under the gun)
    places: { part: { part: 'cylinder', at: [0, -.035, -.04], z: [0, .95, .31], y: [-.65, -.3, -.7] },
      ejector: { part: 'cylinder', at: [0, 0, .219], z: [0, .8, .6], y: [-.65, -.3, -.7] },   // CL-320: the ejector rod's head (two inches short of the muzzle)
      loader: { part: 'cylinder', at: [0, 0, -.06], z: [0, .9, .44], y: [-.65, -.3, -.7] },
      catch: { part: 'cylinder', at: [0, -.062, -.075], z: [0, 1, .1], y: [-.65, -.3, -.7] },   // CL-326: the palm up under the cylinder's back
      pouch: { at: [-.24, -.49, -.27], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  // The source gun opens and closes its ammo box. Follow that direct child
  // with the support palm while the trigger hand stays on the carry grip.
  minigunBox: {
    // CL-306: the box hangs on the gun's right 20 cm out, below the frame from the eye whatever the roll (two tries); the
    // swap is seen only as the hand leaving and coming back until the box moves under the receiver (a second pass)
    // CL-326 (J83): lifted and rolled top-left, so the box on the gun's right comes up into the view and the swap is seen
    gun: [[0, null], [.16, { pos: [-.10, .17, .02], rot: [-.22, .16, .62] }],
      [.78, { pos: [-.10, .17, .02], rot: [-.22, .16, .62] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.14, 'box', 'cup'], [.28, 'box', 'cup'],
      [.38, 'pouch', 'pouch'], [.48, 'pouch', 'cup'], [.62, 'box', 'cup'],
      [.80, 'box', 'open'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    // CL-306 (the audit: nothing on the gun changed): the box comes off in the palm, goes to the pouch, a fresh one back on
    mag: { grab: .16, swapOut: .37, swapIn: .49, seat: .64 }, magPlace: 'box',
    places: { box: { part: 'mag', at: [-.015, -.13, -.005], z: [-.25, .88, -.37], y: [-.5, -.45, -.74] },   // CL-326: the palm up under the box's floor, the forearm from the lower left (it faced down, in the box)
      pouch: { at: [-.32, -.52, -.35], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  flamerTank: {
    // CL-326 (J81): lifted and rolled top-right, so the tanks under the receiver come out to the left of the firing hand
    gun: [[0, null], [.22, { pos: [-.02, .13, .03], rot: [-.24, 0, -.62] }],
      [.80, { pos: [-.02, .13, .03], rot: [-.24, 0, -.62] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.20, 'tank', 'cup'], [.35, 'tank', 'cup'],
      [.45, 'pouch', 'pouch'], [.55, 'pouch', 'cup'], [.70, 'tank', 'cup'],
      [.86, 'tank', 'open'], [.96, 'fore', 'fore'], [1, 'fore', 'fore']],
    // CL-306 (the audit: the can never moved): the can comes off in the palm, goes to the belt, a fresh one back on
    mag: { grab: .24, swapOut: .44, swapIn: .56, seat: .74 }, magPlace: 'tank',
    places: { tank: { part: 'mag', at: [0, -.172, .08], z: [-.25, .88, -.37], y: [-.5, -.45, -.74] },   // CL-326 (J81): the palm up under the main tank (its bottom y -0.165), the forearm from the lower left (it was in the tank's middle, facing down)
      pouch: { at: [-.29, -.50, -.31], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  },
  // CL-306 (GP-20039, J18: the six-shot swing-out MGL; ChatGPT's beats: open to .18, eject to .28, the rounds in one at a
  // time to .78, wind to .86, shut by 1). The carrier swings a half turn on a hinge parallel to the bore, out to the gun's
  // left at its own height, its chambers' backs toward the eye; between rounds the body turns it a chamber, so the chamber
  // being loaded is always at the open drum's bottom. The support hand thumbs the latch, cups the drum's underside and
  // pulls it round, then three trips from the pouch to that chamber (a round pushed home each), a twist of the winding
  // key at the drum's back, and pushes the drum shut. Places are about the parts' origins in the gun's own axes (rootAt).
  launcherDrum: {
    gun: [[0, null], [.14, { pos: [-.03, .03, 0], rot: [-.18, .12, .22] }],
      [.86, { pos: [-.03, .03, 0], rot: [-.18, .12, .22] }],
      [.95, { pos: [-.015, .015, 0], rot: [-.08, .05, .08] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.05, 'latch', 'pinch'], [.10, 'latch', 'pinch'], [.14, 'drumOut', 'cup'], [.24, 'drumOut', 'cup'],
      [.29, 'pouch', 'pouch'], [.33, 'pouch', 'pinch'], [.40, 'loadIn', 'pinch'], [.44, 'load', 'pinch'], [.47, 'load', 'open'],
      [.51, 'pouch', 'pinch'], [.57, 'loadIn', 'pinch'], [.61, 'load', 'pinch'], [.64, 'load', 'open'],
      [.67, 'pouch', 'pinch'], [.73, 'loadIn', 'pinch'], [.76, 'load', 'pinch'], [.79, 'load', 'open'],
      [.81, 'wind', 'pinch'], [.86, 'wind', 'pinch'], [.89, 'drumOut', 'cup'], [.96, 'fore', 'fore'], [1, 'fore', 'fore']],
    // CL-326 (J80): one trip a round to load (st.rounds.need), on the game's beats: its loading runs .28 to .78 in equal
    // slices, the round counted in at each slice's middle. pre/post: the keys before and after; trip: a slice's keys
    // (slice time 0-1); round: the loose round in the fingers over a slice.
    perRound: { start: .28, end: .78,
      pre: [[0, 'fore', 'fore'], [.05, 'latch', 'pinch'], [.10, 'latch', 'pinch'], [.14, 'drumOut', 'cup'], [.24, 'drumOut', 'cup']],
      trip: [[0, 'pouch', 'pinch'], [.36, 'loadIn', 'pinch'], [.50, 'load', 'pinch'], [.62, 'load', 'open']],
      post: [[.81, 'wind', 'pinch'], [.86, 'wind', 'pinch'], [.89, 'drumOut', 'cup'], [.96, 'fore', 'fore'], [1, 'fore', 'fore']],
      round: [.04, .50] },
    round: { trips: [[.33, .46], [.51, .63], [.67, .78]], ahead: .09, up: .04 },   // GP-20039's loadRound ahead of the fingertips (the pinch reaches ~6 cm past the palm), each trip, until the push home
    places: {
      latch: { part: 'latch', rootAt: [-.02, -.015, -.025], z: [-.5, .85, 0], y: [-.5, -.5, -.7] },
      drumOut: { part: 'drum', rootAt: [0, -.122, 0], z: [0, 1, 0], y: [-.45, -.55, -.7] },   // cupping its underside through the swing   // CL-322: GP-20063 narrowed the drum (r .14 -> .112, orbit .075 -> .065): drumOut -.15 -> -.122, loadIn/load -.115 -> -.105
      loadIn: { part: 'drum', rootAt: [0, -.105, -.20], z: [0, .3, 1], y: [-.5, -.5, -.7] },   // the round at the chamber's mouth: the palm 13 cm behind the drum's back and 4 cm under the chamber, the round above the fingertips (seen past the glove)
      load: { part: 'drum', rootAt: [0, -.105, -.145], z: [0, .3, 1], y: [-.5, -.5, -.7] },    // pushed home: the fingertips at the back face (ChatGPT, 13:03Z: at -.105 the glove was through the drum)
      wind: { part: 'winder', rootAt: [.01, 0, -.03], z: [0, 0, 1], y: [-.5, -.5, -.7] },
      pouch: { at: [-.29, -.51, -.32], z: [.25, .9, .3], y: [-.4, -.6, .65] } }
  }
});

// Gun-local contact points. The support point is on the handguard for the rifles and under the fore end on the Wasp (GB-294).
// A magazine's foot stays in the support palm during the reload. The work point is a fixed bolt/handle target until
// the weapon builders expose moving direct-child nodes; the viewmodel then follows those nodes.
// CL-307: the blade in the firing hand. Each key [u, { p, e }] is a gun-like frame in view space as the eye sees it
// (metres right/up/-forward; yaw, pitch, roll in radians: the "bore" is the blade's line), the fist on it as on a pistol's
// grip (the hold's right socket); hold is the blade's root in that frame (the knife's handle middle is 4 cm behind its
// root). The gun is put away below the view for the swing and comes back up after; the support hand is out of the view.
// e: [yaw, pitch, roll, swing]. Pitch > 0 points the blade down (as the gun's own pitch); yaw > 0 turns it in toward the
// middle; swing turns the whole thing about the view's own depth axis (a raised blade swept across the view: the chop),
// which the gun's yaw/pitch/roll cannot do (a blade turned from up to down through them passes through pointing away
// from the eye and vanishes behind the fist: the first cloud strip).
export const VM_BLADES = Object.freeze({
  knife: {   // a slash (0.22 s): the blade up out of the fist, swept from the right across the lower middle, back (a thrust
             // points the 30 cm blade at the eye's line and it vanishes behind the fist: fpshot p18)
    keys: [[0, { p: [0.30, -0.34, -0.30], e: [0.2, -0.9, 0.3, -0.3] }], [0.30, { p: [0.20, -0.10, -0.45], e: [0.1, -1.1, 1.2, -0.2] }],
      [0.60, { p: [-0.02, -0.14, -0.55], e: [0.0, -0.9, 1.5, 1.1] }], [0.80, { p: [0.10, -0.20, -0.45], e: [0.1, -0.7, 1.2, 0.8] }],
      [1, { p: [0.30, -0.34, -0.30], e: [0.2, -0.9, 0.3, -0.3] }]],
    hold: { pos: [0, -0.07, 0.0], rot: [0, 0.15, 0] },
    away: [-0.22, -0.46, -0.36]   // the support wrist, out of the view (view space)
  },
  machete: {   // a chop (0.40 s): raised high at the right with the blade straight up, swept across and down to the lower left, back
    keys: [[0, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }], [0.30, { p: [0.26, 0.06, -0.42], e: [0.1, -1.35, 0.3, -0.3] }],
      [0.58, { p: [0.03, -0.18, -0.58], e: [0.0, -1.0, 1.5, 1.5] }], [0.80, { p: [0.16, -0.22, -0.44], e: [0.1, -0.6, 1.0, 0.9] }],
      [1, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }]],   // the fist stays right of the middle (the forearm was a log across the view at -0.06); the flat to the eye in the chop (roll)
    hold: { pos: [0, -0.07, 0.0], rot: [0, 0.15, 0] },
    away: [-0.22, -0.46, -0.36]
  },
  katana: {   // a cut (0.30 s): the same arc, the blade long
    keys: [[0, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }], [0.28, { p: [0.24, 0.08, -0.44], e: [0.1, -1.4, 0.3, -0.3] }],
      [0.56, { p: [0.02, -0.18, -0.60], e: [0.0, -1.0, 1.5, 1.5] }], [0.80, { p: [0.16, -0.22, -0.44], e: [0.1, -0.6, 1.0, 0.9] }],
      [1, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }]],
    hold: { pos: [0, -0.07, 0.0], rot: [0, 0.15, 0] },
    away: [-0.22, -0.46, -0.36]
  }
});

// CL-307: the grenade in the support hand (index.html GRENADE_ANIM's phases and times). Places are gun-like frames in
// view space as the eye sees it (the fist on them as on a mirrored pistol grip), the grenade's root at hold in the fist.
// grab: from the gun down to the pouch (the grenade in hand from inHand); raise: up to cocked beside the head; cocked:
// held there while G is held; throw: the whip forward (the grenade leaves at whip) and the follow-through; back: to the gun.
export const VM_GRENADE = Object.freeze({
  times: { grab: 0.16, inHand: 0.11, raise: 0.14, whip: 0.08, follow: 0.14, back: 0.2 },
  places: {
    pouch: { p: [-0.26, -0.44, -0.30], e: [-0.4, 0.6, -0.3] },
    lift: { p: [-0.30, -0.10, -0.42], e: [-0.5, -0.3, -0.5] },
    cocked: { p: [-0.26, 0.06, -0.42], e: [-0.6, -0.9, -0.6] },   // was 30 cm from the eye: a fist the size of the view's corner
    whip: { p: [-0.08, 0.06, -0.60], e: [-0.1, -0.2, -0.3] },
    follow: { p: [0.02, -0.16, -0.62], e: [0.1, 0.5, -0.1] }
  },
  hold: { pos: [0, -0.045, 0.01], rot: [0, 0, 0] },   // the grenade's top out of the fist
  bob: { y: 0.006, rate: 1.6 }   // the cocked hand's breathing
});

// CL-317 (the audit: unarmed and on a ladder the view fell back to the body's own arms past the eye): the hands without a
// gun. 'empty': both hands hanging easy at the bottom corners, a slow breathing bob; the view keeps its last gun's arms
// with the gun put away. 'ladder': each hand on the rung the body's own climb put it on (index.html _lad.hand, world
// space, mirrored into the view like the hold), gripping over the rung (the fingers curl over and behind it: the hand
// as on a grip rolled flat, pitched down), the elbows below and a little outside. Places p in view space as the eye sees
// it (x mirrored for the left), e = [yaw, pitch, roll] of a hand as on a grip pointing that way.
export const VM_HANDS = Object.freeze({
  empty: {
    // CL-324 (J70): at his sides as in third person (eye-relative, his body's frame: x right, y up, z back), swinging
    // `swing` metres forward and back with his stride (opposite hands), `lift` up at the ends of the swing; the fist's
    // forward level and a little in (e: yaw, pitch, roll as a gun's hip, in his body's frame); the elbow above the wrist.
    sides: { r: [0.215, -0.70, 0.04], l: [-0.215, -0.70, 0.04], swing: 0.12, lift: 0.025, e: [0.12, -0.25, 0.10], elbow: [0.03, 0.27, 0.05] },
    r: { p: [0.21, -0.25, -0.46], e: [-0.15, 0.20, 0.60] },   // as on a grip pointing a little in and down, rolled in (view-space angles, as a gun's hip): the palms turn in, the fingers curled easy
    l: { p: [-0.20, -0.26, -0.44], e: [0.15, 0.20, -0.60] },
    elbow: { r: [0.08, -0.40, 0.14], l: [-0.08, -0.40, 0.14] },   // from the wrist (view space, the right's; the left's x mirrored): below and a little behind
    bob: { y: 0.008, x: 0.004, rate: 1.4 }
  },
  ladder: {
    grab: { e: [0.0, 1.05, 1.45], back: 0.03, down: 0.02 },   // the wrist a little behind and under the rung point
    elbow: { r: [0.10, -0.36, 0.06], l: [-0.10, -0.36, 0.06] }
  }
});

export const VM_SOCKETS = Object.freeze({
  // CL-293 (J54: "the left hand should grip the pistol the way a real shooter would"): the support hand comes in off the body's
  // hold (its fist sat 16 cm out from the grip, beside it) onto the grip's front, its fingers over the strong hand's (the
  // cloud look, 2026-11-02: in from -0.03 to -0.012 the fingers wrap without coming through the far side).
  // CL-331 c (J95/J96 and Jerry's grip references): the thumb round the back, the index on the trigger, the support palm
  // over the firing fingers, its index under the guard and its thumb forward on the frame (was support [-0.0284, -0.0702,
  // 0.0008] y [-0.684, 0.177, -0.708], grip [0.0022, -0.0663, -0.0147]; fitted on the view gun, p91: every part within
  // 2 mm of the gun, the hands' gloves overlapping a few mm where they meet).
  pistol: { support: [-0.0469, -0.0861, -0.0076], supportBasis: { x: [0, -0.97, -0.243], y: [-0.4377, 0.2182, -0.8723] }, grip: [0.0026, -0.0703, -0.0146],
    supportPose: { f: [[0.5, 0.575, 0.475, 0], [0.6, 0.69, 0.57, 0], [0.6, 0.69, 0.57, 0], [0.58, 0.667, 0.551, 0]], t: [0.2, 0.3, 0.12] },
    gripPose: { f: [[0.3, 1.2, 0.72, -0.3], [1.1, 1.265, 1.045, 0], [1.1, 1.265, 1.045, 0], [0.9, 1.035, 0.855, 0]], t: [1, -0.5, 0] } },   // CL-331 e (J98): the thumb straight (was t [0.7, -1.6, 0.98], hooked)
  // GB-312 (CL-310, GB-153 fit qa/2026-11-07-GB-312/fit/fit-fp.json): support fingers curled to the 40 mm handguard until each touches.
  m4: { grip: [0.0014, -0.1062, -0.1152], gripPose: { f: [[1, 1.15, 0.95, 0], [1, 1.15, 0.95, 0], [1, 1.15, 0.95, 0], [1, 1.15, 0.95, 0]], t: [0, 1.4, 0] },   // CL-325 m: the firing hand fitted (grip was [0, -0.106, -0.116])
    support: [-0.0087, -0.0201, 0.4219], supportBasis: { x: [0.679, 0, -0.734], y: [-0.734, 0, -0.679] }, magFoot: [0, -0.278, 0.04], work: [-0.03, -0.03, 0.105],   // CL-310: the 40 mm handguard (its bottom -0.01, was -0.027) and the bolt catch on the 32 mm lower; CL-322: the support on GP-20055's quad rail (was [0, .004, .36])
    supportPose: { f: [[0.434, 0.499, 0.412, 0], [0.624, 0.718, 0.593, 0], [0.854, 0.982, 0.811, 0], [1.104, 1.27, 1.049, 0]], t: [0.6, 0.4, 0.36] } },   // CL-325 c: the cradle (palm up, the thumb on the left side, the fingers up the right), fitted
  // GB-312 (re-fit after CL-310/313/314; was GB-311): support fingers on the 44 mm handguard; thumb curl 0.079 (was 0.08).
  // GB-311 (CL-311/CL-312, GB-153's fit run on the view gun and view hands, qa/2026-11-07-GB-311/fit/fit-fp-run2.json): the
  // support fingers curled to the slim handguard (44 mm, was 74) until each touches; the fist's thumb sat 19 mm into it.
  ak: { grip: [0, -0.123, -0.126], gripPose: { f: [[1.104, 1.27, 1.049, 0], [1.122, 1.29, 1.066, 0], [1.104, 1.27, 1.049, 0], [1.014, 1.166, 0.963, 0]], t: [1.45, 1.4, 0.87] },   // CL-325 k (J88): the fingers fitted, the thumb round the grip's far side
    support: [-0.0085, -0.0426, 0.35], supportBasis: { x: [0.683, 0, -0.731], y: [-0.731, 0, -0.683] }, magFoot: [0, -0.311, 0.14], work: [0.041, 0.02, 0.13],   // CL-311: the slim receiver's charging knob (x 0.041, was 0.083) and the mag 2 cm higher
    supportPose: { f: [[0.687, 0.79, 0.653, 0], [0.28, 0.322, 0.266, 0], [0.687, 0.79, 0.653, 0], [0.876, 1.007, 0.832, 0]], t: [0.5, 0.1, 0.3] } },   // CL-325 c: the cradle (palm up, the thumb on the left side, the fingers up the right), fitted
  // CL-331 d (J96): the firing thumb round the back of the grip (was t [0.05, -0.1, 0.03]); the cradle 16 mm lower, its
  // fingers up the right side (they went up to 33 mm through the receiver; support was [-0.0088, -0.0797, 0.1715],
  // f [[1.202, 1.382, 1.142], [0.574, 0.66, 0.545], [0.467, 0.537, 0.444], [1.45, 1.667, 1.377]]).
  uzi: { grip: [0.0129, -0.1071, -0.0149], gripPose: { f: [[0.8, 0.92, 0.76, 0], [1.05, 1.207, 0.997, 0], [1, 1.15, 0.95, 0], [0.9, 1.035, 0.855, 0]], t: [0.8, -1.6, 1.12] },
    support: [-0.0088, -0.0957, 0.1715], supportBasis: { x: [0.695, 0, -0.719], y: [-0.719, 0, -0.695] }, magFoot: [0, -0.324, -0.043], work: [0, 0.115, 0.11],
    supportPose: { f: [[0, 0, 0, 0], [0.25, 0.287, 0.237, 0], [0.45, 0.517, 0.427, 0], [1.5, 1.725, 1.425, 0]], t: [0.2, 0.3, 0.12] } },
  // GB-312 (re-fit): index closes to a full curl (1.45; was 1.181); little finger free past the forend keeps the fist.
  // GB-311 (CL-312, the same fit): the fingers close further round the 44 mm forend (the fist's middle finger sat 10 mm in
  // at its root, so it curls round instead; the little finger meets nothing past the forend and keeps the fist's curl).
  shotgun: { grip: [0.0144, -0.0902, -0.0475], gripPose: { f: [[0.98, 1.127, 0.931, 0], [0.98, 1.127, 0.931, 0], [0.98, 1.127, 0.931, 0], [0.893, 1.027, 0.848, 0]], t: [0, -0.2, 0] },   // CL-325 m: the firing hand fitted (grip was [0, -0.088, -0.056])
    support: [-0.0087, -0.0258, 0.4599], supportBasis: { x: [0.502, 0, -0.865], y: [-0.865, 0, -0.502] }, port: [0, -0.034, 0.12],   // CL-312 (D-121): the forend 44 mm across on the tube (its middle y -0.006, z 0.28-0.49); the loading port under the receiver   // CL-322: the forend a stroke further forward (its root 0.28 -> 0.375), the palm with it
    supportPose: { f: [[0.386, 0.444, 0.367, 0], [0.745, 0.857, 0.708, 0], [0.729, 0.838, 0.693, 0], [0.862, 0.991, 0.819, 0]], t: [0.15, 0.7, 0.09] } },   // CL-325 c: the cradle (palm up, the thumb on the left side, the fingers up the right), fitted
  // GB-312 (CL-313, GB-153 fit): support fingers wrap the 62 mm handguard; roots stay a few mm in (socket depth; WEAPON_HOLD unchanged).
  aa12: { grip: [0.0106, -0.1461, -0.1616], gripPose: { f: [[1.085, 1.248, 1.031, 0], [1.085, 1.248, 1.031, 0], [1.085, 1.248, 1.031, 0], [0.902, 1.037, 0.857, 0]], t: [0.6, -0.2, 0.36] },   // CL-325 m: the firing hand fitted (grip was [0, -0.145, -0.166])
    support: [-0.0092, -0.0659, 0.3408], supportBasis: { x: [0.616, 0, -0.788], y: [-0.788, 0, -0.616] }, magFoot: [0, -0.415, 0.05], work: [-0.058, 0.05, 0.18],   // CL-313 c: the support is a bar's axis in the fist; a box handguard 18 cm tall is held by its underside (-0.082), so the axis sits 2 cm under it (GB-312/314: at -0.035/-0.047 the palm was in the box)
    supportPose: { f: [[0.648, 0.745, 0.616, 0], [0.5, 0.575, 0.475, 0], [0.496, 0.57, 0.471, 0], [0.648, 0.745, 0.616, 0]], t: [0.15, 0.7, 0.09] } },   // CL-325 c: the cradle (palm up, the thumb on the left side, the fingers up the right), fitted
  revolver: { grip: [0.0182, -0.0709, -0.0556], support: [-0.0236, -0.0768, -0.0322], supportBasis: { x: [0, -0.97, -0.243], y: [-0.702, 0.173, -0.691] },   // CL-325 j: the palms' heels together (support was [-0.012, -0.10, -0.041])
    supportPose: { f: [[0.665, 0.765, 0.632, 0], [0.72, 0.828, 0.684, 0], [0.687, 0.79, 0.653, 0], [1.33, 1.529, 1.264, 0]], t: [0, -0.4, 0] },   // CL-325 i (J78): the palm out of the grip (it sat 12 mm in; was [0, -.07, -.059]), the fingers fitted (they were 14-24 mm through)
    gripPose: { f: [[0.77, 0.885, 0.731, 0], [0.865, 0.995, 0.822, 0], [0.837, 0.963, 0.795, 0], [0.857, 0.986, 0.814, 0]], t: [0.1, -0.3, 0.06] } },   // J57: palm cups the grip, not air beside it; CL-320: the S&W grip raked back (0.27 of its depth)
  // GB-312 (CL-314, GB-153 fit): support fingers open on the 50 mm forend (fist sat 7-15 mm in); thumb keeps a full curl.
  sniper: { grip: [0.0248, -0.0919, -0.1019], gripPose: { f: [[1, 1.15, 0.95, 0], [1, 1.15, 0.95, 0], [1, 1.15, 0.95, 0], [1, 1.15, 0.95, 0]], t: [0.05, -0.5, 0.03] },   // CL-325 m: the firing hand fitted (grip was [0, -0.088, -0.117])
    support: [-0.0086, -0.0316, 0.331], supportBasis: { x: [0.633, 0, -0.774], y: [-0.774, 0, -0.633] }, magFoot: [0, -0.203, 0.02], boltKnob: [0.13, 0.035, -0.16],   // CL-306: the handle on +x (reads right in the mirrored view)
    supportPose: { f: [[0.6, 0.69, 0.57, 0], [0.388, 0.446, 0.369, 0], [0.652, 0.75, 0.619, 0], [1.204, 1.385, 1.144, 0]], t: [0.15, 0.55, 0.09] } },   // CL-325 c: the cradle (palm up, the thumb on the left side, the fingers up the right), fitted
  // CL-301 (GP-20022): rear throttle + front hoop. GB-292 (J1): contacts were already R=rear/L=front but the left fist
  // sat on the cowling behind the hoop (basis too steep) and the right hand had no gripBasis so the rear throttle read empty.
  // Right: vertical throttle, palm inward, elbow back; left: motorcycle on the hoop top, palm down, forearm mostly back.
  // GB-292 redo (Claude's 04:14Z review: one forearm filled the view): elbowFollow runs each forearm along its hand's y, which
  // the code keeps square to the channel x. With x along the hoop the left forearm could only run back, so it crossed the view
  // over the rear hand. The left channel now crosses the bar on a diagonal and the forearms run out to the bottom corners.
  chainsaw: { grip: [0, -0.014, -0.43], gripBasis: { x: [0, -1, 0], y: [0.5, -0.1, -0.85] },
    support: [-0.146, 0.165, -0.108], supportBasis: { x: [-0.09, -0.91, -0.40], y: [-0.86, -0.02, -0.42] },   // CL-325 n (J82, D-128): on the hoop's left upright, the elbow out to the left (was the top bar: [-0.01, 0.250, -0.035], x [-0.4, 0.2, 0.7], y [-0.85, -0.3, -0.4])
    supportPose: { f: [[1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.05, 1.15, 1.0, 0], [1.08, 1.2, 1.0, 0]], t: [1.0, -0.3, 0.55] } },   // HAND_POSES.fist
  // CL-301 (Jerry, 3 Nov: "Right hand is sticking through minigun"; GP-20022 rebuilt it to his refs): the rear firing grip
  // behind the housing and the front vertical post on top (ChatGPT's handle centres).
  // Jerry, 4 Nov: "create a grip that juts off to the side. Something like a peg to hold into. That way his arm will not clip
  // through the gun": GP-20024's side peg (centre (-0.304, 0.012, 0.16), axis vertical), the left hand round it from outside.
  minigun: { grip: [0, -0.0119, -0.364], support: [-0.2128, 0.0084, 0.112], supportBasis: { x: [0, -1, 0], y: [-0.6, -0.3, -0.74] },   // CL-322: GP-20063 scaled the gun 0.70: the grip and the peg with it (was [0,-.017,-.52], [-.304,.012,.16])
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
