// GB-170: the CIF relaxed hang, full body front / 3/4 / side (close-ups are crops of these).
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'after', out = path.join(ROOT, 'handoffs/2026-10-14-grokbot-GB-170', tag); fs.mkdirSync(out, { recursive: true });
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
  await step(`await startMatch(T, 'Hands'); T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode'); T.grantAllWeapons && T.grantAllWeapons(); return 1;`);
   await step(`T.openCIF(); await wait(1500);
    const el = document.getElementById('cifMarine'); Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '99999' });
    window.dispatchEvent(new Event('resize')); await wait(2000); return 1;`);
  const turn = (px) => step(`const el = document.getElementById('cifMarine'), r = el.getBoundingClientRect(), y = r.top + r.height / 2, x0 = r.left + r.width / 2;
    const ev = (t, x) => el.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', x0); for (let i = 1; i <= 10; i++) { ev('pointermove', x0 + ${px} * i / 10); await wait(30); } ev('pointerup', x0 + ${px}); await wait(1800); return T.cifDressDbg().yaw;`);
  await page.screenshot(path.join(out, 'relax-front.png'));
  console.log('yaw', await turn(48)); await page.screenshot(path.join(out, 'relax-34.png'));
  console.log('yaw', await turn(48)); await page.screenshot(path.join(out, 'relax-side.png'));
 console.log('errors', JSON.stringify(page.errors || []).slice(0, 400));
} finally { await browser.close(); await srv.close(); }
