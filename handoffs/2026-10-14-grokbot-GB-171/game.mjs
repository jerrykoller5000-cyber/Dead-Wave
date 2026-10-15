// GB-171: the frag grenade in his hand (during the G hold) and in the air.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'handoffs/2026-10-14-grokbot-GB-171/shots'); fs.mkdirSync(out, { recursive: true });
const lib = fs.readFileSync(path.join(ROOT, 'tools/tests/lib.js'), 'utf8');
const srv = await serve(ROOT); const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 900, height: 640 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  await page.evaluate(lib);
  const step = (code) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, 240000);
  await step(`await startMatch(T, 'Grenade'); T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode'); T.setGrenadesDbg && T.setGrenadesDbg(4); return 1;`);
  // in hand: hold G, frame the grenade from in front and a little to the side of him
  console.log('hand', await step(`T.startGrenadeCharge(); let h = null; const t1 = Date.now();
    while (!h && Date.now() - t1 < 5000) { T.scene.traverse((o) => { if (!h && o.name === 'grenade-in-hand' && o.visible) h = o; }); await wait(30); }
    if (!h) return 'no grenade in hand';
    const p = h.getWorldPosition(new T.THREE.Vector3()), me = T.localPlayer || T.player, c = me.getWorldPosition(new T.THREE.Vector3());
    // out from his body through the hand (so he never stands between), a little up
    const d = new T.THREE.Vector3(p.x - c.x, 0, p.z - c.z).normalize();
    window.__shot = setInterval(() => { h.getWorldPosition(p); T.setShotView({ x: p.x + d.x * 0.42, y: p.y + 0.14, z: p.z + d.z * 0.42, tx: p.x, ty: p.y, tz: p.z, fov: 30 }); }, 16); await wait(1500);
    return p.toArray().map((v) => v.toFixed(2)).join(',');`));
  await page.screenshot(path.join(out, 'grenade-in-hand.png'));
  // in the air: let go, catch it on the way up
  console.log('air', await step(`clearInterval(window.__shot); T.releaseGrenadeCharge();
    const t0 = Date.now(); while (!T.grenadesInFlight.length && Date.now() - t0 < 3000) await wait(5);
    const g = T.grenadesInFlight[T.grenadesInFlight.length - 1]; if (!g) return 'none in flight';
    // the game can't be paused from here: leave a still copy of the thrown mesh where it is a moment after release
    await wait(60); const p = g.mesh.getWorldPosition(new T.THREE.Vector3()), still = g.mesh.clone(true);
    still.position.copy(p); still.quaternion.copy(g.mesh.getWorldQuaternion(new T.THREE.Quaternion())); still.scale.setScalar(1); T.scene.add(still);
    const names = []; g.mesh.traverse((o) => names.push(o.name || o.type)); const up = new T.THREE.Vector3(0, 1, 0).applyQuaternion(still.quaternion);
    T.setShotView({ x: p.x + 0.45, y: p.y + 0.3, z: p.z + 0.45, tx: p.x, ty: p.y, tz: p.z, fov: 30 }); await wait(1500); return names.length + ' parts @ ' + p.toArray().map((v) => v.toFixed(2)).join(',');`));
  await page.screenshot(path.join(out, 'grenade-thrown.png'));
  console.log('errors', JSON.stringify(await page.evaluate('(window.__errs || [])')));
} finally { await browser.close(); srv.close && srv.close(); }
