import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/cdp.mjs';
import { serve } from '../../../tools/serve.mjs';
import { save } from '../../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','timing'].includes(phase));
const folder = new URL('./' + phase + '/', import.meta.url);
await mkdir(folder, {recursive:true});
const server = await serve(fileURLToPath(new URL('../../../', import.meta.url)), 0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:1280,height:720});
  const started = Date.now();
  await page.goto(server.origin + (phase === 'timing' ? '/index.html?debug=1' : '/index.html?debug=1&raf=timer'));
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs = Date.now() - started;
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Prop review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.grantAllWeapons(); TT.setViewFirstDbg(true); if(TT.isUnarmed()) TT.toggleHolster(); TT.setWeapon(TT.WEAPON_ORDER.indexOf('revolver'))");
  assert(await page.waitFor('TT.viewmodelDbg().info.key==="revolver" && TT.viewmodelDbg().info.raise>.98'));
  if (phase === 'timing') {
    await page.evaluate("TT.applyGraphicsPreset('high'); TT.setMagazinesDbg('revolver',2,[5]); TT.setRevolverSpentDbg(3); TT.startReload(); TT.reloadClipDbg.hold(.47)");
    assert(await page.waitFor('TT.isReloading() && TT.viewmodelDbg()?.gun?.speedloader?.visible'));
    const samples = [];
    for(let i=0;i<12;i++){
      await new Promise(resolve=>setTimeout(resolve,1000));
      const sample=await page.evaluate("({key:TT.viewmodelDbg().info.key,gfx:TT.getGfx(),count:TT.viewmodelDbg().gun.speedloader.children.slice(1).filter(o=>o.visible).length,...TT.perfSnapshot()})");
      assert.equal(sample.key,'revolver');assert.equal(sample.gfx,'high');assert.equal(sample.count,5);
      samples.push({fps:sample.fps,low:sample.low});
    }
    const mean = key=>samples.slice(2).reduce((sum,s)=>sum+s[key],0)/10;
    await save(new URL('samples.json',folder),JSON.stringify({readyMs,samples},null,2));
    assert.deepEqual(page.errors,[]);
    console.log('PASS 12 High samples with five incoming rounds: ready',readyMs,'ms,',mean('fps').toFixed(1),'fps,',mean('low').toFixed(1),'low');
  } else await captures();
  async function captures(){
    const report = await page.evaluate(`(async()=>{
      const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
      const lib=await import('/studio/weapon-casings.js'),ud=TT.weaponMeshes.revolver.userData;
      const make=(await import('/studio/weapon-sidearms.js')).makeRevolverModel;
      const raw=make({...H.builders.weaponContext(),finishGun:g=>g}).userData;
      const ref=lib.roundGeometry(T,'revolver');
      const stage=new T.Group();
      stage.position.set(20,80,-60);stage.scale.setScalar(14);
      stage.visible=false;TT.scene.add(stage);
      const props={loader:raw.speedloader.children[1],palm:raw.palmRounds.children[0],empty:raw.emptyCasings[0]};
      const bounds={};
      let col=0;
      for(const [name,part] of Object.entries(props)){
        const clone=TT.cloneLean(part);
        clone.visible=true;clone.position.set(0,0,0);clone.rotation.set(0,0,0);
        const box=new T.Box3().setFromObject(clone);
        bounds[name]={min:box.min.toArray(),max:box.max.toArray()};
        const mount=new T.Group();
        mount.rotation.x=-Math.PI/2;mount.add(clone);
        mount.position.set((col++-1)*.04,-box.min.z,0);stage.add(mount);
      }
      const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
      document.head.append(css);
      TT.setOtsAimDbg(0,-.08);TT.flightHold(true);
      for(let i=0;i<80;i++)TT.stepFrame(1/30);
      TT.setMagazinesDbg('revolver',2,[5]);TT.setRevolverSpentDbg(3);
      TT.startReload();
      let light='noon';
      const target=stage.position.clone().add(new T.Vector3(0,.40,0));
      H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
        const L=LIGHTS[light],p=stage.visible?target:TT.player.position;
        H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
        H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
        H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;
        H.ambientFill.intensity=L.fill;H.moon.intensity=0;
      }});
      window.sampleReload=async(name,beat,lightName)=>{
        stage.visible=name==='props';light=lightName;
        if(stage.visible){
          TT.setViewFirstDbg(false);
          const eye=target.clone().add(new T.Vector3(.48,.85,2.6));
          TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:30});
        }else{
          TT.setShotView(null);TT.setViewFirstDbg(true);
        }
        TT.reloadClipDbg.hold(beat);
        for(let i=0;i<48;i++)TT.stepFrame(1/30);
        for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,70));TT.stepFrame(1/30)}
        if(stage.visible)return {name};
        const vm=TT.viewmodelDbg(),g=vm.gun;
        return {name,at:beat,key:vm.info.key,active:vm.info.active,reloading:TT.isReloading(),counts:TT.vmStateDbg().rounds,
          empty:g.empties.visible?g.empties.children.filter(o=>o.visible).length:0,
          palm:g.palmRounds.visible?g.palmRounds.children.filter(o=>o.visible).length:0,
          loader:g.speedloader.visible?g.speedloader.children.slice(1).filter(o=>o.visible).length:0};
      };
      return {bounds,mmPerLocal:1000*TT.weaponMeshes.revolver.scale.x/TT.getWeaponSizeDbg().upm,liveExport:!!ref,spentCached:lib.spentCaseGeometry(T,'revolver')===lib.spentCaseGeometry(T,'revolver'),
        liveUsed:!!ref && raw.palmRounds.children[0].children.some(o=>o.geometry===ref)
          && raw.speedloader.children[1].children.some(o=>o.geometry===ref)};
    })()`);
    report.frames=[];
    for(const [name,beat] of [['empty',.205],['palm',.302],['loader',.47],['props',.47]]){
      for(const light of ['noon','overcast','dusk','night']){
        const frame=await page.evaluate('sampleReload('+[name,beat,light].map(JSON.stringify).join(',')+')');
        if(name!=='props'){
          assert.equal(frame.key,'revolver');assert(frame.active && frame.reloading);
          assert.deepEqual(frame.counts,{spent:3,live:2,load:5});
          assert.equal(frame[name],{empty:3,palm:2,loader:5}[name]);
        }
        const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
        await save(new URL(name+'-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
        report.frames.push({...frame,light});
      }
    }
    await save(new URL('proof.json',folder),JSON.stringify(report,null,2));
    assert.deepEqual(page.errors,[]);
    if(phase==='after')assert(report.liveExport && report.liveUsed && report.spentCached);
    console.log('PASS',phase,report.frames.length,'frames; mixed reload showed 3 empties, 2 retained and 5 incoming',JSON.stringify(report.bounds));
  }
} finally { await browser.close(); await server.close(); }
