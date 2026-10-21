import fs from 'node:fs';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright'),out='review/armory/height',before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(process.cwd(),0);let browser;const stop=setTimeout(()=>process.exit(2),120000);
try{
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/index.html*',r=>{let s=fs.readFileSync('index.html','utf8');if(before){const a=s.indexOf('// GP-125: a full-size issue cabinet.'),b=s.indexOf('// Lamps, for night.',a);s=s.slice(0,a)+JSON.parse(fs.readFileSync(out+'/source-before.json','utf8'))+s.slice(b);}s=s.replace('window.TT = stampDebugHooks({','window.rackProbe={copy:rackGunCopy,stored:armoryStoredKinds,refresh:refreshArmoryRack,inventory:()=>runArmory.read()}; window.TT = stampDebugHooks({');return r.fulfill({contentType:'text/html',body:s});});
 if(before)await p.route('**/world/training.js*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(out+'/training-before.js','utf8')}));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await p.evaluate(()=>DWOpening.dismissForTesting());await p.waitForFunction(()=>document.getElementById('opening').hidden);
 const fresh=await p.evaluate(()=>{TT.armoryDbg.refreshRack();return TT.armoryDbg.rack();});if(!before)assert.deepEqual(fresh,['pistol'],'fresh run only displays issued pistol');
 await p.evaluate(()=>{document.getElementById('playerName').value='Armory review';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active,null,{timeout:30000});await p.waitForTimeout(600);
 const state=await p.evaluate(()=>{
  const T=TT.THREE,tg=TT.trainingDbg.tg(),st=tg.stations.armory;TT.player.position.set(st.front.x,tg.floorY,st.front.z);TT.armoryDbg.refreshRack();
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
  const sizes={};for(const k of TT.WEAPON_ORDER){const g=rackProbe.copy(k);g.rotation.set(-Math.PI/2,0,Math.PI/2);const b=new T.Box3().setFromObject(g);sizes[k]={size:b.getSize(new T.Vector3()).toArray(),min:b.min.toArray(),max:b.max.toArray(),scale:TT.weaponMeshes[k].scale.toArray()};g.traverse(o=>{if(o.isMesh)o.geometry.dispose();});}
  return {sizes,rack:TT.armoryDbg.rack(),stored:TT.armoryDbg.stored(),owned:TT.getWeaponOwned(),loadout:TT.armoryDbg.inReach()};
 });
 async function shot(id,where,eye,target,showPlayer=false){await p.evaluate(({where,eye,target,showPlayer})=>{const arm=where==='training'?TT.trainingDbg.state().copies.armory.copy:TT.house.armoryRack.parent,T=TT.THREE;TT.getMarine().visible=showPlayer;const e=arm.localToWorld(new T.Vector3(...eye)),t=arm.localToWorld(new T.Vector3(...target));TT.setShotView({x:e.x,y:e.y,z:e.z,tx:t.x,ty:t.y,tz:t.z,fov:45});},{where,eye,target,showPlayer});await p.waitForTimeout(300);await p.screenshot({path:out+'/'+prefix+'-'+id+'.jpg',type:'jpeg',quality:94});}
 await shot('training','training',[.76,2.6,6.6],[.76,2.45,.4]);
 await shot('player','training',[2.4,4.6,6.5],[.6,2.0,.15],true);
 await shot('wall','training',[-2.3,3.7,12],[-2.3,2.1,.2],true);
 await p.evaluate(()=>{TT.trainingDbg.leave();TT.setWorldTime(.4);const a=TT.house.armoryRack.parent,pt=a.localToWorld(new TT.THREE.Vector3(.3,0,1));TT.player.position.set(pt.x,TT.sampleHeight(pt.x,pt.z),pt.z);TT.house.armoryRack.visible=true;});
 await shot('hq','hq',[2.8,3.7,6.6],[.5,1.9,0],true);
 const checks=await p.evaluate(()=>{
  const T=TT.THREE,A=TT.armoryDbg,r=TT.house.armoryRack,inv=JSON.stringify(rackProbe.inventory()),owned=JSON.stringify(TT.getWeaponOwned()),load=A.inReach().join(','),out=[];
  const check=(c,label)=>out.push((c?'PASS ':'FAIL ')+label);
  function inspect(label){
   A.refreshRack();const kinds=A.rack();check(kinds.length===11&&new Set(kinds).size===11&&!kinds.includes('chainsaw'),label+' all eleven firearms, no duplicates/melee');
   const bounds=r.children.filter(g=>g.userData.rackKind).map(g=>{const b=new T.Box3().setFromObject(g.clone(true));check(g.scale.equals(new T.Vector3(1,1,1)),label+' '+g.userData.rackKind+' original weapon scale');check(b.min.x>=-1.25&&b.max.x<=2.77&&b.min.y>=.90&&b.max.y<=3.72&&b.min.z>=.39&&b.max.z<=.80,label+' '+g.userData.rackKind+' within cabinet');return{k:g.userData.rackKind,b};});
   for(let i=0;i<bounds.length;i++)for(let j=i+1;j<bounds.length;j++)check(!bounds[i].b.intersectsBox(bounds[j].b),label+' separate '+bounds[i].k+'/'+bounds[j].k);
   const tr=TT.trainingDbg.state().copies.rack;check(tr.children.filter(g=>g.userData.rackKind).map(g=>g.userData.rackKind).join(',')===kinds.join(','),label+' Training mirror matches');
   let noRay=true;for(const rack of[r,tr])rack.traverse(o=>{if(o.isMesh&&o.raycast.name!=='rackNoRay')noRay=false;});check(noRay,label+' both displays excluded from gameplay ray tests');
   check(JSON.stringify(rackProbe.inventory())===inv&&JSON.stringify(TT.getWeaponOwned())===owned&&A.inReach().join(',')===load,label+' refresh leaves ammo/inventory/loadout unchanged');
   return bounds.map(({k,b})=>({k,min:b.min.toArray(),max:b.max.toArray()}));
  }
  const stock=inspect('stock');TT.addCash(1e6);
  for(const k of TT.WEAPON_ORDER)for(const[id,fn]of[['suppressor','buySuppressor'],['ext','buyExtMag']])if(A.mods(k).some(m=>m.id===id)){TT[fn](k);A.fit(k,id,true);}
  // Upgrades intentionally change inventory; use a separate invariant around the forced refresh.
  const upgradedInventory=JSON.stringify(rackProbe.inventory());A.refreshRack();check(upgradedInventory===JSON.stringify(rackProbe.inventory()),'upgraded refresh leaves inventory unchanged');
  const upgraded=r.children.filter(g=>g.userData.rackKind).map(g=>{const b=new T.Box3().setFromObject(g.clone(true));check(b.min.x>=-1.25&&b.max.x<=2.77&&b.min.y>=.9&&b.max.y<=3.72&&b.max.z<=.80,'all attachments '+g.userData.rackKind+' within cabinet');return{k:g.userData.rackKind,min:b.min.toArray(),max:b.max.toArray()};});
  for(let i=0;i<upgraded.length;i++)for(let j=i+1;j<upgraded.length;j++){const a=upgraded[i],b=upgraded[j];check(a.max[0]<b.min[0]||b.max[0]<a.min[0]||a.max[1]<b.min[1]||b.max[1]<a.min[1],'attachments separate '+a.k+'/'+b.k);}
  return{out,stock,upgraded,meshes:r.children.reduce((n,g)=>{g.traverse(o=>{if(o.isMesh)n++;});return n;},0)};
 });
 if(!before){fs.writeFileSync(out+'/layout-checks.json',JSON.stringify(checks,null,2));assert(!checks.out.some(s=>s.startsWith('FAIL')),checks.out.filter(s=>s.startsWith('FAIL')).join('\n'));}
 await shot('attachments','hq',[.76,2.6,6.6],[.76,2.45,.4]);
 assert.deepEqual(errors,[]);
 if(!before){const old=JSON.parse(fs.readFileSync(out+'/before-checks.json','utf8'));assert.deepEqual(state.owned,old.owned);assert.deepEqual(state.loadout,old.loadout);assert.deepEqual(state.stored,old.stored);}
 state.errors=errors;fs.writeFileSync(out+'/'+prefix+'-checks.json',JSON.stringify(state,null,2));console.log('Captured '+prefix+' five views; '+checks.out.filter(s=>s.startsWith('PASS')).length+' checks passed, '+checks.out.filter(s=>s.startsWith('FAIL')).length+' failed'+(before?' (baseline uses old display behavior)':''));
 if(process.argv.includes('--integration')){await p.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));const result=await p.evaluate(fs.readFileSync('tools/tests/t180.js','utf8'));fs.writeFileSync(out+'/t180-checks.txt',result);console.log(result);}
}finally{clearTimeout(stop);await browser?.close();server.close();}
