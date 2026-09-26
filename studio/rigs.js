// studio/rigs.js — every body the studio can animate, registered once. Claude's (D-40).
// A rig entry says how to build the body and what the player needs to know about it: its limbs
// (IK chains), its head, how its hand closes, its rest pose and its budget (docs/studio.md §2).
// A new creature is a new entry here, not new player code.
import * as THREE from 'three';
import { loadClip, sampleClip, applyPose } from './clip.js';
import { makeCaveGuardianRig, guardianGrip } from '../world/cave-guardian.js';
import { makeMarineRig, adoptMarine, MARINE_CHAINS } from './marine.js';
import guardianRest from './clips/guardian/rest.json' with { type: 'json' };

const REG = new Map();

export function registerRig(name, def) {
  if (!def || typeof def.build !== 'function' || !def.chains) throw new Error(`rig "${name}": needs build() and chains`);
  REG.set(name, { name, displayScale: 1, head: null, grip: null, rest: null, stage: {}, budget: null, ...def });
}
export const rigs = {
  names: () => [...REG.keys()],
  def: (name) => REG.get(name) || null,
  get(name) {
    const def = REG.get(name);
    if (!def) throw new Error(`no rig "${name}" (registered: ${[...REG.keys()].join(', ') || 'none'})`);
    return { def, create: (opts = {}) => createInstance(def, opts) };
  }
};

// A built body the player can pose: its root group, its joints by name, and its rest pose.
// opts.group: a body the host already has (the game's own marine) is adopted instead of built:
// its scale and pose are left as they are, and its rest is what it is now.
function createInstance(def, opts) {
  const adopting = !!opts.group;
  if (adopting && typeof def.adopt !== 'function') throw new Error(`rig "${def.name}" can't adopt a body (no adopt())`);
  const group = adopting ? opts.group : def.build(opts);
  if (!adopting) group.scale.setScalar(opts.scale ?? def.displayScale);
  const R = adopting ? def.adopt(group) : (group.userData.rig || {});
  // Name every joint group so the damping and the renderer's snap check can report it.
  for (const [k, v] of Object.entries(R)) if (v && v.isObject3D && !v.name) v.name = k;
  const inst = { def, group, R, rest: new Map(), plants: {}, rootBase: null };
  const capture = () => {
    inst.rest.clear();
    group.traverse((o) => { if (o !== group && !o.isMesh) inst.rest.set(o, { q: o.quaternion.clone(), p: o.position.clone() }); });
  };
  capture();
  // The rest pose is a clip at time 0: joints a clip doesn't mention sit where it puts them.
  if (def.rest && !adopting) {
    group.updateWorldMatrix(true, true);
    applyPose(inst, sampleClip(loadClip(def.rest), 0));
    capture();
    inst.plants = {};
  }
  return inst;
}

// Every mesh and triangle a rig draws: the renderer checks it against the budget.
export function rigCost(group) {
  let draws = 0, triangles = 0;
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    draws++;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return { draws, triangles: Math.round(triangles) };
}

// --- The cave guardian (world/cave-guardian.js) ---------------------------------------------
registerRig('guardian', {
  build: (opts) => makeCaveGuardianRig(opts.design),
  displayScale: 1.3,
  chains: {
    handL: { root: 'shoulderL', mid: 'elbowL', end: 'wristL', lengths: [1.08, 1.16], pole: [-0.7, 0.35, -1] },
    handR: { root: 'shoulderR', mid: 'elbowR', end: 'wristR', lengths: [1.08, 1.16], pole: [0.7, 0.35, -1] },
    footL: { root: 'hipL', mid: 'kneeL', end: 'ankleL', lengths: [0.74, 0.66], pole: [0, 0.2, 1] },
    footR: { root: 'hipR', mid: 'kneeR', end: 'ankleR', lengths: [0.74, 0.66], pole: [0, 0.2, 1] }
  },
  head: { neck: 'neck', head: 'head', jaw: 'jaw', jawOpenDeg: 55, limitDeg: 70 },
  // -1 knuckles under to walk on; +1 closes on what it holds.
  grip: (R, chain, v) => guardianGrip(R, chain.endsWith('L') ? 'L' : 'R', Math.min(1, Math.abs(v)), v < 0 ? 'walk' : 'grab'),
  rest: guardianRest,
  // Where the renderer stands its live targets (rig frame): the marine's ankle, in reach of a pounce.
  stage: { targets: { ankle: [0.4, 0.3, 2.6], carry: [0, 1.2, 0.85] }, marine: [1.6, 0, 2.2] },
  budget: { draws: 160, triangles: 8000 }
});

// --- The marine (studio/marine.js; the game's makeMarine() joint layout) ------------------
registerRig('marine', {
  build: () => makeMarineRig(),
  adopt: (group) => adoptMarine(group),
  displayScale: 1,
  chains: MARINE_CHAINS,
  head: null,
  stage: {},
  budget: { draws: 40, triangles: 2000 }
});
