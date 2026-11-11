import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';
const phase=process.argv[2];assert(process.env.DW_GAME_TEST_TOKEN && ['before','after'].includes(phase));
const seam=process.argv.includes('--j128');
const dir=new URL(seam?'../GT-20076/visible-repairs/uzi/effect-'+phase+'/':'./wasp-effect-'+phase+'/',import.meta.url);await mkdir(dir,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1152,height:648});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Effect artwork';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate(`(async()=>{
    const T=TT.THREE,H=TT.inspectHost(),{LIGHTS}=await import('/studio/inspector/stage.js');
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.addCash(100000);TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    TT.flightHold(true);const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/60)};
    for(let i=0;i<20&&TT.getCurrentWeapon()!=='uzi';i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf('uzi'));step(30)}step(90);
    const range=TT.trainingDbg.tg();TT.player.position.set(range.origin.x,range.floorY,range.origin.z-.55);TT.setOtsAimDbg(0,-.08);
    if(!TT.armoryDbg.fit('uzi','suppressor',true))throw Error('Game appearance was not equipped');
    TT.armoryDbg.fit('uzi','laserLight',false);step(90);
    const css=document.createElement('style');css.textContent='body > :not(canvas):not(script):not(style):not(#view){visibility:hidden!important}';document.head.append(css);
    let light='noon';H.attach({held:()=>false,scale:dt=>dt,frame:()=>{
      const L=LIGHTS[light],p=TT.player.position;H.sun.position.copy(p).addScaledVector(new T.Vector3(...L.dir).normalize(),85);
      H.sun.target.position.copy(p);H.sun.target.updateMatrixWorld();H.sun.color.setHex(L.sunColor);H.sun.intensity=L.sun;
      H.hemi.color.setHex(L.skyColor);H.hemi.groundColor.setHex(L.ground);H.hemi.intensity=L.sky;H.ambientFill.intensity=L.fill;H.moon.intensity=0;
    }});
    window.effectFrame=async name=>{
      light=name;step(100);await new Promise(r=>setTimeout(r,80));step(2);
      const gun=TT.weaponMeshes.uzi,u=gun.userData,ammo=TT.getAmmo().uzi;TT.setMouseFireDbg(true);
      for(let i=0;i<240&&ammo===TT.getAmmo().uzi;i++)TT.stepFrame(1/240);
      TT.setMouseFireDbg(false);
      const data={light,delta:ammo-TT.getAmmo().uzi,appearance:u.suppressor.visible,eye:TT.viewmodelDbg().info.key,
        flashVisible:u.flash.visible,flashOpacity:u.flash.material.opacity};
      if(data.delta!==1||!data.appearance||data.eye!=='uzi')throw Error('Missing actual game event '+JSON.stringify(data));
      return data;
    };
  })()`);
  const rows=[];for(const light of ['noon','overcast','dusk','night']){
    rows.push(await page.evaluate('effectFrame('+JSON.stringify(light)+')'));
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:95});
    await save(new URL(light+'.jpg',dir),Buffer.from(shot.data,'base64'));
  }
  if(seam){
    const settings=await page.evaluate(`(()=>{
      const T=TT.THREE;
      const inspect=gun=>{
        const u=gun.userData,graphic=u.suppressor, wasOn=u.suppressed;
        TT.setGunSuppressor(gun,true);gun.updateWorldMatrix(true,true);
        const toGun=gun.matrixWorld.clone().invert();let front=-Infinity;
        graphic.traverseVisible(mesh=>{
          const pos=mesh.geometry?.attributes?.position;
          if(!mesh.isMesh || !pos || mesh.material?.visible===false)return;
          const transform=toGun.clone().multiply(mesh.matrixWorld),point=new T.Vector3();
          for(let i=0;i<pos.count;i++)front=Math.max(front,point.fromBufferAttribute(pos,i).applyMatrix4(transform).z);
        });
        const enabled={front,anchor:u.muzzleLocal.z,flash:u.flash.position.z,visible:graphic.visible};
        TT.setGunSuppressor(gun,false);
        const disabled={anchor:u.muzzleLocal.toArray(),flash:u.flash.position.toArray(),base:u.muzzleBase.toArray(),visible:graphic.visible};
        TT.setGunSuppressor(gun,wasOn);
        return {enabled,disabled};
      };
      return {primary:inspect(TT.weaponMeshes.uzi),offhand:inspect(TT.offhandMeshes.uzi)};
    })()`);
    await save(new URL('endpoints.json',dir),JSON.stringify(settings,null,2)+'\n');
    for(const {enabled,disabled} of Object.values(settings)){
      assert(enabled.visible && !disabled.visible && Number.isFinite(enabled.front));
      assert.deepEqual(disabled.anchor,disabled.base);assert.deepEqual(disabled.flash,disabled.base);
      assert(Math.abs(enabled.flash-enabled.anchor)<1e-6);
      if(phase==='after')assert(Math.abs(enabled.front-enabled.anchor)<1e-6,'Visible artwork ends away from the game effect anchor');
    }
  }
  await save(new URL('frames.json',dir),JSON.stringify(rows,null,2));assert.deepEqual(page.errors,[]);console.log('PASS Wasp actual effect frames',phase,JSON.stringify(rows));
}finally{await browser.close();await server.close()}
