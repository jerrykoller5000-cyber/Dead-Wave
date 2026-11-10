import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Run through crew.mjs slot run');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20078');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', '--window-size=1280,720'] });
const report = {at:new Date().toISOString(),errors:[]};
try {
  const page = await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`);
  if (!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"', {timeout:90000})) throw new Error('game did not load');
  await page.evaluate('DWOpening.dismissForTesting()');
  await page.waitFor('document.getElementById("opening").hidden', {timeout:30000});
  await page.evaluate(`(() => {document.getElementById('playerName').value='GP-20078 Confirm';document.getElementById('modeTraining').click();})()`);
  if (!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"', {timeout:90000})) throw new Error('Training did not start');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', {timeout:30000});
  await new Promise(r=>setTimeout(r,1800));
  report.console = await page.evaluate(`(() => {const T=TT,tg=T.trainingDbg.tg(),s=tg.stations.rangeConsole,f=s.front;T.player.position.set(f.x,tg.floorY,f.z);T.setShotView({x:f.x,y:tg.floorY+1.65,z:f.z,tx:s.x,ty:tg.floorY+1.4,tz:s.z,fov:65});return {action:T.trainingDbg.action(),mesh:!!tg.group.getObjectByName('training-range-console'),front:f};})()`);
  await new Promise(r=>setTimeout(r,700));
  await page.screenshot(path.join(out,'16-range-console-eye.png'));
  report.shotgun = await page.evaluate(`(() => {const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;T.setShotView(null);T.player.position.set(f.x,tg.floorY,f.z);T.doAction();const u=T.armoryDbg.ui(),p=document.getElementById('armoryPanel');for(const w of ['shotgun','chainsaw'])p.querySelector('[data-buy-gun="'+w+'"]')?.click();u.bench('shotgun');const row=id=>p.querySelector('[data-mod="'+id+'"]'),btn=id=>row(id)?.querySelector('button');const before={buck:row('load:buck')?.textContent,slug:row('load:slug')?.textContent};btn('load:buck')?.click();const buck=T.shotLoadDbg.fitted();btn('load:slug')?.click();return {ownedShotgun:u.armory.has('shotgun'),ownedSaw:u.armory.has('chainsaw'),before,buck,slug:T.shotLoadDbg.fitted(),after:{buck:row('load:buck')?.textContent,slug:row('load:slug')?.textContent}};})()`);
  await page.evaluate(`document.querySelector('#armoryPanel [data-mod="load:slug"]')?.scrollIntoView({block:'center'})`);
  await page.screenshot(path.join(out,'17-shotgun-loads-fitted.png'));
  report.saw = await page.evaluate(`(() => {const T=TT,tg=T.trainingDbg.tg(),p=T.player.position;p.set(tg.origin.x-14,tg.floorY,tg.origin.z-8);T.closeMenuDbg('armory');const carried=T.takeOutGun('chainsaw');T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));T.setViewFirstDbg(false);return {carried,weapon:T.getCurrentWeapon(),saw:!!T.sawDbg};})()`);
  await new Promise(r=>setTimeout(r,900));
  report.sawSetup = await page.evaluate(`(() => {const T=TT,p=T.player.position,b=T.sawDbg.blade(),x=(b.ax+b.bx)/2,z=(b.az+b.bz)/2,zom=T.spawnZombie(x,z,'shambler',true,true);zom.riseT=0;zom.speed=zom.baseSpeed=0;zom.hp=zom.maxHp=1000;zom.mesh.position.set(x,p.y,z);window.GP20078SawZombie=zom;T.setShotView({x:p.x-2.4,y:p.y+2.6,z:p.z-3.4,tx:p.x,ty:p.y+1.25,tz:p.z+0.6,fov:48});return {blade:b,placed:{x,z},before:zom.hp};})()`);
  await new Promise(r=>setTimeout(r,250));
  await page.screenshot(path.join(out,'18-chainsaw-before.png'));
  report.sawCut = await page.evaluate(`(() => {const T=TT,zom=window.GP20078SawZombie,b=T.sawDbg.blade(),x=(b.ax+b.bx)/2,z=(b.az+b.bz)/2;zom.hp=1000;zom.riseT=0;zom.speed=zom.baseSpeed=0;zom.mesh.position.set(x,T.player.position.y,z);const before=zom.hp;T.sawDbg.tick();return {before,after:zom.hp,damage:before-zom.hp};})()`);
  await new Promise(r=>setTimeout(r,500));
  await page.screenshot(path.join(out,'18-chainsaw-chain-cut.png'));
  report.errors=page.errors.slice();
  fs.writeFileSync(path.join(out,'final-confirm.json'),JSON.stringify(report,null,2));
  console.log('FINAL CONFIRM',JSON.stringify({console:report.console.action,shotgun:report.shotgun,saw:report.saw,sawDamage:report.sawCut.damage,errors:report.errors.length}));
} catch(e) {report.errors.push(String(e?.stack||e));fs.writeFileSync(path.join(out,'final-confirm.json'),JSON.stringify(report,null,2));console.error('FINAL CONFIRM ERROR',String(e?.stack||e));process.exitCode=1;}
finally {await browser.close();await server.close();}
