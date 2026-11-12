// GP-20118: CB-311 carried-gun visibility through Armory/CIF and Training recovery.
// Run through crew.mjs slot run on Jerry's PC.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20118');
const server=await serve(root,0);
const browser=await launch({headless:false,args:['--window-size=1280,720']});
const records=[];
try {
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1`,{timeout:400000});
  if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state === "ready"',{timeout:400000}))throw Error('load failed');
  await page.evaluate('DWOpening.dismissForTesting()');
  if(!await page.waitFor('!window.DWOpening || window.DWOpening.active === false',{timeout:500000}))throw Error('opening stayed up');
  await page.evaluate(`(()=>{document.getElementById('playerName').value='CB-311 Armory CIF';document.getElementById('modeTraining').click();})()`);
  if(!await page.waitFor('TT.trainingDbg.state().active && TT.getPhase() === "prep"',{timeout:400000}))throw Error('Training failed');
  await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000});
  await page.evaluate(`(()=>{const T=TT;T.setWorldTime(0.42);T.weather.raining=false;T.setViewFirstDbg(false);T.setUnarmedDbg(false);T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));const p=T.player.position;window.__home={x:p.x,y:p.y,z:p.z};
    window.__goHome=()=>{const h=window.__home;T.player.position.set(h.x,h.y,h.z);};
    window.__sim=async(s)=>{const s0=T.getSimTime(),w0=Date.now();while(T.getSimTime()-s0<s&&Date.now()-w0<60000)await new Promise(r=>setTimeout(r,30));};
    window.__cam=()=>{const p=T.player.position,y=T.player.rotation.y,c=Math.cos(y),s=Math.sin(y),tw=v=>({x:p.x+v[0]*c+v[2]*s,y:p.y+v[1],z:p.z-v[0]*s+v[2]*c}),a=tw([0.8,2.5,-1.2]),b=tw([0,1.1,0.1]);T.setShotView({x:a.x,y:a.y,z:a.z,tx:b.x,ty:b.y,tz:b.z,fov:40});};
    window.__state=()=>{const m=T.getMarine(),rig=m.userData.carry,A=T.armoryDbg.ui().armory,vis=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;},count=o=>{let n=0;if(o)o.traverse(x=>{if(x.isMesh&&vis(x))n++;});return n;},slots=rig?[...rig.slings,...rig.holsters,...rig.pairs].map(s=>({kind:s.kind,gun:count(s.gun),object:!!s.gun})):[];
      return {phase:T.getPhase(),wake:!!T.trainingDbg.state().wake,weapon:T.getCurrentWeapon(),held:count(T.weaponMeshes[T.getCurrentWeapon()]),stowed:slots.reduce((n,s)=>n+s.gun,0),slots,watchman:count(T.m240VisDbg().carriedGun),loadout:A.loadout(),armoryOpen:!document.getElementById('armoryPanel').hidden,cifOpen:T.isCIFOpen()};};})()`);
  async function snap(step,{close=false,reopen=false}={}){
    const during=await page.evaluate('__state()');
    if(close)await page.evaluate('TT.armoryDbg.ui().close(); TT.closeCIF(); __goHome()');
    await page.evaluate('__sim(0.28)',60000);
    const after=await page.evaluate('__state()');
    await page.evaluate('__cam(); __sim(0.12)',60000);
    await page.screenshot(path.join(out,`${step}.png`));
    await page.evaluate('TT.setShotView(null)');
    const warnings=page.console.filter(m=>/warn|error/i.test(m.type)||/WebGPU|validation/i.test(m.text)).map(m=>`${m.type}: ${m.text.slice(0,300)}`);
    records.push({step,during,after,warnings:warnings.slice(-20)});
    console.log(step,JSON.stringify({held:after.held,stowed:after.stowed,watchman:after.watchman,slots:after.slots.map(s=>`${s.kind}:${s.gun}`),wake:after.wake,warnings:warnings.length}));
    if(reopen){await page.evaluate('TT.openCIF(true); TT.armoryDbg.ui().open()');if(!await page.waitFor('!document.getElementById("armoryPanel").hidden',{timeout:30000}))throw Error('Armory did not reopen');}
  }
  await snap('00-start');
  await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.armory.front;T.player.position.set(f.x,tg.floorY,f.z);T.doAction();})()`);
  if(!await page.waitFor('!document.getElementById("armoryPanel").hidden',{timeout:30000}))throw Error('Armory station did not open');
  await snap('01-armory-open',{close:true,reopen:true});
  await page.evaluate("TT.armoryDbg.ui().bench('pistol')");
  if(!await page.waitFor('document.querySelector("#armoryPanel .armory-preview-stage")?.dataset.ready === "true"',{timeout:60000}))throw Error('Pistol preview did not draw');
  await page.evaluate("document.querySelector('#armoryPanel [data-turn=right]').click()");
  await new Promise(r=>setTimeout(r,350));
  await snap('02-preview-turn',{close:true,reopen:true});
  await page.evaluate("document.querySelector('#armoryPanel [data-buy-gun=m4]').click()");
  if(!await page.evaluate('TT.getWeaponOwned().m4'))throw Error('M4 not bought through Armory');
  await snap('03-buy-m4',{close:true,reopen:true});
  await page.evaluate(`(()=>{const T=TT;T.grantAllWeapons();T.setUnarmedDbg(false);T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
    T.armoryDbg.ui().close();T.armoryDbg.ui().open();const A=T.armoryDbg.ui().armory;
    for(const [kind,type,index] of [['m4','primary',0],['ak','primary',1],['uzi','secondary',0],['revolver','secondary',1]]){
      if(A.loadout()[type][index]===kind)continue;
      if(!A.has(kind)||!A.take(kind,type,index).ok)throw Error('Could not carry '+kind);}
    T.armoryDbg.ui().bench('m4');})()`);
  await snap('04-all-guns',{close:true,reopen:true});
  await page.evaluate("(()=>{TT.armoryDbg.ui().bench('m4');const b=document.querySelector('#armoryPanel [data-mod=ext] button');if(!b||b.disabled)throw Error('M4 ext mod unavailable');b.click();})()");
  await snap('05-fit-m4',{close:true,reopen:true});
  await page.evaluate("document.querySelector('#armoryPanel [data-slot=\"primary:0\"]')?.click()");
  await page.evaluate("(()=>{const b=document.querySelector('#armoryPanel .armory-actions button');if(!b||b.disabled)throw Error('No occupied primary slot for stow');b.click();})()");
  await snap('06-move-to-shelf',{close:true});
  await page.evaluate('TT.openCIF()');
  if(!await page.waitFor('TT.isCIFOpen() && !document.getElementById("cif").classList.contains("armory-only")',{timeout:30000}))throw Error('CIF did not open');
  await snap('07-cif-open',{close:true});
  await page.evaluate('TT.openCIF()');
  await page.evaluate("document.querySelector('[data-camo=marpat]')?.click()");
  await snap('08-cif-camo',{close:true});
  await page.evaluate('TT.openCIF()');
  await page.evaluate("(()=>{document.querySelector('[data-cif-tab=body]')?.click();document.querySelector('[data-cif-item=shirt]')?.click();const b=document.querySelector('#cifOptions button:last-child');if(!b)throw Error('No shirt option');b.click();})()");
  await snap('09-cif-kit-change',{close:true});
  await snap('10-cif-close');
  await page.evaluate('TT.trainingDbg.blackout()');
  const down=await page.evaluate('__state()');records.push({step:'11-death',during:down});console.log('11-death',JSON.stringify({held:down.held,stowed:down.stowed,wake:down.wake}));
  if(!await page.waitFor('!TT.trainingDbg.state().wake && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:90000}))throw Error('Training wake did not finish');
  await snap('12-wake');await snap('13-post-wake');
}finally{fs.writeFileSync(path.join(out,'trace.json'),JSON.stringify(records,null,2));await browser.close();await server.close();}
