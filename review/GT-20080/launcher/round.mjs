import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/cdp.mjs';
import { serve } from '../../../tools/serve.mjs';
import { save } from '../../GT-20076/save.mjs';

const phase = process.argv[2];
const timing = phase === 'timing-before' || phase === 'timing-after';
assert((timing || ['before', 'after'].includes(phase)) && process.env.DW_GAME_TEST_TOKEN);
const folder = process.argv.includes('--instances') ? new URL('../../GT-20081/launcher-reload/',import.meta.url) : new URL('./' + phase + '/', import.meta.url);
await mkdir(folder, {recursive:true});
const server = await serve(fileURLToPath(new URL('../../../', import.meta.url)), 0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:1152,height:648});
  const started = Date.now();
  await page.goto(server.origin + '/index.html?debug=1' + (timing ? '' : '&raf=timer'));
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs = Date.now() - started;
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.grantAllWeapons();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();TT.setWeapon(TT.WEAPON_ORDER.indexOf('launcher'))");
  assert(await page.waitFor('TT.viewmodelDbg()?.info.key==="launcher" && TT.viewmodelDbg().info.raise>.98'));
  if (timing) {
    await page.evaluate("TT.applyGraphicsPreset('high');TT.setAmmoDbg('launcher',3);TT.getReserve()['40mm']=12;TT.startReload();TT.reloadClipDbg.hold(.34)");
    assert(await page.waitFor('TT.isReloading() && TT.viewmodelDbg()?.gun?.loadRound?.visible'));
    const samples = [];
    for (let i = 0; i < 12; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const sample = await page.evaluate("({gfx:TT.getGfx(),visible:TT.viewmodelDbg()?.gun?.loadRound?.visible,...TT.perfSnapshot()})");
      assert.equal(sample.gfx, 'high');assert.equal(sample.visible, true);
      samples.push({fps:sample.fps,low:sample.low});
    }
    const mean = k => samples.slice(2).reduce((sum, item) => sum + item[k], 0) / 10;
    await save(new URL('samples.json',folder),JSON.stringify({readyMs,samples},null,2));
    assert.deepEqual(page.errors,[]);
    console.log('PASS launcher incoming prop in view, High,',readyMs,'ms,',mean('fps').toFixed(1),'fps,',mean('low').toFixed(1),'low');
  } else await capture();
  async function capture() {
  const result = await page.evaluate(`(async()=>{
    const T=TT.THREE, host=TT.inspectHost(), gun=TT.weaponMeshes.launcher, parts=gun.userData;
    const {LIGHTS}=await import('/studio/inspector/stage.js');
    const art=await import('/studio/weapon-casings.js');
    const spent=art.spentCaseGeometry(T,'launcher'), live=art.roundGeometry(T,'launcher');
    const {makeLauncherModel}=await import('/studio/weapon-heavy.js');
    const raw=makeLauncherModel({...host.builders.weaponContext(),finishGun:node=>node}).userData;
    const bank=raw.drum.getObjectByName('launcher-loaded-inserts');
    const originalParts=[raw.loadRound,...raw.drumRounds];
    const usesLive=!!live && (bank ? bank.isInstancedMesh && bank.geometry===live && bank.material.vertexColors &&
      bank.userData.artworkSlots.length===6 && raw.drumRounds.every((o,i)=>o.name===bank.userData.artworkSlots[i].name) &&
      raw.loadRound.children.some(o=>o.geometry===live && o.material.vertexColors) :
      originalParts.every(part=>part.children.some(m=>m.geometry===live && m.material.vertexColors)));
    const {verifyArtworkInstances}=await import('/review/GT-20081/verify.mjs');
    const css=document.createElement('style');
    css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';
    document.head.append(css);
    TT.flightHold(true); TT.setOtsAimDbg(0,-.08);
    const step=(n)=>{for(let i=0;i<n;i++)TT.stepFrame(1/60)};
    step(100);TT.setAmmoDbg('launcher',6);TT.getReserve()['40mm']=12;
    const start=TT.launcherBrassDbg().thrown;
    for(let tries=0;tries<18 && TT.getAmmo().launcher>3;tries++){
      TT.setMouseFireDbg(true);step(5);TT.setMouseFireDbg(false);step(42);
    }
    if(TT.getAmmo().launcher!==3 || TT.launcherBrassDbg().spent!==3)throw Error('Failed to reach three fired: '+JSON.stringify([TT.getAmmo().launcher,TT.launcherBrassDbg()]));
    TT.startReload();TT.reloadClipDbg.hold(.25);step(12);
    const thrown=TT.launcherBrassDbg().thrown-start;
    const emitted=TT.casings.filter(c=>c.mesh.userData.caseOf==='launcher');
    if(thrown!==3 || !emitted.some(c=>c.mesh.geometry===spent && c.mesh.material.vertexColors))throw Error('Ejection mismatch '+thrown+'/'+emitted.length);
    const afterEject=parts.drumRounds.map(r=>r.visible);
    const counts=()=>({held:verifyArtworkInstances(T,gun),eye:verifyArtworkInstances(T,TT.viewmodelDbg().gun.root)});
    const partialCounts=bank?counts():null;
    const pairs=new Map(TT.viewmodelDbg().gun.pairs);
    const eyeParts=parts.drumRounds.map(r=>pairs.get(r));
    const eyeAfterEject=eyeParts.map(r=>r?.visible??null);
    const stage=new T.Group();stage.visible=false;stage.position.set(20,80,-60);stage.scale.setScalar(12);TT.scene.add(stage);
    const target=stage.position.clone().add(new T.Vector3(0,.49,0));
    // Photograph copies of the actual palm and ejected artwork with their normal materials.
    const holder=new T.Group(),palm=TT.cloneLean(parts.loadRound);
    palm.visible=true;palm.position.set(0,0,0);palm.quaternion.identity();holder.add(palm);
    holder.rotation.x=-Math.PI/2;holder.scale.setScalar(gun.scale.x/TT.getWeaponSizeDbg().upm);
    stage.add(holder);
    const brass=emitted[0].mesh.clone();brass.visible=true;brass.position.set(0,0,0);brass.quaternion.identity();
    brass.material=brass.material.clone();brass.material.color.setRGB(.96,.95,.94);brass.material.opacity=1;stage.add(brass);
    holder.position.set(-.036,0,0);brass.position.set(.036,0,0);
    stage.updateMatrixWorld(true);
    for(const node of [holder,brass]){
      const box=new T.Box3().setFromObject(node),base=stage.worldToLocal(box.min.clone()).y;
      node.position.y-=base;
    }
    let light='noon';
    const illuminate=()=>{
      const L=LIGHTS[light],p=stage.visible?target:TT.player.position;
      host.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),75);
      host.sun.target.position.copy(p);host.sun.target.updateMatrixWorld();host.sun.color.setHex(L.sunColor);host.sun.intensity=L.sun;
      host.hemi.color.setHex(L.skyColor);host.hemi.groundColor.setHex(L.ground);host.hemi.intensity=L.sky;host.ambientFill.intensity=L.fill;host.moon.intensity=0;
    };
    host.attach({held:()=>false,scale:dt=>dt,frame:illuminate});
    window.artFrame=async(view,lightName)=>{
      light=lightName;stage.visible=view==='props';
      TT.setViewFirstDbg(!stage.visible);
      if(stage.visible){
        const eye=target.clone().add(new T.Vector3(.2,1.1,2.9));
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:target.x,ty:target.y,tz:target.z,fov:32});
      }else TT.setShotView(null);
      TT.reloadClipDbg.hold(view==='open'?.25:.34);
      step(50);
      for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,70));step(2)}
      const vm=TT.viewmodelDbg(),palmVisible=!!vm.gun?.loadRound?.visible;
      if(!stage.visible && (!vm.info.active || !TT.isReloading() || palmVisible!==(view==='palm')))throw Error('Missing '+view+' in game camera');
      return {view,light,palmVisible,loaded:TT.getAmmo().launcher};
    };
    window.finishArt=()=>{
      stage.visible=false;TT.setShotView(null);TT.setViewFirstDbg(true);
      TT.reloadClipDbg.hold(null);step(750);
      return {instanceCounts:bank?counts():null,loaded:TT.getAmmo().launcher,shown:parts.drumRounds.filter(o=>o.visible).length,eye:parts.drumRounds.filter(r=>new Map(TT.viewmodelDbg().gun.pairs).get(r)?.visible).length,reloading:TT.isReloading()};
    };
    const meshFinish = m => ({roughness:m.roughness,metalness:m.metalness});
    return {thrown,afterEject,eyeAfterEject,partialCounts,caseGeometryMatches:true,usesLive,liveCached:!!live && art.roundGeometry(T,'launcher')===live,
      liveFinish:meshFinish(raw.loadRound.children[0].material),spentFinish:meshFinish(emitted[0].mesh.material)};
  })()`);
  result.frames=[];
  for(const view of ['open','palm','props']){
    for(const light of ['noon','overcast','dusk','night']){
      result.frames.push(await page.evaluate('artFrame('+JSON.stringify(view)+','+JSON.stringify(light)+')'));
      const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:94});
      await save(new URL(view+'-'+light+'.jpg',folder),Buffer.from(shot.data,'base64'));
    }
  }
  result.end=await page.evaluate('finishArt()');
  await save(new URL('proof.json',folder),JSON.stringify(result,null,2));
  if(process.argv.includes('--instances')){
    for(const view of ['held','eye']){
      assert.equal(result.partialCounts[view]['launcher-loaded-inserts'],3);
      assert.equal(result.end.instanceCounts[view]['launcher-loaded-inserts'],6);
    }
  }
  if(phase==='after'){
    assert(result.usesLive && result.liveCached,'Palm and all six inserts should use the cached live prop');
    assert.deepEqual(result.spentFinish,result.liveFinish,'The actual emitted case should share the incoming prop finish');
  }
  assert.deepEqual(result.afterEject,[true,true,true,false,false,false]);
  assert.deepEqual(result.eyeAfterEject,result.afterEject);assert.equal(result.end.eye,6);
  assert.deepEqual(result.end.loaded,6);assert.equal(result.end.shown,6);assert.equal(result.end.reloading,false);
  assert.deepEqual(page.errors,[]);
  console.log('PASS',phase,result.frames.length,'frames, three real ejected props; held and eye occupancy',result.afterEject,result.eyeAfterEject,'end',result.end);
  }
} finally {await browser.close();await server.close()}
