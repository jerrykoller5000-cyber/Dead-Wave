import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20098');
const server = await serve(root, 0), browser = await launch({headless: false, args: ['--window-size=1280,720']});
let page;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  page = await browser.newPage({width:1280, height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', {timeout:90000}));
  await page.evaluate(`(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='GP-20098';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', {timeout:30000}));
  assert(await page.waitFor('document.getElementById("opening").hidden', {timeout:60000}));
  await pause(1800);
  const station = await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.stations.cif;T.player.position.set(s.front.x,tg.floorY,s.front.z);T.setShotView({x:s.front.x,y:tg.floorY+1.65,z:s.front.z,tx:s.x??s.front.x,ty:tg.floorY+1.45,tz:(s.z??s.front.z)+1,fov:60});return T.trainingDbg.action()})()`);
  assert.equal(station, 'cif');
  await page.evaluate('TT.doAction()');
  await pause(150);
  const hint = await page.evaluate('document.getElementById("cifHint").textContent');
  assert.match(hint, /Try every camo/);
  assert.doesNotMatch(hint, /Four camos issued/);
  await page.screenshot(path.join(out, 'after-cif.png'));
  await page.setViewport(390, 844);
  await pause(250);
  await page.screenshot(path.join(out, 'after-cif-390.png'));
  await page.setViewport(1280, 720);
  await page.evaluate('TT.closeCIF();TT.grantAllWeapons();TT.setUnarmedDbg(false);TT.setShotView(null)');
  const hud = {};
  for (const [weapon, unit] of [['flamer','fuel'], ['launcher','grenades'], ['pistol','Bullets']]) {
    await page.evaluate(`TT.setWeapon(TT.WEAPON_ORDER.indexOf(${JSON.stringify(weapon)}))`);
    await pause(350);
    hud[weapon] = await page.evaluate('document.getElementById("ammoDetail").textContent');
    assert.match(hud[weapon], new RegExp('\\b' + unit + '\\b'));
    await page.screenshot(path.join(out, `after-${weapon}-hud.png`));
  }
  await page.setViewport(390, 844);
  await page.evaluate('TT.setViewFirstDbg(true);TT.setWorldTime(.86);TT.setWeapon(TT.WEAPON_ORDER.indexOf("flamer"))');
  await pause(450);
  assert.match(await page.evaluate('document.getElementById("ammoDetail").textContent'), /\bfuel\b/);
  await page.screenshot(path.join(out, 'after-flamer-hud-390-1p-night.png'));
  fs.writeFileSync(path.join(out, 'verify.json'), JSON.stringify({hint, hud}, null, 2));
  console.log('PASS Training CIF:', hint);
  for (const [weapon, copy] of Object.entries(hud)) console.log(`PASS ${weapon} HUD: ${copy}`);
} finally {
  if (page) await page.close();
  await browser.close();
  await server.close();
}
