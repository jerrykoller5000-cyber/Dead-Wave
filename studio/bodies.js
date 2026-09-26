// studio/bodies.js — what a reacting body is made of (D-42), for studio/motion.js. Claude's.
// A rig's `body` (studio/rigs.js) says which points the simulation moves, which pairs hold their
// length, how far the spine and neck may bend, which way knees and elbows fold, and how the points
// pose the rig's joints again. Humanoids share one layout; `at` places a point on its joint (joint
// units, before the rig's scale).

// The points of a humanoid, grouped for muscle tone: legs, spine, arms, head.
function humanPoints(at) {
  const P = (joint, pos, mass, r, group) => ({ joint, at: pos, mass, r, group });
  return {
    pelvis: P('pelvis', at.pelvis, 10, 0.12, 'spine'),
    waist: P('spine', [0, 0, 0], 6, 0.11, 'spine'),
    chest: P('spine', at.chest, 10, 0.13, 'spine'),
    head: P('head', [0, 0, 0], 3, 0.08, 'head'),
    crown: P('head', at.crown, 2, 0.12, 'head'),
    hipL: P('hipL', [0, 0, 0], 4, 0.09, 'legs'), kneeL: P('kneeL', [0, 0, 0], 3, 0.07, 'legs'), footL: P('ankleL', at.foot, 1.5, 0.05, 'legs'),
    hipR: P('hipR', [0, 0, 0], 4, 0.09, 'legs'), kneeR: P('kneeR', [0, 0, 0], 3, 0.07, 'legs'), footR: P('ankleR', at.foot, 1.5, 0.05, 'legs'),
    shoulderL: P('shoulderL', [0, 0, 0], 3, 0.08, 'arms'), elbowL: P('elbowL', [0, 0, 0], 1.5, 0.06, 'arms'), handL: P('handL', [0, 0, 0], 0.8, 0.05, 'arms'),
    shoulderR: P('shoulderR', [0, 0, 0], 3, 0.08, 'arms'), elbowR: P('elbowR', [0, 0, 0], 1.5, 0.06, 'arms'), handR: P('handR', [0, 0, 0], 0.8, 0.05, 'arms')
  };
}

const LOWER = { x: ['hipL', 'hipR'], up: ['pelvis', 'waist'] };
const UPPER = { x: ['shoulderL', 'shoulderR'], up: ['waist', 'chest'] };

// `pelvisIsRoot`: the pelvis joint carries the torso (the zombie); otherwise torso and pelvis are
// siblings under the body's group (the marine), and the torso's pivot follows its own point.
export function humanBody(at, { pelvisIsRoot }) {
  const both = (f) => [f('L'), f('R')];
  return {
    points: humanPoints(at),
    // Held at their length: each rigid part (hips, torso, head on its neck, the limb bones).
    bones: [
      ['pelvis', 'waist'], ['pelvis', 'hipL'], ['pelvis', 'hipR'], ['hipL', 'hipR'], ['waist', 'hipL'], ['waist', 'hipR'],
      ['waist', 'chest'], ['waist', 'shoulderL'], ['waist', 'shoulderR'], ['chest', 'shoulderL'], ['chest', 'shoulderR'], ['shoulderL', 'shoulderR'],
      ['chest', 'head'], ['shoulderL', 'head'], ['shoulderR', 'head'], ['head', 'crown'],
      ...both((s) => ['hip' + s, 'knee' + s]), ...both((s) => ['knee' + s, 'foot' + s]),
      ...both((s) => ['shoulder' + s, 'elbow' + s]), ...both((s) => ['elbow' + s, 'hand' + s])
    ],
    // Within [lo, hi] × their length when the body woke: how far the spine bends and twists, the head
    // nods, a leg or arm folds, and the legs keep apart.
    braces: [
      ['pelvis', 'chest', 0.82, 1.04], ['hipL', 'shoulderL', 0.85, 1.1], ['hipR', 'shoulderR', 0.85, 1.1],
      ['hipL', 'shoulderR', 0.88, 1.1], ['hipR', 'shoulderL', 0.88, 1.1],
      ['crown', 'shoulderL', 0.85, 1.12], ['crown', 'shoulderR', 0.85, 1.12], ['crown', 'chest', 0.9, 1.05],
      ['hipL', 'footL', 0.45, 1], ['hipR', 'footR', 0.45, 1], ['shoulderL', 'handL', 0.35, 1], ['shoulderR', 'handR', 0.35, 1],
      ['footL', 'footR', 0.5, 4], ['kneeL', 'kneeR', 0.6, 4]
    ],
    // Knees fold forward, elbows back and down (a direction in the hips' or the chest's frame).
    hinges: [
      ...both((s) => ['hip' + s, 'knee' + s, 'foot' + s, [0, 0, 1], 'lower']),
      ...both((s) => ['shoulder' + s, 'elbow' + s, 'hand' + s, [0, -0.5, -0.85], 'upper'])
    ],
    frame: { lower: LOWER, upper: UPPER },
    // Parents first. A frame turns a joint to match three or four points; an aim turns it so its bone
    // points from one point to the next; pos moves its pivot with a point.
    segments: [
      { joint: 'pelvis', frame: LOWER, pos: 'pelvis' },
      pelvisIsRoot ? { joint: 'spine', frame: UPPER } : { joint: 'spine', frame: UPPER, pos: 'waist' },
      { joint: 'head', aim: ['head', 'crown'] },
      ...['L', 'R'].flatMap((s) => [
        { joint: 'hip' + s, aim: ['hip' + s, 'knee' + s] }, { joint: 'knee' + s, aim: ['knee' + s, 'foot' + s] },
        { joint: 'shoulder' + s, aim: ['shoulder' + s, 'elbow' + s] }, { joint: 'elbow' + s, aim: ['elbow' + s, 'hand' + s] }
      ])
    ],
    feet: ['footL', 'footR'], hands: ['handL', 'handR'], root: 'pelvis',
    // What a body can lose (studio/motion.js body.lose; the game's partsLost keys): the points that go
    // with it, the point they hung from, and the joint whose group is the part (what a host hides).
    // The shoulder, hip and chest points stay: they're part of the torso's and the hips' frames.
    parts: {
      ...Object.fromEntries(['L', 'R'].flatMap((s) => [
        ['arm' + s, { points: ['elbow' + s, 'hand' + s], anchor: 'shoulder' + s, joint: 'shoulder' + s }],
        ['leg' + s, { points: ['knee' + s, 'foot' + s], anchor: 'hip' + s, joint: 'hip' + s }]
      ])),
      head: { points: ['head', 'crown'], anchor: 'chest', joint: 'head' }
    }
  };
}

// The zombie (studio/zombie.js): hips carry the torso; the head turns about its middle.
export const ZOMBIE_BODY = humanBody({ pelvis: [0, 0, 0], chest: [0, 0.45, 0], crown: [0, 0.17, 0], foot: [0, -0.05, 0] }, { pelvisIsRoot: true });
// The marine (studio/marine.js): the lower body's group sits on the ground, its hips at 0.62; the
// torso turns about 0.7; the head about the neck.
export const MARINE_BODY = humanBody({ pelvis: [0, 0.62, 0], chest: [0, 0.42, 0], crown: [0, 0.3, 0], foot: [0, -0.09, 0.04] }, { pelvisIsRoot: false });
