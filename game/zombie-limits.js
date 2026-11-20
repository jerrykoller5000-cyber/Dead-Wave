// game/zombie-limits.js — J159 / D-191 (Jerry, 17 Nov 2026: "make sure that they move realistically ... that they could
// really move that way in the real world"), Claude 5. The zombies' joint ranges and the feet and hands rules, in one place:
// the motion audit and its test (tools/tests/t339.js) read them; rule 25's spirit (D-139) for the dead. A range is never
// widened to make a pose fit: a pose that leaves it is fixed at its source.
//
// Degrees. How each joint is read (t339 and the audit's sampler, Claude outputs/CE-13/J159/tools):
//   legs, knees, ankles, elbows: through the visible skin's bind (bind = anatomical zero; the rigs' own rest turns are not
//     bends); the shoulder, the spine and the neck in the parent group's own frame (the bind hangs the arms 26-66 deg forward
//     of the torso and holds the hunch, so a bind-relative read would count those as bends).
//   hip/shoulder flex: + forward; plantar: + toe down; inv: + the sole turned in; foreRot: pronation reads negative from the
//   bind's palm-forward hand; shFlex: overhead reads 180, overhead-and-back past 180.
// Sources: core/body-limits.js (the player's: wrist 75/70/20/35, forearm turn 85 from mid, elbow 0-150) and the standard
// human ranges of motion (AAOS) for the rest.
export const ZOMBIE_LIMITS = Object.freeze({
  hipFlex: [-30, 125], hipAbd: [-30, 45], hipRot: [-45, 45],
  knee: [-5, 150], kneeVar: [-10, 10], kneeRot: [-30, 30],
  plantar: [-30, 50], inv: [-20, 35], toeIn: [-25, 25],
  shFlex: [-60, 190], shAbd: [-45, 180], shRot: [-90, 90],
  elbow: [-5, 150], elbowLat: [-15, 15], foreRot: [-170, 10],
  wristFlex: [-70, 75], wristDev: [-35, 20],
  spineFlex: [-30, 80], spineLat: [-35, 35], spineRot: [-45, 45],
  neckFlex: [-70, 60], neckLat: [-45, 45], neckRot: [-80, 80],
});

// The feet and the hands (metres, m/s, degrees). A foot is planted when its heel and toe are both under `planted` over the
// ground. Not on the ground (falls, knocks, the rise, a leap, a charge, a slam) the feet rules don't apply but the
// through-the-ground one (except the rise, which comes out of the ground).
export const ZOMBIE_FEET_RULES = Object.freeze({
  planted: 0.04,          // heel and toe under this: on the ground
  soleTilt: 15,           // a planted sole lies flat within this
  toesOff: 35,            // a planted foot's toes within this of the way he faces (or goes)
  slide: 0.3,             // a planted foot moves no faster than this over the ground
  through: 0.03,          // no heel, toe, hand or limb tip deeper than this under the ground
  bothOff: 0.05,          // on his feet, both feet are never this far up at once
  // PROPOSED (J159 b2, for the Director's OK; t339 and the audit count with and without it): a SPRINT has a flight. Past
  // Froude `sprintFroude` (speed squared over g x the leg's length; 4.7 m/s on a man's 0.74 m leg: today only the feral's
  // 6.2 m/s and the guardians) both feet may be up to `sprintBothOff` off the ground between footfalls (game/zombie-feet.js
  // ZFEET.runFroude / flightClear hold the body there: 7 cm, not the 10-28 cm leaps of the old gait).
  sprintFroude: 3, sprintBothOff: 0.09,
  palmUp: 0.6,            // in a wind-up or a swing with the hand raised, the palm's up component stays under this
});

// The named exceptions (rule 25: "unless ... it looks right for that one case (named, with its reason, in the limits
// table)"). Nothing else: the brute, the demon, the colossus and the guardians are big humanoids and keep human joints
// (the guardians' kneeling crawl names only its feet off the ground, below).
export const ZOMBIE_ALLOWANCES = Object.freeze({
  spider: {
    // Not a human body: eight jointed limbs on a low body. Each limb's knee bends about its own axis (crawlLimbs bendAxis),
    // from straight to folded tight, either way; the human arm and leg ranges don't apply to it.
    limbBend: { range: [-160, 160], reason: 'eight jointed limbs, not human legs: each knee folds about its own axis either way' },
  },
  leaper: {
    // On all fours with the back level, the head is held up to see ahead: the neck extends past a standing man's 70.
    neckFlex: { range: [-100, 60], reason: 'runs on all fours with the back level; the head up to look ahead (a quadruped carriage, not a man standing)' },
  },
  guardian: {
    // CE-13o (the Director, 17 Nov: "if the knees carry it by design and touch the ground, name it"): the guardian goes on its
    // knees and knuckles, a kneeling crawl: the knees and shins and the hands carry it and the feet trail behind, off the
    // ground. Measured in the inspector (walk + live, every 1/30 s): the knee bones' lowest skin within 3 cm of the ground in
    // about a third of the frames (median 9 cm), the hands on it in a third; the soles 6-27 cm up. Its feet may be off together.
    bothOff: { max: 0.30, reason: 'a kneeling crawl on knees and knuckles: the knees, shins and hands carry it, the feet trail behind off the ground' },
  },
  caveguard: {
    // the cave guardian is the guardian's body and crawl
    bothOff: { max: 0.30, reason: 'the guardian\'s kneeling crawl on knees and knuckles: the feet trail behind off the ground' },
  },
});

// The both-feet-off height for one type (a named allowance's max, else the rule's)
export function zombieBothOff(type) { const a = ZOMBIE_ALLOWANCES[type] && ZOMBIE_ALLOWANCES[type].bothOff; return a ? a.max : ZOMBIE_FEET_RULES.bothOff; }
// The range of one joint for one type: [lo, hi] and, for an allowance, its reason.
export function zombieRange(type, joint) {
  const a = ZOMBIE_ALLOWANCES[type] && ZOMBIE_ALLOWANCES[type][joint];
  return a ? { range: a.range, reason: a.reason } : { range: ZOMBIE_LIMITS[joint] || null, reason: null };
}
