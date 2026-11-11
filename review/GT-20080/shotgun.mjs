import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const phase = process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const folder = new URL('./shotgun/' + phase + '/', import.meta.url);
await mkdir(folder,{recursive:true});
const server = await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser = await launch({headless:false});
try {
  const page = await browser.newPage({width:1080,height:640});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Shell art';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:45000}));
  const result = await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),lib=await import('/studio/weapon-casings.js');
    const {LIGHTS}=await import('/studio/inspector/stage.js');
    const gun=TT.weaponMeshes.shotgun, shell=gun.userData.reloadShell;
    const types=['birdshot','buckshot','slug'], revised=typeof lib.roundGeometry==='function';
    if(revised!==${phase==='after'})throw Error('Unexpected source stage');
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
    window.shellPose=async(name,type)=>{
      window.shellLight=name;window.inRack=!type;
      if(type){
        TT.setShotView(null);stage.visible=false;
        if(revised)gun.userData.setReloadShellType(type);
        if(!TT.isReloading()){TT.setAmmoDbg('shotgun',1);TT.startReload();}
        TT.reloadClipDbg.hold(.46);
        for(let i=0;i<50;i++)TT.stepFrame(1/30);
        await settle();
        const vm=TT.viewmodelDbg(),obj=vm.gun.shell;
        if(vm.info.key!=='shotgun'||!obj.visible)throw Error('Missing live shell at the eye');
        const p=obj.getWorldPosition(new T.Vector3());
        const screen=vm.ndc(vm.space.worldToLocal(p));
        return {type,screen:[screen.x,screen.y],visible:obj.visible,vertices:obj.geometry.attributes.position.count};
      }
      stage.visible=true;TT.setViewFirstDbg(false);
      const eye=center.clone().add(new T.Vector3(.10,1.25,3.65));
      TT.setShotView({x:eye.x,y:eye.y,z:eye.z,tx:center.x,ty:center.y,tz:center.z,fov:29});
      await settle();return {light:name};
    };
    return report;
  })()`);
  const frames=[];
  async function capture(light,type,name){
    frames.push(await page.evaluate('shellPose('+JSON.stringify(light)+','+JSON.stringify(type)+')'));
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL(name+'.jpg',folder),Buffer.from(shot.data,'base64'));
  }
  for(const type of ['birdshot','buckshot','slug'])await capture('noon',type,'eye-'+type);
  for(const light of ['noon','overcast','dusk','night'])await capture(light,null,light);
  assert.deepEqual(page.errors,[]);
  await save(new URL('proof.json',folder),JSON.stringify({phase,result,frames},null,2));
  console.log('PASS',phase,'three held reloads and four lights, dimensions',JSON.stringify(result));
} finally {await browser.close();await server.close();}
