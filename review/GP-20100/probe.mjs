import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20100');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', { timeout: 90000 })) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 });
  await page.evaluate(`(() => { document.getElementById('playerName').value='GP-20100'; document.getElementById('modeTraining').click(); })()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', { timeout: 90000 })) throw new Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 1500));
  const data = await page.evaluate(`(() => {
    const T=TT,tg=T.trainingDbg.tg(),p=T.player.position;
    const stations=Object.fromEntries(Object.entries(tg.stations).filter(([k,v])=>v&&v.front).map(([k,v])=>[k,{front:v.front,at:v.at||v.pos||null}]));
    const near=tg.solids.filter(s=>Math.abs((s.minX+s.maxX)/2-p.x)<8&&Math.abs((s.minZ+s.maxZ)/2-p.z)<8&&s.target==null&&!s.floor).slice(0,50);
    const u=T.getMarine().userData;
    return {player:[p.x,p.y,p.z],rotation:T.player.rotation.y,stations,near,weapon:T.getCurrentWeapon(),view:T.fpDbg(),mountVisible:u.weaponMount.visible,
      shoulderR:u.armRG.getWorldPosition(u.armRG.position.clone()).toArray(),shoulderL:u.armLG.getWorldPosition(u.armLG.position.clone()).toArray(),
      scene:!!T.scene,three:!!T.THREE};
  })()`);
  fs.writeFileSync(path.join(out,'probe.json'),JSON.stringify(data,null,2));
  console.log(JSON.stringify({player:data.player,rotation:data.rotation,weapon:data.weapon,stations:data.stations,nearCount:data.near.length,scene:data.scene,three:data.three}));
  await page.screenshot(path.join(out,'probe.png'));
  await page.evaluate(`(() => {
    const T=TT,p=T.player.position;
    T.grantAllWeapons();T.setUnarmedDbg(false);T.setViewFirstDbg(false);
    p.set(0,T.trainingDbg.tg().floorY,-639.95);
    T.setShotView({x:p.x+2.4,y:p.y+1.75,z:p.z-1.65,tx:p.x,ty:p.y+1.15,tz:p.z+0.4,fov:40});
  })()`);
  const samples=[];
  for (const weapon of ['pistol','m4','launcher','minigun','chainsaw']) {
    const selected=await page.evaluate(`((w)=>{ const T=TT;T.setWeapon(T.WEAPON_ORDER.indexOf(w));return T.getCurrentWeapon();})(${JSON.stringify(weapon)})`);
    await new Promise(r=>setTimeout(r,1100));
    const sample=await page.evaluate(`(() => {
      const T=TT,m=T.getMarine(),g=T.weaponMeshes[T.getCurrentWeapon()],p=T.player.position;
      m.updateMatrixWorld(true);g.updateMatrixWorld(true);
      const box=new T.THREE.Box3().setFromObject(g);
      const sr=m.userData.armRG.getWorldPosition(new T.THREE.Vector3()),sl=m.userData.armLG.getWorldPosition(new T.THREE.Vector3());
      return {weapon:T.getCurrentWeapon(),player:[p.x,p.y,p.z],gunBox:{min:box.min.toArray(),max:box.max.toArray()},shoulderR:sr.toArray(),shoulderL:sl.toArray(),muzzle:T.getMuzzleWorld().toArray()};
    })()`);
    samples.push({selected,...sample});
    await page.screenshot(path.join(out,`before-${weapon}.png`));
  }
  fs.writeFileSync(path.join(out,'before.json'),JSON.stringify(samples,null,2));
  console.log(JSON.stringify(samples));
  await page.evaluate(`(() => {
    const T=TT,p=T.player.position;
    T.setShotView(null);T.rotateCamera(Math.PI/2);
    p.set(7,T.trainingDbg.tg().floorY,-643);
  })()`);
  await new Promise(r=>setTimeout(r,1500));
  await page.evaluate(`(() => {const T=TT,p=T.player.position;T.setShotView({x:p.x-1.8,y:p.y+1.9,z:p.z-2.1,tx:p.x+0.55,ty:p.y+1.15,tz:p.z,fov:40});})()`);
  const wallSamples=[];
  for (const weapon of ['pistol','m4','launcher','minigun','chainsaw']) {
    await page.evaluate(`((w)=>{const T=TT;T.setWeapon(T.WEAPON_ORDER.indexOf(w));})(${JSON.stringify(weapon)})`);
    await new Promise(r=>setTimeout(r,1100));
    const sample=await page.evaluate(`(() => {const T=TT,p=T.player.position;return {weapon:T.getCurrentWeapon(),player:[p.x,p.y,p.z],yaw:T.player.rotation.y,muzzle:T.getMuzzleWorld().toArray()};})()`);
    wallSamples.push(sample);
    await page.screenshot(path.join(out,`wall-before-${weapon}.png`));
  }
  fs.writeFileSync(path.join(out,'wall-before.json'),JSON.stringify(wallSamples,null,2));
  console.log(JSON.stringify(wallSamples));
} finally { await browser.close(); await server.close(); }
