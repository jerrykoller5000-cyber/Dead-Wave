// review/GB-274/probe.mjs - brute get-up: simulated points vs the mesh the rig really shows (GB-274).
//   node --import ./studio/node-three.mjs review/GB-274/probe.mjs
import * as THREE from 'three';
import { rigs, loadMotion, createBody } from '../../studio/index.js';
import { presets } from '../../studio/motion/index.js';

export function run(dir = [0, .3, -1], opts = {}) {
  const inst = rigs.get('zombie').create({ type: 'brute', scale: 1.38 });
  const body = createBody(inst, loadMotion(presets.json('zombie/brute')));
  const spec = inst.def.body;
  const rows = [];
  body.follow();
  const jointY = (pt) => { const j = inst.R[spec.points[pt].joint]; j.updateWorldMatrix(true, false); return new THREE.Vector3().setFromMatrixPosition(j.matrixWorld); };
  const up = new THREE.Vector3();
  let tGetup = null, f0 = 0;
  for (let f = 0; f < 60 * 8; f++) {
    body.follow();
    if (f === 30) body.hit({ at: 'pelvis', dir, power: 30, kind: 'blast' });
    for (const e of body.update(1 / 60)) if (e[0] === 'getup') { tGetup = f; }
    body.apply();
    if (tGetup !== null && body.state === 'getup') {
      const u = (f - tGetup) / 60 / 1.4;
      const P = body.points();
      const spineJ = inst.R[spec.segments.find((s) => s.joint === 'spine' || /spine/.test(s.joint))?.joint || 'spine'];
      rows.push({ u, w: body.weight, P, spine: spineJ ? new THREE.Vector3(0, 1, 0).applyQuaternion(spineJ.getWorldQuaternion(new THREE.Quaternion())) : null,
        mesh: Object.fromEntries(['pelvis', 'chest', 'head', 'handL', 'kneeL'].map((k) => [k, jointY(k)])) });
    }
  }
  return { rows, inst, body, spec };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('probe.mjs')) {
  for (const dir of [[0, .3, -1], [0, .3, 1]]) {
    const { rows, inst, spec } = run(dir);
    console.log('segments', spec.segments.map((s) => s.joint).join(','));
    console.log('dir', dir.join(','));
    for (const target of [0.02, .2, .35, .5, .7, .85, .98]) {
      const r = rows.reduce((a, b) => Math.abs(b.u - target) < Math.abs(a.u - target) ? b : a);
      console.log(`u=${r.u.toFixed(2)} w=${r.w.toFixed(2)} P pelvis ${r.P.pelvis[1].toFixed(2)} chest ${r.P.chest[1].toFixed(2)} | mesh pelvis ${r.mesh.pelvis.y.toFixed(2)} chest ${r.mesh.chest.y.toFixed(2)} head ${r.mesh.head.y.toFixed(2)} handL ${r.mesh.handL.y.toFixed(2)} | spineUp.y ${r.spine ? r.spine.y.toFixed(2) : '-'}`);
    }
  }
}
