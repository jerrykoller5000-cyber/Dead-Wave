// GB-169: hand close-ups (unarmed: front/side/back), rifle + pistol grips, the CIF full body.
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'after', out = path.join(ROOT, 'handoffs/2026-10-14-grokbot-GB-169', tag); fs.mkdirSync(out, { recursive: true });
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
  const aim = (dx, dy, dz, fov = 30, side = 1) => `const me = T.localPlayer || T.player; let wr = null; me.traverse((o) => { if (!wr && o.name === 'wrist' && o.userData.hand && o.userData.hand.side === ${side}) wr = o; });
    const c = new (me.position.constructor)(); if (wr) wr.getWorldPosition(c); else c.set(me.position.x, me.position.y + 0.9, me.position.z); c.y -= 0.05;
    const d = new (me.position.constructor)(); me.getWorldDirection(d); d.y = 0; d.normalize(); const fx = d.x, fz = d.z, rx = d.z * ${side}, rz = -d.x * ${side};
    T.setShotView({ x: c.x + fx * ${dz} + rx * ${dx}, y: c.y + ${dy}, z: c.z + fz * ${dz} + rz * ${dx}, tx: c.x, ty: c.y, tz: c.z, fov: ${fov} }); await wait(700); return !!wr;`;
  const shoot = async (name, code) => { console.log(name, await step(code)); await page.screenshot(path.join(out, name + '.png')); };
  // Close-ups in the CIF preview (the world camera clips the body at this range): the preview framed on the hands,
  // the panel blown up to the window, turned with a drag on the figure.
  await step(`T.openCIF(); await wait(1500);
    const btn = (re) => [...document.querySelectorAll('#cif button, #cifTabs *, #cifItems *')].find((b) => re.test((b.textContent || '').trim()));
    btn(/^clothing$/i)?.click(); await wait(400); btn(/^gloves$/i)?.click(); await wait(1500);
    const el = document.getElementById('cifMarine'); Object.assign(el.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', zIndex: '99999' });
    window.dispatchEvent(new Event('resize')); await wait(1500); return 1;`);
  const turn = (px) => step(`const el = document.getElementById('cifMarine'), r = el.getBoundingClientRect(), y = r.top + r.height / 2, x0 = r.left + r.width / 2;
    const ev = (t, x) => el.dispatchEvent(new PointerEvent(t, { clientX: x, clientY: y, bubbles: true, pointerId: 1, isPrimary: true, buttons: t === 'pointerup' ? 0 : 1 }));
    ev('pointerdown', x0); for (let i = 1; i <= 10; i++) { ev('pointermove', x0 + ${px} * i / 10); await wait(30); } ev('pointerup', x0 + ${px}); await wait(1800); return 1;`);
  await page.screenshot(path.join(out, 'hands-front.png'));
  await turn(160); await page.screenshot(path.join(out, 'hands-side.png'));
  await turn(160); await page.screenshot(path.join(out, 'hands-back.png'));
  await step(`const el = document.getElementById('cifMarine'); el.removeAttribute('style'); window.dispatchEvent(new Event('resize')); document.querySelector('#cif button[class*=done], #cifDone')?.click(); return 1;`);
  await page.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape' }))`);
  await step(`for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'm4'; i++) T.setWeapon(i); await wait(1500); T.clearZombies && T.clearZombies(); return 1;`);
  await page.screenshot(path.join(out, 'hands-rifle-grip.png'));
  await step(`for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'pistol'; i++) T.setWeapon(i); await wait(1500); return 1;`);
  await page.screenshot(path.join(out, 'hands-pistol-grip.png'));
  await step(`T.openCIF(); await wait(2500); return 1;`);
  await page.screenshot(path.join(out, 'cif-pose-full.png'));
  console.log('errors', JSON.stringify(page.errors || []).slice(0, 400));
} finally { await browser.close(); await srv.close(); }
