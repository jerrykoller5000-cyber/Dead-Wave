import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const qs = process.argv[2] || 'debug=1';
const outName = process.argv[3] || 'diag-training2.png';
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const ev = (expr, ms = 180000) => page.evaluate(expr, ms);
  await page.goto(`${srv.origin}/index.html?${qs}`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await ev(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await ev('new Promise(r => setTimeout(r, 250))');
  }
  await page.waitFor('!!window.TT && window.DWOpening?.active === false', { timeout: 180000 });
  await ev(`(async () => {
    const n = document.getElementById('playerName'); if (n) n.value = 'Perf';
    document.getElementById('modeHunt').click();
    const t0 = Date.now();
    while ((TT.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t0 < 120000) {
      await new Promise(r => setTimeout(r, 200));
    }
    TT.grantAllWeapons();
    TT.setWeapon(1);
    TT.trainingDbg?.enter?.();
    const t1 = Date.now();
    while ((!TT.trainingDbg?.state()?.active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t1 < 180000) {
      await new Promise(r => setTimeout(r, 200));
    }
    const tg = TT.trainingDbg.tg();
    TT.player.position.set(tg.origin.x - 10, tg.floorY, tg.origin.z - 2);
    await new Promise(r => setTimeout(r, 600));
  })()`);
  const info = await ev(`(() => {
    const THREE = TT.THREE;
    const pl = TT.player;
    const kr = pl.getObjectByName('training-marine-fade-pipeline-keepers');
    const v = new THREE.Vector3();
    const vPos = [];
    pl.traverseVisible(o => {
      if (!o.isMesh || o.layers.mask === 0) return;
      if (o.isSkinnedMesh) {
        const sk = o.skeleton;
        const mw = o.matrixWorld.elements, bm = o.bindMatrix.elements, bmi = o.bindMatrixInverse.elements;
        const b0 = sk.bones[0]?.matrixWorld.elements, bm0 = sk.boneMatrices;
        v.set(0, 0, 0);
        try { o.getVertexPosition(0, v).applyMatrix4(o.matrixWorld); } catch (_) {}
        vPos.push({
          name: o.name, parent: o.parent?.name, bindMode: o.bindMode,
          v0: [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)],
          mw: [+mw[12].toFixed(2), +mw[13].toFixed(2), +mw[14].toFixed(2)],
          bm: [+bm[12].toFixed(2), +bm[13].toFixed(2), +bm[14].toFixed(2)],
          bmi: [+bmi[12].toFixed(2), +bmi[13].toFixed(2), +bmi[14].toFixed(2)],
          b0: b0 ? [+b0[12].toFixed(2), +b0[13].toFixed(2), +b0[14].toFixed(2)] : null,
          mat0: bm0 ? [+bm0[12].toFixed(2), +bm0[13].toFixed(2), +bm0[14].toFixed(2)] : null,
        });
      }
    });
    // Also check ALL top-level visible scene children whose bounding box center is within 30m of player!
    const nearTop = [];
    const box = new THREE.Box3(), ctr = new THREE.Vector3();
    for (const c of TT.scene.children) {
      if (!c.visible || c.isLight || c.isCamera) continue;
      if (c === TT.trainingDbg.tg().group) continue;
      box.makeEmpty();
      try { box.setFromObject(c); } catch (_) {}
      if (!box.isEmpty()) {
        box.getCenter(ctr);
        if (Math.hypot(ctr.x - pl.position.x, ctr.y - pl.position.y, ctr.z - pl.position.z) < 40) {
          nearTop.push({ name: c.name || c.type, ctr: [+ctr.x.toFixed(2), +ctr.y.toFixed(2), +ctr.z.toFixed(2)], min: [+box.min.x.toFixed(2), +box.min.y.toFixed(2), +box.min.z.toFixed(2)], max: [+box.max.x.toFixed(2), +box.max.y.toFixed(2), +box.max.z.toFixed(2)] });
        }
      }
    }
    return {
      qs: location.search,
      playerPos: [+pl.position.x.toFixed(2), +pl.position.y.toFixed(2), +pl.position.z.toFixed(2)],
      keeperVis: kr ? kr.visible : null,
      nearTop,
      vPos,
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot(path.join(ROOT, 'qa', 'AG-419', 'parity', outName));
} finally {
  await browser.close();
  await srv.close();
}
process.exit(0);
