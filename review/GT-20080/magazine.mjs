import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const [id,phase]=process.argv.slice(2);
assert(id==='ak' && ['before','after','timing'].includes(phase) && process.env.DW_GAME_TEST_TOKEN);
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
  if(phase==='timing'){
    await page.evaluate(`(async()=>{
      TT.applyGraphicsPreset('high');TT.grantAllWeapons();TT.setViewFirstDbg(true);
      if(TT.isUnarmed())TT.toggleHolster();
      for(let i=0;i<30&&TT.getCurrentWeapon()!=='ak';i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf('ak'));await new Promise(r=>setTimeout(r,100))}
    })()`);
    assert(await page.waitFor('TT.viewmodelDbg()?.info.key==="ak" && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
    await page.evaluate("TT.setAmmoDbg('ak',1);TT.setMagazinesDbg('ak',1,[30,30]);TT.startReload();TT.reloadClipDbg.hold(.74)");
    assert(await page.waitFor('TT.isReloading() && TT.viewmodelDbg()?.gun?.mag?.visible'));
    const samples=[];
    for(const count of [0,1,30]){
      await page.evaluate('TT.weaponMeshes.ak.userData.setMagazineRounds('+count+')');
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
    if(Boolean(live)!==${phase==='after'})throw Error('Unexpected live artwork for this phase');
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
    window.magImage=async(mode,light,count)=>{
      lightName=light;stage.visible=mode!=='eye';sample.visible=mode==='pair';magStage.visible=mode==='mag';
      if(ud.setMagazineRounds)ud.setMagazineRounds(count);
      let result={mode,light,count};
      if(mode==='eye'){
        TT.setShotView(null);
        TT.setViewFirstDbg(true);
        if(!TT.isReloading()){
          TT.setAmmoDbg(id,1);TT.setMagazinesDbg(id,1,[30,30]);TT.startReload();
        }
        TT.reloadClipDbg.hold(.74);
        for(let i=0;i<55;i++)TT.stepFrame(1/30);
        const vm=TT.viewmodelDbg();
        result={...result,gun:vm.info.key,reloading:TT.isReloading(),magState:vm.info.magState};
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
        target.copy(stage.localToWorld(new T.Vector3(0,examining?0:.026,0)));
        const offset=examining?new T.Vector3(.20,.20,-.10):new T.Vector3(.025,.076,.18);
        const eye=target.clone().addScaledVector(offset,12);
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:examining?32:25});
      }
      for(let i=0;i<4;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,90))}
      illuminate();return result;
    };
    return {live:live?size(live):null,spent:size(spent),hook:typeof ud.setMagazineRounds==='function'};
  })()`);
  if(phase==='after')assert(info.hook,'Missing approved count hook');
  const frames=[];
  const shot=async(mode,light,count,name)=>{
    frames.push(await page.evaluate('magImage('+[mode,light,count].map(x=>JSON.stringify(x)).join(',')+')'));
    const capture=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL(name+'.jpg',dir),Buffer.from(capture.data,'base64'));
  };
  await shot('eye','noon',30,'eye-reload');
  for(const light of ['noon','overcast','dusk','night'])await shot('pair',light,30,light);
  await shot('mag','noon',0,'mag-empty');await shot('mag','noon',30,'mag-loaded');
  assert.deepEqual(page.errors,[]);
  await save(new URL('proof.json',dir),JSON.stringify({info,frames},null,2));
  console.log('PASS',id,phase,frames.length,'game frames',JSON.stringify(info));
  }
}finally{await browser.close();await server.close();}
