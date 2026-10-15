// GB-159: before/after views of the Training Ground's wear. node handoffs/2026-10-12-grokbot-GB-159/shots.mjs <before|after>
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const { serve } = await import(new URL('../../tools/serve.mjs', import.meta.url));
const { launch } = await import(new URL('../../tools/cdp.mjs', import.meta.url));
const tag = process.argv[2] || 'after';
const out = path.join(ROOT, 'handoffs/2026-10-12-grokbot-GB-159', tag); fs.mkdirSync(out, { recursive: true });
const VIEWS = [
  ['1-downrange', [0, 1.7, -3], [0, 1.6, 28], 55],
  ['2-backwall-kit', [0.5, 1.7, -5.5], [-0.8, 1.3, -12], 70],
  ['3-floor-top', [0, 11, -3.5], [0, 0, -3], 70],
  ['4-wall-vents-signs', [-3, 2.2, 6], [8, 3.5, 12], 65],
  ['5-infirmary', [-35.2, 2.3, -5.2], [-38.6, 0.5, -9.6], 60],
  ['6-backstop', [0, 2, 18], [0, 2.8, 30], 60],
  ['8-jerry-view', [-1, 9, -9], [0, 0, 4], 60],
  ['9-line-close', [0, 3.2, -3.5], [0, 0, -0.4], 55],
  ['walls-backstop-close', [-3, 2.4, 22.5], [-2.2, 2.4, 30], 60],
  ['walls-mid-from-line', [0, 1.7, -0.6], [0, 2.6, 30], 40],
  ['walls-side-near-line', [-2, 1.8, -2], [-8, 2.2, 4], 60],
  ['fix-danger-sign', [-6.4, 2.2, 11], [-8, 2.2, 11], 35],
  ['fix-locker-door', [-3.9, 1.9, -8.6], [-5.8, 1.0, -11.4], 55, 'D.tg().wear?.kickDoor?.(3.2); await wait(380);'],
  ['fix-pic3-fade', [0.5, 9.5, -20], [0, 0, -7], 60],
  ['build-top', [-26, 46, 8.2], [-26, 0, 8], 55, '', [-20, 4]],
  ['build-gameplay', [-20, 9.5, -5], [-20, 0, 5.5], 60, '', [-20, 3]],
  ['build-close-gate', [-24, 3.2, 16.5], [-26, 0, 22.5], 55, '', [-20, 10]],
  ['build-close-corner', [-39.5, 2.6, 21], [-44, 2.5, 28], 60, '', [-36, 18]],
  ['r3-locker-spark', [-3.9, 1.9, -8.6], [-5.8, 1.0, -11.4], 55, 'const O2 = D.tg().origin; for (let k = 0; k < 4; k++) D.round?.({ prev: { x: O2.x - 6.6 + k * 0.55, y: O2.y + 1.1 + k * 0.12, z: O2.z - 8 }, pos: { x: O2.x - 6.6 + k * 0.55, y: O2.y + 1.1 + k * 0.12, z: O2.z - 12.5 } }); await wait(25);'],
  ['r3-locker-after-hits', [-3.9, 1.9, -8.6], [-5.8, 1.0, -11.4], 55, 'await wait(900);'],
  ['r3-build-gameplay', [-20, 9.5, -5], [-20, 0, 5.5], 60, '', [-20, 3]],
  ['p4-range-high', [-1, 9, -9], [0, 0, 4], 60, ''],
  ['p4-backstop', [-3, 2.4, 22.5], [-2.2, 2.4, 30], 60, ''],
  ['p4-build', [-20, 9.5, -5], [-20, 0, 5.5], 60, '', [-20, 3]],
  ['7-flicker-dead', [0, 3, 6], [6, 5.6, 16], 70]
];
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 800 });
  await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 180000 });
  await page.waitFor('!!window.TT', { timeout: 300000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 120000 });
  const step = (code, ms = 180000) => page.evaluate(`(async () => { const T = window.TT; const D = T.trainingDbg; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const ok = await step(`document.getElementById('playerName').value = 'Trainee'; document.getElementById('modeTraining').click();
    const t0 = Date.now(); while ((!D.state().active || document.getElementById('trainingBlackout')?.classList.contains('on')) && Date.now() - t0 < 60000) await wait(200);
    await wait(3000);
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight)[0];
    const keep = new Set(); for (let el = c; el && el !== document.body; el = el.parentElement) keep.add(el);
    for (const ch of document.body.children) if (!keep.has(ch)) ch.style.setProperty('display', 'none', 'important');
    return D.state().active;`, 120000);
  if (!ok) throw new Error('Training Ground never opened');
  for (const [n, c, t, fov, pre, at] of VIEWS.filter((v) => !process.env.ONLY || v[0].startsWith(process.env.ONLY))) {
    await step(`const O = D.tg().origin; const p = T.localPlayer ? T.localPlayer.position : T.player.position; p.set(O.x + ${at ? at[0] : 7}, O.y, O.z + ${at ? at[1] : -11});
      T.setShotView({ x: O.x + ${c[0]}, y: O.y + ${c[1]}, z: O.z + ${c[2]}, tx: O.x + ${t[0]}, ty: O.y + ${t[1]}, tz: O.z + ${t[2]}, fov: ${fov} });
      await wait(1200); ${pre || ''} return true;`);
    await page.screenshot(path.join(out, n + '.png')); console.log('shot', n);
  }
  const info = await step(`const w = D.tg().wear; return w ? w.parts.length : 'none';`);
  console.log('wear parts:', info, 'page errors:', (page.errors || []).length, (page.errors || []).slice(0, 3).join(' | '));
} finally { await browser.close(); await srv.close(); }
