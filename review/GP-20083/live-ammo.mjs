import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20083');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const proof={};
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
  await page.evaluate('document.getElementById("perf").style.display="none"');
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20083 Live';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
  proof.initial=await page.evaluate(`(()=>{TT.grantWeaponDbg('shotgun');TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));return {shotgun:TT.ammoTypeState('shotgun'),m4:TT.ammoTypeState('m4'),pistol:TT.ammoTypeState('pistol')}})()`);
  assert(proof.initial.shotgun?.order.join(',')==='birdshot,buckshot,slug');
  assert.equal(proof.initial.m4,null);assert.equal(proof.initial.pistol,null);
  await page.evaluate(`(()=>{TT.openMenuDbg('armory');TT.armoryDbg.ui().bench('shotgun')})()`);
  assert(await page.waitFor('document.querySelectorAll(".armory-typed-list li").length===3'));
  for(const width of [1280,390]){
    await page.setViewport(width,width===390?844:720);
    await page.evaluate('document.querySelector(".armory-typed").scrollIntoView({block:"center"})');
    await page.screenshot(path.join(out,`live-armory-before-${width}.png`));
    const size=await page.evaluate('({scroll:document.documentElement.scrollWidth,width:innerWidth})');
    assert(size.scroll<=size.width,`${width} Armory horizontal overflow`);
  }
  proof.armoryBefore=await page.evaluate(`(()=>({rows:[...document.querySelectorAll('.armory-typed-list li')].map(li=>({type:li.dataset.ammoType,text:li.innerText,disabled:li.querySelector('button').disabled}))}))()`);
  assert(!proof.armoryBefore.rows.find(v=>v.type==='buckshot').disabled);
  await page.evaluate('document.querySelector("[data-buy-ammo-type=buckshot]").click()');
  proof.purchased=await page.evaluate('TT.ammoTypeState("shotgun")');
  assert(proof.purchased.carried.buckshot>proof.initial.shotgun.carried.buckshot);
  for(const width of [1280,390]){
    await page.setViewport(width,width===390?844:720);
    await page.evaluate('document.querySelector(".armory-typed").scrollIntoView({block:"center"})');
    await page.screenshot(path.join(out,`live-armory-after-${width}.png`));
    const panel=await page.evaluate(`(()=>({cif:getComputedStyle(document.querySelector('#cif > .card')).display,armory:getComputedStyle(document.getElementById('armoryPanel')).display}))()`);
    proof[`panel${width}`]=panel;
    assert.equal(panel.cif,'none',`${width} CIF card hidden while Armory open`);
    assert.notEqual(panel.armory,'none',`${width} Armory remains visible`);
  }
  await page.evaluate('TT.armoryDbg.ui().close()');
  assert(await page.waitFor('!document.getElementById("cif").classList.contains("show")'), 'Done closes Armory station');
  proof.equip=await page.evaluate(`(()=>{TT.flightHold(true);window.__gp83='held';const issued=TT.grantWeaponDbg('shotgun'),before=TT.getCurrentWeapon(),owned=TT.getWeaponOwned().shotgun,inReach=TT.armoryDbg.inReach();TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));TT.setUnarmedDbg(false);const after=TT.getCurrentWeapon();const tg=TT.trainingDbg.tg(),s=tg.stations.rangeConsole;TT.player.position.set(s.front.x+1.4,tg.floorY,s.front.z);TT.setShotView({x:TT.player.position.x,y:tg.floorY+1.65,z:TT.player.position.z,tx:s.x,ty:tg.floorY+1.4,tz:s.z,fov:65});TT.stepFrame(.016);return {issued,before,after,owned,inReach,step:TT.getCurrentWeapon(),flight:TT.flightDbg(),origin:performance.timeOrigin}})()`);
  proof.hudBefore=await page.evaluate(`(()=>({marker:window.__gp83,origin:performance.timeOrigin,flight:TT.flightDbg(),reach:TT.armoryDbg.inReach(),weapon:TT.getCurrentWeapon(),name:document.getElementById('ammoWeapon')?.textContent,detail:document.getElementById('ammoDetail')?.textContent,state:TT.ammoTypeState('shotgun')}))()`);
  assert.equal(proof.hudBefore.weapon,'shotgun');
  for(const width of [1280,390]){await page.setViewport(width,width===390?844:720);await page.evaluate('TT.stepFrame(.05)');await page.screenshot(path.join(out,`live-hud-before-${width}.png`));}
  const count=await page.evaluate('TT.ammoDbg.count()');
  await page.evaluate('document.activeElement?.blur()');
  await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'x',code:'KeyX',windowsVirtualKeyCode:88,nativeVirtualKeyCode:88});
  await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'x',code:'KeyX',windowsVirtualKeyCode:88,nativeVirtualKeyCode:88});
  await page.evaluate('TT.stepFrame(.016)');
  proof.switchStart=await page.evaluate(`(()=>({count:TT.ammoDbg.count(),state:TT.ammoTypeState('shotgun'),detail:document.getElementById('ammoDetail')?.textContent,flags:TT.vaultDbg.flags(),unarmed:TT.isUnarmed(),mode:TT.getGameMode(),phase:TT.getPhase()}))()`);
  assert(proof.switchStart.count>count,'X started a type switch');
  await page.evaluate('for(let i=0;i<140;i++)TT.stepFrame(.05)');
  proof.switchEnd=await page.evaluate(`(()=>({state:TT.ammoTypeState('shotgun'),detail:document.getElementById('ammoDetail')?.textContent}))()`);
  assert.equal(proof.switchEnd.state.loaded,'buckshot');
  assert.equal(proof.switchEnd.state.switching,null);
  for(const width of [1280,390]){await page.setViewport(width,width===390?844:720);await page.evaluate('TT.stepFrame(.05)');await page.screenshot(path.join(out,`live-hud-after-${width}.png`));}
  assert.deepEqual(page.errors,[]);
  console.log('PASS GP-20083 live: shotgun-only types, Armory purchase, X switch, typed HUD, 1280/390 eye shots, 0 page errors');
}finally{fs.writeFileSync(path.join(out,'live-ammo.json'),JSON.stringify(proof,null,2));await browser.close();await server.close();}
