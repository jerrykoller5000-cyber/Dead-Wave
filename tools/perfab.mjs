// tools/perfab.mjs — CL-116: A/B the frame in the Training Ground: as built, without the dark point lights, without the
// dark box, without shadows.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './cdp.mjs';
const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const srv = await serve(ROOT);
const browser = await launch({ headless: true });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${srv.origin}/index.html?debug=1`, { timeout: 240000 });
  await page.waitFor('!!window.TT', { timeout: 240000 });
  await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  const run = (code, ms = 900000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
  const fps = (label) => run(`await wait(45000); let f = 0, on = true; const tick = () => { f++; if (on) requestAnimationFrame(tick); }; requestAnimationFrame(tick); const t0 = performance.now(); await wait(15000); on = false; return '${label}: ' + (f / (performance.now() - t0) * 1000).toFixed(2) + ' fps';`);
  await run(`document.getElementById('playerName').value = 'Probe'; document.getElementById('modeTraining').click(); const t0 = Date.now(); while (!T.trainingDbg.state().active && Date.now() - t0 < 60000) await wait(200); return true;`);
  console.log(await fps('A as built'));
  await run(`T.scene.traverse((o) => { if (o.isPointLight || o.isSpotLight) { if (o.intensity === 0) o.visible = false; } }); return true;`);
  console.log(await fps('B dark point lights out'));
  await run(`const g = T.trainingDbg.tg().group; for (const n of ['training-void']) { const o = g.getObjectByName(n); if (o) o.visible = false; } return true;`);
  console.log(await fps('C and the dark box out'));
  await run(`T.sun.castShadow = false; return true;`);
  console.log(await fps('D and no sun shadow'));
  await run(`T.trainingDbg.tg().group.visible = false; return true;`);
  console.log(await fps('E and the whole training ground hidden'));
} finally { await browser.close(); await srv.close(); }
process.exit(0);   // the server keeps the process alive otherwise
