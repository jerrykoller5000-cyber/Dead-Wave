// GB-164: the radio tower road/path junction. Puts the marine at the breaker panel, probes what ground is round it, shoots the gameplay view.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'diag', out = path.join(ROOT, 'handoffs/2026-10-12-grokbot-GB-164', tag); fs.mkdirSync(out, { recursive: true });
const lib = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');
const srv = await serve(ROOT); const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 895, height: 544 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(lib);
  const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const info = await step(`await startMatch(T, 'Trainee'); T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.runDevCommand('relay'); await wait(2500); T.clearZombies && T.clearZombies();
    const p = (T.localPlayer || T.player).position; const c = T.camera.position;
    const pr = T.probeGround ? null : 'no probe';
    return JSON.stringify({ p: [p.x, p.y, p.z].map((v) => +v.toFixed(2)), cam: [c.x, c.y, c.z].map((v) => +v.toFixed(2)), paths: (T.PATHS || window.PATHS || []).length || null });`);
  console.log(info);
  if (process.env.PROBE) console.log(await step(process.env.PROBE));
  await step(`T.clearZombies && T.clearZombies(); await wait(4000); T.clearZombies && T.clearZombies(); await wait(300); return 1;`);
  await page.screenshot(path.join(out, 'tower.png'));
  const j = await step(`let m = null; T.scene.traverse((o) => { if (o.name === 'convoy-approach-tracks') m = o; }); if (!m) return 'none';
    const pa = m.geometry.attributes.position, ca = m.geometry.attributes.color, v = new (m.position.constructor)(); let n = 0, sx = 0, sy = 0, sz = 0;
    for (let i = 0; i < pa.count; i++) { if (ca.itemSize === 4 ? ca.getW(i) > 0.98 : true) continue; v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); sx += v.x; sy += v.y; sz += v.z; n++; }
    if (!n) { m.geometry.computeBoundingBox(); return 'no fade verts'; }
    const c = { x: sx / n, y: sy / n, z: sz / n }; T.setShotView({ x: c.x - 3, y: c.y + 11, z: c.z - 8, tx: c.x, ty: c.y, tz: c.z, fov: 55 }); await wait(1500); return JSON.stringify(c);`);
  console.log('junction', j); await page.screenshot(path.join(out, 'junction.png'));
  console.log('errors', (page.errors || []).length);
} finally { await browser.close(); await srv.close(); }
