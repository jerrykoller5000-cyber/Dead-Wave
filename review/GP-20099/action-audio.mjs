import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';

if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use the crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url)));
const out=path.join(root,'review/GP-20099');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
let page;
try{
  page=await browser.newPage({width:1280,height:720});
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && DWLoad?.snapshot().state==="ready"',{timeout:90000}),'boot');
  await page.evaluate(`(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Action audio';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active && document.getElementById("opening").hidden && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:60000}),'Training');
  const result=await page.evaluate(`(async()=>{
    const {AudioSys:A}=await import('/core/audio.js'),T=TT,tg=T.trainingDbg.tg();
    const events=[],wait=ms=>new Promise(r=>setTimeout(r,ms));let label='';
    const soundNames=['fireWeapon','emptyClick','reloadCue','selectorClick','trainingCue','clip','shutter','cifLocker','lightSwitch','armoryBench','flameBurst','fireHiss','chainsawDryPull','chainsawStart','launcherDrum','launcherShellInsert','shotgunPump','revolverCylinder','revolverSpin','relayBeep','hqDing','invalid'];
    const originals=new Map();
    for(const name of soundNames){if(typeof A[name]!=='function')continue;const fn=A[name];originals.set(name,fn);A[name]=function(...args){events.push({label,kind:name,args:args.slice(0,2),at:performance.now()});return fn.apply(this,args)}}
    const startProto=AudioBufferSourceNode.prototype,oscProto=OscillatorNode.prototype,oldB=startProto.start,oldO=oscProto.start;
    startProto.start=function(...args){events.push({label,kind:'buffer-source',at:performance.now()});return oldB.apply(this,args)};
    oscProto.start=function(...args){events.push({label,kind:'oscillator-source',at:performance.now()});return oldO.apply(this,args)};
    const cases=[];const report=(name,extra={})=>{cases.push({name,events:events.filter(e=>e.label===name),...extra})};
    const station=(site)=>{const s=tg.stations[site];T.player.position.set(s.front.x,tg.floorY,s.front.z);return T.trainingDbg.action()};
    for(const [site,close] of [['kiosk',()=>T.closeShop()],['cif',()=>T.closeCIF()],['armory',()=>{T.armoryDbg.ui().close();T.closeCIF()}],['rangeConsole',()=>T.rangeDbg.exit()],['hqPanel',()=>T.trainingDbg.state().panel.close()]]){
      const action=station(site);label='station:'+site;T.doAction();await wait(100);report(label,{action});close();await wait(200);
    }
    station('lightSwitch');label='station:lights-off';T.doAction();await wait(140);report(label,{off:T.trainingDbg.lights()});
    label='station:lights-on';T.doAction();await wait(140);report(label,{on:T.trainingDbg.lights()});
    const keypad=tg.securityDoor.keypads[0];T.player.position.set(keypad.front.x,tg.floorY,keypad.front.z);
    label='station:door-open';T.doAction();await wait(320);report(label);
    label='station:door-close';T.doAction();await wait(320);report(label);
    T.grantAllWeapons();T.setUnarmedDbg(false);T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-5);
    for(const gun of ['pistol','uzi','m4','ak','shotgun','aa12','revolver','sniper','minigun','flamer','launcher']){
      label='setup:'+gun;T.setWeapon(T.WEAPON_ORDER.indexOf(gun));await wait(1100);
      label='fire:'+gun;const before=T.getAmmo()[gun];T.setMouseFireDbg(true);await wait(gun==='minigun'?1200:gun==='flamer'?520:gun==='launcher'?500:320);T.setMouseFireDbg(false);await wait(120);
      report(label,{ammoBefore:before,ammoAfter:T.getAmmo()[gun]});
    }
    label='reload:pistol';T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));await wait(500);const reloading=T.startReload();await wait(2600);report(label,{reloading,reload:T.getReloadDbg()});
    label='dryfire:pistol';T.setAmmoDbg('pistol',0);T.setMouseFireDbg(true);await wait(260);T.setMouseFireDbg(false);report(label);
    label='ammo-switch:shotgun';T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun'));await wait(500);T.buyAmmoType('shotgun','slug');const started=T.ammoDbg.start('slug');await wait(1500);report(label,{started,state:T.ammoTypeState('shotgun')});
    async function wreck(weapon,index,offset){
      const b=tg.targets[index].box,cx=(b.minX+b.maxX)/2;
      label='setup-wreck:'+weapon;T.setWeapon(T.WEAPON_ORDER.indexOf(weapon));T.setViewFirstDbg(false);
      T.player.position.set(cx,tg.floorY,b.minZ-offset);T.setAimYawDbg(0);T.setAimTargetDbg(cx,weapon==='flamer'?b.minZ+6:b.minZ);await wait(1400);
      label='wreck:'+weapon;T.setMouseFireDbg(true);
      for(let i=0;i<55&&tg.targets[index].state!=='wrecked';i++){
        await wait(200);T.player.position.set(cx,tg.floorY,b.minZ-offset);T.setAimYawDbg(0);T.setAimTargetDbg(cx,weapon==='flamer'?b.minZ+6:b.minZ);
      }
      T.setMouseFireDbg(false);await wait(100);report(label,{target:tg.targets[index].state,index});
    }
    await wreck('flamer',0,4);
    await wreck('launcher',2,6);
    for(const [name,fn]of originals)A[name]=fn;startProto.start=oldB;oscProto.start=oldO;
    return {cases,allEvents:events.length};
  })()`);
  fs.writeFileSync(path.join(out,'action-audio.json'),JSON.stringify({result,pageErrors:page.errors},null,2));
  for(const c of result.cases)console.log(`${c.name}: ${c.events.filter(e=>!e.kind.endsWith('-source')).map(e=>e.kind+(e.args?.length?'('+e.args[0]+')':'')).join(', ')}, sources=${c.events.filter(e=>e.kind.endsWith('-source')).length}`);
  const find=name=>result.cases.find(c=>c.name===name);
  const heard=c=>c?.events?.some(e=>e.kind==='buffer-source'||e.kind==='oscillator-source');
  for(const site of ['kiosk','cif','armory','rangeConsole','hqPanel','lights-off','lights-on','door-open','door-close'])assert(heard(find('station:'+site)),`${site} starts a listener source`);
  for(const [site,kind]of [['kiosk','shutter'],['cif','cifLocker'],['armory','cifLocker'],['rangeConsole','trainingCue'],['hqPanel','trainingCue']])assert.equal(find('station:'+site).events.filter(e=>e.kind===kind).length,1,`${site} has one opening cue`);
  assert.equal(find('station:armory').events.filter(e=>e.kind==='armoryBench').length,1,'Armory bench cue once');
  for(const on of ['off','on'])assert.equal(find('station:lights-'+on).events.filter(e=>e.kind==='lightSwitch').length,1,`light switch ${on} has one cue`);
  for(const state of ['open','close']){
    const events=find('station:door-'+state).events;
    assert.equal(events.filter(e=>e.kind==='clip'&&e.args[0]==='keypadPress').length,1,`door ${state} has one keypad press`);
    const door=events.filter(e=>e.kind==='trainingCue'&&e.args[0].startsWith('door:'));
    assert.equal(door.length,1,`door ${state} has one moving-door cue`);
    const pan=Number(door[0].args[0].split(':')[2]);assert(Number.isFinite(pan)&&Math.abs(pan)>0.01&&Math.abs(pan)<=1,'door cue carries listener pan');
  }
  for(const gun of ['pistol','uzi','m4','ak','shotgun','aa12','revolver','sniper','minigun','flamer','launcher']){
    const c=find('fire:'+gun);
    assert(c.ammoAfter<c.ammoBefore,`${gun} fired in game`);
    assert(c.events.some(e=>e.kind===(gun==='flamer'?'flameBurst':'fireWeapon')&&(!e.args?.length||e.args[0]===gun||gun==='flamer')),`${gun} routes shot sound`);
    if(gun!=='flamer')assert.equal(c.events.filter(e=>e.kind==='fireWeapon'&&e.args[0]===gun).length,c.ammoBefore-c.ammoAfter,`${gun} emits one shot cue per round`);
    assert(heard(c),`${gun} starts a listener source`);
  }
  for(const cue of ['magRelease','magOut','magIn','magSlap','slideBack','slideFwd'])assert.equal(find('reload:pistol').events.filter(e=>e.kind==='reloadCue'&&e.args[0]===cue).length,1,`pistol reload ${cue} once`);
  assert.equal(find('dryfire:pistol').events.filter(e=>e.kind==='emptyClick').length,1,'real dry trigger clicks once');
  assert(find('ammo-switch:shotgun').started&&find('ammo-switch:shotgun').events.some(e=>e.kind==='reloadCue'),'real ammo switch has foley');
  for(const weapon of ['flamer','launcher']){
    const c=find('wreck:'+weapon);assert.equal(c.target,'wrecked',`${weapon} wrecks plate`);
    assert(heard(c),`${weapon} wreck starts audio source`);
    assert.equal(c.events.filter(e=>e.kind==='trainingCue'&&e.args[0]==='target').length,1,`${weapon} target pop once`);
  }
  assert.deepEqual(page.errors,[]);
  console.log(`Action audio probe: ${result.cases.length} actions, ${result.allEvents} routed events, 0 page errors`);
}finally{if(page)await page.close();await browser.close();await server.close();}
