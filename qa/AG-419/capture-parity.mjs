import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const tag = process.argv[2] || 'before';
const OUT = path.join(ROOT, 'qa', 'AG-419', 'parity');
fs.mkdirSync(OUT, { recursive: true });

const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const ev = (expr, ms = 180000) => page.evaluate(expr, ms);
  await page.goto(`${srv.origin}/index.html?debug=1`, { waitUntil: 'none' });
  await page.waitFor('!!window.DWOpening', { timeout: 60000 });
  for (let i = 0; i < 2; i++) {
    await ev(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
    await ev('new Promise(r => setTimeout(r, 250))');
  }
  await page.waitFor('!!window.TT && window.DWOpening?.active === false', { timeout: 180000 });

  const shot = async (name) => {
    await ev('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
    const outPath = path.join(OUT, `${tag}-${name}.png`);
    await page.screenshot(outPath);
    const sz = fs.statSync(outPath).size;
    console.log(`[AG-419 parity] saved ${path.relative(ROOT, outPath)} (${sz} bytes)`);
  };

  // 1. Hunt Day vista (outer world + minimap + marine holding weapon)
  await ev(`(async () => {
    const n = document.getElementById('playerName'); if (n) n.value = 'Perf';
    document.getElementById('modeHunt').click();
    const t0 = Date.now();
    while ((TT.getPhase() !== 'prep' || document.body.classList.contains('deploying')) && Date.now() - t0 < 120000) {
      await new Promise(r => setTimeout(r, 200));
    }
    TT.grantAllWeapons();
    TT.setWeapon(1); // M4
    TT.setWorldTime(0.5); // Noon
    await new Promise(r => setTimeout(r, 500));
  })()`);
  const dayStats = await ev(`(() => {
    const r = TT.renderer?.info?.render || {};
    const ow = TT.scene.getObjectByName('outer-world-vistas');
    let owMeshes = 0, owSprites = 0;
    if (ow) ow.traverse(o => { if (o.isMesh) owMeshes++; if (o.isSprite) owSprites++; });
    return { calls: r.drawCalls ?? r.calls, tris: r.triangles, owMeshes, owSprites };
  })()`);
  console.log('[AG-419 parity] hunt-day:', JSON.stringify(dayStats));
  await shot('hunt-day-m4');

  // 2. Hunt Night looking NE toward distant mountain pass amber town lights + red beacons
  await ev(`(async () => {
    TT.setWorldTime(0.95); // Clear night
    TT.rotateCamera?.(0.35);
    await new Promise(r => setTimeout(r, 600));
  })()`);
  const nightStats = await ev(`(() => {
    const r = TT.renderer?.info?.render || {};
    const am = TT.scene.getObjectByName('outer-amber-lights-core');
    return { calls: r.drawCalls ?? r.calls, tris: r.triangles, amberVis: am?.visible, amberType: am?.type, amberCount: am?.isInstancedMesh || am?.isSprite ? am.count : am?.children?.length };
  })()`);
  console.log('[AG-419 parity] hunt-night:', JSON.stringify(nightStats));
  await shot('hunt-night-lights');

  // 3. Training Ground looking at containment turrets + room
  await ev(`(async () => {
    TT.trainingDbg?.enter?.();
    const t0 = Date.now();
    while ((!TT.trainingDbg?.state()?.active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 180000) {
      await new Promise(r => setTimeout(r, 200));
    }
    const tg = TT.trainingDbg.tg();
    TT.player.position.set(tg.origin.x - 10, tg.floorY, tg.origin.z - 2);
    await new Promise(r => setTimeout(r, 600));
  })()`);
  const trStats = await ev(`(() => {
    const r = TT.renderer?.info?.render || {};
    const tc = TT.scene.getObjectByName('training-containment');
    let tcDraws = 0;
    if (tc) tc.traverse(o => { if (o.isMesh && o.visible) tcDraws++; });
    const tg = TT.trainingDbg.tg().group;
    const byName = new Map();
    tg.traverseVisible(o => {
      if (!o.isMesh) return;
      const k = o.name || (o.parent && o.parent.name) || 'anon';
      const g = o.geometry;
      const tri = g ? ((g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3) * (o.isInstancedMesh ? o.count : 1) : 0;
      const cur = byName.get(k) || { n: 0, tris: 0, cast: 0 };
      cur.n++; cur.tris += tri; if (o.castShadow) cur.cast++;
      byName.set(k, cur);
    });
    const topTg = [...byName.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 18).map(([k, v]) => ({ k, n: v.n, cast: v.cast, tris: Math.round(v.tris) }));
    const topTri = [...byName.entries()].sort((a, b) => b[1].tris - a[1].tris).slice(0, 12).map(([k, v]) => ({ k, n: v.n, cast: v.cast, tris: Math.round(v.tris) }));
    return { calls: r.drawCalls ?? r.calls, tris: r.triangles, tcDraws, topTg, topTri };
  })()`);
  console.log('[AG-419 parity] training:', JSON.stringify(trStats));
  await shot('training-room');

  fs.writeFileSync(path.join(OUT, `${tag}-stats.json`), JSON.stringify({ tag, dayStats, nightStats, trStats, errors: (page.errors || []).slice(0, 10) }, null, 2));
} finally {
  await browser.close();
  await srv.close();
}
process.exit(0);
