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
    // CE-1: the slide back and home on each shot (the 0.28 s interval leaves room)
    action: { slide: { travel: 0.055, t: [0.018, 0.018, 0.075] } },
    elbows: { r: [0.36, -0.75, 0.06], l: [-0.34, -0.75, 0.06] },   // AG-168: low and wide, so the forearms leave the view down its corners
    // CL-293 (Jerry, 3 Nov: "elbow flared in the wrong direction... looks inverted": elbowFollow ran the forearms out flat
    // from the sides, elbows up): each elbow hangs below and behind its wrist, so the forearms come up from the bottom corners.
    // CE-1 (tcl281: the support forearm was 32 degrees off the eye line, under the 40 the rule wants; its sleeve lay flat
    // across the bottom of the view): its elbow lower and further out, 42 degrees, the wrist's bend unchanged (0.35)
    elbowRel: { r: [0.076, -0.024, 0.308], l: [-0.14, -0.14, 0.26] },   // was l [-0.101, -0.074, 0.293]. CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.07, -0.17, 0.26], l [-0.07, -0.17, 0.26])
    sprint: { down: 0.025, across: 0, back: 0.015, yaw: 0.02, pitch: -0.12, roll: 0.06, in: 0.18, out: 0.14 }, runBob: 1.7,   // CL-325 (J73)
    reload: 'pistol'
  },
  m4: {
    hip: { at: [0.27, -0.235, -0.41], yaw: 0.045, pitch: 0.039, roll: -0.11 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.30, -0.26, -0.50], yaw: 0.37, pitch: 0.08, roll: -0.11 }); ads rear 0.24 (was 0.54): the sights close to the eye, shouldered
    ads: { rear: 0.24 },   // holographic window at a readable size once the shoulder stock is eye-hidden
    kick: { back: 0.044, up: 0.09, side: 0.018, ads: 0.50 },
    // CE-1 (GT-20075): the carrier's stroke in the port (fitPortCarrier, 0.072), back and home inside the 0.1 s interval; the
    // AR-pattern charging handle does not ride the carrier (it was kicked 0.025 each shot), so it stays put
    action: { bolt: { travel: 'port', t: [0.028, 0.034, 0.085] } },
    elbows: { r: [0.33, -0.61, -0.10], l: [-0.36, -0.95, -0.26] },
    elbowRel: { r: [0.218, -0.083, 0.31], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'carbine'
  },
  ak: {
    hip: { at: [0.25, -0.235, -0.41], yaw: 0.042, pitch: 0.039, roll: -0.12 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.27, -0.26, -0.50], yaw: 0.32, pitch: 0.09, roll: -0.12 }); ads rear 0.3 (was 0.70): the sights close to the eye, shouldered
    ads: { rear: 0.3 },   // KR-7 leaf sight; the shoulder stock shows at hip and is hidden down the sights
    kick: { back: 0.063, up: 0.15, side: 0.032, ads: 0.58 },
    // CE-1 (GT-20075): the AK-pattern handle is the carrier's: both go back the port's 0.066 and home inside the 0.11 s interval
    action: { bolt: { travel: 'port', t: [0.03, 0.036, 0.092] }, work: { travel: 0.066, t: [0.03, 0.036, 0.092] } },
    elbows: { r: [0.35, -0.63, -0.12], l: [-0.40, -1.10, -0.27] },
    elbowRel: { r: [0.22, -0.086, 0.308], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'ak'
  },
  uzi: {
    hip: { at: [0.147, -0.156, -0.4], yaw: 0.024, pitch: 0.026, roll: -0.10 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.16, -0.17, -0.40], yaw: 0.03, pitch: 0.025, roll: -0.10 }); ads rear 0.3 (was 0.43): the sights close to the eye, shouldered
    ads: { rear: 0.3 },   // the Wasp's tower stays legible without bringing the receiver into the face
    kick: { back: 0.025, up: 0.062, side: 0.016, ads: 0.45 },
    // CE-1 (GT-20075): the carrier in the port (0.048) inside the 1/14 s interval; the top cocking knob does not reciprocate
    action: { bolt: { travel: 'port', t: [0.02, 0.024, 0.062] } },
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
    action: { bolt: { travel: 0.10, t: [0.04, 0.04, 0.13] } },   // CE-1: the same, through actionCycle
    elbows: { r: [0.37, -0.66, -0.10], l: [-0.42, -1.18, -0.25] },
    elbowRel: { r: [0.216, -0.058, 0.318], l: [-0.16, -0.26, 0.20] },   // CL-325 f: the wrists straighter, each elbow toward its hand's line (was r [0.16, -0.26, 0.24])
    reload: 'drum'
  },
  revolver: {
    hip: { at: [0.184, -0.175, -0.42], yaw: 0.031, pitch: 0.029, roll: 0.12 },   // CL-324 (J76-J88): closer, the muzzle line on the crosshair at 6 m (was { at: [0.20, -0.19, -0.49], yaw: 0.20, pitch: 0.025, roll: 0.12 }); ads rear 0.38 (was 0.43): the sights close to the eye, shouldered
    ads: { rear: 0.38 },
    kick: { back: 0.055, up: 0.20, side: 0.032, ads: 0.55 },
    // CE-1 (GT-20075): the double action at the shot: the sear broken (the trigger fully back, the hammer down), the trigger
    // held a moment and forward to its reset by 0.16 s, well inside the 0.45 s interval (doubleActionPose, resetting)
    action: { doubleAction: { t: [0.001, 0.045, 0.16] } },
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
    // CC-342 (J121: "the chainsaw sit slightly lower ... Right now it covering the crosshairs"): 10 cm lower and 3 cm right
    // (was at [0.30, -0.27, -0.60]), drawn at its own view FOV 48 (game/viewmodel.js VIEW_FOV): the crosshair and a margin
    // round it clear (the saw's nearest point 0.17 of the half-height from the centre; it was on it)
    hip: { at: [0.33, -0.37, -0.60], yaw: 0.75, pitch: 0.40, roll: 0.55 },   // CL-322 (9c): the nose left, the bar and teeth out beside the engine (was [0.26,-0.23,-0.62] 0.25/0.58/0.4);   // CL-322: pitch 0.45 -> 0.58, GP-20063's shorter bar up out of the forearm;   // GB-292 redo: saw low right, nose up so the bar shows above the left forearm; both hands on their handles in view
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
      // CE-3 (the pass-2 audit: down and ahead, the support arm crossed over it and the gun left the view): canted 32 degrees
      // toward the support hand, the handle's side up to it, the forearm from the lower left (was [-.08, -.10, -.08] / [.10, -.10, -.42])
      [.72, { pos: [-.03, 0, -.04], rot: [.10, .10, .55] }],
      [.84, { pos: [-.03, 0, -.04], rot: [.10, .10, .55] }],
      [.92, { pos: [-.025, .03, 0], rot: [.18, .04, -.10] }], [1, null]],
    // CL-322 (the AK manual, GP-20056's lugs): out, the catch pressed, the magazine rocks forward on its front lug at the
    // well (.12-.17) and only then comes down; in, it arrives tilted with the front lug in the well (.555) and rocks back
    // on it until the rear lug catches (.585-.64). The palm turns about the lug with it (rock.pivot, mag-local).
    hand: [[0, 'fore', 'fore'], [.10, 'well', 'mag'], [.17, 'well', 'mag'], [.22, 'below', 'mag'],
      [.34, 'pouch', 'mag'], [.38, 'pouch', 'pouch'], [.50, 'below', 'mag'],
      [.555, 'well', 'mag'], [.64, 'well', 'mag'], [.67, 'well', 'cup'], [.76, 'work', 'pinch'],
      [.83, 'work', 'pinch'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .12, swapOut: .335, swapIn: .385, seat: .64 },
    elbowL: [-0.28, -0.30, 0.04],   // CE-3: the support elbow low and out to the left as the hand leaves the hold
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
      // CE-3 (the pass-2 audit: dropped low and close, the support arm came over it and filled the view): canted 32 degrees
      // toward the support hand and a little ahead, the knob turned to the hand, the forearm up from the lower left
      [.66, { pos: [-.03, 0, -.04], rot: [.10, .10, .55] }],
      [.80, { pos: [-.03, 0, -.04], rot: [.10, .10, .55] }],
      [.90, { pos: [-.018, .02, -.01], rot: [.12, .06, -.05] }], [1, null]],
    hand: [[0, 'fore', 'fore'], [.08, 'well', 'mag'], [.17, 'below', 'mag'],
      [.32, 'pouch', 'mag'], [.36, 'pouch', 'pouch'], [.49, 'below', 'mag'],
      [.58, 'well', 'mag'], [.62, 'well', 'cup'], [.70, 'work', 'pinch'],
      [.78, 'work', 'pinch'], [.82, 'fore', 'fore'], [1, 'fore', 'fore']],
    mag: { grab: .10, swapOut: .315, swapIn: .365, seat: .58 },
    rack: [.70, .74, .78, .045],
    elbowL: [-0.28, -0.30, 0.04],   // CE-3: the support elbow low and out to the left as the hand leaves the hold (VM.reloadElbowL's [-0.04, -0.34, 0.14] stood it up through the view)
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
    // CE-3 (J133: "If the player changes ammunition types he will first have to unload the current ammunition and put in
    // the new ones"): X's change of type (index.html st.ammoSwitch, CB-294). Its load is this path, a shell a trip, at the
    // reload's pace. Its unload works each shell out through the action (docs/ammo.md, 0.36 s a shell): the gun rolled 20
    // degrees to its left (as the tube's load, less), which lifts the ejection port on its right toward the eye over the
    // receiver, the support hand on the forend: back (the shell up out of the port and away, up and right), home.
    // pump: [back from, back by, home from, home by] of each shell's 0..1, travel the forend's stroke (index.html's 0.12);
    // shell: [out of the port from, clear by, gone], fly its flight (gun space); ease the roll's in/out time (s).
    unload: { pos: [-.01, .035, .015], rot: [-.10, .04, .34], ease: .12, pump: [.04, .34, .46, .80], travel: .12,
      shell: [.24, .44, .64], fly: [.06, .08, -.03] },
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
    elbowL: [-0.28, -0.30, 0.04],   // CE-3 (the pass-2 audit): the support forearm up from the lower left, not standing over the left third of the view
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
    // CE-8 (GT-20076 #167, ChatGPT 2: the drum went from its seat on the right across the receiver to a pouch on the left,
    // 3 of 48 phases through the fitted right plate): the drum keeps to its own side. The palm under it draws it straight
    // out of its seat to the right and down (as the world drum goes), then drops it below the frame on the right; the
    // fresh one comes up the same way and is pushed home (tce8: 0 of 48 crossing, never inboard of its seat)
    hand: [[0, 'fore', 'fore'], [.14, 'box', 'cup'], [.28, 'box', 'cup'],
      [.32, 'out', 'cup'], [.36, 'drop', 'pouch'], [.49, 'drop', 'cup'], [.56, 'out', 'cup'], [.62, 'box', 'cup'],
      [.80, 'box', 'open'], [.90, 'fore', 'fore'], [1, 'fore', 'fore']],
    // CL-306 (the audit: nothing on the gun changed): the box comes off in the palm, goes to the pouch, a fresh one back on
    mag: { grab: .16, swapOut: .37, swapIn: .49, seat: .64 }, magPlace: 'box',
    places: { box: { part: 'mag', at: [-.015, -.13, -.005], z: [-.25, .88, -.37], y: [-.5, -.45, -.74] },   // CL-326: the palm up under the box's floor, the forearm from the lower left (it faced down, in the box)
      // CE-8: out: the drum clear of its seat, 6 cm out and 9 down in the gun's space (was: on to a pouch on the left, across
      // the receiver); drop: 52 cm below it on the right, out of the frame, where the drums are swapped (same palm frame)
      out: { part: 'mag', at: [.0547, -.2679, .0236], z: [-.25, .88, -.37], y: [-.5, -.45, -.74] },
      drop: { part: 'mag', at: [.0663, -.888, -.005], z: [-.25, .88, -.37], y: [-.5, -.45, -.74] } }
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
  knife: {   // a stab (0.22 s): the gun dropped out of sight, the fist up from below at the right, a thrust in toward the middle, back down
    // CE-4 (J16, Claude 5, 12 Nov; CLAUDE DIRECTOR: "the knife stab first, Jerry uses it a lot"): it was a slash, and the
    // gun vanished on its first frame with the blade standing in its place. Now the hand takes the gun down out of sight
    // (lowered fast, then the blade out: lower, out, put), the fist comes up from below the right with the blade
    // pointing ahead and drawn back a little (0.28), drives forward and in toward the middle below the crosshair (0.48,
    // held to 0.60), the wrist turned so the blade's flat is to the eye (a blade pointed along the eye's line hides behind
    // the fist: fpshot p18; turned the other way at the draw-back, where the flat caught the sky in a white flare), and
    // drops back down out of sight (1); the gun comes up after it. Places as the eye sees them.
    keys: [[0.14, { p: [0.20, -0.274, -0.346], e: [0.15, 0.1, 0.2, 0] }], [0.28, { p: [0.166, -0.108, -0.375], e: [0.30, -0.60, 0.3, 0] }],
      [0.48, { p: [0.086, -0.088, -0.56], e: [0.55, -0.45, -0.5, 0] }], [0.60, { p: [0.080, -0.083, -0.58], e: [0.55, -0.43, -0.5, 0] }],
      [0.80, { p: [0.15, -0.16, -0.52], e: [0.2, 0.0, -0.3, 0] }], [1, { p: [0.236, -0.37, -0.367], e: [0.1, 0.3, 0, 0] }]],
    lower: 4.9, out: 0.15, put: 0.2,   // the gun down out of sight (its raise under 0.15) in about two frames at 60 fps: the view's raise down at 4.9 x its rate (net 27/s); the blade out at the latest at 0.2
    hold: { pos: [0, -0.07, 0.0], rot: [0, 0.15, 0] },
    away: [-0.22, -0.46, -0.36]   // the support wrist, out of the view (view space)
  },
  machete: {   // a chop (0.40 s): raised high at the right with the blade straight up, swept across and down to the lower left, back
    keys: [[0, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }], [0.30, { p: [0.26, 0.06, -0.42], e: [0.1, -1.35, 0.3, -0.3] }],
      [0.58, { p: [0.03, -0.18, -0.58], e: [0.0, -1.0, 1.5, 1.5] }], [0.80, { p: [-0.10, -0.27, -0.46], e: [-0.1, -0.6, 1.4, 1.25] }],
      [1, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }]],   // CE-4: the follow-through goes on down and left past the cut (it swung back right along the view's bottom), then drops away below; the fist stays right of the middle (the forearm was a log across the view at -0.06); the flat to the eye in the chop (roll)
    lower: 4.9, out: 0.15, put: 0.15,   // CE-4 (12 Nov): the gun down out of sight before the blade comes out, as the knife (it vanished on the swing's first frame)
    hold: { pos: [0, -0.07, 0.0], rot: [0, 0.15, 0] },
    away: [-0.22, -0.46, -0.36]
  },
  katana: {   // a cut (0.30 s): the same arc, the blade long
    keys: [[0, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }], [0.28, { p: [0.24, 0.08, -0.44], e: [0.1, -1.4, 0.3, -0.3] }],
      [0.56, { p: [0.02, -0.18, -0.60], e: [0.0, -1.0, 1.5, 1.5] }], [0.80, { p: [-0.10, -0.27, -0.48], e: [-0.1, -0.6, 1.4, 1.25] }],   // CE-4: the follow-through on down and left
      [1, { p: [0.30, -0.34, -0.30], e: [0.2, -0.3, 0.2, 0] }]],
    lower: 4.9, out: 0.15, put: 0.2,   // CE-4 (12 Nov): the gun down out of sight before the blade comes out, as the knife
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
    lift: { p: [-0.25, -0.10, -0.42], e: [-0.5, -0.3, -0.5] },
    // CE-4: in from -0.26 (the fist and its grenade sat under the HUD's left panel, ndc x -0.53: never seen at the eye)
    // CE-4 (12 Nov, Claude 5; CLAUDE DIRECTOR: "a throw that winds up and follows through"): the cock was a fist held up in
    // front of the face, and the whip a push forward from there. Now an overhand throw: cocked up and back by the head at
    // the top left (the grenade above the fist, the elbow up and out: elb, the elbow's offset off the wrist), the whip
    // over and forward to above the middle (the grenade leaves there), the follow-through down and across to the lower
    // middle, clear of the gun, and out below the view on its way back to the gun
    cocked: { p: [-0.21, 0.12, -0.32], e: [-0.6, -1.3, -0.6], elb: [-0.20, -0.10, 0.12] },
    whip: { p: [-0.06, 0.13, -0.60], e: [-0.1, -0.4, -0.3], elb: [-0.12, -0.18, 0.2] },
    follow: { p: [0.04, -0.27, -0.50], e: [0.1, 0.6, -0.1] }
  },
  hold: { pos: [0, -0.045, 0.01], rot: [0, 0, 0] },   // the grenade's top out of the fist
  // CE-4 (J16, Claude 5): the fingers through the throw (the cloud audit, 11 Nov: the hand went from the grip flat open at
  // the grab's first frame, the follow-through read as a pointing finger and a thumb up, and it snapped onto the grip at
  // the end of 'back'). reach: the hand easing open on its way to the pouch until it closes on the grenade (inHand);
  // release: the fingers spread loose as the grenade leaves (open in `open` s from the whip) and through the follow;
  // 'back' eases from release into the support grip as the hand comes onto the gun.
  fingers: { reach: { f: [[0.22, 0.3, 0.18, 0.06], [0.26, 0.36, 0.2, 0], [0.32, 0.42, 0.22, -0.05], [0.38, 0.48, 0.26, -0.1]], t: [0.3, 0.3, 0.15] },
    release: { f: [[0.26, 0.34, 0.2, 0.1], [0.3, 0.38, 0.22, 0.02], [0.34, 0.44, 0.24, -0.06], [0.4, 0.5, 0.28, -0.14]], t: [0.3, 0.4, 0.15] },
    open: 0.04 },
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
      // CE-3 (the pass-2 audit: the support forearm lay across the pistol through the rack): out to the right, a little down and
      // ahead, canted 40 degrees in toward the support hand, so the overhand grip comes from the lower left with the slide in view
      // (was [-0.04, 0, -0.03] / [0.22, 0, 0.42], CL-306's 25-degree tilt)
      [0.68, { pos: [0.02, -0.02, -0.06], rot: [0.2, 0.1, 0.7] }],
      [0.80, { pos: [0.02, -0.025, -0.05], rot: [0.22, 0.1, 0.72] }],   // pushed out against the rack
      [0.90, { pos: [-0.02, 0.0, 0.0], rot: [0.2, 0.06, 0.3] }],
      [1.00, null]
    ],
    hand: [
      [0.00, 'fore', 'fore'], [0.10, 'well', 'mag'], [0.17, 'below', 'mag'], [0.31, 'pouch', 'mag'], [0.36, 'pouch', 'pouch'],
      [0.50, 'below', 'mag'], [0.60, 'well', 'mag'], [0.64, 'well', 'cup'], [0.71, 'work', 'pinch'], [0.89, 'work', 'pinch'],
      [0.93, 'work', 'open'], [1.00, 'fore', 'fore']
    ],
    mag: { grab: 0.10, swapOut: 0.305, swapIn: 0.375, seat: 0.60 },
    elbowL: [-0.28, -0.30, 0.04],   // CE-3: the support elbow low and out to the left as the hand leaves the hold
    rack: [0.72, 0.76, 0.89, 0.07],   // AG-168: the slide back over [0], [1], forward at [2]; travel (gun units)
    tacticalRack: true,   // CE-2 (J103, CLAUDE DIRECTOR 11 Nov): racked by the support hand with rounds left too
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

// CE-2 (J103: "Trigger finger needs to be in actual trigger guard when firing the pistol. Finger needs to physically pull
// the trigger for each shot"; J112: the Wasp's "trigger finger is clipping through the trigger guard and not actually
// pulling the trigger"): the firing hand's index finger (its f[0]: knuckle, middle, end, spread) on each gun's trigger,
// on top of Claude 1's fit (VM_FIT r: the hand's place, the other fingers, the thumb). rest: its pad on the trigger's face
// in the guard; pull: the trigger back by its travel, the pad still on it. Both solved in the cloud against the gun as the
// game draws it with the hand where VM_FIT puts it (no glove vertex inside any closed part over 0.4 mm; Claude 5's
// solve-index, Claude outputs/CE-2/). Re-solve when the gun or the fit changes. part: the control that moves (the gun's
// userData.controls name); pivot (gun space) and turn (rad, about the gun's x) its pin and its travel; hold (s) the
// trigger stays back after a shot, release (s) its return; held down (st.fireHeld) it stays back.
export const VM_TRIGGER = Object.freeze({
  // the pistol: the pad 42% down the blade; the travel at the face 4 game mm
  // CE-2 (11 Nov, Claude 1's CD-1 pass 2: the hand 8.6 mm lower, the middle finger out of the guard): re-solved on the new
  // fit, the pad 2.3 mm off the face at rest, nothing through the gun (tcl334b); clean of itself, gloved. (A closer solve,
  // [0, 0.73, 0.977, 0.155], measured clean in the solver but 2.8 mm into the gun in tcl334b.)
  pistol: { part: 'trigger', rest: [-0.216, 1.262, 0.075, 0.125], pull: [-0.216, 1.322, 0.098, 0.133], pivot: [0, 0.016, 0.075], turn: 0.0853, hold: 0.06, release: 0.09 },
  // the Wasp (J112: "the trigger finger is clipping through the trigger guard"): CE-2 (12 Nov) on Claude 1's CD-1 part-4 fist
  // (under ChatGPT 2's opened guard, GT-20087): the index rises from the fist into the guard, its pad on the blade's front
  // 0.8 mm off it 80% down, presses it back 4 mm at the face on each shot, the blade turning on its pin; nothing of the
  // glove in the guard, the blade or the frame at rest or pulled (0.12 mm at most, the solver's pad give)
  uzi: { part: 'trigger', rest: [-0.2, 1.9, -0.012, 0.29], pull: [-0.132, 1.96, 0.018, 0.29], pivot: null, turn: 0.2085, hold: 0.05, release: 0.07 },
  // the revolver (CE-2, 12 Nov, J136, on Claude 1's 01:50Z fist on GT-20088b's slimmer grip): the pad on the blade's front
  // 1.6 mm off it two thirds down; the double action's pull (index.html's st.triggerPull) turns the blade back its 0.36 rad
  // as the hammer rises and the cylinder turns, and the finger follows it (follow: the blade's turn at full travel); the
  // glove 0.13 mm at most into the blade (the pad's give), nothing else of the hand in the gun
  revolver: { part: 'trigger', rest: [0, 0.7, 0.01, -0.06], pull: [0, 0.8, 0.16, 0], pivot: null, turn: 0, follow: 0.36, hold: 0.06, release: 0.09 },
  // the pump gun (CE-2, 11 Nov, on Claude 1's 10:00Z refit of its firing hand): the pad 5 mm off the face 43% down the blade,
  // nothing of the index in the guard or the blade, at rest or pulled; 4 mm at the face, the blade on its pin
  shotgun: { part: 'trigger', rest: [-0.2, 0.585, 0.895, 0.17], pull: [-0.2, 0.645, 0.985, 0.17], pivot: null, turn: 0.18, hold: 0.06, release: 0.1 },
  // the GW-4 (CE-2, 12 Nov, re-solved on Claude 1's fixes7 fist for ChatGPT 2's trigger 15 gun mm back, GT-20090): the
  // index up into the guard, its pad on the blade's front 72% down, 2.7 mm off it at rest (no closer without its middle
  // bone on the blade's top), 1.9 mm when the blade is back; the blade turns on its own pin (33 mm above the pad's
  // height: 0.1186 rad for 4 mm at the face); the glove 0.3 mm at most into the blade (the pad's give)
  m4: { part: 'trigger', rest: [0.3, 1.2, 0.272, 0.35], pull: [0.36, 1.2, 0.257, 0.282], pivot: null, turn: 0.1186, hold: 0.06, release: 0.09 },
  // the Breacher (AA-12; CE-2, 12 Nov, on Claude 1's 01:50Z fist under ChatGPT 2's longer guard, GT-20092): the index from
  // the fit's straight finger down into the guard, its pad on the blade's front 64% down, 1.2 mm off it at rest, 0.8 mm
  // when the blade is back (82% down); the blade on its own pin (18 mm above: 0.2138 rad for 4 mm at the face); the glove
  // 0.24 mm at most into the blade (the pad's give), nothing in the guard
  aa12: { part: 'trigger', rest: [-0.13, 1.03, -0.08, 0.35], pull: [-0.13, 1.06, 0.025, 0.29], pivot: null, turn: 0.2138, hold: 0.06, release: 0.09 },
  // the KR-7 (AK; CE-2, 12 Nov, on Claude 1's 18:30Z fist round GT-20096's moved blade): the index from the fit's (round the
  // blade's front) a little straighter at the tip, its pad on the blade's front 61% down, 1.8 mm off it at rest, 2.5 mm when
  // the blade is back; the blade on its own pin (0.1623 rad for 4 mm at the face); the glove 0.35 mm at most into the blade
  // (the pad's give), nothing in the guard, the other hand clear
  // CE-2 (J150, 12 Nov 22:1xZ): re-solved on Claude 1's 21:22Z fist on CF-3's softened grip (the hand 6 mm lower, 3 forward):
  // the pad on the blade's front 77% down, 0.9 mm off it at rest and 0.8 mm pulled (0.1594 rad on its pin for 4 mm at the
  // face), 0.27 mm at most into the blade (the pad's give), the other hand clear (was [-0.3, 1.1, -0.035, 0.21] / 0.1623)
  ak: { part: 'trigger', rest: [-0.192, 0.8, 0.437, 0.19], pull: [-0.192, 0.86, 0.52, 0.198], pivot: null, turn: 0.1594, hold: 0.06, release: 0.09 }
});

// CE-4 (J16; ChatGPT 2's GT-20084 switch, the pad in 1 mm and back): the flashlight's switch pressed by the support thumb
// at the eye. times (s): the reach onto it, the press in, held, the lift off, the hand home (index.html changes the light
// half way in); gap: the pad comes in from this far out along the switch's axis; face: the pad's surface off the contact
// when it touches. Per gun, solved in the cloud against the gun as drawn with the hand where VM_FIT puts it (Claude 5's
// solve-light, Claude outputs/CE-4/): the digit that presses (fi: the finger, -1 the thumb; k its end bone; pad: the point
// on it that touches, that bone's frame), r the hand's turn about its palm (gun space, axis * angle), v that digit's values,
// o the rest of the hand eased from the hold toward curl (the thumb toward relaxed) (0..1); the slide that puts it on the switch is worked out each
// frame. Re-solve when the gun, its light or the fit changes.
export const VM_LIGHT = Object.freeze({
  times: { reach: 0.17, press: 0.05, hold: 0.05, lift: 0.04, back: 0.2 }, gap: 0.004, face: 0.0004,
  // curl: the fingers' loose fist the rest of the hand eases toward (o) while a digit presses
  curl: [[0.85, 1.05, 0.65, 0.02], [0.95, 1.15, 0.7, 0], [1.0, 1.2, 0.75, -0.03], [1.05, 1.25, 0.8, -0.06]],
  elbowUp: 0.3,
  pistol: { k: 15, fi: -1, pad: [0, -0.0138, 0.009], r: [0.4906, -0.429, 0.1204], v: [0, 0.0051, -0.17, -0.3, -0.1, -0.1], o: 1 },   // the pistol: the thumb's pad
  revolver: { k: 15, fi: -1, pad: [0, -0.0254, 0], r: [-0.2054, -0.5304, 0.2436], v: [0, 0.2131, 0.7499, 0.9432, 0.5273, 0.7729], o: 1 },   // the revolver: the thumb's tip
  uzi: { k: 6, fi: 1, pad: [0, -0.021, 0], r: [0.0288, 0.0276, -0.0489], v: [1.2595, 1.1558, 0, 0.04], o: 1 },   // the Wasp: the middle finger's tip
  shotgun: { k: 3, fi: 0, pad: [0, -0.0202, 0], r: [-0.2384, 1.3166, 0.0476], v: [1.4069, 0.8004, 0.6906, -0.08], o: 1 },   // the pump gun: the index finger's tip
  aa12: { k: 15, fi: -1, pad: [0, -0.0138, 0.009], r: [-0.0572, 0.4507, -0.1727], v: [0, -0.6, 0.4171, -0.3, -0.1, 0.2213], o: 1 },   // the Breacher: the thumb's pad
  m4: { k: 15, fi: -1, pad: [0, -0.0138, 0.009], r: [-1.0148, 1.0393, 0.463], v: [0.5704, 0.2843, 0.5415, 0.3252, 0.451, 0.532], o: 1 },   // the GW-4: the thumb's pad
  ak: { k: 15, fi: -1, pad: [0, -0.0254, 0], r: [0.3096, 0.1447, -0.7025], v: [0.1287, 1, -0.17, -0.3, 0.2212, -0.1], o: 0.673 },   // the KR-7: the thumb's tip
  sniper: { k: 15, fi: -1, pad: [0, -0.0254, 0], r: [-0.8455, 0.1155, 0.0035], v: [0.442, -0.6, 1.3, 0.3351, 0.3385, 0.2845], o: 1 },   // the sniper: the thumb's tip
  launcher: { k: 3, fi: 0, pad: [0, -0.0106, 0.0085], r: [-0.906, 0.5725, 0.9886], v: [0.2766, 0.6497, 0.12, 0.3], o: 1 },   // the launcher: the index finger's pad
  minigun: { k: 3, fi: 0, pad: [0, -0.0202, 0], r: [0.2808, -1.2729, 0.067], v: [-0.2, 0, 0.3136, 0.1295], o: 1 }   // the rotary gun: the index finger's tip
});

// CE-2 (J110: "Fire selection. Needs animation and manual manipulation by player fingers for each weapon"; J130): a gun's
// controls that show its state. selector: the lever turned to the fire mode (st.fireMode, X), about its axle (gun space;
// x null: the control's own x), turns (rad about the gun's x from the model's rest) per mode, in time s. The GW-4's lever
// as modelled points forward and down: semi; a quarter turn back and down: auto (the AR's SAFE/SEMI/AUTO run, no SAFE here).
// CE-9 (J149, D-177: "safeties, selectors, charging handles and bolt catches as separate moving parts the hands can work"):
// a row for each of the modelers' new controls (ChatGPT 2's sidearms, Claude 6's heavy guns and the sniper), keyed by its
// userData.controls name. axis: 'x' | 'y' | 'z' or a direction, in the part's parent's space (the gun's for most); pivot:
// the point it turns about there (null entries, or no pivot: the part's own origin, which the modelers put on its pin);
// turn (rad) or slide (m, the model's units): its full travel from the rest as modelled; driven by turns (the selector per
// st.fireMode; fixed: the one mode a single-mode gun shows), ready (the gun up: the safety off, the grip safety squeezed,
// the switch armed; back as the gun goes down), fire (the trigger held), reload (beats [in, held, out, home] on the
// authored reload's u, timed to index.html's RELOAD_CUES: the release's click, the latch, the valve; a list for two;
// empty: only on an empty reload) or unload (an ammo change's unload, its u). time (s): a ready/fire/selector move's
// travel time. Not in a row: the parts the gun's own action already moves (the charging handles that are the view's work,
// the pump, the launcher's drum latch, the revolver's hammer), the triggers (VM_TRIGGER), the light switches (VM_LIGHT),
// the parts that never move under a hand in the game (the pistol's takedown lever and extractor, the launcher's stock
// release on the stock first person hides, the GW-4's forward assist (no reload taps it) and its port cover (modelled open,
// as on a gun that has fired), the Breacher drum's two levers (the drum comes off whole)) and the Watchman MG (mounted or
// carried: third person only).
export const VM_CONTROLS = Object.freeze({
  m4: {
    selector: { axle: [null, -0.012, -0.11], turns: { semi: 0, auto: 1.5708 }, time: 0.12 },
    magRelease: { axis: 'x', slide: -0.0025, reload: [0.05, 0.08, 0.12, 0.15] },   // the button on the right pressed in at the release (cue .08)
    boltCatch: { axis: 'x', slide: 0.002, reload: [0.74, 0.77, 0.81, 0.84], empty: true }   // the paddle on the left slapped in as the support hand comes to it (work .76-.82): the bolt home
  },
  ak: {
    selector: { axis: 'x', turns: { semi: 0.1, auto: 0.05 }, time: 0.12 },   // the long lever from its rest at the top (safe) down a notch to auto (8 mm at the tab), two to semi (15 mm)
    magRelease: { axis: 'z', slide: 0.003, reload: [0.07, 0.10, 0.16, 0.19] }   // the paddle pushed forward as the magazine rocks out (rock .12-.17)
  },
  pistol: {
    magRelease: { axis: 'x', slide: 0.002, reload: [0.07, 0.10, 0.13, 0.16] }   // the button on the left pressed in (cue .10)
  },
  uzi: {
    magRelease: { axis: 'x', slide: 0.0015, reload: [0.05, 0.08, 0.11, 0.14] },   // the heel paddle on the left pressed in (cue .08)
    safety: { axis: [0, -0.218, 0.976], slide: 0.002, ready: true, time: 0.1 }   // the grip safety squeezed into the backstrap while he holds it up
  },
  shotgun: {
    safety: { axis: 'x', slide: -0.004, ready: true, time: 0.1 },   // the cross-bolt pushed across to fire as the gun comes up
    slideRelease: { axis: 'y', slide: 0.002, unload: [0.0, 0.03, 0.30, 0.34] }   // the action release pressed up to free the forend for the unload's first stroke (pump .04-.34)
  },
  aa12: {
    selector: { axis: 'x', turns: { semi: 0, auto: 1.5708 }, time: 0.12 },   // the thumb lever forward on semi, a quarter turn down for auto
    magRelease: { axis: 'x', turn: -0.3, reload: [0.07, 0.10, 0.14, 0.17] }   // GT-20098's catch paddle under the guard pushed forward on its axle as the drum drops (cue .10)
  },
  revolver: {
    cylinderRelease: { axis: 'z', slide: 0.003, reload: [0.0, 0.03, 0.08, 0.12] },   // the thumbpiece pushed forward as the cylinder swings out (open .00-.16)
    ejector: { axis: 'z', slide: -0.02, reload: [0.15, 0.20, 0.23, 0.27] }   // the rod pressed back under the support palm (hand on it .16-.225): the cases out
  },
  sniper: {
    safety: { axis: 'x', turn: 0.35, ready: true, time: 0.12 },   // the tabs rocked forward-down off safe
    magRelease: { axis: 'y', slide: 0.002, reload: [0.07, 0.10, 0.14, 0.17] }   // the button ahead of the magazine pressed up (cue .10)
  },
  minigun: {
    safety: { axis: 'x', turn: -0.5, ready: true, time: 0.12 },   // the thumb lever's tail swept down off safe
    powerSwitch: { axis: 'x', turn: 0.76, ready: true, time: 0.15 },   // the arming toggle thrown forward from its rest back (safe)
    drumLatch: { axis: 'z', turn: 0.5, reload: [[0.12, 0.15, 0.18, 0.22], [0.66, 0.70, 0.74, 0.78]] }   // swung out as the palm comes under the drum (.14; cue .12) to free it, again to seat the fresh one (cue .74)
  },
  launcher: {
    safety: { axis: 'x', turn: -0.45, ready: true, time: 0.12 }   // both levers on the cross-shaft rocked off safe
  },
  flamer: {
    safety: { axis: 'x', turn: -0.5, ready: true, time: 0.12 },   // the thumb lever on the left cheek swept off safe
    igniter: { axis: 'x', turn: 0.3, fire: true, reload: [0.85, 0.88, 0.90, 0.93], time: 0.06 },   // pulled back by the support fingers while it fires; clicked once after a tank (cue .88)
    valve: { axis: 'z', turn: 3.0, reload: [0.13, 0.20, 0.68, 0.74] }   // the handwheel turned shut as the palm reaches the tanks (.20; cue .06), open on the fresh ones before the palm leaves (cue .72)
  },
  chainsaw: {
    throttleLock: { axis: 'x', turn: 0.12, ready: true, time: 0.08 },   // the paddle pressed down by the palm on the rear handle
    stopSwitch: { axis: 'x', turn: -0.4, ready: true, time: 0.1 }   // the rocker over to run
  }
});
