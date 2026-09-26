// studio/model.js — models as data (D-40's second half: modeling). Claude's (studio/*).
//
// A model is one JSON file, studio/models/<kind>/<name>.json (docs/studio.md §11): its materials by
// name, an optional skeleton of joints, and parts made of a few plain shapes placed on the joints. The
// game, the studio's pages and the tests all build a model through this file, so what Jerry approves
// on a contact sheet is what the game draws. A model with limbs (chains) is also a studio rig
// (rigFromModel): it plays clips, stands in scenes and, given a body, reacts to hits.
//
//   const errs = validateModel(json);             every problem as a sentence; [] means it's good
//   const m = buildModel(json);                   { group, joints, parts, meshes, limbs, cost, over }
//   registerRig('spider', rigFromModel(json));    a creature model is a rig without new code
//
// Units: metres and degrees. Deterministic: the same JSON builds the same geometry every time, and
// nothing here is random, so a model on Jerry's PC is the model in the cloud.
import * as THREE from 'three';
import { rbox } from '../core/geometry.js';
import { humanBody, ZOMBIE_BODY, MARINE_BODY } from './bodies.js';

export const MODEL_FORMAT = 'dw-model/1';
export const MODEL_KINDS = ['prop', 'creature'];
// The game's partsLost keys (index.html makeZombieMesh): a part tagged with one hides with that limb.
export const LIMBS = ['armL', 'armR', 'legL', 'legR', 'head'];
const D2R = Math.PI / 180;

// What each shape takes. `size` lists how many numbers its size may have; the options are the extra
// fields only that shape reads, so a field on the wrong shape is caught instead of ignored.
const SHAPES = {
  box: { size: [3], what: '[width, height, depth]', opts: [] },
  rbox: { size: [3], what: '[width, height, depth]', opts: ['radius', 'segments'] },
  cylinder: { size: [2, 3], what: '[radius, height] or [top radius, bottom radius, height]', opts: ['segments', 'open'] },
  cone: { size: [2], what: '[radius, height]', opts: ['segments', 'open'] },
  sphere: { size: [1], what: '[radius]', opts: ['segments'] },
  capsule: { size: [2], what: '[radius, length of the straight middle]', opts: ['segments'] },
  torus: { size: [2], what: '[ring radius, tube radius]', opts: ['segments', 'arc'] },
  lathe: { size: [0], what: null, opts: ['points', 'segments', 'arc'] },
  extrude: { size: [0], what: null, opts: ['outline', 'holes', 'depth', 'bevel'] },
  // Placed by points rather than by angles, which is easier to get right blind: a flat sheet through
  // three or four corners (a hull plate, a roof), and a bar from one point to another (a rail, a mast).
  panel: { size: [0], what: null, opts: ['corners'] },
  rod: { size: [1], what: '[radius]', opts: ['from', 'to', 'segments', 'open'] }
};
export const MODEL_SHAPES = Object.keys(SHAPES);
// Segment counts: the default, and the range that still reads as the shape. A pair is [around, other].
const SEGMENTS = {
  rbox: { def: 2, lo: 2, hi: 6 },
  cylinder: { def: 12, lo: 3, hi: 64 }, cone: { def: 12, lo: 3, hi: 64 }, lathe: { def: 12, lo: 3, hi: 64 }, rod: { def: 6, lo: 3, hi: 32 },
  sphere: { def: [12, 8], lo: [3, 2], hi: [64, 64], second: 'down' },
  capsule: { def: [8, 3], lo: [3, 1], hi: [64, 16], second: 'per cap' },
  torus: { def: [16, 6], lo: [3, 3], hi: [64, 32], second: 'around the tube' }
};
const TOP_KEYS = ['format', 'name', 'kind', 'version', 'owner', 'notes', 'materials', 'joints', 'parts', 'chains', 'budget', 'merge',
  'rig', 'displayScale', 'head', 'stage', 'body', 'clips'];
const MATERIAL_KEYS = ['color', 'roughness', 'metalness', 'emissive', 'emissiveIntensity', 'flatShading', 'transparent', 'opacity', 'side', 'note'];
const JOINT_KEYS = ['parent', 'at', 'rot', 'aim', 'pole', 'mirror', 'note'];
const CHAIN_KEYS = ['root', 'mid', 'end', 'lengths', 'pole', 'exact', 'mirror', 'note'];
const PART_KEYS = ['name', 'note', 'joint', 'shape', 'size', 'at', 'rot', 'scale', 'material', 'mirror', 'array', 'merge', 'shadow', 'limb'];
const ARRAY_KEYS = ['count', 'step', 'rot', 'pivot'];
const BODIES = { zombie: ZOMBIE_BODY, marine: MARINE_BODY };

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isVec = (v, n) => Array.isArray(v) && v.length === n && v.every(isNum);
const isVec3 = (v) => isVec(v, 3);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const isColor = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
const list = (a) => a.join(', ');
// "a box", "an rbox", "an extrude": the article for a shape's name, as it's read aloud.
const an = (w) => (/^([aeiou]|rbox)/.test(w) ? 'an ' : 'a ') + w;

// "hipL" <-> "hipR", "hip1L" <-> "hip1R", "legL2" <-> "legR2": a capital L or R at the end, or before
// trailing digits. Anything else has no twin (null).
export function mirrorName(name) {
  const m = typeof name === 'string' ? /^(.+?)([LR])(\d*)$/.exec(name) : null;
  return m ? m[1] + (m[2] === 'L' ? 'R' : 'L') + m[3] : null;
}
// A mirror across the model's YZ plane: a point's x flips, and a rotation's y and z turn the other way.
const flipX = (v) => (v ? [-v[0], v[1], v[2]] : v);
const flipRot = (v) => (v ? [v[0], -v[1], -v[2]] : v);

// The review folder for a model's sheets and Jerry's notes on it: review/model-<name> (docs/studio.md §5).
// Names are unique across kinds, so the folder name needs no kind in it.
export const modelAsset = (json) => 'model-' + json.name;

// --- The skeleton -----------------------------------------------------------------------------------
// Every joint, twins included, parents first: [{ name, parent, at, rot, aim, pole, twinOf }]. Problems
// go into `errs` (when given) as sentences; the list is still as complete as it can be.
function expandJoints(json, errs = []) {
  const src = isObj(json.joints) ? json.joints : {};
  const all = new Map();
  for (const [n, j] of Object.entries(src)) if (isObj(j)) all.set(n, { name: n, parent: j.parent ?? null, at: j.at, rot: j.rot, aim: j.aim, pole: j.pole, twinOf: null });
  const twins = new Map();
  for (const [n, j] of Object.entries(src)) {
    if (!isObj(j) || j.mirror === undefined) continue;
    if (j.mirror !== 'x') { errs.push(`joint "${n}": "mirror" is "x" (a left/right pair across the model's middle)`); continue; }
    const t = mirrorName(n);
    if (!t) { errs.push(`joint "${n}": a mirrored joint's name ends in L or R (then its twin is the other), e.g. "hipL"`); continue; }
    if (all.has(t)) { errs.push(`joint "${n}" is mirrored onto "${t}", which is declared as well: declare one side and mirror it`); continue; }
    twins.set(t, n);
  }
  for (const [t, n] of twins) {
    const j = all.get(n);
    const pt = j.parent !== null ? mirrorName(j.parent) : null;
    const parent = j.parent === null ? null : (pt && (all.has(pt) || twins.has(pt)) ? pt : j.parent);
    all.set(t, { name: t, parent, at: flipX(j.at), rot: flipRot(j.rot), aim: flipX(j.aim), pole: flipX(j.pole), twinOf: n });
  }
  // Parents first, so a joint's parent is built (and its rest rotation known) before it is.
  const out = [], state = new Map();
  const visit = (n, trail) => {
    if (state.get(n) === 2) return true;
    if (state.get(n) === 1) { errs.push(`joints ${trail.concat(n).map((x) => `"${x}"`).join(' -> ')} make a loop: a joint can't be its own ancestor`); return false; }
    const j = all.get(n);
    state.set(n, 1);
    if (j.parent !== null) {
      if (!all.has(j.parent)) { errs.push(`joint "${n}": its parent "${j.parent}" is not a joint (${list([...all.keys()]) || 'none'})`); state.set(n, 2); return false; }
      if (!visit(j.parent, trail.concat(n))) { state.set(n, 2); return false; }
    }
    state.set(n, 2);
    out.push(j);
    return true;
  };
  for (const n of all.keys()) visit(n, []);
  return out;
}

// A joint's rest rotation in its parent's frame. `aim` and `pole` are in the model's own frame (the
// easy one to think in), so the parent's rest rotation in that frame (`parentQ`) turns them into it.
// The joint's -Y goes along `aim` (the rig convention: limbs hang along -Y, studio/ik.js) and its +Z
// toward `pole`, which is also the way a limb's middle joint points when the IK solver bends it.
const _qa = new THREE.Quaternion(), _m4 = new THREE.Matrix4(), _vx = new THREE.Vector3(), _vy = new THREE.Vector3(), _vz = new THREE.Vector3();
function restQuat(j, parentQ, out) {
  if (j.aim) {
    _vy.set(-j.aim[0], -j.aim[1], -j.aim[2]).normalize();
    // The pole, or failing that the parent's forward, up or side: the first not along the aim.
    const tries = [j.pole ? _vz.set(...j.pole) : null, new THREE.Vector3(0, 0, 1).applyQuaternion(parentQ), new THREE.Vector3(0, 1, 0).applyQuaternion(parentQ), new THREE.Vector3(1, 0, 0).applyQuaternion(parentQ)];
    let z = null;
    for (const c of tries) {
      if (!c) continue;
      const p = c.clone().addScaledVector(_vy, -c.dot(_vy));
      if (p.lengthSq() > 1e-8) { z = p.normalize(); break; }
    }
    _vz.copy(z);
    _vx.crossVectors(_vy, _vz);
    // makeBasis(x, y, z), written into the elements (column-major) as studio/ik.js does: the game's
    // tests run on a stand-in three whose makeBasis does nothing.
    const me = _m4.identity().elements;
    me[0] = _vx.x; me[1] = _vx.y; me[2] = _vx.z; me[4] = _vy.x; me[5] = _vy.y; me[6] = _vy.z; me[8] = _vz.x; me[9] = _vz.y; me[10] = _vz.z;
    out.setFromRotationMatrix(_m4);
    return out.premultiply(_qa.copy(parentQ).invert());
  }
  const r = j.rot || [0, 0, 0];
  return out.setFromEuler(new THREE.Euler(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'));
}
// Every joint with its rest rotation (in its parent's frame), parents first.
function restJoints(json) {
  const worldQ = new Map();
  return expandJoints(json).map((j) => {
    const pq = j.parent === null ? new THREE.Quaternion() : worldQ.get(j.parent);
    const q = restQuat(j, pq, new THREE.Quaternion());
    worldQ.set(j.name, pq.clone().multiply(q));
    return { ...j, q };
  });
}

// Every limb, twins included, with its lengths worked out from the joints where the file leaves them
// out: { name: { root, mid, end, lengths, pole, exact } }, the rig chain format (docs/studio.md §2).
function expandChains(json, joints, errs = []) {
  const src = isObj(json.chains) ? json.chains : {};
  const byName = new Map(joints.map((j) => [j.name, j]));
  const out = {};
  const add = (name, c, from) => {
    const at = `chain "${name}"${from ? ` (the mirror of "${from}")` : ''}`;
    const ends = ['root', 'mid', 'end'].map((k) => c[k]);
    const bad = ['root', 'mid', 'end'].filter((k) => !(typeof c[k] === 'string' && byName.has(c[k])));
    if (bad.length) {
      errs.push(`${at}: "root", "mid" and "end" name its three joints (hip, knee, foot); ${bad.map((k) => `"${k}" ${c[k] === undefined ? 'is missing' : `(${JSON.stringify(c[k])}) is not a joint`}`).join(', ')}`);
      return;
    }
    const [root, mid, end] = ends.map((n) => byName.get(n));
    if (mid.parent !== root.name) errs.push(`${at}: "${mid.name}" must be a child of "${root.name}" (its parent is ${JSON.stringify(mid.parent)})`);
    if (end.parent !== mid.name) errs.push(`${at}: "${end.name}" must be a child of "${mid.name}" (its parent is ${JSON.stringify(end.parent)})`);
    const ma = mid.at || [0, 0, 0], ea = end.at || [0, 0, 0];
    const onY = (v) => Math.abs(v[0]) < 1e-6 && Math.abs(v[2]) < 1e-6 && v[1] < 0;
    if (!onY(ma)) errs.push(`${at}: "${mid.name}" must sit straight down "${root.name}"'s -Y, at [0, -length, 0] (the IK solver, studio/ik.js, bends limbs that hang along -Y); turn "${root.name}" with "rot" or "aim" instead`);
    if (c.exact ? !(Math.abs(ea[0]) < 1e-6 && ea[1] < 0) : !onY(ea)) errs.push(`${at}: "${end.name}" must sit down "${mid.name}"'s -Y, at [0, -length, 0]${c.exact ? ' (with "exact" it may sit off the line in z, never in x)' : ' (or set "exact": true when it sits off the line, like a hand ahead of the forearm)'}`);
    if (c.pole !== undefined && !(isVec3(c.pole) && Math.hypot(...c.pole) > 1e-6)) errs.push(`${at}: "pole" is [x, y, z], model frame, the way the middle joint bends (a knee forward is [0, 0, 1])`);
    if (c.lengths !== undefined && !(isVec(c.lengths, 2) && c.lengths.every((v) => v > 0))) errs.push(`${at}: "lengths" is [upper, lower] in metres; leave it out to measure the joints`);
    if (c.exact !== undefined && typeof c.exact !== 'boolean') errs.push(`${at}: "exact" is true or false`);
    const lengths = isVec(c.lengths, 2) ? c.lengths.slice() : [Math.hypot(...ma), c.exact ? Math.hypot(ea[1], ea[2]) : Math.hypot(...ea)];
    out[name] = { root: root.name, mid: mid.name, end: end.name, lengths, pole: isVec3(c.pole) ? c.pole.slice() : [0, 0, 1], ...(c.exact ? { exact: true } : {}) };
  };
  for (const [n, c] of Object.entries(src)) {
    if (!isObj(c)) { errs.push(`chain "${n}" must be an object { root, mid, end, pole }`); continue; }
    for (const k of Object.keys(c)) if (!CHAIN_KEYS.includes(k)) errs.push(`chain "${n}": unknown field "${k}" (a chain has ${list(CHAIN_KEYS)})`);
    add(n, c, null);
    if (c.mirror === undefined) continue;
    const t = mirrorName(n);
    if (c.mirror !== 'x') errs.push(`chain "${n}": "mirror" is "x"`);
    else if (!t) errs.push(`chain "${n}": a mirrored chain's name ends in L or R, e.g. "footL"`);
    else if (src[t]) errs.push(`chain "${n}" is mirrored onto "${t}", which is declared as well: declare one side and mirror it`);
    else {
      const sw = (j) => { const m = mirrorName(j); return m && byName.has(m) ? m : j; };
      add(t, { ...c, root: sw(c.root), mid: sw(c.mid), end: sw(c.end), pole: isVec3(c.pole) ? flipX(c.pole) : c.pole }, n);
    }
  }
  return out;
}

// --- Validation ---------------------------------------------------------------------------------
// Every problem in a model, as sentences an agent can act on. Empty means it's good.
export function validateModel(json) {
  const errs = [];
  if (!isObj(json)) return ['the model is not a JSON object'];
  if (json.format !== MODEL_FORMAT) errs.push(`"format" must be "${MODEL_FORMAT}" (got ${JSON.stringify(json.format)})`);
  if (typeof json.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,57}$/.test(json.name)) errs.push('"name" is missing: lower case, digits and dashes, up to 58 of them, the same as the file name (studio/models/<kind>/<name>.json)');
  if (!MODEL_KINDS.includes(json.kind)) errs.push(`"kind" is ${MODEL_KINDS.map((k) => `"${k}"`).join(' or ')} (got ${JSON.stringify(json.kind)})`);
  for (const k of Object.keys(json)) if (!TOP_KEYS.includes(k)) errs.push(`unknown field "${k}" (a model has ${list(TOP_KEYS)})`);
  if (json.version !== undefined && !(Number.isInteger(json.version) && json.version >= 1)) errs.push('"version" is a whole number from 1: bump it with each change Jerry should look at');
  if (json.owner !== undefined && !/^[a-z]+$/.test(json.owner)) errs.push('"owner" is the agent who answers Jerry\'s notes on it (claude, cursor, grokbot, chatgpt)');
  if (json.notes !== undefined && typeof json.notes !== 'string') errs.push('"notes" is free text: what the model is and what it should feel like');
  if (json.merge !== undefined && json.merge !== true && json.merge !== false && json.merge !== 'color') errs.push('"merge" is true (parts on one joint with one material draw as one), "color" (parts on one joint whose materials differ only in colour draw as one) or false');
  const b = json.budget;
  if (!isObj(b) || !(Number.isInteger(b.draws) && b.draws >= 1) || !(Number.isInteger(b.triangles) && b.triangles >= 1)) errs.push('"budget" is { "draws": n, "triangles": n }, whole numbers: what this model may cost (the build checks it)');

  // Materials.
  const mats = isObj(json.materials) ? json.materials : null;
  if (!mats || !Object.keys(mats).length) errs.push('"materials" is missing: name each material, e.g. { "paint": { "color": "#a8261c" } }');
  for (const [n, m] of Object.entries(mats || {})) {
    const at = `material "${n}"`;
    if (!isObj(m)) { errs.push(`${at} must be an object with at least "color"`); continue; }
    for (const k of Object.keys(m)) if (!MATERIAL_KEYS.includes(k)) errs.push(`${at}: unknown field "${k}" (a material has ${list(MATERIAL_KEYS)})`);
    if (!isColor(m.color)) errs.push(`${at}: "color" is "#rrggbb" (got ${JSON.stringify(m.color)})`);
    if (m.emissive !== undefined && !isColor(m.emissive)) errs.push(`${at}: "emissive" is "#rrggbb", the colour it glows`);
    for (const k of ['roughness', 'metalness', 'opacity']) if (m[k] !== undefined && !(isNum(m[k]) && m[k] >= 0 && m[k] <= 1)) errs.push(`${at}: "${k}" is a number from 0 to 1`);
    if (m.emissiveIntensity !== undefined && !(isNum(m.emissiveIntensity) && m.emissiveIntensity >= 0 && m.emissiveIntensity <= 20)) errs.push(`${at}: "emissiveIntensity" is a number from 0 to 20`);
    for (const k of ['flatShading', 'transparent']) if (m[k] !== undefined && typeof m[k] !== 'boolean') errs.push(`${at}: "${k}" is true or false`);
    if (m.opacity !== undefined && m.opacity < 1 && m.transparent !== true) errs.push(`${at}: an "opacity" under 1 needs "transparent": true`);
    if (m.side !== undefined && m.side !== 'front' && m.side !== 'double') errs.push(`${at}: "side" is "front" or "double" (both faces drawn: a thin sheet seen from either side)`);
  }

  // Joints.
  if (json.joints !== undefined && !isObj(json.joints)) errs.push('"joints" is an object of named joints, { "hipL": { "parent": "pelvis", "at": [x, y, z] } }');
  for (const [n, j] of Object.entries(isObj(json.joints) ? json.joints : {})) {
    const at = `joint "${n}"`;
    if (!isObj(j)) { errs.push(`${at} must be an object { parent, at, rot }`); continue; }
    for (const k of Object.keys(j)) if (!JOINT_KEYS.includes(k)) errs.push(`${at}: unknown field "${k}" (a joint has ${list(JOINT_KEYS)})`);
    if (j.parent !== undefined && j.parent !== null && typeof j.parent !== 'string') errs.push(`${at}: "parent" names another joint (leave it out for the model's root)`);
    if (j.parent === n) errs.push(`${at}: a joint can't be its own parent`);
    if (j.at !== undefined && !isVec3(j.at)) errs.push(`${at}: "at" is [x, y, z] metres from its parent`);
    if (j.rot !== undefined && !isVec3(j.rot)) errs.push(`${at}: "rot" is [x, y, z] degrees, in its parent's frame`);
    if (j.aim !== undefined && !(isVec3(j.aim) && Math.hypot(...j.aim) > 1e-6)) errs.push(`${at}: "aim" is [x, y, z], model frame: the way its bone (its -Y) points`);
    if (j.pole !== undefined && !(isVec3(j.pole) && Math.hypot(...j.pole) > 1e-6)) errs.push(`${at}: "pole" is [x, y, z], model frame: the way its +Z turns (a limb's bend)`);
    if (j.rot !== undefined && j.aim !== undefined) errs.push(`${at}: give "rot" or "aim", not both`);
    if (j.pole !== undefined && j.aim === undefined) errs.push(`${at}: "pole" goes with "aim"`);
  }
  const joints = expandJoints(json, errs);
  const jointNames = new Set(joints.map((j) => j.name));
  const hasJoint = (n) => jointNames.has(n);

  // Parts.
  if (!Array.isArray(json.parts) || !json.parts.length) errs.push('"parts" is missing: a list of shapes, e.g. [{ "shape": "box", "size": [1, 1, 1], "material": "paint" }]');
  (Array.isArray(json.parts) ? json.parts : []).forEach((p, i) => {
    const at = `part ${i}${p && typeof p.name === 'string' ? ` ("${p.name}")` : ''}`;
    if (!isObj(p)) { errs.push(`${at} must be an object { shape, size, material }`); return; }
    const S = SHAPES[p.shape];
    if (!S) { errs.push(`${at}: "shape" is one of ${list(MODEL_SHAPES)} (got ${JSON.stringify(p.shape)})`); return; }
    for (const k of Object.keys(p)) {
      if (PART_KEYS.includes(k) || S.opts.includes(k)) continue;
      const owners = MODEL_SHAPES.filter((s) => SHAPES[s].opts.includes(k));
      errs.push(owners.length ? `${at}: "${k}" is for ${list(owners)}, not ${an(p.shape)}` : `${at}: unknown field "${k}" (a part has ${list(PART_KEYS)}; ${an(p.shape)} also ${S.opts.length ? list(S.opts) : 'nothing else'})`);
    }
    if (S.what) {
      if (!Array.isArray(p.size) || !S.size.includes(p.size.length) || !p.size.every(isNum)) errs.push(`${at}: ${an(p.shape)}'s "size" is ${S.what}`);
      else if (p.shape === 'cylinder' && p.size.length === 3 ? !(p.size[0] >= 0 && p.size[1] >= 0 && p.size[0] + p.size[1] > 0 && p.size[2] > 0) : !p.size.every((v) => v > 0)) errs.push(`${at}: "size" must be above 0`);
    } else if (p.size !== undefined) errs.push(`${at}: ${an(p.shape)} has no "size" (${{ lathe: '"points" give its outline', extrude: '"outline" and "depth" give it', panel: '"corners" give it' }[p.shape]})`);
    if (p.shape === 'lathe') {
      if (!Array.isArray(p.points) || p.points.length < 2 || !p.points.every((q) => isVec(q, 2) && q[0] >= 0)) errs.push(`${at}: a lathe's "points" are at least two [radius, y], radius 0 or more, turned about the part's Y`);
      else if (p.points[p.points.length - 1][1] < p.points[0][1]) errs.push(`${at}: a lathe's "points" go from bottom to top (the faces point outward that way)`);
    }
    if (p.shape === 'extrude') {
      const outline = (o) => Array.isArray(o) && o.length >= 3 && o.every((q) => isVec(q, 2));
      if (!outline(p.outline)) errs.push(`${at}: an extrude's "outline" is at least three [x, y] points, the shape's face (x across, y up)`);
      if (!(isNum(p.depth) && p.depth > 0)) errs.push(`${at}: an extrude's "depth" is how thick it is along z, in metres, above 0`);
      if (p.holes !== undefined && !(Array.isArray(p.holes) && p.holes.every(outline))) errs.push(`${at}: "holes" is a list of outlines, each at least three [x, y] points`);
      if (p.bevel !== undefined && !(isNum(p.bevel) && p.bevel >= 0)) errs.push(`${at}: "bevel" is metres of rounded edge, 0 or more`);
    }
    if (p.shape === 'panel') {
      if (!Array.isArray(p.corners) || (p.corners.length !== 3 && p.corners.length !== 4) || !p.corners.every(isVec3)) errs.push(`${at}: a panel's "corners" are three or four [x, y, z], going round anticlockwise as seen from the side that shows (or give its material "side": "double")`);
    }
    if (p.shape === 'rod') {
      if (!isVec3(p.from) || !isVec3(p.to)) errs.push(`${at}: a rod goes "from" [x, y, z] "to" [x, y, z]`);
      else if (Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1], p.to[2] - p.from[2]) < 1e-4) errs.push(`${at}: a rod's "from" and "to" are the same point`);
    }
    if (p.radius !== undefined && !(isNum(p.radius) && p.radius > 0)) errs.push(`${at}: "radius" is metres of rounded edge, above 0 (default a quarter of the smallest side)`);
    if (p.open !== undefined && typeof p.open !== 'boolean') errs.push(`${at}: "open" is true (no end caps) or false`);
    if (p.arc !== undefined && !(isNum(p.arc) && p.arc > 0 && p.arc <= 360)) errs.push(`${at}: "arc" is degrees round, above 0 and up to 360`);
    const sg = SEGMENTS[p.shape];
    if (p.segments !== undefined && sg) {
      const pair = Array.isArray(sg.def);
      const v = pair && isNum(p.segments) ? [p.segments, sg.def[1]] : p.segments;
      const ok = pair ? isVec(v, 2) && v.every((n, k) => Number.isInteger(n) && n >= sg.lo[k] && n <= sg.hi[k]) : Number.isInteger(v) && v >= sg.lo && v <= sg.hi;
      if (!ok) errs.push(pair ? `${at}: ${an(p.shape)}'s "segments" is [around (${sg.lo[0]}-${sg.hi[0]}), ${sg.second} (${sg.lo[1]}-${sg.hi[1]})], or one number for around` : `${at}: ${an(p.shape)}'s "segments" is a whole number from ${sg.lo} to ${sg.hi}`);
    }
    if (p.at !== undefined && !isVec3(p.at)) errs.push(`${at}: "at" is [x, y, z] metres on its joint`);
    if (p.rot !== undefined && !isVec3(p.rot)) errs.push(`${at}: "rot" is [x, y, z] degrees`);
    if (p.scale !== undefined && !((isNum(p.scale) && p.scale > 0) || (isVec3(p.scale) && p.scale.every((v) => v > 0)))) errs.push(`${at}: "scale" is a number or [x, y, z], above 0 (a left/right copy is "mirror": "x", not a negative scale)`);
    if (typeof p.material !== 'string' || !mats || !mats[p.material]) errs.push(`${at}: "material" names one of "materials" (${mats ? list(Object.keys(mats)) : 'none'}); got ${JSON.stringify(p.material)}`);
    if (p.joint !== undefined && !hasJoint(p.joint)) errs.push(`${at}: joint "${p.joint}" is not a joint (${list([...jointNames]) || 'none: leave "joint" out to put it on the model itself'})`);
    if (p.limb !== undefined && !LIMBS.includes(p.limb)) errs.push(`${at}: "limb" is one of ${list(LIMBS)} (the part hides when that limb is lost)`);
    if (p.merge !== undefined && typeof p.merge !== 'boolean') errs.push(`${at}: "merge" is false to keep this part its own mesh (something the game moves or hides alone)`);
    if (p.shadow !== undefined && typeof p.shadow !== 'boolean') errs.push(`${at}: "shadow" is true or false (casts a shadow; default true)`);
    if (p.mirror !== undefined) {
      if (p.mirror !== 'x') errs.push(`${at}: "mirror" is "x": a left/right twin across the model's middle`);
      else if (p.joint !== undefined && mirrorName(p.joint) && hasJoint(p.joint) && !hasJoint(mirrorName(p.joint))) errs.push(`${at}: its mirror goes on "${mirrorName(p.joint)}", and there is no such joint (mirror the joint "${p.joint}" too)`);
    }
    if (p.array !== undefined) {
      const a = p.array;
      if (!isObj(a) || !(Number.isInteger(a.count) && a.count >= 1 && a.count <= 64)) errs.push(`${at}: "array" is { "count": 1 to 64, "step": [x, y, z], "rot": [x, y, z] degrees, "pivot": [x, y, z] }`);
      else {
        for (const k of Object.keys(a)) if (!ARRAY_KEYS.includes(k)) errs.push(`${at}: "array" has unknown field "${k}" (${list(ARRAY_KEYS)})`);
        for (const k of ['step', 'rot', 'pivot']) if (a[k] !== undefined && !isVec3(a[k])) errs.push(`${at}: array "${k}" is [x, y, z]`);
        if (a.count > 1 && !(isVec3(a.step) && a.step.some((v) => v !== 0)) && !(isVec3(a.rot) && a.rot.some((v) => v !== 0))) errs.push(`${at}: an array of ${a.count} needs a "step" or a "rot", or every copy sits in one place`);
      }
    }
  });

  // Limbs, and the rest of what a rig needs.
  if (json.chains !== undefined) {
    if (!isObj(json.chains)) errs.push('"chains" is an object of named limbs, { "footL": { "root": "hipL", "mid": "kneeL", "end": "ankleL", "pole": [0, 0, 1] } }');
    else expandChains(json, joints, errs);
  }
  if (json.rig !== undefined && !(typeof json.rig === 'string' && /^[a-z][a-z0-9-]*$/.test(json.rig))) errs.push('"rig" is the name it registers as a studio rig (lower case), e.g. "spider"');
  if (json.rig !== undefined && !jointNames.size) errs.push('"rig" needs "joints": a rig is a skeleton');
  if (json.clips !== undefined && !(Array.isArray(json.clips) && json.clips.every((c) => typeof c === 'string' && /^[\w-]+\/[\w-]+$/.test(c)))) errs.push('"clips" lists the clips its rig plays, "rig/clip" (studio/clips/<rig>/<clip>.json), the one to show first first');
  if (json.clips !== undefined && json.rig === undefined) errs.push('"clips" needs "rig": only a model that is a rig plays clips');
  if (json.displayScale !== undefined && !(isNum(json.displayScale) && json.displayScale > 0)) errs.push('"displayScale" is the size it is shown at, above 0 (1 is as built)');
  if (json.head !== undefined) {
    const h = json.head;
    if (!isObj(h) || !hasJoint(h.neck) || !hasJoint(h.head)) errs.push('"head" is { "neck": joint, "head": joint, "jaw"?: joint, "jawOpenDeg"?: n, "limitDeg"?: n }, naming joints of this model');
    else {
      if (h.jaw !== undefined && !hasJoint(h.jaw)) errs.push(`head.jaw: "${h.jaw}" is not a joint`);
      for (const k of ['jawOpenDeg', 'limitDeg']) if (h[k] !== undefined && !(isNum(h[k]) && h[k] > 0 && h[k] <= 180)) errs.push(`head.${k} is degrees, above 0`);
    }
  }
  if (json.stage !== undefined) {
    if (!isObj(json.stage)) errs.push('"stage" is { "targets": { name: [x, y, z] } }: where the renderer puts live targets, model frame');
    else if (json.stage.targets !== undefined && !(isObj(json.stage.targets) && Object.values(json.stage.targets).every(isVec3))) errs.push('stage.targets is { name: [x, y, z] }, model frame');
  }
  if (json.body !== undefined) {
    const body = resolveBody(json.body);
    if (!body) errs.push(`"body" is ${list(Object.keys(BODIES).map((k) => `"${k}"`))} (a layout in studio/bodies.js), { "human": { pelvis, chest, crown, foot }, "pelvisIsRoot": bool }, or a whole body { points, bones, segments, ... }`);
    else {
      const need = new Set([...Object.values(body.points || {}).map((p) => p.joint), ...(body.segments || []).map((s) => s.joint)]);
      const missing = [...need].filter((n) => !hasJoint(n));
      if (missing.length) errs.push(`"body" moves joints this model doesn't have: ${list(missing)}`);
    }
  }
  return errs;
}

function resolveBody(b) {
  if (typeof b === 'string') return BODIES[b] || null;
  if (!isObj(b)) return null;
  if (isObj(b.human)) {
    const h = b.human;
    if (!['pelvis', 'chest', 'crown', 'foot'].every((k) => isVec3(h[k]))) return null;
    return humanBody(h, { pelvisIsRoot: !!b.pelvisIsRoot });
  }
  return isObj(b.points) && Array.isArray(b.segments) ? b : null;
}

// --- Shapes -----------------------------------------------------------------------------------
// Built once per distinct shape and shared, like core/geometry.js's rbox: a horde of the same model
// holds one copy of each piece.
const GEO = new Map();
const segs = (p) => {
  const d = SEGMENTS[p.shape].def;
  if (!Array.isArray(d)) return p.segments ?? d;
  if (p.segments === undefined) return d;
  return isNum(p.segments) ? [p.segments, d[1]] : p.segments;
};
const shapeKey = (p) => JSON.stringify([p.shape, p.size, p.radius, p.segments, p.open, p.arc, p.points, p.outline, p.holes, p.depth, p.bevel, p.corners, p.from, p.to]);
function shapeGeometry(p) {
  const key = shapeKey(p);
  let g = GEO.get(key);
  if (g) return g;
  const s = p.size;
  switch (p.shape) {
    case 'box': g = new THREE.BoxGeometry(s[0], s[1], s[2]); break;
    case 'rbox': g = rbox(s[0], s[1], s[2], p.radius ?? Math.min(s[0], s[1], s[2]) * 0.25, segs(p)); break;
    case 'cylinder': {
      const [top, bottom, h] = s.length === 2 ? [s[0], s[0], s[1]] : s;
      g = new THREE.CylinderGeometry(top, bottom, h, segs(p), 1, !!p.open);
      break;
    }
    case 'cone': g = new THREE.ConeGeometry(s[0], s[1], segs(p), 1, !!p.open); break;
    case 'sphere': { const [w, h] = segs(p); g = new THREE.SphereGeometry(s[0], w, h); break; }
    case 'capsule': { const [around, cap] = segs(p); g = new THREE.CapsuleGeometry(s[0], s[1], cap, around); break; }
    case 'torus': { const [around, tube] = segs(p); g = new THREE.TorusGeometry(s[0], s[1], tube, around, (p.arc ?? 360) * D2R); break; }
    case 'lathe': g = new THREE.LatheGeometry(p.points.map(([r, y]) => new THREE.Vector2(r, y)), segs(p), 0, (p.arc ?? 360) * D2R); break;
    case 'extrude': {
      const path = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
      const shape = new THREE.Shape(path(p.outline));
      for (const h of p.holes || []) shape.holes.push(new THREE.Path(path(h)));
      const bevel = p.bevel || 0;
      g = new THREE.ExtrudeGeometry(shape, { depth: p.depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, curveSegments: 1 });
      g.translate(0, 0, -p.depth / 2);   // centred on its z, so "at" is its middle
      break;
    }
    case 'panel': {
      // One flat triangle, or two for four corners; each keeps its own normal, so a quad that isn't
      // quite flat still lights as two faces rather than a smear.
      const c = p.corners, tris = c.length === 4 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
      const UV = [[0, 0], [1, 0], [1, 1], [0, 1]];
      const pos = [], nrm = [], uv = [];
      const a = new THREE.Vector3(), b = new THREE.Vector3(), d = new THREE.Vector3();
      for (const t of tris) {
        a.set(...c[t[1]]).sub(b.set(...c[t[0]]));
        d.set(...c[t[2]]).sub(b);
        const n = a.cross(d).normalize();
        for (const k of t) { pos.push(...c[k]); nrm.push(n.x, n.y, n.z); uv.push(...UV[k]); }
      }
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      break;
    }
    case 'rod': {
      const from = new THREE.Vector3(...p.from), dir = new THREE.Vector3(...p.to).sub(from);
      const len = dir.length();
      g = new THREE.CylinderGeometry(s[0], s[0], len, segs(p), 1, !!p.open);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
      g.translate(from.x + dir.x * len / 2, from.y + dir.y * len / 2, from.z + dir.z * len / 2);
      break;
    }
  }
  g.computeBoundingSphere();
  g.userData.shared = true;
  GEO.set(key, g);
  return g;
}
// The shape seen in a mirror across its own YZ plane: x flips, and so does each triangle's winding,
// so its faces still point outward. Shared like the shapes.
function mirroredGeometry(p) {
  const key = 'mirror:' + shapeKey(p);
  let g = GEO.get(key);
  if (g) return g;
  const src = shapeGeometry(p);
  g = src.clone();
  const P = g.attributes.position, N = g.attributes.normal;
  for (let i = 0; i < P.count; i++) P.setX(i, -P.getX(i));
  if (N) for (let i = 0; i < N.count; i++) N.setX(i, -N.getX(i));
  const n = src.index ? src.index.count : P.count;
  const idx = new (P.count > 65535 ? Uint32Array : Uint16Array)(n);
  for (let k = 0; k < n; k += 3) {
    const a = src.index ? src.index.getX(k) : k, b = src.index ? src.index.getX(k + 1) : k + 1, c = src.index ? src.index.getX(k + 2) : k + 2;
    idx[k] = a; idx[k + 1] = c; idx[k + 2] = b;
  }
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  g.userData.shared = true;
  GEO.set(key, g);
  return g;
}

// --- Parts ----------------------------------------------------------------------------------------
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
function partMatrix(at, rot, scale) {
  const r = rot || [0, 0, 0];
  _q.setFromEuler(_e.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'XYZ'));
  _p.set(...(at || [0, 0, 0]));
  if (isNum(scale)) _s.setScalar(scale); else _s.set(...(scale || [1, 1, 1]));
  return new THREE.Matrix4().compose(_p, _q, _s);
}
// S·M·S with S the mirror across x: an entry flips where exactly one of its row and column is x.
function mirrorMatrix(m) {
  const out = m.clone(), e = out.elements;
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) if ((r === 0) !== (c === 0)) e[c * 4 + r] = -e[c * 4 + r];
  return out;
}
// Every part as it's drawn: array copies and mirror twins spelled out, each with its joint (null for
// the model itself) and its matrix on that joint.
function expandParts(json, jointNames) {
  const out = [];
  json.parts.forEach((p, i) => {
    const base = partMatrix(p.at, p.rot, p.scale);
    const a = p.array || { count: 1 };
    for (let c = 0; c < a.count; c++) {
      let m = base;
      if (c > 0) {
        const pv = a.pivot || [0, 0, 0], st = a.step || [0, 0, 0], rt = a.rot || [0, 0, 0];
        const T = new THREE.Matrix4().makeTranslation(st[0] * c + pv[0], st[1] * c + pv[1], st[2] * c + pv[2]);
        const R = partMatrix(null, [rt[0] * c, rt[1] * c, rt[2] * c], 1);
        m = T.multiply(R).multiply(new THREE.Matrix4().makeTranslation(-pv[0], -pv[1], -pv[2])).multiply(base);
      }
      const joint = p.joint ?? null;
      out.push({ src: i, copy: c, mirrored: false, spec: p, name: p.name || null, joint, limb: p.limb || null, matrix: m });
      if (p.mirror === 'x') {
        const tj = joint !== null && mirrorName(joint) && jointNames.has(mirrorName(joint)) ? mirrorName(joint) : joint;
        out.push({
          src: i, copy: c, mirrored: true, spec: p, name: p.name ? (mirrorName(p.name) || p.name) : null, joint: tj,
          limb: p.limb ? (mirrorName(p.limb) || p.limb) : null, matrix: mirrorMatrix(m)
        });
      }
    }
  });
  return out;
}

// --- Materials --------------------------------------------------------------------------------
function makeMaterial(name, m, { white = false } = {}) {
  const mat = new THREE.MeshStandardMaterial({
    color: white ? 0xffffff : new THREE.Color(m.color), roughness: m.roughness ?? 0.8, metalness: m.metalness ?? 0,
    flatShading: !!m.flatShading, transparent: !!m.transparent, opacity: m.opacity ?? 1,
    side: m.side === 'double' ? THREE.DoubleSide : THREE.FrontSide
  });
  if (m.emissive) { mat.emissive = new THREE.Color(m.emissive); mat.emissiveIntensity = m.emissiveIntensity ?? 1; }
  if (white) mat.vertexColors = true;
  mat.name = name;
  return mat;
}
// Everything about a material but its colour: materials that share it can be one mesh, coloured per vertex.
const finishOf = (m) => JSON.stringify(MATERIAL_KEYS.filter((k) => k !== 'color' && k !== 'note').map((k) => m[k] ?? null));

// --- Merging ----------------------------------------------------------------------------------
// Several parts on one joint as one geometry in the joint's frame: positions and normals moved by
// each part's matrix, indices offset, and a colour per vertex when the parts differ in colour. Written
// out here because BufferGeometryUtils isn't vendored (and this keeps the index, which that doesn't).
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _nm = new THREE.Matrix3(), _c = new THREE.Color();
function mergeGeometry(items, colors) {
  let vc = 0, ic = 0, uvs = true;
  for (const it of items) {
    const g = it.geo;
    vc += g.attributes.position.count;
    ic += g.index ? g.index.count : g.attributes.position.count;
    if (!g.attributes.uv) uvs = false;
  }
  const pos = new Float32Array(vc * 3), nrm = new Float32Array(vc * 3), uv = uvs ? new Float32Array(vc * 2) : null;
  const col = colors ? new Float32Array(vc * 3) : null;
  const idx = new (vc > 65535 ? Uint32Array : Uint16Array)(ic);
  let vo = 0, io = 0;
  for (const it of items) {
    const g = it.geo, P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    _nm.getNormalMatrix(it.matrix);
    const flip = it.matrix.determinant() < 0;
    if (col) _c.set(it.color);
    for (let i = 0; i < P.count; i++) {
      const w = (vo + i) * 3;
      _v.fromBufferAttribute(P, i).applyMatrix4(it.matrix);
      pos[w] = _v.x; pos[w + 1] = _v.y; pos[w + 2] = _v.z;
      if (N) { _n.fromBufferAttribute(N, i).applyMatrix3(_nm).normalize(); nrm[w] = _n.x; nrm[w + 1] = _n.y; nrm[w + 2] = _n.z; }
      if (uv) { uv[(vo + i) * 2] = U.getX(i); uv[(vo + i) * 2 + 1] = U.getY(i); }
      if (col) { col[w] = _c.r; col[w + 1] = _c.g; col[w + 2] = _c.b; }
    }
    const n = g.index ? g.index.count : P.count;
    for (let k = 0; k < n; k += 3) {
      const a = g.index ? g.index.getX(k) : k, b = g.index ? g.index.getX(k + 1) : k + 1, c = g.index ? g.index.getX(k + 2) : k + 2;
      idx[io++] = vo + a;
      if (flip) { idx[io++] = vo + c; idx[io++] = vo + b; } else { idx[io++] = vo + b; idx[io++] = vo + c; }
    }
    vo += P.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  if (uv) out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// --- Building ---------------------------------------------------------------------------------
// Draw calls and triangles, counted the way studio/rigs.js rigCost counts a rig.
export function modelCost(group) {
  let draws = 0, triangles = 0;
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    draws++;
    const g = o.geometry;
    triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return { draws, triangles: Math.round(triangles) };
}

// Builds a model: { group, joints, parts, meshes, limbs, cost, budget, over }.
//   group    a THREE.Group at the model's origin; group.userData.rig is the joints (a rig can adopt it)
//   joints   { name: THREE.Group } at their rest pose
//   parts    [{ name, joint, material, limb, mirrored, copy, mesh }], one per part as drawn
//   meshes   every mesh, in build order; limbs { armL: [meshes], ... } for parts tagged with a limb
//   cost     { draws, triangles }; over: true when that's past the model's budget
export function buildModel(json) {
  const errs = validateModel(json);
  if (errs.length) throw new Error(`model ${json && json.name ? '"' + json.name + '" ' : ''}is not valid:\n  - ` + errs.join('\n  - '));
  const group = new THREE.Group();
  group.name = json.name;
  // The skeleton, parents first, each at its rest pose.
  const joints = {};
  for (const j of restJoints(json)) {
    const g = new THREE.Group();
    g.name = j.name;
    g.position.set(...(j.at || [0, 0, 0]));
    g.quaternion.copy(j.q);
    (j.parent === null ? group : joints[j.parent]).add(g);
    joints[j.name] = g;
  }
  // The parts, grouped into meshes: alone, or merged with others on the same joint.
  const mode = json.merge ?? false;
  const mats = new Map(), finishMats = new Map();
  const matOf = (n) => mats.get(n) || mats.set(n, makeMaterial(n, json.materials[n])).get(n);
  const expanded = expandParts(json, new Set(Object.keys(joints)));
  const bins = new Map();
  expanded.forEach((e, k) => {
    const m = json.materials[e.spec.material], alone = mode === false || e.spec.merge === false;
    const key = alone ? 'solo:' + k : [e.joint, mode === 'color' ? finishOf(m) : e.spec.material, e.limb, e.spec.shadow !== false].join('|');
    (bins.get(key) || bins.set(key, []).get(key)).push(e);
  });
  const meshes = [], parts = [], limbs = {};
  for (const items of bins.values()) {
    const first = items[0], parent = first.joint === null ? group : joints[first.joint];
    const oneMat = items.every((e) => e.spec.material === first.spec.material);
    let mesh;
    if (items.length === 1) {
      mesh = new THREE.Mesh(first.mirrored ? mirroredGeometry(first.spec) : shapeGeometry(first.spec), matOf(first.spec.material));
      first.matrix.decompose(mesh.position, mesh.quaternion, mesh.scale);
      mesh.name = first.name || '';
    } else {
      const geo = mergeGeometry(items.map((e) => ({ geo: e.mirrored ? mirroredGeometry(e.spec) : shapeGeometry(e.spec), matrix: e.matrix, color: json.materials[e.spec.material].color })), !oneMat);
      let mat;
      if (oneMat) mat = matOf(first.spec.material);
      else {
        const fk = finishOf(json.materials[first.spec.material]);
        const same = Object.keys(json.materials).filter((n) => finishOf(json.materials[n]) === fk).join('+');
        mat = finishMats.get(fk) || finishMats.set(fk, makeMaterial(same, json.materials[first.spec.material], { white: true })).get(fk);
      }
      mesh = new THREE.Mesh(geo, mat);
      mesh.name = `${first.joint || json.name}:${mat.name}`;
    }
    mesh.castShadow = first.spec.shadow !== false;
    mesh.receiveShadow = true;
    mesh.userData.model = json.name;
    parent.add(mesh);
    meshes.push(mesh);
    for (const e of items) {
      parts.push({ name: e.name, joint: e.joint, material: e.spec.material, limb: e.limb, mirrored: e.mirrored, copy: e.copy, src: e.src, mesh });
      if (e.limb) { const l = limbs[e.limb] || (limbs[e.limb] = []); if (!l.includes(mesh)) l.push(mesh); }
    }
  }
  group.userData.rig = joints;
  group.userData.model = { name: json.name, kind: json.kind, version: json.version || 1 };
  group.updateMatrixWorld(true);
  const cost = modelCost(group);
  const budget = json.budget;
  return { group, joints, parts, meshes, limbs, cost, budget, over: cost.draws > budget.draws || cost.triangles > budget.triangles };
}

// Another copy of a built model that shares its geometry and materials (a horde of one model costs
// one set of buffers). Its joints are its own.
export function instanceModel(built) {
  const src = built.group, rig = src.userData.rig;
  // Object3D.clone copies userData through JSON, and the rig map holds the joints themselves.
  delete src.userData.rig;
  const group = src.clone(true);
  src.userData.rig = rig;
  const names = new Set(Object.keys(built.joints)), joints = {};
  group.traverse((o) => { if (!o.isMesh && names.has(o.name) && !joints[o.name]) joints[o.name] = o; });
  group.userData.rig = joints;
  return { group, joints };
}

// Frees what a build made for itself (merged geometry, materials). Shapes are shared and stay.
// Dispose the original only once every instance of it is gone.
export function disposeModel(built) {
  const seen = new Set();
  built.group.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.geometry.userData.shared && !seen.has(o.geometry)) { seen.add(o.geometry); o.geometry.dispose(); }
    if (!seen.has(o.material)) { seen.add(o.material); o.material.dispose(); }
  });
}

// --- Models as rigs ------------------------------------------------------------------------------
// The model's rest pose as a clip (dw-clip/1, docs/studio.md §1): every joint that turns at rest, at
// time 0. It's what the rig's rest is, spelled as the data the player reads.
export function restClip(json) {
  const errs = validateModel(json);
  if (errs.length) throw new Error(`model ${json && json.name ? '"' + json.name + '" ' : ''}is not valid:\n  - ` + errs.join('\n  - '));
  const tracks = {};
  const e = new THREE.Euler();
  for (const j of restJoints(json)) {
    if (Math.abs(j.q.w) > 1 - 1e-12) continue;
    e.setFromQuaternion(j.q, 'XYZ');
    tracks[j.name] = { rot: [[0, [e.x / D2R, e.y / D2R, e.z / D2R]]] };
  }
  return { format: 'dw-clip/1', name: 'rest', rig: json.rig || json.name, length: 1, loop: false, notes: `The rest pose of studio/models/${json.kind}/${json.name}.json.`, tracks };
}

// A definition registerRig (studio/rigs.js) accepts, so a model with a skeleton is a studio rig:
//   registerRig(json.rig, rigFromModel(json))
// build() makes a fresh one; adopt(group) takes one the host built with buildModel. The limbs are the
// model's chains (lengths measured from the joints where the file leaves them out). opts.rest: a clip
// JSON to rest in instead of the model's own pose.
export function rigFromModel(json, opts = {}) {
  const errs = validateModel(json);
  if (errs.length) throw new Error(`model ${json && json.name ? '"' + json.name + '" ' : ''}is not valid:\n  - ` + errs.join('\n  - '));
  if (!isObj(json.joints) || !Object.keys(json.joints).length) throw new Error(`model "${json.name}" has no "joints": a rig needs a skeleton`);
  const chains = expandChains(json, expandJoints(json));
  const body = json.body !== undefined ? resolveBody(json.body) : undefined;
  return {
    build: () => buildModel(json).group,
    adopt: (group) => {
      const u = group && group.userData;
      if (!u || !u.rig || !u.model || u.model.name !== json.name) throw new Error(`this group is not a "${json.name}" model (build one with buildModel)`);
      return u.rig;
    },
    displayScale: json.displayScale ?? 1,
    chains,
    head: json.head || null,
    stage: json.stage || {},
    ...(body ? { body } : {}),
    rest: opts.rest || restClip(json),
    budget: { ...json.budget },
    model: `${json.kind}/${json.name}`
  };
}
