import { rigs, loadMotion } from '../../studio/index.js';
import { createBody as newBody } from '../../studio/motion.js';
import { createBody as oldBody } from '../../studio/_motion_before_tmp.js';
import { presets } from '../../studio/motion/index.js';
const run = (cb, ref) => {
  const bodies = [];
  for (let i = 0; i < 48; i++) { const inst = rigs.get('zombie').create({}); inst.group.position.set(i * 2, 0, 0);
    const b = cb(inst, loadMotion(presets.json(ref))); b.follow(); b.hit({ power: 4.5, kind: 'pellet' }); bodies.push(b); }
  const t0 = performance.now();
  for (let f = 0; f < 60; f++) for (const b of bodies) { b.follow(); b.update(1 / 60); b.apply(); }
  return (performance.now() - t0) / 60;
};
const med = (a) => a.sort((x, y) => x - y)[a.length >> 1];
run(oldBody, 'zombie/shambler'); run(newBody, 'zombie/shambler');
for (const ref of ['zombie/shambler', 'zombie/brute']) {
  const o = [], n = [];
  for (let k = 0; k < 15; k++) { o.push(run(oldBody, ref)); n.push(run(newBody, ref)); }
  console.log(ref, '48 bodies ms/frame  old median', med(o).toFixed(2), ' new median', med(n).toFixed(2));
}
