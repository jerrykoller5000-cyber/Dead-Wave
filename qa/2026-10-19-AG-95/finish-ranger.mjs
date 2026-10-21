import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-95');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const server = await serve(ROOT, 0);
const browser = await launch({
  headless: false,
  args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720']
});

try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 120000 });
  await page.waitFor('!!window.DWOpening || !!window.TT', { timeout: 120000 });
  for (let i = 0; i < 2; i++) {
    await page.evaluate(`(() => {
      if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting();
      else { const b = document.getElementById('openingSkip'); if (b) b.click(); }
      return true;
    })()`);
    await sleep(300);
  }
  await page.waitFor('!!window.TT', { timeout: 120000 });
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await sleep(400);

  const libCode = fs.readFileSync(path.resolve(ROOT, 'tools/tests/lib.js'), 'utf8');
  await page.evaluate(libCode);

  const t52Code = fs.readFileSync(path.resolve(ROOT, 'tools/tests/t52.js'), 'utf8');
  const t52Out = await page.evaluate(t52Code, 120000);

  const t266Code = fs.readFileSync(path.resolve(ROOT, 'tools/tests/t266.js'), 'utf8');
  const t266Out = await page.evaluate(t266Code, 120000);

  // Move marine to lockbox (`site ranger`) so he isn't standing in front of the left truck door (`u0`),
  // while framing the left truck door decal (`u0`) cleanly.
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.runDevCommand('site ranger');
    await new Promise(r => setTimeout(r, 200));
    const THREE = T.THREE;
    const truckG = T.scene.getObjectByName('ranger-truck');
    const units = truckG.getObjectsByProperty('name', 'ranger-unit');
    const u0 = units[0];
    u0.updateMatrixWorld(true);
    const t = new THREE.Vector3();
    u0.getWorldPosition(t);
    const q = u0.getWorldQuaternion(new THREE.Quaternion());
    const p = t.clone().add(new THREE.Vector3(0.18, 0.05, 0.85).applyQuaternion(q));
    T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 38 });
    await new Promise(r => setTimeout(r, 250));
  })()`);
  await page.screenshot(path.join(OUT_DIR, '06-door-left-3d-closeup.png'));

  const diag = await page.evaluate(`(() => {
    const T = window.TT;
    const S = T.scene;
    const D = T.rangerDbg;
    const truckG = S.getObjectByName('ranger-truck');
    const units = truckG ? truckG.getObjectsByProperty('name', 'ranger-unit') : [];
    const log = S.getObjectByName('ranger-search-log');
    const kp = S.getObjectByName('ranger-keypad');
    const lid = S.getObjectByName('ranger-lid-pictures');
    return {
      built: D.ranger.built,
      off: D.ranger.off,
      codeBanner: T.runDevCommand('site ranger code'),
      state: D.state(),
      unitsCount: units.length,
      unitLocalPositions: units.map(u => ({ x: u.position.x, y: u.position.y, z: u.position.z, ry: u.rotation.y })),
      logPos: log ? { x: log.position.x, y: log.position.y, z: log.position.z, ry: log.rotation.y } : null,
      kpPos: kp ? { x: kp.position.x, y: kp.position.y, z: kp.position.z } : null,
      lidPos: lid ? { x: lid.position.x, y: lid.position.y, z: lid.position.z } : null
    };
  })()`);

  fs.writeFileSync(path.join(OUT_DIR, 'diagnostics.json'), JSON.stringify({ diag, t52Out, t266Out }, null, 2), 'utf8');
  console.log('=== t52 on real Three.js ===\n' + t52Out);
  console.log('=== t266 on real Three.js ===\n' + t266Out);
} finally {
  await browser.close();
  await server.close();
}
