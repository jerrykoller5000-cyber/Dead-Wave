import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0),browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:1152,height:648});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  const fixture=await page.evaluate(`(async()=>{
    const Fake=await import('/tools/tests/fakethree.mjs');
    return [TT.THREE,Fake].map(T=>{const source=new T.Group();source.name='copy-probe';source.visible=false;
      const copy=new T.Group().copy(source,false);return {name:copy.name,visible:copy.visible}});
  })()`);
  const code=await readFile(new URL('../../tools/tests/t217.js',import.meta.url),'utf8');
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Display returns';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate('TT.flightHold(true);for(let i=0;i<100;i++)TT.stepFrame(1/30);true');
  const lines=(await page.evaluate(code,90000)).split('\n');
  const accessories={passed:lines.filter(l=>l.startsWith('PASS ')).length,
    failed:lines.filter(l=>l.startsWith('FAIL ')).map(l=>l.split(' (')[0])};
  const report=await page.evaluate(`(async()=>{
    const T=TT.THREE;TT.grantAllWeapons();TT.modsOwnAllDbg();TT.addCash(100000);TT.setViewFirstDbg(true);
    if(TT.isUnarmed())TT.toggleHolster();TT.flightHold(true);
    const step=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    const equip=id=>{for(let i=0;i<24&&TT.getCurrentWeapon()!==id;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(id));step(16)}step(100)};
    equip('pistol');TT.opticDbg.fit('pistol','rmr');step(60);
    const mount=TT.weaponMeshes.pistol.userData.fittedOptic;
    const pistol={source:mount?.name,child:!!mount?.getObjectByName('optic.rmr'),cloneChild:!!TT.cloneLean(mount).getObjectByName('optic.rmr')};
    equip('m4');TT.armoryDbg.refreshRack(true);
    const housed=()=>TT.house.armoryRack.children.find(o=>o.userData.rackKind==='m4');
    const initiallyOnRack=!!housed(),arm=TT.armoryDbg.ui().armory;
    if(!arm.read().shelf.some(g=>g.kind==='m4'))arm.buy({id:'six-return-rack-m4',kind:'m4'},{store:true});
    TT.buyHeavyBarrel('m4');const fit=TT.fitWeaponMod('m4','heavy');
    TT.armoryFinishDbg.paint('m4','m81');step(20);TT.armoryDbg.refreshRack(true);
    const registry=TT.getGunFurniture().m4,parts=root=>{const list=[];root.traverse(o=>{if(o.isMesh)list.push(o)});return list};
    const rack=parts(housed()).filter(m=>m.material.userData.gunPaintId==='m4'),sleeve=TT.weaponMeshes.m4.userData.heavyLook;
    const paint={initiallyOnRack,rackMeshes:rack.length,rackCorrect:rack.every(o=>registry.includes(o.material)&&o.material.map&&o.geometry.attributes.uv),
      sleeveVisible:!!fit && sleeve?.visible,sleeveMeshes:parts(sleeve).length,sleeveCoated:parts(sleeve).filter(o=>registry.includes(o.material)&&o.material.map).length};
    equip('uzi');const model=TT.weaponMeshes.uzi,ud=model.userData;TT.setGunSuppressor(model,true);step(3);
    model.updateWorldMatrix(true,true);const inv=model.matrixWorld.clone().invert(),point=new T.Vector3();
    let min=Infinity,max=-Infinity;
    ud.suppressor.traverseVisible(o=>{if(o.isMesh){const rel=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld),pos=o.geometry.attributes.position;
      for(let i=0;i<pos.count;i++){point.fromBufferAttribute(pos,i).applyMatrix4(rel);min=Math.min(min,point.z);max=Math.max(max,point.z)}}});
    const ctx=TT.inspectHost().builders.weaponContext();let assetPoint=null;
    const make=(await import('/studio/weapon-sidearms.js')).makeUziModel;
    const reference=make({...ctx,finishGun:g=>g,gunSuppressor(g,kit,key){
      ctx.gunSuppressor(g,kit,key);
      const data=g.userData,v=data.muzzleBase.clone();v.z+=data.suppressorLen;
      g.updateWorldMatrix(true,true);assetPoint=data.suppressor.worldToLocal(g.localToWorld(v));
    }});
    reference.updateWorldMatrix(true,true);
    const expected=reference.worldToLocal(reference.userData.suppressor.localToWorld(assetPoint));
    const effect={transformed:ud.suppressor.scale.z!==1,visible:ud.suppressor.visible,hasVertices:Number.isFinite(max-min),
      artistAnchorFollowsSurface:expected.distanceTo(ud.muzzleLocal)<1e-6,
      relativeEndpointOffset:Math.abs(ud.muzzleLocal.z-max)/(max-min),
      actualFlashAtModelAnchor:ud.flash.position.distanceTo(ud.muzzleLocal)<1e-5};
    TT.setGunSuppressor(model,false);
    equip('sniper');const vm=TT.viewmodelDbg(),src=TT.weaponMeshes.sniper;
    const {VM_SOCKETS}=await import('/game/viewmodel-poses.js'),{SIGHT}=await import('/game/sight-points.js');
    const knob=VM_SOCKETS.sniper.boltKnob,side=new T.Vector3(...knob),mid=side.clone();mid.x=0;
    const x=v=>vm.ndc(vm.viewPoint(v)).x,screenX=x(side)-x(mid);
    TT.setZoomHeldDbg(true);step(100);
    const scope=src.getObjectByName('optic.nx8'),glass=scope.getObjectByName('ocular lens');
    src.updateWorldMatrix(true,true);const loc=src.worldToLocal(glass.getWorldPosition(new T.Vector3()));
    const authored=new T.Vector3(...SIGHT.sniper.pos);
    const imagePt=v=>{const p=vm.ndc(vm.viewPoint(v));return {x:p.x,y:p.y}};
    const sniper={modelSide:src.userData.boltSide,projectedSide:Math.sign(screenX),screenX,ads:vm.info.ads,
      issuedScope:scope.visible,legacyVisible:src.getObjectByName('scope')?.visible,lensCentre:imagePt(loc),cameraAnchor:imagePt(authored),
      overlay:Number.parseFloat(getComputedStyle(document.getElementById('scopeOverlay')).opacity)};
    return {pistol,paint,sniper,effect};
  })()`);
  await save(new URL('./current-real.json',import.meta.url),JSON.stringify({fixture,accessories,...report},null,2));
  assert(report.pistol.child&&report.pistol.cloneChild&&report.paint.rackMeshes>=6&&report.paint.rackCorrect);
  assert.deepEqual(page.errors,[]);console.log('Renderer copy',fixture,'real accessory check',accessories.passed,'pass',accessories.failed.length,'fail','stored rack/sleeve',report.paint,'screen side',report.sniper.projectedSide,'scope',report.sniper);
}finally{await browser.close();await server.close()}
