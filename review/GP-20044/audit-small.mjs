// Diagnose t333's sub-18 mm hardware before the merged builder hides its parts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion'] });
try {
  const page = await browser.newPage({ width: 900, height: 600 });
  await page.goto(`${server.origin}/tools/gunshot/index.html?gun=flamer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.GUNSHOT', { timeout: 120000 })) throw new Error('GUNSHOT did not boot');
  const result = await page.evaluate(`(async () => {
    const { weaponModelContext } = await import('/tools/marine-inspector.js');
    const H = await import('/studio/weapon-heavy.js');
    const THREE = (await import('three'));
    let floats = [];
    const ctxBase = weaponModelContext();
    H.makeFlamerModel({ ...ctxBase, finishGun(gun) {
      gun.updateMatrixWorld(true);
      const parts = [];
      gun.traverse(o => { if (!o.isMesh || !o.geometry) return;
        o.updateWorldMatrix(true, false);
        const b = new THREE.Box3().setFromObject(o), size = b.getSize(new THREE.Vector3());
        if (b.isEmpty()) return;
        parts.push({ o, b, len: Math.max(size.x, size.y, size.z) });
      });
      for (const s of parts.filter(p => p.len <= .018)) {
        if (parts.some(b => b.len > .018 && s.b.clone().expandByScalar(.0015).intersectsBox(b.b))) continue;
        floats.push({ at: s.b.getCenter(new THREE.Vector3()).toArray().map(v=>+v.toFixed(4)),
          len: +s.len.toFixed(4), geom: s.o.geometry.type,
          mat: s.o.material?.name || s.o.material?.type || '?' });
      }
      return ctxBase.finishGun(gun);
    }});
    return floats;
  })()`);
  fs.writeFileSync(path.join(root, 'review/GP-20044/audit-small.json'), JSON.stringify({ floats: result, errors: page.errors }, null, 2) + '\n');
  console.log(JSON.stringify(result));
  if (page.errors.length) throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }
