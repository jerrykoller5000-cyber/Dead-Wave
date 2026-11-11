import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {serve} from '../../../tools/serve.mjs';
import {launch} from '../../../tools/cdp.mjs';
import {save} from '../../GT-20076/save.mjs';

const phase=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','binding','integrated'].includes(phase));
const dir=new URL('./ce6-'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='CE6 artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor("TT.trainingDbg.state().active && !document.getElementById('trainingBlackout')?.classList.contains('on')"));
  await page.evaluate('window.reviewPhase='+JSON.stringify(phase));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),g=TT.weaponMeshes.launcher,d=g.userData;
    const {updateArtworkInstances}=await import('/studio/weapon-model-hooks.js');
    const {verifyArtworkInstances}=await import('/review/GT-20081/verify.mjs');
    const {spentCaseGeometry}=await import('/studio/weapon-casings.js');
    const {makeViews}=await import('/review/GT-20076/visibility-camera.mjs');
    const vis=makeViews(TT);await vis.equip('launcher');await vis.pose('hip');
    // Release the review freeze to exercise the running game's input and reload.
    let frozen=false,lighting;const {LIGHTS}=await import('/studio/inspector/stage.js');
    function illuminate(){
      if(!lighting)return;
      const p=TT.player.position,L=LIGHTS[lighting];
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);
      H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }
    H.attach({held:()=>frozen,scale:dt=>dt,frame:illuminate});
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/60)};
    TT.setAmmoDbg('launcher',6);TT.getReserve()['40mm']=0;step(50);
    const read=(root)=>{
      const c=verifyArtworkInstances(T,root);
      return [c['launcher-loaded-inserts'],c['launcher-spent-inserts']||0];
    };
    const syncBinding=()=>{
      if(reviewPhase!=='binding')return;
      const shown=TT.getAmmo().launcher,eye=TT.viewmodelDbg().gun?.root;
      for(const [i,n] of d.drumNoses.entries()){
        n.visible=i<shown;if(eye)eye.getObjectByName(n.name).visible=n.visible;
      }
      updateArtworkInstances(T,g);if(eye)updateArtworkInstances(T,eye);
    };
    window.state=()=>{
      syncBinding();
      const eye=TT.viewmodelDbg().gun.root;
      return {ammo:TT.getAmmo().launcher,occupancy:d.drumRounds.map(r=>r.visible),flags:d.drumNoses?.map(o=>o.visible),
        held:read(g),eye:read(eye),independent:d.drumNoses?.every(n=>eye.getObjectByName(n.name)!==n && !!eye.getObjectByName(n.name)),
        eyeFlags:d.drumNoses?.map(n=>eye.getObjectByName(n.name).visible),
        acceptedCase:g.getObjectByName('launcher-spent-inserts')?.geometry===spentCaseGeometry(T,'launcher')};
    };
    window.shot=()=>{
      frozen=false;TT.setShotView(null);TT.setViewFirstDbg(true);step(65);
      const start=TT.getAmmo().launcher;TT.setMouseFireDbg(true);
      for(let f=0;f<25 && TT.getAmmo().launcher===start;f++)step(1);
      TT.setMouseFireDbg(false);step(42);
      if(TT.getAmmo().launcher!==start-1)throw Error('Missed shot at '+start);
      return state();
    };
    window.camera=async(view,light)=>{
      frozen=false;TT.setShotView(null);TT.setViewFirstDbg(view==='hip');step(65);syncBinding();
      if(view==='front'){
        const centre=d.drum.localToWorld(new T.Vector3(0,0,.02));
        const eye=d.drum.localToWorld(new T.Vector3(.12,.04,.57));
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:32});
      }
      lighting=light;frozen=true;
      for(let i=0;i<3;i++){step(1);await new Promise(r=>setTimeout(r,45));}
    };
    window.openPreview=()=>{
      frozen=false;TT.setShotView(null);TT.setViewFirstDbg(false);step(65);
      TT.getReserve()['40mm']=18;TT.startReload();TT.reloadClipDbg.hold(.18);step(20);
      if(TT.launcherBrassDbg().spent!==6 || !d.drumRounds.every(r=>r.visible))throw Error('Wrong pre-ejection display '+JSON.stringify({spent:TT.launcherBrassDbg(),occupied:d.drumRounds.map(n=>n.visible),loading:TT.isReloading(),ammo:TT.getAmmo().launcher}));
      syncBinding();
      const centre=d.drum.localToWorld(new T.Vector3(0,0,0));
      const eye=d.drum.localToWorld(new T.Vector3(.045,.026,.56));
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:centre.x,ty:centre.y,tz:centre.z,fov:34});
      frozen=true;
    };
    window.preview=async(original,light)=>{
      const saved=d.drumNoses.map(n=>n.visible);
      if(original===true)for(const n of d.drumNoses)n.visible=true;
      updateArtworkInstances(T,g);
      const spent=g.getObjectByName('launcher-spent-inserts'),copies=[];
      if(original==='empty' || original==='individual'){
        if(original==='individual')for(let i=0;i<spent.count;i++){
          const mesh=new T.Mesh(spent.geometry,spent.material),m=new T.Matrix4();
          spent.getMatrixAt(i,m);m.decompose(mesh.position,mesh.quaternion,mesh.scale);spent.parent.add(mesh);copies.push(mesh);
        }
        spent.visible=false;
      }
      lighting=light;step(1); await new Promise(r=>setTimeout(r,120));step(1);
      window.restorePreview=()=>{for(const m of copies)m.removeFromParent();d.drumNoses.forEach((n,i)=>{n.visible=saved[i]});updateArtworkInstances(T,g);};
    };
    window.refill=()=>{TT.reloadClipDbg.hold(null);step(750);return state();};
    window.eject=()=>{frozen=false;TT.setShotView(null);TT.setViewFirstDbg(true);TT.getReserve()['40mm']=18;if(!TT.isReloading())TT.startReload();TT.reloadClipDbg.hold(.25);step(50);return state();};
  })()`);
  const rows=[await page.evaluate('state()')];
  for(let i=0;i<6;i++){
    rows.push(await page.evaluate('shot()'));
    if(i===2){
      for(const view of ['hip','front'])for(const light of ['noon','overcast','dusk','night']){
        await page.evaluate('camera('+[view,light].map(s=>JSON.stringify(s)).join(',')+')');
        const shot=await page.send('Page.captureScreenshot',{format:'png'});
        await save(new URL(view+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
      }
    }
  }
  if(phase!=='before'){
    await page.evaluate('openPreview()');
    for(const light of ['noon','overcast','dusk','night'])for(const original of (light==='overcast'?[true,false,'empty','individual']:[true,false])){
      await page.evaluate('preview('+JSON.stringify(original)+','+JSON.stringify(light)+')');
      const shot=await page.send('Page.captureScreenshot',{format:'png'});
      await save(new URL('open-'+(typeof original==='string'?original:original?'previous':'current')+'-'+light+'.png',dir),Buffer.from(shot.data,'base64'));
      await page.evaluate('restorePreview()');
    }
  }
  const ejected=await page.evaluate('eject()');
  const refilled=await page.evaluate('refill()');
  await save(new URL('proof.json',dir),JSON.stringify({phase,rows,ejected,refilled},null,2)+'\n');
  for(const [i,row] of rows.entries()){
    assert.equal(row.ammo,6-i);
    const expected=phase==='before'?[6,0]:[6-i,i];
    assert.deepEqual(row.held,expected);assert.deepEqual(row.eye,expected);
    assert(row.occupancy.every(Boolean));
    if(phase!=='before'){
      assert(row.independent && row.acceptedCase);
      assert.deepEqual(row.flags,Array.from({length:6},(_,j)=>j<6-i));
      assert.deepEqual(row.eyeFlags,row.flags);
    }
  }
  assert.deepEqual(ejected.held,[0,0]);assert.deepEqual(ejected.eye,[0,0]);
  assert.equal(refilled.ammo,6);assert.deepEqual(refilled.held,[6,0]);assert.deepEqual(refilled.eye,[6,0]);
  assert.deepEqual(page.errors,[]);
  console.log('PASS',phase,'seven live/spent states at eye and held:',rows.map(r=>r.held.join('/')).join(' '),'after ejection',ejected.held.join('/'));
}finally{await browser.close();await server.close();}
