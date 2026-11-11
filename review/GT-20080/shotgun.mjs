import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {setTimeout as wait} from 'node:timers/promises';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after','revised','eye-baseline','timing','timing-revised','timing-repeat'].includes(phase));
const folder = new URL('./shotgun/' + phase + '/', import.meta.url);
await mkdir(folder,{recursive:true});
const server = await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:1080,height:640});
  const start=Date.now();
  await page.goto(server.origin+'/index.html?debug=1'+(phase.startsWith('timing')?'':'&raf=timer'));
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const readyMs=Date.now()-start;
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Shell art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:45000}));
  if(phase.startsWith('timing')){
    await page.evaluate(`(async()=>{
      TT.applyGraphicsPreset('high');TT.grantAllWeapons();TT.setViewFirstDbg(true);
      if(TT.isUnarmed())TT.toggleHolster();
      while(TT.getCurrentWeapon()!=='shotgun'){
        TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));await new Promise(r=>setTimeout(r,120));
      }
      TT.setAmmoDbg('shotgun',1);TT.startReload();TT.reloadClipDbg.hold(.39);
    })()`,30000);
    assert(await page.waitFor('TT.viewmodelDbg().gun?.shell?.visible && TT.viewmodelDbg().info.raise>.98'));
    const samples=[];
    for(const type of ['birdshot','buckshot','slug']){
      await page.evaluate('TT.weaponMeshes.shotgun.userData.setReloadShellType('+JSON.stringify(type)+')');
      for(let i=0;i<4;i++){
        await wait(1000);
        const s=await page.evaluate('({eye:TT.viewmodelDbg().info.key,visible:TT.viewmodelDbg().gun.shell.visible,high:TT.getGfx(),...TT.perfSnapshot()})');
        assert.equal(s.eye,'shotgun');assert.equal(s.high,'high');assert(s.visible);
        samples.push({type,fps:s.fps,low:s.low});
      }
    }
    assert.deepEqual(page.errors,[]);
    await save(new URL('samples.json',folder),JSON.stringify({readyMs,samples},null,2));
    const avg=k=>samples.reduce((sum,s)=>sum+s[k],0)/samples.length;
    console.log('PASS 12 High samples with visible shell: ready',readyMs,'ms,',avg('fps').toFixed(1),'fps,',avg('low').toFixed(1),'low');
  } else {
  const result = await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),lib=await import('/studio/weapon-casings.js');
    const {LIGHTS}=await import('/studio/inspector/stage.js');
    const gun=TT.weaponMeshes.shotgun, shell=gun.userData.reloadShell;
    const types=['birdshot','buckshot','slug'], revised=${['after','revised'].includes(phase)};
    if(${phase==='eye-baseline'}){
      // Replay only the original two meshes in this isolated Training session,
      // before the game makes its normal first-person copy.
      const ctx=H.builders.weaponContext();
      shell.geometry=new T.CylinderGeometry(.0105,.011,.058,10);
      shell.material=ctx.shellRedMat;shell.scale.setScalar(1);
      const rim=new T.Mesh(new T.CylinderGeometry(.0118,.0118,.007,10),ctx.brassMat);
      rim.position.y=-.0255;shell.add(rim);
    } else if((typeof lib.roundGeometry==='function')!==revised)throw Error('Unexpected source stage');
    TT.grantAllWeapons();TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();
    for(let i=0;i<30&&TT.getCurrentWeapon()!=='shotgun';i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf('shotgun'));await new Promise(r=>setTimeout(r,120))}
    TT.setOtsAimDbg(0,-.08);TT.flightHold(true);
    for(let i=0;i<150;i++)TT.stepFrame(1/30);
    const style=document.createElement('style');style.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(style);
    const stage=new T.Group();stage.position.set(25,80,-60);stage.scale.setScalar(8);TT.scene.add(stage);
    const material=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:.52,metalness:.14});
    const report={};
    for(let i=0;i<types.length;i++){
      const type=types[i];
      if(revised)gun.userData.setReloadShellType(type);
      const live=shell.clone();live.rotation.set(0,0,0);live.position.set(0,0,0);live.visible=true;
      live.scale.multiplyScalar(gun.scale.x / TT.getWeaponSizeDbg().upm);
      const spent=new T.Mesh(lib.spentCaseGeometry(T,'shotgun',type),material);
      const measure=o=>new T.Box3().setFromObject(o).getSize(new T.Vector3()).toArray();
      report[type]={live:measure(live),spent:measure(spent)};
      if(revised){
        if(shell.geometry!==lib.roundGeometry(T,'shotgun',type))throw Error('Reload shell cache mismatch '+type);
        if(!shell.material.vertexColors)throw Error('Reload shell needs hull colours');
      }
      for(const [j,part] of [live,spent].entries()){
        const holder=new T.Group();holder.position.set((i-1)*.106+(j-.5)*.036,0,0);
        holder.rotation.x=.36;stage.add(holder);holder.add(part);
        // All six props rest on one baseline.
        part.position.y=report[type][j?'spent':'live'][1]/2;
      }
    }
    if(revised)gun.userData.setReloadShellType('birdshot');
    const center=stage.localToWorld(new T.Vector3(0,.042,0));
    window.shellLight='noon';window.inRack=false;
    function light(){
      const L=LIGHTS[shellLight],p=inRack?center:TT.player.position;
      H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),75);H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();
      H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;H.hemi.color.setHex(L.skyColor);
      H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }
    H.attach({held:()=>false,scale:dt=>dt,frame:light});
    async function settle(){for(let i=0;i<4;i++){TT.stepFrame(1/30);await new Promise(r=>setTimeout(r,90));}light();}
    window.shellPose=async(name,type,u=.46)=>{
      window.shellLight=name;window.inRack=!type;
      if(type){
        TT.setShotView(null);stage.visible=false;
        if(revised)gun.userData.setReloadShellType(type);
        if(!TT.isReloading()){TT.setAmmoDbg('shotgun',1);TT.startReload();}
        TT.reloadClipDbg.hold(u);
        for(let i=0;i<50;i++)TT.stepFrame(1/30);
        await settle();
        const vm=TT.viewmodelDbg(),obj=vm.gun.shell;
        if(vm.info.key!=='shotgun'||!obj)throw Error('Missing reload artwork');
        if(!obj.visible)return {type,u,visible:false,shown:0};
        const p=obj.getWorldPosition(new T.Vector3());
        const screen=vm.ndc(vm.space.worldToLocal(p));
        const eye=vm.space.localToWorld(new T.Vector3()),parts=[],samples=[],shellMeshes=new Set();
        vm.root.traverseVisible(o=>{if(o.isMesh && o.material?.visible!==false && o.material?.opacity!==0)parts.push(o)});
        obj.traverseVisible(o=>{if(o.isMesh)shellMeshes.add(o)});
        const bounds=new T.Box3().setFromObject(obj);
        const centre=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
        for(const dx of [-.28,0,.28])for(const dy of [-.28,0,.28])for(const dz of [-.28,0,.28]){
          const target=centre.clone().add(new T.Vector3(dx,dy,dz).multiply(size));
          const ndc=vm.ndc(vm.space.worldToLocal(target.clone()));
          if(Math.abs(ndc.x)>1||Math.abs(ndc.y)>1){samples.push('offscreen');continue;}
          const hit=new T.Raycaster(eye,target.sub(eye).normalize()).intersectObjects(parts,false)[0];
          samples.push(shellMeshes.has(hit?.object)?'shell':hit?.object.name||'other');
        }
        return {type,u,visible:true,screen:[screen.x,screen.y],shown:samples.filter(s=>s==='shell').length,blockers:[...new Set(samples)],vertices:obj.geometry.attributes.position.count};
      }
      stage.visible=true;TT.setViewFirstDbg(false);
      const eye=center.clone().add(new T.Vector3(.10,1.25,3.65));
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:29});
      await settle();return {light:name};
    };
    return report;
  })()`);
  const sweep=[];
  for(const u of [.30,.34,.37,.38,.39,.40,.42,.46,.50,.54,.56,.59,.64,.69,.72]){
    sweep.push(await page.evaluate('shellPose("noon","birdshot",'+u+')'));
  }
  const best=['after','revised'].includes(phase) ? JSON.parse(await readFile(new URL('../eye-baseline/proof.json',folder),'utf8')).selected :
    sweep.filter(s=>s.visible && Math.abs(s.screen[0])<.98 && Math.abs(s.screen[1])<.98).reduce((a,b)=>a.shown>=b.shown?a:b).u;
  const frames=[];
  async function capture(light,type,name){
    const frame=await page.evaluate('shellPose('+JSON.stringify(light)+','+JSON.stringify(type)+','+best+')');
    if(type)assert(frame.visible && frame.shown>0 && Math.abs(frame.screen[1])<1,'Reload prop must be visible on screen');
    frames.push(frame);
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL(name+'.jpg',folder),Buffer.from(shot.data,'base64'));
  }
  for(const type of ['birdshot','buckshot','slug'])await capture('noon',type,'eye-'+type);
  if(phase!=='eye-baseline')for(const light of ['noon','overcast','dusk','night'])await capture(light,null,light);
  assert.deepEqual(page.errors,[]);
  await save(new URL('proof.json',folder),JSON.stringify({phase,result,selected:best,sweep,frames},null,2));
  console.log('PASS',phase,'three held reloads at',best,'and',frames.filter(f=>f.light).length,'lighting views');
  }
} finally {await browser.close();await server.close();}
