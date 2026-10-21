// studio/reference.js — reference motion on a plain mannequin (CL-59, D-40). The clips are the
// Quaternius Universal Animation Library (CC0), imported by studio/import-ual.mjs into
// assets/anim/reference/ual.json. The renderer shows a reference beside our clip, frame for frame,
// so an agent can see real timing and weight next to its own work (docs/studio.md §4).
//
//   const ref = loadReference(await (await fetch('assets/anim/reference/ual.json')).json());
//   const man = makeMannequin(ref);   scene.add(man.group);
//   poseReference(man, ref.clip('Push_Loop'), t);
import * as THREE from 'three';

export function loadReference(json) {
  if (!json || json.format !== 'dw-ref/1') throw new Error('not a dw-ref/1 reference file');
  const names = Object.keys(json.clips);
  return {
    fps: json.fps, skeleton: json.skeleton, names,
    clip(name) {
      const c = json.clips[name];
      if (!c) throw new Error(`no reference clip "${name}" (have: ${names.join(', ')})`);
      return { name, ...c };
    }
  };
}

// A plain grey figure built from the skeleton's rest pose: a box along each bone to its child.
export function makeMannequin(ref, { color = 0xb8b8b0, joint = 0x6d6d68 } = {}) {
  // The packs face -Z once their root turns them Y-up; turned round here so a mannequin faces +Z,
  // the way our rigs do.
  const group = new THREE.Group();
  const facing = new THREE.Group();
  facing.rotation.y = Math.PI;
  group.add(facing);
  const bones = ref.skeleton.map((b) => {
    const o = new THREE.Group();
    o.name = b.name;
    o.position.set(...b.t);
    o.quaternion.set(...b.r);
    return o;
  });
  ref.skeleton.forEach((b, i) => (b.parent >= 0 ? bones[b.parent] : facing).add(bones[i]));
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const jmat = new THREE.MeshStandardMaterial({ color: joint, roughness: 0.8 });
  const up = new THREE.Vector3(0, 1, 0);
  ref.skeleton.forEach((b, i) => {
    const kids = ref.skeleton.map((c, k) => (c.parent === i ? k : -1)).filter((k) => k >= 0);
    if (b.name === 'root') return;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(b.name === 'Head' ? 0.11 : 0.035, 10, 8), b.name === 'Head' ? mat : jmat);
    if (b.name === 'Head') ball.position.set(0, 0.1, 0.02);
    bones[i].add(ball);
    for (const k of kids) {
      const to = new THREE.Vector3(...ref.skeleton[k].t);
      const len = to.length();
      if (len < 0.02) continue;
      const w = /thigh|calf/.test(b.name) ? 0.11 : /pelvis|spine/.test(b.name) ? 0.2 : 0.07;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, w), mat);
      m.position.copy(to).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(up, to.clone().normalize());
      bones[i].add(m);
    }
  });
  group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  const rest = bones.map((o) => ({ q: o.quaternion.clone(), p: o.position.clone() }));
  return { group, bones, rest, byName: new Map(bones.map((o) => [o.name, o])) };
}

// Pose the mannequin at time t (seconds; a loop wraps, otherwise held at the ends).
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion();
export function poseReference(man, clip, t, fps = 30) {
  const L = clip.length;
  const tt = clip.loop ? ((t % L) + L) % L : Math.max(0, Math.min(L, t));
  const f = Math.min(clip.frames - 1, tt * fps), i = Math.floor(f), u = f - i, j = Math.min(clip.frames - 1, i + 1);
  man.bones.forEach((o, k) => { o.quaternion.copy(man.rest[k].q); o.position.copy(man.rest[k].p); });
  for (const [bone, flat] of Object.entries(clip.rot)) {
    const o = man.byName.get(bone); if (!o) continue;
    _qa.fromArray(flat, i * 4); _qb.fromArray(flat, j * 4);
    o.quaternion.copy(_qa).slerp(_qb, u);
  }
  for (const [bone, flat] of Object.entries(clip.pos)) {
    const o = man.byName.get(bone); if (!o) continue;
    o.position.set(flat[i * 3] + (flat[j * 3] - flat[i * 3]) * u, flat[i * 3 + 1] + (flat[j * 3 + 1] - flat[i * 3 + 1]) * u, flat[i * 3 + 2] + (flat[j * 3 + 2] - flat[i * 3 + 2]) * u);
  }
  man.group.updateWorldMatrix(true, true);
}
