import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Display check';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  const display=await page.evaluate(`(async()=>{
    const T=TT.THREE,S=TT.getWeaponSizeDbg(),marine=TT.getMarine(),out={};
    TT.grantAllWeapons();TT.setViewFirstDbg(false);if(TT.isUnarmed())TT.toggleHolster();TT.flightHold(true);
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    const equip=id=>{for(let i=0;i<20&&TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));step(15)}step(85);if(TT.getCurrentWeapon()!==id)throw Error('Cannot equip '+id)};
    for(const id of ['revolver','uzi','ak','launcher','flamer','sniper']){
      equip(id);const gun=TT.weaponMeshes[id];gun.updateWorldMatrix(true,true);
      const inv=gun.matrixWorld.clone().invert(),v=new T.Vector3();
      let min=Infinity,max=-Infinity;
      gun.traverseVisible(o=>{
        if(!o.isMesh||o===gun.userData.flash||o===gun.userData.laser)return;
        const p=o.geometry.attributes.position,base=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),local=new T.Matrix4();
        for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){
          const m=base.clone();if(o.isInstancedMesh){o.getMatrixAt(i,local);m.multiply(local)}
          for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(m);min=Math.min(min,v.z);max=Math.max(max,v.z)}
        }
      });
      const worldRatio=gun.getWorldScale(v).x/marine.getWorldScale(new T.Vector3()).x;
      if(!Number.isFinite(max-min)||max<=min)throw Error('Missing equipped geometry '+id);
      const desired=S.sizes[id].m*(S.sizes[id].look||1),observed=(max-min)*worldRatio/S.upm;
      out[id]={builderSpan:max-min,displayRatio:observed/desired,sourceCalibration:S.sizes[id].len};
    }
    return out;
  })()`);
  await save(new URL('./real-display.json',import.meta.url),JSON.stringify(display,null,2));
  const pair=await page.evaluate(`(async()=>{
    const T=TT.THREE,{verifyArtworkInstances}=await import('/review/GT-20081/verify.mjs');
    TT.setViewFirstDbg(true);
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    for(let i=0;i<20&&TT.getCurrentWeapon()!=='revolver';i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf('revolver'));step(20)}step(100);
    const key=code=>{document.dispatchEvent(new KeyboardEvent('keydown',{code,key:code,bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{code,key:code,bubbles:true}));};
    const armory=TT.armoryDbg.ui().armory;
    if(!armory.has('revolver'))armory.buy({id:'revolver',kind:'revolver'},{store:true});
    if(!armory.loadout().secondary.includes('revolver'))armory.take('revolver','secondary',0);
    if(!TT.armoryDbg.fit('revolver','pair',true))throw Error('Could not carry the second revolver '+JSON.stringify(armory.loadout()));
    key('KeyY');step(110);
    const get=()=>{
      const d=TT.viewmodelDbg(),one=TT.weaponMeshes.revolver,two=TT.offhandMeshes.revolver;
      const counts=g=>verifyArtworkInstances(T,g);
      return {paired:d.info.akimbo,worldRight:counts(one),worldLeft:counts(two),eyeRight:counts(d.gun.root),
        sourceCounts:[one,two].map(g=>g.userData.chamberNoses.filter(n=>n.visible).length)};
    };
    TT.setAmmoDbg('revolver',3);TT.setRevolverSpentDbg(3);step(30);
    const before=get();
    if(!before.paired)throw Error('Normal Y entry did not equip the pair');
    const right=before.worldRight['revolver-visible-tips'],left=before.worldLeft['revolver-visible-tips'];
    if(right!==2||left!==1||before.eyeRight['revolver-visible-tips']!==right)throw Error('Paired counts mismatched '+JSON.stringify(before));
    key('KeyY');step(100);
    TT.setAmmoDbg('revolver',2);TT.setRevolverSpentDbg(0);step(25);
    const old=TT.viewmodelDbg().gun.root.uuid;
    TT.modsOwnAllDbg();TT.addCash(100000);TT.armoryDbg.fit('revolver','optic:rmr',true);step(100);
    const current=TT.viewmodelDbg().gun,draw=current.root.getObjectByName('revolver-visible-tips');
    if(current.root.uuid===old)throw Error('Expected rebuilt first-person copy after real optic fit');
    if(draw.count!==2||draw.instanceMatrix.array.length!==96)throw Error('Partial constructor lost six-slot capacity');
    return {before,rebuiltPartial:{count:draw.count,capacity:draw.instanceMatrix.array.length/16}};
  })()`);
  await save(new URL('./paired-rebuild.json',import.meta.url),JSON.stringify(pair,null,2));
  assert.deepEqual(page.errors,[]);
  console.log('PASS display ratios',JSON.stringify(display),'independent paired render counts',pair.before.sourceCounts,'partial eye rebuild',pair.rebuiltPartial);
}finally{await browser.close();await server.close()}
