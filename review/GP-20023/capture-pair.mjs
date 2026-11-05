// GP-20023 first-person Uzi pair and geometry measurement. Use through crew.mjs slot run.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw new Error('Use the shared game-test slot');
const phase = process.argv[2];
if (!['before', 'after'].includes(phase)) throw new Error('Expected before or after');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20023');
const lights = [{name:'noon',t:0.5},{name:'dusk',t:0.77}];
fs.mkdirSync(out, {recursive:true});
const server = await serve(root, 0);
const browser = await launch({headless:false,args:['--window-position=-2400,-2400','--window-size=1920,1080','--disable-features=CalculateNativeWinOcclusion']});
try {
  const page = await browser.newPage({width:1920,height:1080});
  await page.goto(`${server.origin}/index.html?solid=1&debug=1&raf=timer`,{timeout:240000});
  if (!await page.waitFor('!!window.TT',{timeout:240000})) throw new Error('TT did not boot');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); else window.DWOpening?.skip?.(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false',{timeout:60000});
  await page.evaluate(fs.readFileSync(path.join(root,'tools/tests/lib.js'),'utf8'));
  await page.evaluate(`(async () => {
    const T=window.TT;
    await startMatch(T,'JERRY');
    T.clearZombies?.(); T.setHp(100000); T.grantAllWeapons();
    T.setViewFirstDbg(true);
    if (T.isUnarmed()) T.toggleHolster();
    T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
    T.setDualOwnedDbg('uzi',true);
    if (!T.vaultDbg.flags().dualActive) T.toggleDualWieldDbg();
    T.setWorldTime(0.5);
    if (T.weather) {T.weather.raining=false;T.weather.intensity=0;}
    for(let i=0;i<180;i++) T.stepFrame(1/60);
    const ots=T.otsDbg();
    const seat={x:T.player.position.x,z:T.player.position.z,yaw:T.player.rotation.y,otsYaw:ots.yaw||T.player.rotation.y};
    window.__gp20023={seat,step(dt=1/60){const nf=T.renderer?._nodes?.nodeFrame;if(nf?.update){nf.update();T.renderer.info.frame=nf.frameId;}T.stepFrame(dt);},lock(t){
      T.marineIdleDbg?.()?.reset();const y=T.sampleHeight(seat.x,seat.z);
      T.player.position.set(seat.x,y,seat.z);T.localPlayer?.position?.set(seat.x,y,seat.z);
      T.player.rotation.y=seat.yaw;T.setAimYawDbg(seat.yaw);T.setOtsAimDbg(seat.otsYaw,0);T.setVelDbg(0,0);T.setWorldTime(t);
    }};
  })()`);
  const telemetry={phase,generatedAt:new Date().toISOString(),lights:{},errors:[]};
  for(const light of lights){
    const data=await page.evaluate(`(async () => {
      const T=window.TT,h=window.__gp20023,light=${JSON.stringify(light)};
      T.flightHold(true);T.clearZombies?.();T.setHp(100000);T.flightInput({keys:[],zoom:false,fire:false});
      T.setMouseFireDbg(false);T.setZoomHeldDbg(false);T.setViewFirstDbg(true);
      if(T.isUnarmed())T.toggleHolster();T.setWeapon(T.WEAPON_ORDER.indexOf('uzi'));
      T.setDualOwnedDbg('uzi',true);if(!T.vaultDbg.flags().dualActive)T.toggleDualWieldDbg();
      for(let i=0;i<150;i++){h.lock(light.t);h.step();}
      await T.renderer.compileAsync(T.scene,T.camera);h.step(0);h.step(0);
      const vm=T.viewmodelDbg(),THREE=T.THREE||window.THREE,gun=T.weaponMeshes.uzi;
      gun.updateMatrixWorld(true);
      const inv=new THREE.Matrix4().copy(gun.matrixWorld).invert(),v=new THREE.Vector3();
      let lo=Infinity,hi=-Infinity,verts=0;
      gun.traverse(o=>{
        if(!o.isMesh||!o.geometry?.attributes?.position)return;
        for(let q=o;q&&q!==gun.parent;q=q.parent)if(!q.visible&&q!==gun)return;
        if(o===gun.userData.laser||o===gun.userData.flash)return;
        const mm=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),pa=o.geometry.attributes.position;
        for(let i=0;i<pa.count;i++){v.fromBufferAttribute(pa,i).applyMatrix4(mm);lo=Math.min(lo,v.z);hi=Math.max(hi,v.z);verts++;}
      });
      return {weapon:T.getCurrentWeapon(),first:T.fpDbg().first,dual:T.vaultDbg.flags().dualActive,
        vmKey:vm.info.key,akimbo:vm.info.akimbo,gun2:!!vm.gun2,raise:vm.info.raise,ads:vm.info.ads,
        unscaledZ:[lo,hi],unscaledLength:hi-lo,vertices:verts,
        size:T.getWeaponSizeDbg().sizes.uzi,scale:gun.scale.x,
        backend:T.getRendererBackend(),calls:T.renderer.info.render.calls};
    })()`);
    telemetry.lights[light.name]=data;
    const shot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:92,captureBeyondViewport:false});
    fs.writeFileSync(path.join(out,`uzi-pair-${phase}-${light.name}.jpg`),Buffer.from(shot.data,'base64'));
    if(data.weapon!=='uzi'||!data.first||!data.dual||data.vmKey!=='uzi'||!data.akimbo||!data.gun2||data.raise<0.99||data.ads>0.02)telemetry.errors.push(`${light.name}: bad pair state ${JSON.stringify(data)}`);
    console.log(`${phase}-${light.name}: ${data.backend} pair=${data.akimbo&&data.gun2} length=${data.unscaledLength.toFixed(5)} z=${data.unscaledZ.map(x=>x.toFixed(5)).join('..')} scale=${data.scale.toFixed(5)}`);
  }
  const holster=await page.evaluate(`(async () => {
    const T=window.TT,h=window.__gp20023;
    T.setViewFirstDbg(false);T.setWeapon(T.WEAPON_ORDER.indexOf('pistol'));
    const d=T.carryDbg({loadout:{primary:[null,null],secondary:['uzi','uzi']},inHand:'pistol',akimbo:false,grenades:0,vest:true});
    for(let i=0;i<90;i++){h.lock(0.5);h.step();}
    await T.renderer.compileAsync(T.scene,T.camera);h.step(0);h.step(0);
    const p=T.player.position,yaw=T.player.rotation.y;
    T.camera.position.set(p.x-2.1*Math.sin(yaw),p.y+1.8,p.z-2.1*Math.cos(yaw));
    T.camera.lookAt(p.x,p.y+1.25,p.z);T.camera.updateMatrixWorld(true);
    await T.renderer.renderAsync(T.scene,T.camera);
    return {first:T.fpDbg().first,holstered:d.holstered,backend:T.getRendererBackend()};
  })()`);
  telemetry.holster=holster;
  const holsterShot=await page.send('Page.captureScreenshot',{format:'jpeg',quality:92,captureBeyondViewport:false});
  fs.writeFileSync(path.join(out,`uzi-holster-${phase}-noon.jpg`),Buffer.from(holsterShot.data,'base64'));
  if(holster.first||holster.holstered.join()!=='uzi,uzi')telemetry.errors.push(`bad holster state ${JSON.stringify(holster)}`);
  console.log(`${phase}-holster: ${holster.backend} stowed=${holster.holstered.join(',')}`);
  telemetry.errors.push(...page.errors);
  fs.writeFileSync(path.join(out,`pair-${phase}-telemetry.json`),JSON.stringify(telemetry,null,2)+'\n','utf8');
  if(telemetry.errors.length)throw new Error(telemetry.errors.join(' | '));
}finally{await browser.close();await server.close();}
