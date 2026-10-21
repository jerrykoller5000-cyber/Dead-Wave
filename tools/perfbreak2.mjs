// tools/perfbreak2.mjs — CL-117: draws by scene child and by material, in view (hunt at the HQ, or training).
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const mode = process.argv[2] || 'hunt';
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const run = (code, ms = 1800000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  if (mode === 'training') await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeTraining').click(); const t0 = Date.now(); while (!T.trainingDbg.state().active && Date.now() - t0 < 60000) await wait(200); await wait(5000); return true;`);
  else await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeHunt').click(); const t1 = Date.now(); while ((T.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t1 < 1500000) await wait(500); await wait(3000); return true;`);
  const res = await run(`
    const THREE = T.THREE, cam = T.camera, scene = T.scene;
    cam.updateMatrixWorld(); const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const sph = new THREE.Sphere(); const byChild = new Map(), byMat = new Map(); let n = 0;
    const matKey = (m) => (m.name || m.type) + '#' + (m.color ? m.color.getHexString() : '') + (m.map ? '+map' : '') + (m.transparent ? '+t' : '') + (m.emissive && m.emissive.getHex && m.emissive.getHex() ? '+e' : '');
    for (const child of scene.children) {
      let draws = 0, tri = 0;
      child.traverseVisible((o) => {
        if (!(o.isMesh || o.isInstancedMesh || o.isPoints || o.isLine) || !o.geometry) return;
        const g = o.geometry; let inView = !o.frustumCulled;
        if (o.frustumCulled) { if (!g.boundingSphere) g.computeBoundingSphere(); sph.copy(g.boundingSphere).applyMatrix4(o.matrixWorld); inView = fr.intersectsSphere(sph); }
        if (!inView) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        draws += mats.length; n += mats.length; tri += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1);
        for (const m of mats) { const k = matKey(m); const e = byMat.get(k) || { n: 0, ids: new Set() }; e.n++; e.ids.add(m.uuid); byMat.set(k, e); }
      });
      if (!draws) continue;
      const k = (child.name || child.type) + (child.userData && child.userData.kind ? ':' + child.userData.kind : '');
      const e = byChild.get(k) || { n: 0, draws: 0, tri: 0 }; e.n++; e.draws += draws; e.tri += tri; byChild.set(k, e);
    }
    return { total: n,
      children: [...byChild.entries()].sort((a, b) => b[1].draws - a[1].draws).slice(0, 30).map(([k, v]) => v.draws + ' draws ' + Math.round(v.tri / 1000) + 'k tri in ' + v.n + ' x ' + k),
      mats: [...byMat.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 30).map(([k, v]) => v.n + ' draws, ' + v.ids.size + ' material objects: ' + k) };`);
  console.log(JSON.stringify(res, null, 1));
} finally { await browser.close(); await srv.close(); }
process.exit(0);   // the server keeps the process alive otherwise
