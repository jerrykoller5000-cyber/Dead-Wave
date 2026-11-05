import * as THREE from 'three';
import { rigs, loadMotion } from '../../studio/index.js';
import { createBody as newBody } from '../../studio/motion.js';
import { createBody as oldBody } from '../../studio/_motion_before_tmp.js';
import { presets } from '../../studio/motion/index.js';
// Unkeyed presets: the old and new engine must write the same joints, frame for frame.
let worst = 0, frames = 0;
for (const [ref, create, power] of [['zombie/shambler', {}, 8], ['zombie/shambler', {}, 3], ['marine/marine', {}, 8]]) {
  const rig = ref.startsWith('marine') ? 'marine' : 'zombie';
  const A = rigs.get(rig).create(create), B = rigs.get(rig).create(create);
  const a = newBody(A, loadMotion(presets.json(ref))), b = oldBody(B, loadMotion(presets.json(ref)));
  const qa = [], qb = [];
  A.group.traverse((o) => qa.push(o)); B.group.traverse((o) => qb.push(o));
  for (let f = 0; f < 60 * 7; f++) {
    for (const x of [a, b]) x.follow();
    if (f === 30) for (const x of [a, b]) x.hit({ at: 'pelvis', dir: [0, .3, -1], power, kind: 'blast' });
    a.update(1 / 60); b.update(1 / 60); a.apply(); b.apply();
    for (let i = 0; i < qa.length; i++) { const d = qa[i].quaternion.angleTo(qb[i].quaternion) + qa[i].position.distanceTo(qb[i].position); worst = Math.max(worst, d); }
    frames++;
  }
}
console.log('unkeyed old-vs-new max joint difference over', frames, 'frames:', worst);
