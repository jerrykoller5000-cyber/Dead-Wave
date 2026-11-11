import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase]=process.argv.slice(2);
assert(['ak','uzi','aa12','sniper'].includes(id) && ['before','after','revised','timing','inventory'].includes(phase) && process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('./'+id+'/'+phase+'/',import.meta.url);
await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:960,height:540});
  const start=Date.now();
  await page.goto(server.origin+'/index.html?debug=1'+(phase==='timing'?'':'&raf=timer'));
  assert(await page.waitFor('TT && DWLoad.snapshot().state==="ready"'));
  const readyMs=Date.now()-start;
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Magazine art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate('window.proofMagId='+JSON.stringify(id));
  const capacity=await page.evaluate('TT.WEAPON_STATS[proofMagId].maxAmmo');
  if(phase==='inventory'){
    assert.equal(id,'aa12');
    const counts=await page.evaluate(`(async()=>{
      const id=proofMagId;
      TT.grantAllWeapons();TT.setViewFirstDbg(true);
      if(TT.isUnarmed())TT.toggleHolster();
      for(let i=0;i<30&&TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,120))}
      TT.flightHold(true);for(let i=0;i<120;i++)TT.stepFrame(1/30);
      TT.modsOwnAllDbg();TT.addCash(100000);TT.buyExtMag(id);
      const u=TT.weaponMeshes[id].userData,result={};
      for(const extended of [false,true]){
        TT.armoryDbg.fit(id,'ext',extended);
        for(let i=0;i<8;i++)TT.stepFrame(1/30);
        if((TT.weaponMods(id).fitted==='ext')!==extended)throw Error('Wrong drum');
        const size=TT.magazinesDbg(id).size;
        TT.setMagazinesDbg(id,0,[size]);TT.startReload();
        const states=[];
        for(const f of [.28,.78,.96]){
          TT.reloadClipDbg.hold(f);
          for(let i=0;i<55;i++)TT.stepFrame(1/30);
          const vm=TT.viewmodelDbg();
          states.push({f,magState:vm.info.magState,visible:vm.gun.mag.getObjectByName('magazine top round').visible});
        }
        TT.reloadClipDbg.hold(null);
        for(let i=0;i<150;i++)TT.stepFrame(1/30);
        const settled={remaining:TT.magazinesDbg(id).loaded,visible:u.magazineTopRound.visible};
        if(!settled.visible || TT.isReloading())throw Error('Drum did not finish reloading');
        result[extended?'extended':'standard']={size,states,settled,top:u.magazineTopRound.position.toArray(),pivot:u.mag.position.toArray()};
      }
      return result;
    })()`);
    assert.deepEqual(counts.standard.top,counts.extended.top);
    assert.deepEqual(counts.standard.pivot,counts.extended.pivot);
    await save(new URL('counts.json',dir),JSON.stringify(counts,null,2));
    assert.deepEqual(page.errors,[]);
    console.log('PASS live standard/extended drum seat and finished inventory; observed unforced empty-reload frames',JSON.stringify(counts));
  } else if(phase==='timing'){
    await page.evaluate(`(async()=>{
      TT.applyGraphicsPreset('high');TT.grantAllWeapons();TT.setViewFirstDbg(true);
      if(TT.isUnarmed())TT.toggleHolster();
      for(let i=0;i<30&&TT.getCurrentWeapon()!==proofMagId;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(proofMagId));await new Promise(r=>setTimeout(r,100))}
    })()`);
    assert(await page.waitFor('TT.viewmodelDbg()?.info.key===proofMagId && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
    await page.evaluate("TT.setAmmoDbg(proofMagId,1);TT.setMagazinesDbg(proofMagId,1,[TT.WEAPON_STATS[proofMagId].maxAmmo]);TT.startReload();TT.reloadClipDbg.hold(proofMagId==='aa12'?.58:proofMagId==='sniper'?.48:.74)");
    assert(await page.waitFor('TT.isReloading() && TT.viewmodelDbg()?.gun?.mag?.visible'));
    const samples=[];
    for(const count of [0,1,capacity]){
      if(id==='aa12' || id==='sniper'){
        assert(await page.evaluate('TT.setMagazinesDbg(proofMagId,'+count+',['+capacity+'])'));
        assert(await page.waitFor('TT.viewmodelDbg().gun.mag.getObjectByName("magazine top round").visible==='+String(count>0)),'Inventory count '+count+' did not reach the drum');
      }else await page.evaluate('TT.weaponMeshes[proofMagId].userData.setMagazineRounds('+count+')');
      for(let i=0;i<4;i++){
        await wait(1000);
        const s=await page.evaluate('({gun:TT.viewmodelDbg().info.key,high:TT.getGfx(),round:TT.viewmodelDbg().gun.mag.getObjectByName("magazine top round").visible,...TT.perfSnapshot()})');
        assert.equal(s.gun,id);assert.equal(s.high,'high');assert.equal(s.round,count>0);
        samples.push({count,fps:s.fps,low:s.low});
      }
    }
    await save(new URL('samples.json',dir),JSON.stringify({readyMs,samples},null,2));
    const avg=k=>samples.reduce((sum,s)=>sum+s[k],0)/samples.length;
    console.log('PASS loaded and empty, 12 High samples: ready',readyMs,'ms,',avg('fps').toFixed(1),'fps,',avg('low').toFixed(1),'low');
  } else {
  const info=await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),id=${JSON.stringify(id)};
    const lib=await import('/studio/weapon-casings.js'),{LIGHTS}=await import('/studio/inspector/stage.js');
    TT.grantAllWeapons();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();
    for(let i=0;i<30&&TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,100))}
    TT.flightHold(true);TT.setOtsAimDbg(0,-.08);
    for(let i=0;i<140;i++)TT.stepFrame(1/30);
    const gun=TT.weaponMeshes[id],ud=gun.userData,live=lib.roundGeometry(T,id),spent=lib.spentCaseGeometry(T,id);
    if(Boolean(live)!==${id==='aa12'||phase!=='before'})throw Error('Unexpected live artwork for this phase');
    let ejection=null;
    if(id==='aa12' || id==='sniper'){
      if(id==='aa12')for(const label of ['issued','buckshot','slug']){
        if(lib.roundGeometry(T,id,label)!==live || lib.spentCaseGeometry(T,id,label)!==spent)
          throw Error('The Breacher must keep one issued shell');
      }
      const startCount=TT.casings.length;
      TT.setMouseFireDbg(true);
      let roundWasVisible=false;
      for(let i=0;i<300 && TT.casings.length===startCount;i++){
        TT.stepFrame(1/120);
        if(ud.boltRound?.visible)roundWasVisible=true;
      }
      TT.setMouseFireDbg(false);
      const mesh=TT.casings.at(-1)?.mesh;
      if(TT.casings.length<=startCount || mesh?.userData.caseOf!==id || mesh.geometry!==spent || !mesh.material.vertexColors)
        throw Error('Normal shot did not emit the issued '+id+' case');
      for(let i=0;i<100;i++){
        TT.stepFrame(1/80);
        if(ud.boltRound?.visible)roundWasVisible=true;
      }
      ejection={source:mesh.userData.caseOf,vertices:mesh.geometry.attributes.position.count,scale:mesh.scale.toArray(),roundWasVisible};
    }
    const independentCounts={};
    if(id==='uzi' && ud.setMagazineRounds){
      const second=TT.offhandMeshes.uzi.userData;
      const setPrimary=ud.setMagazineRounds;
      for(const [right,left] of [[0,4],[7,0]]){
        setPrimary(right);second.setMagazineRounds(left);
        const a=ud.magazineTopRound.visible,b=second.magazineTopRound.visible;
        if(a!==(right>0)||b!==(left>0)||ud.magazineTopRound===second.magazineTopRound)throw Error('Magazine counts leaked between copies');
        independentCounts[right+','+left]=[a,b];
      }
    }
    const inventoryCounts={};
    let mouth=null;
    if(id==='uzi' && ud.setMagazineRounds){
      for(const count of [1,0,TT.WEAPON_STATS[id].maxAmmo]){
        TT.setMagazinesDbg(id,count,[TT.WEAPON_STATS[id].maxAmmo]);
        for(let i=0;i<5;i++)TT.stepFrame(1/30);
        const eye=TT.viewmodelDbg().gun.mag.getObjectByName('magazine top round');
        if(ud.magazineTopRound.visible!==(count>0) || eye?.visible!==(count>0))throw Error('Inventory count did not reach the held and eye art: '+count);
        inventoryCounts[count]=eye.visible;
      }
      const raw=(await import('/studio/weapon-sidearms.js')).makeUziModel({...H.builders.weaponContext(),finishGun:g=>g});
      const stick=raw.userData.mag.children[0],local=TT.cloneLean(stick);
      local.position.set(0,0,0);local.rotation.set(0,0,0);local.updateMatrixWorld(true);
      const tip=local.getObjectByName('magazine top round'),point=new T.Vector3();
      function top(loaded){
        tip.visible=loaded;
        let max=-Infinity;
        local.traverseVisible(o=>{
          if(!o.isMesh)return;
          const pos=o.geometry.attributes.position;
          for(let i=0;i<pos.count;i++)max=Math.max(max,point.fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld).y);
        });
        return max;
      }
      const topMesh=raw.userData.magazineTopRound;
      live.computeBoundingBox();
      raw.updateMatrixWorld(true);
      const tipPoint=new T.Vector3(0,live.boundingBox.max.y,0).applyMatrix4(topMesh.matrixWorld);
      const headPoint=new T.Vector3(0,live.boundingBox.min.y,0).applyMatrix4(topMesh.matrixWorld);
      const towardTip=tipPoint.clone().sub(headPoint).normalize(),muzzle=raw.userData.muzzleLocal;
      const jacket=live.attributes.color,verts=live.attributes.position;
      let copper=0,leadingCopper=-Infinity;
      for(let i=0;i<verts.count;i++){
        if(Math.abs(jacket.getX(i)-.58)<1e-5 && Math.abs(jacket.getY(i)-.22)<1e-5){
          copper++;leadingCopper=Math.max(leadingCopper,verts.getY(i));
        }
      }
      if(!copper || leadingCopper<live.boundingBox.max.y-.00001 || towardTip.z<.95 || muzzle.z<=tipPoint.z)
        throw Error('Copper end must point down the visual gun axis toward its muzzle');
      mouth={oldTop:.115,emptyTop:top(false),loadedTop:top(true),mmPerLocal:1000*gun.scale.x/TT.getWeaponSizeDbg().upm,
        tipDirection:towardTip.toArray(),tipZ:tipPoint.z,headZ:headPoint.z,muzzleZ:muzzle.z,copperVertices:copper};
    }
    if((id==='aa12'||id==='sniper') && ud.setMagazineRounds){
      const capacity=TT.WEAPON_STATS[id].maxAmmo;
      for(const count of [1,0,capacity]){
        TT.setMagazinesDbg(id,count,[capacity]);
        for(let i=0;i<8;i++)TT.stepFrame(1/30);
        const eye=TT.viewmodelDbg().gun.mag.getObjectByName('magazine top round');
        if(eye?.visible!==(count>0)||ud.magazineTopRound.visible!==(count>0))throw Error('Magazine count did not reach both models');
        inventoryCounts[count]=eye.visible;
      }
      TT.reloadClipDbg.hold(null);
      for(let i=0;i<180 && TT.isReloading();i++)TT.stepFrame(1/30);
      if(TT.isReloading())throw Error('Count sweep left a reload in progress');
      const libModels=await import('/studio/weapon-longarms.js');
      const build=id==='aa12'?libModels.makeAa12Model:libModels.makeSniperModel;
      const raw=build({...H.builders.weaponContext(),finishGun:g=>g});
      const shell=raw.userData.magazineTopRound;
      shell.geometry.computeBoundingBox();live.computeBoundingBox();
      const shellBox=shell.geometry.boundingBox;
      const loadedTop=shell.position.y-shellBox.min.z*shell.scale.z;
      mouth={oldTop:id==='aa12'?.1785:.070,emptyTop:id==='aa12'?.1765:.070,loadedTop,mmPerLocal:1000*gun.scale.x/TT.getWeaponSizeDbg().upm};
      if(Math.abs(loadedTop-mouth.oldTop)>.0005)throw Error('The visible prop changes the magazine silhouette');
      if(Math.abs(shellBox.min.z-live.boundingBox.min.z)>1e-7 ||
         (id==='aa12' && Math.abs(shellBox.min.y-live.boundingBox.min.y)>1e-7) ||
         Math.abs(shellBox.max.y-live.boundingBox.max.y)>1e-7)
        throw Error('Exposed artwork differs from the issued prop');
      if(id==='sniper'){
        if(raw.userData.boltRound.children[0].geometry!==live || !ejection.roundWasVisible)
          throw Error('The normal action did not display the shared prop');
        TT.setMagazinesDbg(id,1,[]);
        TT.setMouseFireDbg(true);
        for(let i=0;i<220 && TT.magazinesDbg(id).loaded[0]>0;i++)TT.stepFrame(1/120);
        TT.setMouseFireDbg(false);
        if(TT.magazinesDbg(id).loaded[0]!==0)throw Error('Did not reach last-round state');
        for(let i=0;i<145;i++){
          TT.stepFrame(1/80);
          if(TT.magazinesDbg(id).loaded[0]===0 && ud.boltRound.visible)throw Error('Round artwork on an empty action');
        }
        mouth.emptyActionHidden=true;
      }
    }
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    const stage=new T.Group();stage.position.set(20,80,-60);stage.scale.setScalar(12);TT.scene.add(stage);
    const sample=new T.Group(),magStage=new T.Group();stage.add(sample,magStage);
    const surface=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.38,metalness:.42});
    const size=geometry=>{
      geometry.computeBoundingBox();return geometry.boundingBox.getSize(new T.Vector3()).toArray();
    };
    for(const [geometry,x] of [[live,-.015],[spent,.015]]){
      if(!geometry)continue;
      const mesh=new T.Mesh(geometry,surface);mesh.rotation.x=.15;
      mesh.position.set(x,size(geometry)[1]/2,0);sample.add(mesh);
    }
    if(id==='sniper' && !live){
      const original=TT.cloneLean(ud.boltRound);
      original.visible=true;original.position.set(-.015,0,0);original.rotation.set(-Math.PI/2,0,0);
      original.scale.setScalar(gun.scale.x/TT.getWeaponSizeDbg().upm);
      sample.add(original);
    }
    let magazine=null;
    const target=new T.Vector3();
    let lightName='noon';
    const illuminate=()=>{
      const L=LIGHTS[lightName],p=stage.visible?target:TT.player.position;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),75);
      H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    };
    H.attach({held:()=>false,scale:dt=>dt,frame:illuminate});
    window.magImage=async(mode,light,count,fraction=.74)=>{
      lightName=light;stage.visible=mode!=='eye';sample.visible=mode==='pair';magStage.visible=mode==='mag';
      if(ud.setMagazineRounds)ud.setMagazineRounds(count);
      let result={mode,light,count};
      if(mode==='eye'){
        TT.setShotView(null);
        TT.setViewFirstDbg(true);
        if(!TT.isReloading()){
          TT.setAmmoDbg(id,1);TT.setMagazinesDbg(id,1,[TT.WEAPON_STATS[id].maxAmmo,TT.WEAPON_STATS[id].maxAmmo]);TT.startReload();
        }
        TT.reloadClipDbg.hold(fraction);
        for(let i=0;i<55;i++)TT.stepFrame(1/30);
        const vm=TT.viewmodelDbg();
        result={...result,gun:vm.info.key,reloading:TT.isReloading(),magState:vm.info.magState,fraction,clock:TT.getReloadDbg()};
        if(result.gun!==id || !result.reloading)throw Error('Missing eye reload');
      }else{
        TT.setViewFirstDbg(false);
        const examining=mode==='mag';
        if(examining){
          if(magazine)magStage.remove(magazine);
          magazine=TT.cloneLean(ud.mag);magazine.visible=true;
          magazine.position.set(0,0,0);magazine.rotation.set(0,0,0);
          magazine.scale.setScalar(gun.scale.x/TT.getWeaponSizeDbg().upm);magStage.add(magazine);
          const top=magazine.getObjectByName('magazine top round');
          result.topRoundVisible=!!top?.visible;
          if(top && top.visible!==(count>0))throw Error('Loaded/empty magazine artwork mismatch');
        }
        const focus=id==='sniper'?new T.Vector3(0,examining?.051:.044,0):examining && id==='aa12'?new T.Vector3(0,.13,0):examining && id==='uzi'?new T.Vector3(0,.081,.013):new T.Vector3(0,examining?0:.026,0);
        target.copy(stage.localToWorld(focus));
        const offset=id==='sniper'?(examining?new T.Vector3(.12,.17,-.18):new T.Vector3(.06,.19,.50)):examining && id==='aa12'?new T.Vector3(.20,.21,-.27):id==='aa12'?new T.Vector3(.055,.14,.39):examining && id==='uzi'?new T.Vector3(.095,.123,-.108):
          examining?new T.Vector3(.20,.20,-.10):new T.Vector3(.025,.076,.18);
        const eye=target.clone().addScaledVector(offset,12);
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:examining?32:25});
      }
      for(let i=0;i<4;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,90))}
      illuminate();return result;
    };
    return {live:live?size(live):null,spent:size(spent),independentCounts,inventoryCounts,mouth,ejection,hook:typeof ud.setMagazineRounds==='function'};
  })()`);
  if(phase!=='before')assert(info.hook,'Missing approved count hook');
  if(id==='uzi' && phase==='revised')assert(Math.abs(info.live[1]-.0297)<.00001,'Revised Wasp art length');
  const frames=[];
  const shot=async(mode,light,count,name,fraction=.74)=>{
    frames.push(await page.evaluate('magImage('+[mode,light,count,fraction].map(x=>JSON.stringify(x)).join(',')+')'));
    const capture=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL(name+'.jpg',dir),Buffer.from(capture.data,'base64'));
  };
  await shot('eye','noon',capacity,'eye-reload');
  if(id==='aa12' || id==='sniper'){
    for(const fraction of [.10,.18,.28,.38,.48,.58,.68,.78,.88,.96])
      await shot('eye','noon',capacity,'reload-'+Math.round(fraction*100),fraction);
  }
  if(phase==='revised' || id==='aa12' || id==='sniper') {
    for(const light of ['overcast','dusk','night'])await shot('eye',light,capacity,'eye-reload-'+light);
  }
  if(id==='sniper' && phase==='after'){
    for(const light of ['noon','overcast','dusk','night'])await shot('eye',light,capacity,'return-48-'+light,.48);
  }
  if(id==='aa12' && phase==='after'){
    for(const light of ['noon','overcast','dusk','night']){
      await shot('eye',light,capacity,'visible-58-'+light,.58);
      await shot('eye',light,capacity,'visible-78-'+light,.78);
    }
  }
  for(const light of ['noon','overcast','dusk','night'])await shot('pair',light,capacity,light);
  await shot('mag','noon',0,'mag-empty');await shot('mag','noon',capacity,'mag-loaded');
  assert.deepEqual(page.errors,[]);
  await save(new URL('proof.json',dir),JSON.stringify({info,frames},null,2));
  console.log('PASS',id,phase,frames.length,'game frames',JSON.stringify(info));
  }
}finally{await browser.close();await server.close();}
