// studio/model.test.mjs — models as data (docs/drafts/model.md). Real three.js maths in Node:
//   node --import ./studio/node-three.mjs --test studio/model.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { validateModel, buildModel, rigFromModel, restClip, instanceModel, mirrorName, modelAsset, MODEL_SHAPES } from './model.js';
import { models } from './models/index.js';
import { rigs, registerRig, rigCost } from './rigs.js';
import { makeZombieRig } from './zombie.js';
import { loadClip, validateClip, createPlayer, solveChain } from './clip.js';
import { loadMotion, validateMotion, createBody } from './motion.js';
import { presets } from './motion/index.js';
import { loadScene, createScene } from './scene.js';

const read = (rel) => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url), 'utf8'));
const model = (parts, extra = {}) => ({
  format: 'dw-model/1', name: 't', kind: 'prop', materials: { a: { color: '#aa3322' }, b: { color: '#2255aa' } },
  parts, budget: { draws: 64, triangles: 20000 }, ...extra
});
const wpos = (o) => new THREE.Vector3().setFromMatrixPosition(o.matrixWorld);
// Every triangle of a mesh in world space, with the normal its winding gives and the normal it stores.
function worldTris(mesh) {
  mesh.updateWorldMatrix(true, false);
  const g = mesh.geometry, P = g.attributes.position, N = g.attributes.normal;
  const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const n = g.index ? g.index.count : P.count, out = [];
  for (let k = 0; k < n; k += 3) {
    const ids = [0, 1, 2].map((j) => (g.index ? g.index.getX(k + j) : k + j));
    const v = ids.map((i) => new THREE.Vector3().fromBufferAttribute(P, i).applyMatrix4(mesh.matrixWorld));
    const wind = new THREE.Vector3().subVectors(v[1], v[0]).cross(new THREE.Vector3().subVectors(v[2], v[0]));
    const stored = new THREE.Vector3().fromBufferAttribute(N, ids[0]).applyMatrix3(nm).normalize();
    out.push({ v, wind, stored });
  }
  return out;
}

test('every model on disk is listed, is valid, is named for its file and builds within its budget', () => {
  const dir = new URL('./models/', import.meta.url);
  const onDisk = [];
  for (const kind of fs.readdirSync(dir)) {
    if (!fs.statSync(new URL(kind, dir)).isDirectory()) continue;
    for (const f of fs.readdirSync(new URL(kind + '/', dir))) if (f.endsWith('.json')) onDisk.push(`${kind}/${f.slice(0, -5)}`);
  }
  assert.deepEqual([...onDisk].sort(), [...models.names()].sort(), 'studio/models/index.js lists every model file');
  const names = new Set();
  for (const ref of models.names()) {
    const json = models.json(ref);
    assert.deepEqual(validateModel(json), [], ref);
    assert.equal(`${json.kind}/${json.name}`, ref, `${ref}: "kind" and "name" match where the file is`);
    assert.ok(!names.has(json.name), `${json.name}: a model's name is its review folder (model-<name>), so names are unique`);
    assert.match(modelAsset(json), /^[a-z0-9][a-z0-9-]{1,63}$/, 'a review asset name the notes endpoint takes');
    names.add(json.name);
    const m = buildModel(json);
    assert.ok(!m.over, `${ref} is over its budget: ${JSON.stringify(m.cost)} against ${JSON.stringify(json.budget)}`);
    assert.deepEqual(m.cost, rigCost(m.group), 'counted the way a rig is');
    // The clips a model lists are on disk, valid, and for its rig.
    for (const c of json.clips || []) {
      const clip = loadClip(read(`./clips/${c}.json`));
      assert.equal(clip.rig, json.rig, `${c} is for rig "${json.rig}"`);
    }
    if (json.rig) assert.equal(rigs.def(json.rig).model, ref, `studio/rigs.js registers ${ref} as "${json.rig}"`);
    console.log(`  ${ref.padEnd(18)} draws ${String(m.cost.draws).padStart(2)}/${json.budget.draws}  triangles ${String(m.cost.triangles).padStart(4)}/${json.budget.triangles}  ${Object.keys(m.joints).length} joints, ${m.parts.length} parts drawn`);
  }
  // What the roadmap asks of the first ones: the drum in one or two draws (P-43), the boat under 40 (P-52).
  assert.ok(buildModel(models.json('prop/fuel-drum')).cost.draws <= 2);
  assert.ok(buildModel(models.json('prop/evac-boat')).cost.draws < 40);
  assert.equal(Object.keys(rigFromModel(models.json('creature/spider')).chains).length, 8, 'the spider has eight legs');
});

test('a bad model is refused with every problem named as a sentence', () => {
  const bad = {
    format: 'dw-model/0', name: 'Bad Name', kind: 'thing', colour: 'red',
    materials: { paint: { color: 'red', roughness: 2, shine: 1 } },
    joints: {
      a: { parent: 'b' }, b: { parent: 'a' }, hip: { parent: 'nowhere', mirror: 'x' },
      kneeL: { parent: 'pelvis', rot: [0, 0, 0], aim: [0, -1, 0] }, pelvis: {}, footL: { parent: 'kneeL', at: [0.1, -0.3, 0] }
    },
    parts: [
      { shape: 'blob', material: 'paint' },
      { shape: 'box', size: [1, 1], material: 'paint' },
      { shape: 'cylinder', size: [0.1, 1], points: [[0, 0], [1, 1]], material: 'nope' },
      { shape: 'box', size: [1, 1, 1], material: 'paint', joint: 'ghost', rotation: [0, 90, 0] },
      { shape: 'lathe', points: [[0.1, 1], [0.2, 0]], material: 'paint' },
      { shape: 'box', size: [1, 1, 1], material: 'paint', array: { count: 3 } },
      { shape: 'box', size: [1, 1, 1], material: 'paint', joint: 'kneeL', mirror: 'x' },
      { shape: 'box', size: [1, 1, 1], material: 'paint', scale: -1 },
      { shape: 'rod', size: [0.1], from: [0, 0, 0], to: [0, 0, 0], material: 'paint' }
    ],
    clips: ['spider/crawl'],
    chains: { legL: { root: 'pelvis', mid: 'kneeL', end: 'footL' } },
    merge: 'yes'
  };
  const errs = validateModel(bad), text = errs.join('\n');
  for (const want of [
    /"format" must be "dw-model\/1"/, /"name" is missing/, /"kind" is "prop" or "creature"/, /unknown field "colour"/,
    /"budget" is \{ "draws": n, "triangles": n \}/, /"merge" is true/,
    /material "paint": "color" is "#rrggbb"/, /material "paint": "roughness" is a number from 0 to 1/, /material "paint": unknown field "shine"/,
    /make a loop/, /joint "hip": a mirrored joint's name ends in L or R/, /its parent "nowhere" is not a joint/, /give "rot" or "aim", not both/,
    /part 0: "shape" is one of box, rbox/, /part 1: a box's "size" is \[width, height, depth\]/, /part 2: "points" is for lathe, not a cylinder/,
    /part 2: "material" names one of "materials"/, /part 3: joint "ghost" is not a joint/, /part 3: unknown field "rotation"/,
    /part 4: a lathe's "points" go from bottom to top/, /part 5: an array of 3 needs a "step" or a "rot"/,
    /part 6: its mirror goes on "kneeR", and there is no such joint/, /part 7: "scale" is a number or \[x, y, z\], above 0/,
    /part 8: a rod's "from" and "to" are the same point/,
    /chain "legL": "footL" must sit down "kneeL"'s -Y/, /"clips" needs "rig"/
  ]) assert.match(text, want);
  assert.throws(() => buildModel(bad), /is not valid/);
  assert.throws(() => rigFromModel(bad), /is not valid/);
  assert.deepEqual(validateModel('nope'), ['the model is not a JSON object']);
  // A good model with a knee off its hip's -Y: the IK solver couldn't bend it, so it says how to fix it.
  const offAxis = model([{ shape: 'box', size: [0.1, 0.1, 0.1], material: 'a', joint: 'hipL' }], {
    joints: { hipL: { at: [0, 1, 0] }, kneeL: { parent: 'hipL', at: [0.2, -0.4, 0] }, footL: { parent: 'kneeL', at: [0, -0.4, 0] } },
    chains: { legL: { root: 'hipL', mid: 'kneeL', end: 'footL' } }
  });
  assert.match(validateModel(offAxis).join('\n'), /"kneeL" must sit straight down "hipL"'s -Y, at \[0, -length, 0\].*turn "hipL" with "rot" or "aim" instead/);
});

test('every shape builds where its size says, with the triangles it should have, facing out', () => {
  const cases = [
    [{ shape: 'box', size: [1, 2, 3] }, [1, 2, 3], 12],
    [{ shape: 'rbox', size: [1, 0.5, 0.4] }, [1, 0.5, 0.4], 48],
    [{ shape: 'cylinder', size: [0.5, 2] }, [1, 2, 1], 48],
    [{ shape: 'cylinder', size: [0.2, 0.5, 1], segments: 8 }, [1, 1, 1], 32],
    [{ shape: 'cone', size: [0.5, 1] }, [1, 1, 1], 24],
    [{ shape: 'sphere', size: [0.5] }, [1, 1, 1], null],
    [{ shape: 'capsule', size: [0.25, 1] }, [0.5, 1.5, 0.5], null],
    [{ shape: 'torus', size: [1, 0.2] }, [2.4, 2.4, 0.346], 16 * 6 * 2],   // a six-sided tube is 0.2 × sin 60° thick either side
    [{ shape: 'lathe', points: [[0.5, 0], [0.3, 1], [0.1, 1.2]] }, [1, 1.2, 1], 12 * 2 * 2],
    [{ shape: 'extrude', outline: [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 1]], holes: [[[-0.2, 0.3], [0.2, 0.3], [0.2, 0.7], [-0.2, 0.7]]], depth: 0.2 }, [1, 1, 0.2], null],
    [{ shape: 'panel', corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]] }, [1, 1, 0], 2],
    [{ shape: 'rod', size: [0.05], from: [0, 0, 0], to: [0, 0, 2] }, [0.1, 0.1, 2], 24]
  ];
  assert.deepEqual([...new Set(cases.map((c) => c[0].shape))].sort(), [...MODEL_SHAPES].sort(), 'every shape is tried');
  for (const [spec, dims, tris] of cases) {
    const m = buildModel(model([{ ...spec, material: 'a' }]));
    const box = new THREE.Box3().setFromObject(m.group), size = box.getSize(new THREE.Vector3());
    size.toArray().forEach((v, i) => assert.ok(Math.abs(v - dims[i]) < 0.02, `${spec.shape}: size ${size.toArray().map((x) => x.toFixed(3))} should be ${dims}`));
    if (tris !== null) assert.equal(m.cost.triangles, tris, spec.shape);
    assert.ok(m.cost.triangles > 0 && m.cost.draws === 1, spec.shape);
    // Closed shapes face outward: from the middle, every face's winding points away.
    if (['box', 'rbox', 'cylinder', 'cone', 'sphere', 'capsule'].includes(spec.shape)) {
      const c = box.getCenter(new THREE.Vector3());
      let inward = 0;
      for (const t of worldTris(m.meshes[0])) if (t.wind.lengthSq() > 1e-12 && t.wind.dot(t.v[0].clone().sub(c)) < -1e-9) inward++;
      assert.equal(inward, 0, `${spec.shape}: ${inward} faces point inward`);
    }
  }
  // A rod lies from one point to the other, whatever the direction.
  const rod = buildModel(model([{ shape: 'rod', size: [0.02], from: [1, 0, 0], to: [1, 1, 1], material: 'a' }]));
  const rb = new THREE.Box3().setFromObject(rod.group);
  assert.ok(rb.min.distanceTo(new THREE.Vector3(0.98, -0.02, -0.02)) < 0.03 && rb.max.distanceTo(new THREE.Vector3(1.02, 1.02, 1.02)) < 0.03, JSON.stringify(rb));
});

test('mirror makes a left/right twin: on the twin joint, reflected exactly, faces still out', () => {
  assert.equal(mirrorName('hipL'), 'hipR'); assert.equal(mirrorName('hip1R'), 'hip1L'); assert.equal(mirrorName('legL2'), 'legR2'); assert.equal(mirrorName('pelvis'), null);
  // An L-shaped plate (not symmetric in itself) on a turned arm: the twin must be its mirror image.
  const json = model([
    { name: 'plateL', joint: 'armL', shape: 'extrude', outline: [[0, 0], [0.4, 0], [0.4, 0.1], [0.1, 0.1], [0.1, 0.3], [0, 0.3]], depth: 0.05, at: [-0.1, -0.2, 0.05], rot: [10, 30, -5], mirror: 'x', material: 'a' },
    { name: 'badge', shape: 'box', size: [0.1, 0.1, 0.02], at: [-0.3, 1.5, 0.2], rot: [0, 25, 0], mirror: 'x', material: 'b' }
  ], { joints: { spine: { at: [0, 1, 0] }, armL: { parent: 'spine', at: [-0.3, 0.4, 0.05], rot: [0, 20, 10], mirror: 'x' } } });
  const m = buildModel(json);
  assert.ok(m.joints.armR, 'the twin joint is made');
  assert.deepEqual(m.joints.armR.position.toArray(), [0.3, 0.4, 0.05]);
  const e = new THREE.Euler().setFromQuaternion(m.joints.armR.quaternion, 'XYZ');
  assert.ok(Math.abs(e.y + 20 * Math.PI / 180) < 1e-9 && Math.abs(e.z + 10 * Math.PI / 180) < 1e-9, 'its turn is mirrored');
  const byName = (n) => m.parts.find((p) => p.name === n);
  assert.equal(byName('plateR').joint, 'armR');
  assert.equal(byName('badge').mesh.parent, m.group);
  for (const [a, b] of [['plateL', 'plateR'], ['badge', null]]) {
    const pa = m.parts.find((p) => p.name === a && !p.mirrored), pb = b ? byName(b) : m.parts.find((p) => p.name === a && p.mirrored);
    const ta = worldTris(pa.mesh), tb = worldTris(pb.mesh);
    const key = (v) => v.toArray().map((x) => x.toFixed(5)).join(',');
    const sa = new Set(ta.flatMap((t) => t.v.map((v) => key(new THREE.Vector3(-v.x, v.y, v.z)))));
    const sb = new Set(tb.flatMap((t) => t.v.map(key)));
    assert.deepEqual([...sb].sort(), [...sa].sort(), `${a}: the twin is the mirror image`);
    for (const t of tb) if (t.wind.lengthSq() > 1e-12) assert.ok(t.wind.dot(t.stored) > 0, `${a}: the twin's faces wind the way their normals point`);
  }
});

test('array lays copies out by a step, and round a pivot', () => {
  const row = buildModel(model([{ shape: 'box', size: [0.2, 0.2, 0.2], array: { count: 4, step: [0.5, 0, 0] }, material: 'a' }]));
  assert.deepEqual(row.meshes.map((o) => +o.position.x.toFixed(6)), [0, 0.5, 1, 1.5]);
  const ring = buildModel(model([{ shape: 'box', size: [0.4, 0.05, 0.05], at: [1, 0, 0], array: { count: 8, rot: [0, 45, 0], pivot: [0, 0, 0] }, material: 'a' }]));
  ring.meshes.forEach((o, k) => {
    // A turn about +Y takes +X toward -Z: spoke k sits at (cos 45k°, 0, -sin 45k°), turned with it.
    const a = k * Math.PI / 4;
    assert.ok(Math.hypot(o.position.x - Math.cos(a), o.position.y, o.position.z + Math.sin(a)) < 1e-6, `spoke ${k} at ${o.position.toArray()}`);
    assert.ok(Math.abs(new THREE.Euler().setFromQuaternion(o.quaternion, 'YXZ').y - Math.atan2(Math.sin(a), Math.cos(a))) < 1e-6, `spoke ${k} turned`);
  });
  // The drum's two hoops are an array: 0.7 m apart.
  const drum = buildModel(models.json('prop/fuel-drum'));
  const hoops = drum.parts.filter((p) => p.name === 'hoop');
  assert.deepEqual(hoops.map((p) => p.copy), [0, 1]);
});

test('merge draws a joint\'s parts in one material as one mesh; "color" merges colours too', () => {
  const parts = [
    { shape: 'box', size: [0.2, 0.2, 0.2], at: [0, 0, 0], material: 'a' },
    { shape: 'box', size: [0.2, 0.2, 0.2], at: [0.5, 0, 0], material: 'a' },
    { shape: 'rbox', size: [0.2, 0.2, 0.2], at: [1, 0, 0], material: 'b' },
    { shape: 'box', size: [0.2, 0.2, 0.2], joint: 'lid', material: 'a' },
    { shape: 'cylinder', size: [0.1, 0.3], joint: 'lid', at: [0.3, 0, 0], material: 'b' },
    { name: 'light', shape: 'sphere', size: [0.1], at: [0, 1, 0], material: 'a', merge: false }
  ];
  const joints = { lid: { at: [0, 1, 0] } };
  const sep = buildModel(model(parts, { joints })), one = buildModel(model(parts, { joints, merge: true }));
  const col = buildModel(model(parts, { joints, merge: 'color' }));
  assert.equal(sep.cost.draws, 6);
  assert.equal(one.cost.draws, 5, 'the two "a" boxes on the model itself became one');
  assert.equal(col.cost.draws, 3, 'one mesh per joint (same finish), and the light on its own');
  for (const m of [one, col]) {
    assert.equal(m.cost.triangles, sep.cost.triangles, 'merging keeps every triangle');
    const a = new THREE.Box3().setFromObject(sep.group), b = new THREE.Box3().setFromObject(m.group);
    assert.ok(a.min.distanceTo(b.min) < 1e-6 && a.max.distanceTo(b.max) < 1e-6, 'and where they are');
  }
  assert.ok(col.parts.find((p) => p.name === 'light').mesh.geometry.userData.shared, 'a part kept alone is still the shared shape');
  // The colour merge paints each part's colour on its vertices.
  const merged = col.meshes.find((o) => o.parent === col.group && o.geometry.attributes.color);
  assert.ok(merged && merged.material.vertexColors, 'a colour merge colours by vertex');
  const C = merged.geometry.attributes.color, P = merged.geometry.attributes.position;
  const ca = new THREE.Color('#aa3322'), cb = new THREE.Color('#2255aa');
  for (let i = 0; i < P.count; i++) {
    const want = P.getX(i) > 0.75 ? cb : ca;
    assert.ok(Math.abs(C.getX(i) - want.r) < 1e-6 && Math.abs(C.getZ(i) - want.b) < 1e-6, `vertex ${i} at x ${P.getX(i).toFixed(2)} has the wrong colour`);
  }
  // Materials that differ in more than colour don't merge under "color".
  const shiny = buildModel(model(parts.slice(0, 3), { merge: 'color', materials: { a: { color: '#aa3322' }, b: { color: '#2255aa', metalness: 0.8 } } }));
  assert.equal(shiny.cost.draws, 2);
  // Limbs never merge together: a lost arm hides alone.
  const limbs = buildModel(model([
    { shape: 'box', size: [0.1, 0.1, 0.1], material: 'a', limb: 'armL' }, { shape: 'box', size: [0.1, 0.1, 0.1], at: [1, 0, 0], material: 'a', limb: 'armR' }
  ], { merge: true }));
  assert.equal(limbs.cost.draws, 2);
  assert.deepEqual(Object.keys(limbs.limbs).sort(), ['armL', 'armR']);
});

test('the same file builds the same geometry, every time; instances share it', () => {
  for (const ref of models.names()) {
    const a = buildModel(models.json(ref)), b = buildModel(models.json(ref));
    assert.equal(a.meshes.length, b.meshes.length);
    a.meshes.forEach((m, i) => {
      const n = b.meshes[i];
      assert.equal(m.name, n.name);
      assert.deepEqual(m.matrix.elements, n.matrix.elements, `${ref} mesh ${i}: placed the same`);
      assert.ok(Buffer.from(m.geometry.attributes.position.array.buffer).equals(Buffer.from(n.geometry.attributes.position.array.buffer)), `${ref} mesh ${i} (${m.name}): the same vertices`);
    });
    const inst = instanceModel(a);
    const ma = [], mi = [];
    a.group.traverse((o) => { if (o.isMesh) ma.push(o); });
    inst.group.traverse((o) => { if (o.isMesh) mi.push(o); });
    assert.equal(mi.length, ma.length);
    mi.forEach((o, i) => assert.equal(o.geometry, ma[i].geometry, 'an instance shares the geometry'));
    for (const [n, j] of Object.entries(inst.joints)) { assert.notEqual(j, a.joints[n]); assert.equal(j.name, n); }
    assert.equal(inst.group.userData.rig, inst.joints);
  }
});

test('the zombie model is studio/zombie.js: the same joints, offsets, boxes and cost', () => {
  const m = buildModel(models.json('creature/zombie'));
  const z = makeZombieRig({});
  z.updateMatrixWorld(true);
  const R = z.userData.rig;
  const nameOf = (o) => Object.entries(R).find(([, v]) => v === o)?.[0] ?? null;
  assert.deepEqual(Object.keys(m.joints).sort(), Object.keys(R).sort(), 'the same joint names');
  for (const [n, j] of Object.entries(R)) {
    const mj = m.joints[n];
    assert.equal(mj.parent === m.group ? null : mj.parent.name, nameOf(j.parent), `${n}: the same parent`);
    assert.ok(mj.position.distanceTo(j.position) < 1e-12, `${n}: at ${mj.position.toArray()} not ${j.position.toArray()}`);
    assert.ok(1 - Math.abs(mj.quaternion.dot(j.quaternion)) < 1e-12, `${n}: turned the same`);
  }
  const boxes = (g) => {
    const out = [];
    g.updateMatrixWorld(true);
    g.traverse((o) => { if (o.isMesh) { const b = new THREE.Box3().setFromObject(o); out.push([o.material.color.getHexString(), ...b.min.toArray(), ...b.max.toArray()].map((v) => (typeof v === 'number' ? v.toFixed(5) : v)).join(' ')); } });
    return out.sort();
  };
  assert.deepEqual(boxes(m.group), boxes(z), 'every box the same size, in the same place, the same colour');
  assert.deepEqual(m.cost, rigCost(z));
  const def = rigFromModel(models.json('creature/zombie')), zdef = rigs.def('zombie');
  for (const [n, c] of Object.entries(zdef.chains)) assert.deepEqual({ ...def.chains[n], pole: def.chains[n].pole.map((v) => v + 0) }, { ...c, pole: c.pole.map((v) => v + 0) }, `chain ${n}`);
  assert.equal(def.body, zdef.body, 'the same body (studio/bodies.js ZOMBIE_BODY)');
  assert.deepEqual(Object.keys(m.limbs).sort(), ['armL', 'armR', 'head', 'legL', 'legR']);
  assert.equal(m.limbs.armL.length, 3, 'upper arm, forearm and hand');
});

test('the zombie model reacts to a shell exactly as the stand-in does', () => {
  registerRig('zombie-model', rigFromModel(models.json('creature/zombie')));
  const run = (rig) => {
    const inst = rigs.get(rig).create({});
    const body = createBody(inst, loadMotion({ ...presets.json('zombie/shambler'), rig }), {});
    const track = [];
    for (let f = 0; f < 90; f++) {
      body.follow();
      if (f === 10) body.hit({ at: 'chest', dir: [0, 0, -1], power: 6.5, kind: 'pellet' });
      body.update(1 / 60);
      body.apply();
      track.push(body.points());
    }
    return { track, state: body.state };
  };
  const a = run('zombie'), b = run('zombie-model');
  let worst = 0;
  a.track.forEach((pts, f) => { for (const [k, p] of Object.entries(pts)) worst = Math.max(worst, Math.hypot(...p.map((v, i) => v - b.track[f][k][i]))); });
  assert.ok(worst < 1e-6, `the model's body drifted ${worst} m from the stand-in's`);
  assert.equal(a.state, b.state);
  assert.notEqual(a.state, 'animated', 'the shell did something');
});

test('the spider model is a rig: its IK keeps the modelled pose, and it crawls through the studio player', () => {
  const def = rigs.def('spider');
  assert.ok(def && def.model === 'creature/spider', 'studio/rigs.js registers the spider from its model');
  assert.deepEqual(validateClip(def.rest), []);
  const inst = rigs.get('spider').create({});
  inst.group.updateWorldMatrix(true, true);
  // Solving each leg onto where its foot already is changes nothing: the model's limbs are what the solver makes.
  const before = new Map([...inst.rest.keys()].map((o) => [o, o.quaternion.clone()]));
  for (const [name, ch] of Object.entries(def.chains)) {
    const at = wpos(inst.R[ch.end]);
    solveChain(inst, name, at, 1, ch.pole);
    assert.ok(wpos(inst.R[ch.end]).distanceTo(at) < 1e-3, `${name}: the foot stays put`);
  }
  for (const [o, q] of before) assert.ok(2 * Math.acos(Math.min(1, Math.abs(q.dot(o.quaternion)))) < 0.01, `${o.name} turned`);
  // The crawl, twice round at 60 fps.
  const clip = loadClip(read('./clips/spider/crawl.json'));
  const fresh = rigs.get('spider').create({});
  const player = createPlayer(fresh).play(clip);
  const prev = new Map(), lo = {}, hi = {};
  let worst = 0, falls = 0;
  for (let i = 0; i <= 100; i++) {
    for (const e of player.update(i === 0 ? 0 : 1 / 60)) if (e.name === 'footfall') falls++;
    for (const j of Object.values(fresh.R)) {
      assert.ok(Number.isFinite(j.quaternion.w) && Number.isFinite(j.position.x), j.name);
      const q = prev.get(j);
      if (q) worst = Math.max(worst, 2 * Math.acos(Math.min(1, Math.abs(q.dot(j.quaternion)))));
      prev.set(j, j.quaternion.clone());
    }
    for (const [n, ch] of Object.entries(def.chains)) { const y = wpos(fresh.R[ch.end]).y; lo[n] = Math.min(lo[n] ?? 9, y); hi[n] = Math.max(hi[n] ?? -9, y); }
  }
  assert.ok(worst < 0.3, `a joint snapped: ${worst.toFixed(3)} rad in a frame`);
  for (const n of Object.keys(def.chains)) {
    assert.ok(lo[n] < 0.06, `${n} puts its hand down (lowest ${lo[n].toFixed(3)})`);
    assert.ok(hi[n] > 0.15, `${n} lifts it (highest ${hi[n].toFixed(3)})`);
  }
  assert.equal(falls, 4, 'two sets of feet land each time round (at 0.4, 0.8, 1.2 and 1.6 s)');
  // In a scene, moved at its stride, its planted hands don't slide over the ground.
  const clipOf = (r) => read(`./clips/${r}.json`);
  const sp = createScene(loadScene(read('./scenes/spider-crawl.json'), clipOf), {});
  for (let i = 0; i < 3.2 * 60; i++) sp.update(1 / 60);
  const bad = Object.entries(sp.worst).filter(([, w]) => w.bad).map(([k, w]) => `${k} ${w.value.toFixed(3)}`);
  assert.deepEqual(bad, [], 'the spider-crawl scene passes its checks');
  assert.ok(sp.worst['slide:spider.leg1L'].value < 0.01);
});

test('a model is a rig with no new code: rest pose, adopting a built one, and what it can\'t be', () => {
  const json = models.json('creature/spider');
  const rest = restClip(json);
  assert.deepEqual(validateClip(rest), []);
  assert.ok(rest.tracks.hip1L && rest.tracks.jaw && !rest.tracks.pelvis, 'turned joints are in the rest clip; straight ones are not');
  // The game can build one itself and hand it over.
  const built = buildModel(json);
  const inst = rigs.get('spider').create({ group: built.group });
  assert.equal(inst.R, built.joints);
  assert.throws(() => rigs.get('spider').create({ group: buildModel(models.json('prop/fuel-drum')).group }), /not a "spider" model/);
  // A prop with joints (the boat's motor and lamp) can be a rig too, with no limbs.
  assert.deepEqual(rigs.def('evac-boat').chains, {});
  assert.throws(() => rigFromModel(model([{ shape: 'box', size: [1, 1, 1], material: 'a' }])), /has no "joints": a rig needs a skeleton/);
  // Its searchlight sweeps the shore: the clip turns the model's own lamp joint.
  const b = rigs.get('evac-boat').create({});
  const beamX = (t) => { createPlayer(b).play(loadClip(read('./clips/evac-boat/search.json'))).poseAt(t); b.group.updateWorldMatrix(true, true); return wpos(b.R.beam).x - wpos(b.R.lamp).x; };
  assert.ok(beamX(0) < -0.05 && beamX(3) > 0.05, 'the lamp swings from one side to the other');
  assert.ok(Math.abs(beamX(1.5)) < 1e-6, 'and faces ahead halfway');
  // P-52's approach: 24 m in, slowing to the dock, with the horn, the flares and "docked" on the way.
  const arrive = loadClip(read('./clips/evac-boat/arrive.json'));
  const a = rigs.get('evac-boat').create({});
  const player = createPlayer(a).play(arrive, { rootMotion: true });
  const names = [], zs = [];
  for (let i = 0; i <= 20 * 30; i++) { for (const e of player.update(i === 0 ? 0 : 1 / 30)) names.push(e.name); zs.push(a.group.position.z); }
  assert.deepEqual(names, ['horn', 'flares', 'horn', 'docked']);
  assert.ok(Math.abs(zs[0] + 24) < 1e-6 && Math.abs(zs[zs.length - 1]) < 1e-6, `from ${zs[0]} to ${zs[zs.length - 1]}`);
  const speed = (i) => (zs[i + 1] - zs[i]) * 30;
  assert.ok(speed(30) > speed(300) && speed(300) > speed(570), 'it slows all the way in');
});

// The spider's body is data in its model file (points, bones, braces, hinges, frames, segments), and
// motion.js runs it with no code of its own: eight feet instead of two. The weapons are the motion lab's.
test('the spider reacts on its eight legs: a body made of data, the same engine', () => {
  const pj = read('./motion/spider/spider.json');
  assert.deepEqual(validateMotion(pj), []);
  const preset = loadMotion(pj);
  const idle = loadClip(read('./clips/spider/idle.json'));
  const hit = (weapon) => {
    const inst = rigs.get('spider').create({});
    const player = createPlayer(inst).play(idle, { loop: true });
    const body = createBody(inst, preset, {});
    const events = [];
    let low = Infinity, finite = true;
    for (let f = 0; f < 6 * 60; f++) {
      player.update(1 / 60);
      body.follow();
      if (f === 30) (weapon.kill ? body.kill : body.hit)({ at: weapon.at, dir: weapon.dir || [0, 0, -1], power: weapon.power, kind: weapon.kind });
      for (const e of body.update(1 / 60)) events.push(e[0]);
      body.apply();
      if (f >= 30) for (const p of Object.values(body.points())) { low = Math.min(low, p[1]); if (!p.every(Number.isFinite)) finite = false; }
      inst.group.traverse((o) => { if (!Number.isFinite(o.quaternion.w)) finite = false; });
    }
    return { events, low, finite, state: body.state };
  };
  const rifle = hit({ kind: 'bullet', power: 2.5, at: 'chest' });
  assert.ok(rifle.finite && rifle.low > 0.03, 'nothing goes through the ground or off to infinity');
  assert.ok(!rifle.events.includes('fall') && rifle.events.includes('recovered'), 'a rifle round is a flinch: ' + rifle.events.join(' '));
  const shell = hit({ kind: 'pellet', power: 6.5, at: 'chest' });
  assert.ok(!shell.events.includes('fall') && shell.events.includes('recovered'), 'eight legs take a close shell: ' + shell.events.join(' '));
  const grenade = hit({ kind: 'blast', power: 8, at: 'pelvis', dir: [0, 0.5, -1] });
  for (const e of ['fall', 'down', 'getup', 'recovered']) assert.ok(grenade.events.includes(e), `a grenade: ${e} (${grenade.events.join(' ')})`);
  assert.ok(grenade.finite && grenade.low > 0.03);
  const kill = hit({ kind: 'bullet', power: 3, at: 'head', kill: true });
  assert.ok(kill.events.includes('dead') && kill.events.includes('settled'), 'dead, it goes limp and settles: ' + kill.events.join(' '));
  // What it costs: more points than a zombie (26 to 17), so more, but not out of scale. Timed against a
  // shambler in the same run (best of five), so a slow machine doesn't fail it.
  const per = (rig, p) => {
    const inst = rigs.get(rig).create({});
    const body = createBody(inst, p, {});
    let best = Infinity;
    for (let r = 0; r < 6; r++) {
      body.reset(); body.follow();
      body.hit({ at: 'chest', dir: [0, 0, -1], power: 3.2, kind: 'pellet' });
      const t0 = performance.now();
      for (let f = 0; f < 20; f++) { body.follow(); body.update(1 / 60); body.apply(); }
      if (r > 0) best = Math.min(best, (performance.now() - t0) / 20);   // the first run warms up
      assert.notEqual(body.state, 'animated', 'timed while it reacts');
    }
    return best;
  };
  const sp = per('spider', preset), zb = per('zombie', loadMotion(presets.json('zombie/shambler')));
  console.log(`  a reacting spider ${sp.toFixed(3)} ms a frame, a shambler ${zb.toFixed(3)} ms (${(sp / zb).toFixed(1)}x)`);
  assert.ok(sp < zb * 4, `a spider costs ${(sp / zb).toFixed(1)} shamblers`);
});

