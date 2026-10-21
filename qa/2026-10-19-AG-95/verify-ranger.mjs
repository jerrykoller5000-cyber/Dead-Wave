import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const OUT_DIR = path.resolve(ROOT, 'qa/2026-10-19-AG-95');
await fs.promises.mkdir(OUT_DIR, { recursive: true });
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
  const ready = await page.waitFor('!!window.TT', { timeout: 120000 });
  if (!ready) throw new Error('window.TT never initialized');
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await sleep(500);

  const libCode = fs.readFileSync(path.resolve(ROOT, 'tools/tests/lib.js'), 'utf8');
  await page.evaluate(libCode);
  const t52Code = fs.readFileSync(path.resolve(ROOT, 'tools/tests/t52.js'), 'utf8');
  const t52Out = await page.evaluate(t52Code);

  await page.evaluate(`(async () => {
    const T = window.TT;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    await startMatch(T, 'AG95');
    for (let i = 0; i < 60 && !T.rangerDbg?.ranger?.built; i++) await wait(100);
    T.clearZombies();
    T.setHp(100000);
    T.runDevCommand('godmode');
    return true;
  })()`, 120000);

  const tapKey = async (code = 'KeyE', key = 'e') => {
    await page.evaluate(`(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '${key}', bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      document.dispatchEvent(new KeyboardEvent('keyup', { code: '${code}', key: '${key}', bubbles: true }));
      await new Promise(r => setTimeout(r, 150));
    })()`);
  };

  const diag = await page.evaluate(`(() => {
    const T = window.TT;
    const S = T.scene;
    const D = T.rangerDbg;
    const codeBanner = T.runDevCommand('site ranger code');
    const st = D.state();
    const truckG = S.getObjectByName('ranger-truck');
    const units = truckG ? truckG.getObjectsByProperty('name', 'ranger-unit') : [];
    const log = S.getObjectByName('ranger-search-log');
    const kp = S.getObjectByName('ranger-keypad');
    const lid = S.getObjectByName('ranger-lid-pictures');
    return {
      built: D.ranger.built,
      off: D.ranger.off,
      codeBanner,
      state: st,
      clues: D.ranger.clues.map(c => ({ source: c.source, spot: c.spot })),
      unitsCount: units.length,
      unitLocalPositions: units.map(u => ({ x: u.position.x, y: u.position.y, z: u.position.z, ry: u.rotation.y })),
      logPos: log ? { x: log.position.x, y: log.position.y, z: log.position.z, ry: log.rotation.y } : null,
      kpPos: kp ? { x: kp.position.x, y: kp.position.y, z: kp.position.z } : null,
      lidPos: lid ? { x: lid.position.x, y: lid.position.y, z: lid.position.z } : null
    };
  })()`);

  // 1. Lockbox close-up (closed lid 3 pictures + front keypad & red LED)
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.runDevCommand('site ranger');
    await new Promise(r => setTimeout(r, 250));
    const prop = T.getObjectiveProps().props['objective:ranger-cache'];
    const g = prop.group;
    g.updateMatrixWorld(true);
    const THREE = T.THREE;
    const p = g.localToWorld(new THREE.Vector3(0, 0.56, 0.56));
    const t = g.localToWorld(new THREE.Vector3(0, 0.20, 0.14));
    T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 38 });
    await new Promise(r => setTimeout(r, 250));
  })()`);
  await page.screenshot(path.join(OUT_DIR, '01-lockbox-closed-lid-and-keypad.png'));

  // 2. Radio close-up (`site ranger radio`) + E Look modal
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.setShotView(null);
    T.runDevCommand('site ranger radio');
    await new Promise(r => setTimeout(r, 250));
    const THREE = T.THREE;
    const truckG = T.scene.getObjectByName('ranger-truck');
    const radio = truckG.getObjectByName('ranger-radio');
    radio.updateMatrixWorld(true);
    const lcd = radio.children.find(o => o.isMesh && o.geometry.type === 'PlaneGeometry');
    const t = new THREE.Vector3();
    lcd.getWorldPosition(t);
    const n = new THREE.Vector3(0, 0.18, 0.36).applyQuaternion(lcd.getWorldQuaternion(new THREE.Quaternion()));
    const p = t.clone().add(n);
    T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 32 });
    await new Promise(r => setTimeout(r, 250));
  })()`);
  await page.screenshot(path.join(OUT_DIR, '02-radio-3d-closeup.png'));

  await tapKey('KeyE', 'e');
  await page.screenshot(path.join(OUT_DIR, '03-radio-look-modal.png'));
  await tapKey('KeyE', 'e');

  // 3. Search board close-up (`site ranger board`) + E Look modal
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.setShotView(null);
    T.runDevCommand('site ranger board');
    await new Promise(r => setTimeout(r, 250));
    const THREE = T.THREE;
    const log = T.scene.getObjectByName('ranger-search-log');
    log.updateMatrixWorld(true);
    const t = new THREE.Vector3();
    log.getWorldPosition(t);
    const fwd = new THREE.Vector3(0.08, 0.04, 0.52).applyAxisAngle(new THREE.Vector3(0, 1, 0), log.rotation.y);
    const p = t.clone().add(fwd);
    T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 38 });
    await new Promise(r => setTimeout(r, 250));
  })()`);
  await page.screenshot(path.join(OUT_DIR, '04-board-3d-closeup.png'));

  await tapKey('KeyE', 'e');
  await page.screenshot(path.join(OUT_DIR, '05-board-look-modal.png'));
  await tapKey('KeyE', 'e');

  // 4. Truck doors close-up (`site ranger door` — both left and right doors) + E Look modal
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.setShotView(null);
    T.runDevCommand('site ranger door');
    await new Promise(r => setTimeout(r, 250));
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

  await page.evaluate(`(async () => {
    const T = window.TT;
    const THREE = T.THREE;
    const truckG = T.scene.getObjectByName('ranger-truck');
    const units = truckG.getObjectsByProperty('name', 'ranger-unit');
    const u1 = units[1];
    u1.updateMatrixWorld(true);
    const t = new THREE.Vector3();
    u1.getWorldPosition(t);
    const q = u1.getWorldQuaternion(new THREE.Quaternion());
    const p = t.clone().add(new THREE.Vector3(-0.18, 0.05, 0.85).applyQuaternion(q));
    T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 38 });
    await new Promise(r => setTimeout(r, 250));
  })()`);
  await page.screenshot(path.join(OUT_DIR, '07-door-right-3d-closeup.png'));

  await tapKey('KeyE', 'e');
  await page.screenshot(path.join(OUT_DIR, '08-door-look-modal.png'));
  await tapKey('KeyE', 'e');

  // 5. Return to lockbox (`site ranger`), open keypad, enter WRONG code, then RIGHT code (`OPEN`), then E search
  await page.evaluate(`(async () => {
    const T = window.TT;
    T.setShotView(null);
    T.runDevCommand('site ranger');
    await new Promise(r => setTimeout(r, 250));
    const prop = T.getObjectiveProps().props['objective:ranger-cache'];
    const g = prop.group;
    g.updateMatrixWorld(true);
    const THREE = T.THREE;
    const p = g.localToWorld(new THREE.Vector3(0, 0.56, 0.56));
    const t = g.localToWorld(new THREE.Vector3(0, 0.20, 0.14));
    T.setShotView({ x: p.x, y: p.y, z: p.z, tx: t.x, ty: t.y, tz: t.z, fov: 38 });
    await new Promise(r => setTimeout(r, 250));
  })()`);

  await tapKey('KeyE', 'e');
  const code = diag.state.code;
  const wrong = code.map(d => (d % 9) + 1);
  for (const d of wrong) {
    await tapKey('Digit' + d, String(d));
  }
  await page.screenshot(path.join(OUT_DIR, '09-keypad-wrong-code.png'));

  // Wait for WRONG flash to clear (~1.2s)
  await sleep(1200);
  for (const d of code) {
    await tapKey('Digit' + d, String(d));
  }
  await page.screenshot(path.join(OUT_DIR, '10-keypad-right-code-open.png'));

  // Wait for keypad to auto-close (~1.2s), then show open lockbox + green LED and search prompt
  await sleep(1200);
  await page.screenshot(path.join(OUT_DIR, '11-lockbox-unlocked-green-led.png'));

  // Press E to open the cache search modal
  await tapKey('KeyE', 'e');
  await sleep(300);
  await page.screenshot(path.join(OUT_DIR, '12-lockbox-searched-modal.png'));

  const afterState = await page.evaluate(`(() => {
    const T = window.TT;
    const D = T.rangerDbg;
    return {
      unlocked: !D.locked(),
      ledHex: D.ranger.led?.material?.emissive?.getHex(),
      reach: D.reach(),
      modalOpen: !!T.objectiveModalOpen?.()
    };
  })()`);

  // Reload once on the same single page and run t266.js cleanly on real Three.js
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
  await page.evaluate(libCode);
  const t266Code = fs.readFileSync(path.resolve(ROOT, 'tools/tests/t266.js'), 'utf8');
  const t266Out = await page.evaluate(t266Code, 120000);

  fs.writeFileSync(path.join(OUT_DIR, 'diagnostics.json'), JSON.stringify({ diag, afterState, t52Out, t266Out }, null, 2), 'utf8');
  console.log('--- t52 real Three.js ---\n' + t52Out);
  console.log('--- t266 real Three.js ---\n' + t266Out);
  console.log('verify-ranger complete:', JSON.stringify({ code: diag.state.code, order: diag.state.order, afterState }));
} finally {
  await browser.close();
  await server.close();
}
