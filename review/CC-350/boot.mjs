// CC-350 (claude3): shared boot for the probes and captures: load, dismiss the opening, enter the Training Ground, third person.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
export const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
export const LT = { noon: 0.42, overcast: 0.5, dusk: 0.74, night: 0.02 };
export async function boot(name = 'CC-350') {
  const server = await serve(root, 0);
  const browser = await launch({ headless: true, args: ['--window-size=1280,720'] });
  const page = await browser.newPage({ width: 1280, height: 720 });
  const close = async () => { try { await browser.close(); } catch {} try { server.close && server.close(); } catch {} setTimeout(() => process.exit(0), 1500); };
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 600000 });
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 900000 })) throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if (!await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 600000 })) throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value=${JSON.stringify(name)};document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 900000 })) throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 120000 });
  await page.evaluate(`(()=>{ const T=TT; T.setViewFirstDbg(false); const p=T.player.position; window.__home={x:p.x,y:p.y,z:p.z,yaw:T.player.rotation.y}; })()`);
  return { page, browser, server, close };
}
