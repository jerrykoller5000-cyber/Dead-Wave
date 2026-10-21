// tools/perfbreak.mjs — CL-116: what the camera draws, grouped by the scene's top-level objects.
//   node tools/perfbreak.mjs training|hunt
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] || 'training';
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8'));
  const run = (code, ms = 900000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  if (mode === 'training') await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeTraining').click(); const t0 = Date.now(); while (!T.trainingDbg.state().active && Date.now() - t0 < 60000) await wait(200); await wait(5000); return true;`);
  else await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeHunt').click(); const t1 = Date.now(); while ((T.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t1 < 1500000) await wait(500); await wait(3000); return true;`);
  const res = await run(`
    const THREE = T.THREE, cam = T.camera, scene = T.scene, sun = T.sun;
    cam.updateMatrixWorld(); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const groups = new Map(); const lights = []; const never = [];
    const sph = new THREE.Sphere();
    const rootOf = (o) => { let n = o; while (n.parent && n.parent !== scene) n = n.parent; return n; };
    const label = (r) => (r.name || r.type) + (r.userData && r.userData.kind ? ':' + r.userData.kind : '');
    scene.traverseVisible((o) => {
      if (o.isLight) { const chain = []; for (let n = o; n && n !== scene; n = n.parent) chain.push(n.name || n.type); lights.push(chain.join(' < ') + ' i=' + (+o.intensity).toFixed(2) + ' @' + o.getWorldPosition(new THREE.Vector3()).toArray().map((v) => v.toFixed(0)).join(',')); return; }
      if (!(o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o.isPoints || o.isLine)) return;
      const g = o.geometry; if (!g) return;
      let inView = !o.frustumCulled;
      if (o.frustumCulled) { if (!g.boundingSphere) g.computeBoundingSphere(); sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); inView = fr.intersectsSphere(sph); }
      if (!inView) return;
      const tri = (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3 * (o.isInstancedMesh ? o.count : 1);
      const k = label(rootOf(o)) + (o.frustumCulled ? '' : ' [never culled]');
      const e = groups.get(k) || { n: 0, tri: 0 }; e.n++; e.tri += tri; groups.set(k, e);
      if (!o.frustumCulled) { const chain = []; for (let n = o; n && n !== scene; n = n.parent) chain.push(n.name || n.type); never.push(Math.round(tri / 1000) + 'k ' + chain.join(' < ')); }
    });
    const top = [...groups.entries()].sort((a, b) => b[1].tri - a[1].tri).slice(0, 40).map(([k, v]) => v.n + ' draws ' + Math.round(v.tri / 1000) + 'k tri  ' + k);
    return { far: cam.far, lights, never, top, total: [...groups.values()].reduce((a, v) => ({ n: a.n + v.n, tri: a.tri + v.tri }), { n: 0, tri: 0 }) };`);
  console.log(JSON.stringify(res, null, 1));
} finally { await browser.close(); await srv.close(); }
process.exit(0);   // the server keeps the process alive otherwise
