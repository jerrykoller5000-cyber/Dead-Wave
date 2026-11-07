// shots.mjs: GB-298 Marine Inspector / FP laser hip+ADS still frames per gun that takes a laser.
//   node qa/2026-11-07-GB-298/shots.mjs   (inside game-test slot)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'qa/2026-11-07-GB-298');
const srv = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const page = await browser.newPage({ width: 1280, height: 720 });
try { const { windowId } = await page.send('Browser.getWindowForTarget', {}); await page.conn.send('Browser.setWindowBounds', { windowId, bounds: { left: -4000, top: -4000 } }); } catch { }
await page.goto(`${srv.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
await page.waitFor('!!window.TT', { timeout: 400000 });
await page.evaluate(`(() => { if (window.DWOpening && DWOpening.dismissForTesting) DWOpening.dismissForTesting(); })()`);
await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
const step = (code, ms = 240000) => page.evaluate(`(async () => { const T = window.TT; const wait = (ms) => new Promise((r) => setTimeout(r, ms)); ${code} })()`, ms);
await step(`const n = document.getElementById('playerName'); if (n) n.value = 'Shot'; document.getElementById('modeHunt').click();
  for (let i = 0; i < 100 && !(T.getPhase && T.getPhase() === 'prep'); i++) await wait(200);
  for (let i = 0; i < 600 && document.body.classList.contains('deploying'); i++) await wait(100);
  await wait(1200); T.runDevCommand('godmode'); T.runDevCommand('bigtex shooter'); T.clearZombies && T.clearZombies();
  T.grantAllWeapons && T.grantAllWeapons(); T.setGearDbg('laser'); T.setLasersDbg(true); T.setViewFirstDbg(true); await wait(600);
  return 'ok';`, 180000);
const guns = JSON.parse(await step(`return JSON.stringify(T.WEAPON_ORDER.filter((w) => T.weaponMeshes[w] && T.weaponMeshes[w].userData.laser))`));
console.log('guns', guns.join(','));
for (const gun of guns) {
  await step(`
    const W='${gun}'; T.setViewFirstDbg(true); T.setWeapon(T.WEAPON_ORDER.indexOf(W)); await wait(1000);
    T.setLasersDbg(true); T.flightHold(true); const dt=1/60;
    const cv=T.renderer.domElement, r=cv.getBoundingClientRect();
    const put=(px,py)=>{ cv.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width/2+px,clientY:r.top+r.height/2+py,bubbles:true,pointerType:'mouse'})); };
    for (let i=0;i<45;i++){ T.flightInput({keys:[],zoom:false}); put(30,-70); T.stepFrame(dt); }
    return W;
  `, 90000);
  await page.screenshot(path.join(OUT, `fp-${gun}-hip.png`));
  await step(`
    const dt=1/60; const cv=T.renderer.domElement, r=cv.getBoundingClientRect();
    const put=(px,py)=>{ cv.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width/2+px,clientY:r.top+r.height/2+py,bubbles:true,pointerType:'mouse'})); };
    for (let i=0;i<40;i++){ T.flightInput({keys:[],zoom:true}); put(30,-70); T.stepFrame(dt); }
    return 'ads';
  `, 60000);
  await page.screenshot(path.join(OUT, `fp-${gun}-ads.png`));
  // one mid-fire hip frame
  await step(`
    const dt=1/60; T.setMouseFireDbg(true);
    const cv=T.renderer.domElement, r=cv.getBoundingClientRect();
    const put=(px,py)=>{ cv.dispatchEvent(new PointerEvent('pointermove',{clientX:r.left+r.width/2+px,clientY:r.top+r.height/2+py,bubbles:true,pointerType:'mouse'})); };
    for (let i=0;i<8;i++){ T.flightInput({keys:[],zoom:false}); put(30,-70); T.stepFrame(dt); }
    T.setMouseFireDbg(false); T.flightHold(false);
    return 'fire';
  `, 60000);
  await page.screenshot(path.join(OUT, `fp-${gun}-fire.png`));
  console.log('shot', gun);
}
await browser.close(); srv.close && srv.close();
console.log('shots done ->', OUT);