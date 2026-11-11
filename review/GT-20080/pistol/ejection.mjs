import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/cdp.mjs';
import { serve } from '../../../tools/serve.mjs';
import { save } from '../../GT-20076/save.mjs';

const phase=process.argv[2], lights=['noon','overcast','dusk','night'];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','timing'].includes(phase));
const folder=new URL('./'+phase+'/',import.meta.url);
await mkdir(folder,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0);
const browser=await launch({headless:false});
try {
  const page=await browser.newPage({width:1280,height:720});
  const start=Date.now();
  await page.goto(server.origin+(phase==='timing'?'/index.html?debug=1':'/index.html?debug=1&raf=timer'));
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs=Date.now()-start;
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const {spentCaseGeometry}=await import('/studio/weapon-casings.js');
    const samples=new Map(), stage=new T.Group();
    stage.position.set(20,80,-60);stage.scale.setScalar(30);TT.scene.add(stage);
    stage.visible=false;
    TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    window.ejectSample=async id=>{
      H.attach(null);TT.flightHold(false);TT.setShotView(null);TT.setViewFirstDbg(true);
      for(let i=0;i<30 && TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));await new Promise(r=>setTimeout(r,120))}
      TT.flightHold(true);TT.setOtsAimDbg(0,-.08);TT.setAmmoDbg(id,12);
      for(let i=0;i<100;i++)TT.stepFrame(1/30);
      if(TT.viewmodelDbg().info.key!==id || !TT.viewmodelDbg().info.active)throw Error('Incorrect eye model');
      const original=TT.casings.length;TT.setMouseFireDbg(true);
      for(let i=0;i<90 && TT.casings.length===original;i++)TT.stepFrame(1/120);
      TT.setMouseFireDbg(false);
      const mesh=TT.casings.at(-1)?.mesh;
      if(TT.casings.length<=original || mesh?.userData.caseOf!==id || mesh.geometry!==spentCaseGeometry(T,id) || !mesh.material.vertexColors)
        throw Error('Missing game case '+id);
      const geo=mesh.geometry;geo.computeBoundingBox();
      // Keep the sampled finish when the pool fades the original effect.
      const copy=new T.Mesh(geo,mesh.material.clone());
      copy.userData.sampleGeometry=geo;
      copy.position.set(id==='pistol'?-.011:.011,-geo.boundingBox.min.y,0);
      stage.add(copy);samples.set(id,copy);
      return {id,size:geo.boundingBox.getSize(new T.Vector3()).toArray(),pooledScale:mesh.scale.toArray(),vertices:geo.attributes.position.count};
    };
    window.poseEjection=async(mode,name)=>{
      const L=LIGHTS[name],target=stage.position.clone().add(new T.Vector3(0,.34,0));
      stage.visible=mode==='props' || mode==='original-props';
      if(stage.visible){
        if(samples.size!==2)throw Error('Need both game cases');
        // The previous pistol and Wasp used the same geometry. Replay that
        // original assignment with the still-identical Wasp sample for the plate.
        const left=samples.get('pistol');
        left.geometry=mode==='original-props'?samples.get('uzi').geometry:left.userData.sampleGeometry;
        left.position.y=-left.geometry.boundingBox.min.y;
        H.attach(null);TT.setViewFirstDbg(false);
        for(let i=0;i<75;i++)TT.stepFrame(1/30);
        if(TT.fpDbg().w>.01)throw Error('Eye overlay still present in specimen view');
        const pos=target.clone().add(new T.Vector3(.12,1.05,2.5));
        TT.setShotView({x:pos.x,y:pos.y,z:pos.z,tx:target.x,ty:target.y,tz:target.z,fov:27});
      }
      H.attach({held:()=>true,scale:dt=>dt,frame:()=>{
        const focus=stage.visible?target:TT.player.position;
        H.sun.position.copy(focus).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
        H.sun.target.position.copy(focus);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
        H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
      }});
      // Present several frames after the camera cut before reading WebGPU back.
      for(let i=0;i<5;i++){
        TT.stepFrame(1/120);
        await new Promise(r=>setTimeout(r,100));
      }
    };
  })()`);
  if(phase==='timing'){
    await page.evaluate("TT.applyGraphicsPreset('high');ejectSample('pistol')");
    await page.evaluate('TT.flightHold(false)');
    const samples=[];
    for(let i=0;i<12;i++){
      await new Promise(r=>setTimeout(r,1000));
      const v=await page.evaluate('({gun:TT.viewmodelDbg().info.key,gfx:TT.getGfx(),...TT.perfSnapshot()})');
      assert.equal(v.gun,'pistol');assert.equal(v.gfx,'high');samples.push({fps:v.fps,low:v.low});
    }
    const mean=k=>samples.slice(2).reduce((sum,v)=>sum+v[k],0)/10;
    await save(new URL('samples.json',folder),JSON.stringify({readyMs,samples},null,2));
    assert.deepEqual(page.errors,[]);
    console.log('PASS High pistol after ejection',readyMs,'ms to ready',mean('fps').toFixed(1),'fps',mean('low').toFixed(1),'low');
  } else await pictures();
  async function pictures(){
  const report={};
  for(const subject of (phase==='after'?['pistol','uzi','original-props','props']:['pistol','uzi','props'])){
    if(subject==='pistol' || subject==='uzi')report[subject]=await page.evaluate('ejectSample('+JSON.stringify(subject)+')');
    for(const light of lights){
      await page.evaluate('poseEjection('+JSON.stringify(subject)+','+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
      await save(new URL(subject+'-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
  }
  assert.deepEqual(page.errors,[]);
  assert.deepEqual(report.pistol.pooledScale,[1,1,1]);assert.deepEqual(report.uzi.pooledScale,[1,1,1]);
  await save(new URL('proof.json',folder),JSON.stringify(report,null,2));
  console.log('PASS two actual ejected props in four lights',phase,JSON.stringify(report));
  }
} finally { await browser.close(); await server.close(); }
