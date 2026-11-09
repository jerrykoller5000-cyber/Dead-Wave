// GP-20066: first-person attachment origin and four-light gameplay views.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('use the shared game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20066', 'fp');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`, { timeout: 240000 });
  if (!await page.waitFor('!!window.TT', { timeout: 400000 })) throw new Error('TT did not boot');
  await page.evaluate('window.DWOpening?.dismissForTesting?.()');
  await page.evaluate(fs.readFileSync(path.join(root, 'tools/tests/lib.js'), 'utf8'));
  const setup = await page.evaluate(`(async () => {
    const T=window.TT,wait=ms=>new Promise(r=>setTimeout(r,ms));
    const until=async(fn,ms)=>{const end=Date.now()+ms;while(Date.now()<end){if(fn())return true;await wait(60)}return false};
    await startMatch(T,'GP20066FP');T.clearZombies?.();T.setHp(100000);T.grantAllWeapons();
    if(T.isUnarmed())T.toggleHolster();T.setViewFirstDbg(true);
    T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));T.setLasersDbg(true);
    if(!await until(()=>T.getCurrentWeapon()==='pistol'&&T.fpDbg().w>.99&&T.viewmodelDbg()?.info.active&&T.viewmodelDbg().info.key==='pistol'&&T.viewmodelDbg().info.raise>.99,20000))throw new Error('pistol FP did not settle: '+JSON.stringify({fp:T.fpDbg(),vm:T.viewmodelDbg()?.info,mode:T.getGameMode()}));
    const gun=T.weaponMeshes.pistol,laser=gun.userData.laserLensLocal.clone(),white=gun.userData.lightLensLocal.clone(),v=T.viewmodelDbg();
    const projected=v.pointWorld(laser,new T.THREE.Vector3()),aim=T.laserAimDbg();
    if(!aim||projected.distanceTo(new T.THREE.Vector3(aim.ox,aim.oy,aim.oz))>.05)throw new Error('FP laser misses unit lens');
    document.body.dispatchEvent(new KeyboardEvent('keydown',{code:'Digit2',bubbles:true}));
    document.body.dispatchEvent(new KeyboardEvent('keyup',{code:'Digit2',bubbles:true}));await wait(400);
    const light=T.scene.children.find(o=>o.isSpotLight&&o.color.getHex()===0xfff2d0);
    const projectedWhite=v.pointWorld(white,new T.THREE.Vector3());
    if(!light||light.intensity<=0||light.position.distanceTo(projectedWhite)>.05)throw new Error('FP white beam misses its separate lens');
    return {backend:T.getRendererBackend(),fp:T.fpDbg().w,laserError:projected.distanceTo(new T.THREE.Vector3(aim.ox,aim.oy,aim.oz)),whiteError:light.position.distanceTo(projectedWhite)};
  })()`);
  for (const light of [
    {name:'noon',time:.40,rain:false},
    {name:'overcast',time:.40,rain:true},
    {name:'dusk',time:.68,rain:false},
    {name:'night',time:0,rain:false}
  ]) {
    await page.evaluate(`(async()=>{const T=window.TT,v=${JSON.stringify(light)};T.weather.raining=v.rain;T.weather.rainTimeLeft=v.rain?100:0;T.weather.intensity=v.rain?1:0;T.setWorldTime(v.time);await new Promise(r=>setTimeout(r,800))})()`);
    const shot=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,`${light.name}-pistol.png`),Buffer.from(shot.data,'base64'));
  }
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({setup,errors:page.errors},null,2)+'\n');
  console.log(JSON.stringify({setup,captures:4,errors:page.errors}));
  if(page.errors.length)throw new Error(page.errors[0]);
} finally { await browser.close(); await server.close(); }
