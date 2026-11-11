import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../../tools/cdp.mjs';
import {serve} from '../../../tools/serve.mjs';
import {save} from '../../GT-20076/save.mjs';

const phase=process.argv[2];assert(['before','after'].includes(phase)&&process.env.DW_GAME_TEST_TOKEN);
const dir=new URL('./'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../../', import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1280,height:720});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Finish review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    TT.flightHold(true);TT.setOtsAimDbg(0,-.08);
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    let light='noon',fill=null,hemi=null;
    H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light],p=TT.player.position;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
      H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.useGun=id=>{
      TT.setShotView(null);TT.setViewFirstDbg(true);TT.setZoomHeldDbg(false);
      for(let i=0;i<30&&TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));step(12)}
      const range=TT.trainingDbg.tg();
      TT.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);
      TT.setOtsAimDbg(0,-.08);step(120);
      const arm=TT.armoryDbg.ui().armory;if(!TT.armoryDbg.stored().includes(id))arm.buy({id:'glare-rack-'+id,kind:id},{store:true});
      TT.armoryDbg.refreshRack(true);
      if(TT.viewmodelDbg().info.key!==id)throw Error('Missing '+id);
    };
    window.glareMods=(id,kind)=>{
      TT.setShotView(null);TT.setViewFirstDbg(true);TT.setZoomHeldDbg(false);
      for(const m of TT.armoryDbg.mods(id)){
        if(m.id.startsWith('optic:')||['suppressor','laserLight','extMag'].includes(m.id)){
          const selected=!!kind && [kind && 'optic:'+kind,'suppressor','laserLight'].includes(m.id);
          TT.armoryDbg.fit(id,m.id,selected);
        }
      }
      step(42);
      const actual=TT.weaponMeshes[id].userData.fittedOptic?.userData.kind||null;
      if(actual!==kind)throw Error('Wrong Armory fit '+actual+' / '+kind);
    };
    window.glareFinish=(id,finish)=>{
      if(!TT.armoryFinishDbg.paint(id,finish)||TT.armoryFinishDbg.list(id).current!==finish)throw Error('Wrong finish '+finish);
      step(42);
    };
    window.glareFrame=async(id,view,lighting)=>{
      light=lighting;
      if(fill){TT.scene.remove(fill,fill.target,hemi);fill=null;hemi=null}
      TT.setShotView(null);TT.setViewFirstDbg(view!=='rack');TT.setZoomHeldDbg(view==='aimed');
      if(view!=='rack'){
        // Re-entering first person after the rack initializes yaw from the previous third-person camera.
        // Restore the recorded range heading once that normal transition has run.
        step(24);
        const range=TT.trainingDbg.tg();TT.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);TT.setOtsAimDbg(0,-.08);
      }
      if(view==='rack'){
        TT.armoryDbg.refreshRack(true);
        const rack=TT.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
        const model=rack.children.find(o=>o.userData.rackKind===id);
        const bounds=new T.Box3().setFromObject(model),pivot=bounds.getCenter(new T.Vector3());
        const size=bounds.getSize(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
        const eye=new T.Vector3(.10,.06,1).applyQuaternion(rack.getWorldQuaternion(new T.Quaternion())).multiplyScalar(Math.max(.68,span*1.38)).add(pivot);
        TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:pivot.x,ty:pivot.y,tz:pivot.z,fov:36});
        const c=rack.getWorldPosition(new T.Vector3());
        fill=new T.DirectionalLight(0xffecd6,2.35);fill.position.copy(c).add(new T.Vector3(-1.8,2.6,3.4));fill.target.position.copy(c);
        hemi=new T.HemisphereLight(0xf3f7ff,0xc7bba9,1.55);TT.scene.add(fill,fill.target,hemi);
      }
      step(view==='rack'?16:54);
      for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,65));step(1)}
      if(view==='rack')return {view,light};
      const vm=TT.viewmodelDbg().info;
      if(!vm.active||vm.key!==id||(view==='aimed'?vm.ads<.97:vm.ads>.03))throw Error('Wrong eye pose '+id+' '+view);
      return {view,light,ads:vm.ads,key:id,finish:TT.armoryFinishDbg.list(id).current,dir:H.camera.getWorldDirection(new T.Vector3()).toArray()};
    };
  })()`);
  const frames=[];
  const call=(name,...args)=>page.evaluate(name+'('+args.map(a=>JSON.stringify(a)).join(',')+')');
  async function shot(id,view,light,file){
    frames.push(await call('glareFrame',id,view,light));
    const capture=await page.send('Page.captureScreenshot',{format:'png'});
    await save(new URL(file+'.png',dir),Buffer.from(capture.data,'base64'));
  }
  const mountsOnly=process.argv.includes('--mounts');
  for(const id of (mountsOnly?['ak']:['revolver','ak'])){
    await call('useGun',id);await call('glareMods',id,null);
    for(const finish of (mountsOnly?[]:['','m81'])){
      await call('glareFinish',id,finish);
      for(const light of ['noon','overcast','dusk','night'])
        await shot(id,'aimed',light,[id,finish||'factory','aimed',light].join('-'));
    }
    if(id==='ak')await call('glareFinish',id,'m81');
    if(id==='ak')for(const optic of ['acog','rmr']){
      await call('glareMods',id,optic);
      await shot(id,'rack','noon',id+'-'+optic+'-rack');
      await shot(id,'hip','noon',id+'-'+optic+'-hip');
    }
  }
  await save(new URL(mountsOnly?'mount-frames.json':'frames.json',dir),JSON.stringify(frames,null,2));
  assert.deepEqual(page.errors,[]);console.log('PASS',phase,frames.length,'AG-294 player-eye and fitted Training rack views');
}finally{await browser.close();await server.close()}
