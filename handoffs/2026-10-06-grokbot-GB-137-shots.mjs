// GB-137 before/after HUD shots: node handoffs/2026-10-06-grokbot-GB-137-shots.mjs before|after
// Uses only hooks that exist before and after the change (setSpareMags, setAmmoDbg, startReload), so the same script
// shoots both. A: the revolver reloaded with 4 live rounds left. B: the AK reloaded when every carried magazine is emptier.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
import { launch } from '../tools/cdp.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const label = process.argv[2] || 'after';
const OUT = path.join(ROOT, 'handoffs', '2026-10-06-grokbot-GB-137-shots');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => `new Promise(r => setTimeout(r, ${ms}))`;

const server = await serve(ROOT, 0);
const browser = await launch({ headless: true });
const page = await browser.newPage({ width: 1280, height: 720 });
const log = [];
try {
  await page.goto(`${server.origin}/index.html?debug=1&renderer=webgl`);
  await page.waitFor('!!window.TT', { timeout: 90000 });
  const skip = `(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); const b = document.getElementById('openingSkip'); if (b) b.click(); return true; })()`;
  await page.evaluate(skip); await page.evaluate(sleep(300)); await page.evaluate(skip);
  await page.evaluate(`(() => { const n = document.getElementById('playerName'); if (n) n.value = 'Shots'; const p = document.getElementById('modeHunt'); if (p) p.click(); })()`);
  await page.waitFor(`TT.getPhase() === 'prep'`, { timeout: 90000 });
  await page.waitFor(`!document.body.classList.contains('deploying')`, { timeout: 90000 });
  await page.evaluate(sleep(800));
  await page.evaluate(`(() => { TT.clearZombies(); TT.runDevCommand('godmode'); TT.grantAllWeapons(); return true; })()`);
  const toGun = async (w) => { await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf('${w}'))`); await page.evaluate(sleep(900)); };
  const hud = async () => page.evaluate(`JSON.stringify({ w: TT.getCurrentWeapon(), detail: document.getElementById('ammoDetail').textContent, mags: [...document.querySelectorAll('#ammoMags .mag-glyph')].map(g => +g.dataset.rounds) })`);
  const reloadDone = async () => { await page.evaluate(sleep(150)); await page.waitFor('!TT.isReloading()', { timeout: 15000 }); await page.evaluate(sleep(300)); };

  // A: revolver, two full loaders, 4 live rounds in the cylinder, R.
  await toGun('revolver');
  await page.evaluate(`(() => { TT.setSpareMags('revolver', 2); TT.setAmmoDbg('revolver', 4); return true; })()`);
  log.push('A before R ' + await hud());
  await page.evaluate('TT.startReload()'); await reloadDone();
  log.push('A after R  ' + await hud());
  await page.screenshot(path.join(OUT, `${label}-A-revolver-reload.png`));

  // B: AK. Make a 20-round spare (20 in the gun, one full spare, R), then 25 in the gun and R again.
  await toGun('ak');
  await page.evaluate(`(() => { TT.setSpareMags('ak', 1); TT.setAmmoDbg('ak', 20); TT.startReload(); return true; })()`); await reloadDone();
  await page.evaluate(`TT.setAmmoDbg('ak', 25)`);
  log.push('B before R ' + await hud());
  await page.evaluate('TT.startReload()');
  await page.evaluate(sleep(250));
  await page.screenshot(path.join(OUT, `${label}-B-ak-no-fuller.png`));
  const busy = await page.evaluate('TT.isReloading()');
  if (busy) await reloadDone();
  log.push('B after R  (reload started: ' + busy + ') ' + await hud());
} catch (e) { log.push('ERROR ' + (e && e.stack || e)); }
finally { await browser.close(); await server.close(); }
fs.writeFileSync(path.join(OUT, `${label}.txt`), log.join('\n') + '\n');
console.log(log.join('\n'));
