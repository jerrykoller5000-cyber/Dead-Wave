// GB-167: the thumb mid-flick on the M4 and the AK, close on the firing hand.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const out = path.join(ROOT, 'handoffs/2026-10-13-grokbot-GB-167'); fs.mkdirSync(out, { recursive: true });
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
  await step(`await startMatch(T, 'Selector'); T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode'); T.grantAllWeapons(); return 1;`);
  for (const w of ['m4', 'ak']) {
    for (const [tag, at] of [['rest', -1], ['mid', 0.45]]) {
      const r = await step(`for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) T.setWeapon(i); await wait(900); T.clearZombies && T.clearZombies();
        const p = (T.localPlayer || T.player).position, F = T.selectorFlick; let hand = null;
        T.scene.traverse((o) => { if (!hand && o.userData && o.userData.hand && o.userData.hand.side === 1) hand = o; });
        const c = new (p.constructor)(); if (hand) hand.getWorldPosition(c); else c.set(p.x, p.y + 1.2, p.z);
        const yaw = (T.localPlayer || T.player).rotation ? (T.localPlayer || T.player).rotation.y : 0;
        T.setShotView({ x: c.x + Math.cos(yaw) * 0.55, y: c.y + 0.25, z: c.z - Math.sin(yaw) * 0.55, tx: c.x, ty: c.y, tz: c.z, fov: 40 });
        F.state.hold = null; ${at < 0 ? 'F.cancel();' : `T.toggleFireMode(); F.state.hold = ${at};`}
        await wait(60); return JSON.stringify({ hand: !!hand, phase: F.phase('${w}') });`);
      console.log(w, tag, r);
      await page.screenshot(path.join(out, `selector-${w}-${tag}.png`));
      await step(`T.selectorFlick.state.hold = null; T.selectorFlick.cancel(); return 1;`);
    }
  }
  console.log('errors', JSON.stringify(page.errors || []).slice(0, 400));
} finally { await browser.close(); await srv.close(); }
