import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../vendor/three/three.core.js';
import { applyZombieConcept, applyGuardianConcept, CONCEPT_TYPES } from './zombie-concepts.js';

const rbox = (w, h, d) => new T.BoxGeometry(w, h, d);
const EPS = 0.0005;

function rig() {
  const g = new T.Group(), u = g.userData;
  const joint = (p, name, x = 0, y = 0, z = 0) => {
    const o = new T.Group(); o.name = name; o.position.set(x, y, z); p.add(o); return o;
  };
  u.hips = joint(g, 'hips', 0, .81);
  u.torso = joint(u.hips, 'torso', 0, .28);
  u.head = joint(u.torso, 'head', 0, .58);
  for (const side of ['L', 'R']) {
    const x = side === 'L' ? -1 : 1;
    const arm = u['arm' + side + 'G'] = joint(u.torso, 'arm' + side, x * .32, .42);
    arm.userData.elbowG = joint(arm, 'elbow' + side, 0, -.34);
    const leg = u['leg' + side + 'G'] = joint(u.hips, 'leg' + side, x * .13, -.02);
    leg.userData.shinG = joint(leg, 'shin' + side, 0, -.38);
  }
  u.eyes = [-1, 1].map(x => {
    const e = new T.Mesh(new T.SphereGeometry(.045, 8, 6), new T.MeshStandardMaterial({ emissive: 0xaabb22 }));
    e.position.set(x * .09, .04, .18); u.head.add(e); return e;
  });
  u.crawlLimbs = [];
  for (let i = 0; i < 6; i++) {
    const root = joint(u.torso, 'crawl' + i), knee = joint(root, 'knee' + i, 0, .4);
    const baseQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 1.3);
    const kneeQ = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), 1.3);
    root.quaternion.copy(baseQ); knee.quaternion.copy(kneeQ);
    u.crawlLimbs.push({ root, knee, baseQ, kneeQ });
  }
  return g;
}

function guardianRig() {
  const g = new T.Group(), r = g.userData.rig = { joints: [], hands: [], claws: [] };
  const joint = (p, name, x = 0, y = 0, z = 0) => {
    const o = new T.Group(); o.name = name; o.position.set(x, y, z); p.add(o);
    r[name] = o; r.joints.push(o); return o;
  };
  const pelvis = joint(g, 'pelvis', 0, 1.02);
  const spine1 = joint(pelvis, 'spine1', 0, .16, .22);
  const spine2 = joint(spine1, 'spine2', 0, .12, .32);
  const chest = joint(spine2, 'chest', 0, .1, .34);
  const neck = joint(chest, 'neck', 0, .2, .58);
  const head = joint(neck, 'head', 0, .04, .44);
  joint(head, 'jaw', 0, -.1, .06);
  for (const side of [-1, 1]) {
    const s = side < 0 ? 'L' : 'R';
    const sh = joint(chest, 'shoulder' + s, side * .66, .16, .3);
    const el = joint(sh, 'elbow' + s, 0, -1.08);
    const wr = joint(el, 'wrist' + s, 0, -1.16);
    const hand = joint(wr, 'hand' + s, 0, -.08, .18); r.hands.push(hand);
    r['fingers' + s] = [];
    for (let f = 0; f < 4; f++) {
      const fin = joint(hand, 'finger' + s + f, (f - 1.5) * .085);
      fin.userData.tip = joint(fin, 'tip' + s + f, 0, 0, (f === 1 || f === 2 ? .4 : .34) * .55);
      r['fingers' + s].push(fin);
    }
    const thumb = joint(hand, 'thumb' + s, side * .19, 0, -.06);
    thumb.rotation.y = side * .9;
    thumb.userData.tip = joint(thumb, 'thumbTip' + s, 0, 0, .16);
    r['thumb' + s] = thumb;
    const hip = joint(pelvis, 'hip' + s, side * .3, -.08, -.02);
    const knee = joint(hip, 'knee' + s, 0, -.74);
    joint(knee, 'ankle' + s, 0, -.66);
  }
  return g;
}

function boxGap(a, b) {
  const axis = (loA, hiA, loB, hiB) => Math.max(loA - hiB, loB - hiA, 0);
  return Math.hypot(axis(a.min.x, a.max.x, b.min.x, b.max.x),
    axis(a.min.y, a.max.y, b.min.y, b.max.y),
    axis(a.min.z, a.max.z, b.min.z, b.max.z));
}

function looseParts(root) {
  root.updateMatrixWorld(true);
  const parts = [];
  root.traverse(o => {
    if (o.isMesh) parts.push({ name: o.parent?.name || '?', surface: o.material?.userData?.surface,
      box: new T.Box3().setFromObject(o) });
  });
  return parts.map((part, i) => ({ ...part, nearest: Math.min(...parts.filter((_, j) => i !== j).map(other => boxGap(part.box, other.box))) }))
    .filter(part => part.nearest > EPS);
}

// A broad box can overlap a curved or hollow mesh without the surfaces touching.
// Confirm that at least three quarters of an attachment is buried by rays
// through its actual triangles; shallower overlap is the modeled seat.
function buriedParts(root) {
  root.updateMatrixWorld(true);
  const eyes = new Set(root.userData.eyes), parts = [];
  root.traverse(mesh => {
    if (mesh.isMesh && !eyes.has(mesh)) parts.push({ mesh, joint: mesh.parent,
      surface: mesh.material?.userData?.surface, box: new T.Box3().setFromObject(mesh) });
  });
  const ray = new T.Raycaster(), direction = new T.Vector3(1, .137, .071).normalize();
  const isInside = (point, host) => {
    ray.set(point, direction); ray.near = .00001; ray.far = Infinity;
    const material = host.material, side = material.side; material.side = T.DoubleSide;
    const hits = ray.intersectObject(host, false); material.side = side;
    let count = 0, last = -Infinity;
    for (const hit of hits) if (hit.distance - last > .0001) { count++; last = hit.distance; }
    return count % 2 === 1;
  };
  const buried = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i], size = part.box.getSize(new T.Vector3());
    if (Math.min(size.x, size.y, size.z) < .005) continue;
    const partVolume = size.x * size.y * size.z;
    for (let j = 0; j < parts.length; j++) {
      const host = parts[j];
      if (i === j || host.joint !== part.joint || !host.box.intersectsBox(part.box)) continue;
      const hostSize = host.box.getSize(new T.Vector3());
      if (hostSize.x * hostSize.y * hostSize.z < partVolume * 4) continue;
      const pos = part.mesh.geometry.attributes.position, step = Math.max(1, Math.ceil(pos.count / 40));
      let inside = 0, total = 0;
      for (let k = 0; k < pos.count; k += step) {
        const p = new T.Vector3().fromBufferAttribute(pos, k).applyMatrix4(part.mesh.matrixWorld);
        inside += Number(isInside(p, host.mesh)); total++;
      }
      if (inside / total >= .75) buried.push({ part: i, host: j, joint: part.joint?.name,
        surface: part.surface, sameMaterial: part.mesh.material === host.mesh.material, inside, total,
        center: part.box.getCenter(new T.Vector3()).toArray().map(n => +n.toFixed(3)),
        size: size.toArray().map(n => +n.toFixed(3)) });
    }
  }
  return buried;
}

// The base flesh is deliberately hidden under clothes and armor. Brute flesh uses
// the wet atlas and caveguard's broad root masses form its body. The check below
// targets attached details and wound surfaces rather than those foundation layers.
function buriedAttachments(root, type) {
  return buriedParts(root).filter(part => part.surface !== 'skin' && !(type === 'brute' && part.surface === 'wet')
    && !(type === 'caveguard' && part.surface === 'root' && Math.min(...part.size) > .09));
}

for (const type of CONCEPT_TYPES.filter(k => k !== 'guardian' && k !== 'caveguard')) {
  test(`${type}: no floating or mostly buried attachments`, () => {
    const g = rig(); let loose = null, buried = null;
    assert(applyZombieConcept({ THREE: T, g, typeKey: type, scale: 1, rbox,
      audit: ({ root }) => { loose = looseParts(root); buried = buriedAttachments(root, type); } }));
    assert.deepEqual(loose, [], `${type}: isolated pre-batch parts ${JSON.stringify(loose?.slice(0, 12))}`);
    assert.deepEqual(buried, [], `${type}: mostly buried attachment parts ${JSON.stringify(buried?.slice(0, 12))}`);
  });
}

for (const type of ['guardian', 'caveguard']) {
  test(`${type}: no floating or mostly buried attachments`, () => {
    const g = guardianRig(); let loose = null, buried = null;
    const stop = new Error('audit captured');
    assert.throws(() => applyGuardianConcept({ THREE: T, g, rbox, kind: type,
      audit: ({ root }) => { loose = looseParts(root); buried = buriedAttachments(root, type); throw stop; } }), e => e === stop);
    assert.deepEqual(loose, [], `${type}: isolated pre-batch parts ${JSON.stringify(loose?.slice(0, 12))}`);
    assert.deepEqual(buried, [], `${type}: mostly buried attachment parts ${JSON.stringify(buried?.slice(0, 12))}`);
  });
}
