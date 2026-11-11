import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {launch} from '../../tools/cdp.mjs';
import {serve} from '../../tools/serve.mjs';
import {save} from '../GT-20076/save.mjs';

const id=process.argv[2];
assert(process.env.DW_GAME_TEST_TOKEN && ['flamer','chainsaw'].includes(id));
const directory=new URL('./'+id+'/',import.meta.url);
await mkdir(directory,{recursive:true});
const server=await serve(fileURLToPath(new URL('../../',import.meta.url)),0);
const browser=await launch({headless:false});
try{
  const page=await browser.newPage({width:960,height:540});
  await page.goto(server.origin+'/index.html?debug=1&raf=timer');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("document.getElementById('playerName').value='Finish review';document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate('window.finishKind='+JSON.stringify(id));
  const states=await page.evaluate(`(async()=>{
    TT.grantAllWeapons();TT.modsOwnAllDbg();TT.setViewFirstDbg(true);if(TT.isUnarmed())TT.toggleHolster();
    TT.flightHold(true);const advance=n=>{for(let i=0;i<n;i++)TT.stepFrame(1/30)};
    const arm=TT.armoryDbg.ui().armory;
    if(finishKind!=='chainsaw'&&!TT.armoryDbg.stored().includes(finishKind))arm.buy({id:'finish-copy-'+finishKind,kind:finishKind},{store:true});
    for(let i=0;i<25&&TT.getCurrentWeapon()!==finishKind;i++){TT.setWeapon(TT.WEAPON_ORDER.indexOf(finishKind));advance(12)}
    advance(70);
    const result={},rackVertices={};
    const quantize=n=>Math.round(n*10000);
    const point=new TT.THREE.Vector3();
    for(const [label,paint] of [['factory',''],['m81','m81'],['restored','']]){
      if(!TT.armoryFinishDbg.paint(finishKind,paint))throw Error('Could not paint');
      advance(55);TT.armoryDbg.refreshRack(true);advance(5);
      const rack=TT.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
      const roots={held:TT.weaponMeshes[finishKind],eye:TT.viewmodelDbg().gun.root,carry:TT.carryGunCopyDbg(finishKind)};
      const rackModel=rack.children.find(o=>o.userData.rackKind===finishKind);
      if(finishKind==='chainsaw'){
        if(rackModel)throw Error('Unexpected chainsaw rack display');
        const data=roots.held.userData;
        let heatMeshes=0;
        roots.held.traverse(o=>{if(o.isMesh&&o.material===data.heatMat)heatMeshes++});
        if(!heatMeshes||!data.chainInst?.count)throw Error('Missing rendered heat surface or animated chain');
        (result.motion||={})[label]={heatMeshes,chainInstances:data.chainInst.count};
      }else roots.rack=rackModel;
      const item={};
      for(const [view,root] of Object.entries(roots)){
        if(!root)throw Error('Missing '+view);
        const painted=[],factory=[];
        let paintedVertices=0;
        if(view==='rack')rackVertices[label]=[];
        root.traverse(o=>{
          if(!o.isMesh||Array.isArray(o.material))return;
          const m=o.material,record=[m.name||'',m.color?.getHex(),m.map?.uuid||null,m.roughness,m.metalness];
          const mask=m.userData.gunPaintId===finishKind||m.name==='vm:gunPaint:'+finishKind;
          if(mask)painted.push(record);else factory.push(record);
          const g=o.geometry;
          const count=g.index?g.index.count:g.attributes.position.count;
          if(mask)paintedVertices+=count;

        });
        item[view]={painted:painted.sort(),factory:factory.sort(),paintedVertices};
      }
      result[label]=item;
      if(!roots.rack)continue;
      rack.updateWorldMatrix(true,true);
      const inverse=new TT.THREE.Matrix4().copy(rack.matrixWorld).invert(),matrix=new TT.THREE.Matrix4();
      // At factory finish the rack-wide batch owns the housing vertices, outside
      // the individual gun group. Compare the complete shelf in rack-local space.
      rack.traverse(o=>{
        if(!o.isMesh||Array.isArray(o.material))return;
        const m=o.material,g=o.geometry,P=g.attributes.position,C=g.attributes.color,RM=g.attributes.foldRM;
        const mask=m.userData.gunPaintId===finishKind;
        matrix.multiplyMatrices(inverse,o.matrixWorld);
        const count=g.index?g.index.count:P.count;
        for(let i=0;i<count;i++){
          const j=g.index?g.index.getX(i):i;
          const pos=point.fromBufferAttribute(P,j).applyMatrix4(matrix).toArray().map(quantize).join(',');
          const color=C&&m.vertexColors?[C.getX(j),C.getY(j),C.getZ(j)]:[m.color.r,m.color.g,m.color.b];
          const surface=RM?[RM.getX(j),RM.getY(j)]:[m.roughness||0,m.metalness||0];
          const signature=color.concat(surface).map(quantize).join(',')+'|'+(m.map?.uuid||'');
          rackVertices[label].push({pos,signature,mask});
        }
      });
    }
    if(finishKind==='chainsaw')return result;
    // A bare rack housing is baked into vertex colors. Match every vertex in
    // the refreshed rack to the original vertex multiset; only coated vertices may change finish.
    function counts(items,key){const bag=new Map();for(const item of items){const value=key(item);bag.set(value,(bag.get(value)||0)+1)}return bag}
    const position=v=>v.pos, style=v=>v.pos+'|'+v.signature;
    const equal=(a,b)=>a.size===b.size&&[...a].every(([k,n])=>b.get(k)===n);
    const original=rackVertices.factory,swatch=rackVertices.m81,restored=rackVertices.restored;
    const beforeStyles=counts(original,style),hardware=counts(swatch.filter(v=>!v.mask),style);
    const aPos=counts(original,position),bPos=counts(swatch,position);
    const differences=(left,right)=>Array.from(left).filter(([k,n])=>n!==(right.get(k)||0)).slice(0,12).map(([k,n])=>[k,n,right.get(k)||0]);
    result.rackBake={sameShape:equal(aPos,bPos),factoryCount:original.length,paintedCount:swatch.length,
      beforeDiff:differences(aPos,bPos),afterDiff:differences(bPos,aPos),
      fullFactoryRestored:equal(beforeStyles,counts(restored,style)),
      sameHardware:[...hardware].every(([k,n])=>(beforeStyles.get(k)||0)>=n),
      all:original.length,coated:swatch.filter(v=>v.mask).length};
    return result;
  })()`);
  await save(new URL('copies.json',directory),JSON.stringify(states,null,2));
  for(const [name,factory] of Object.entries(states.factory)){
    const camo=states.m81[name],restored=states.restored[name];
    assert.deepEqual(restored,factory,name+' factory appearance restores');
    assert.deepEqual(camo.factory,factory.factory,name+' factory hardware');
    if(name==='rack'){
      const receipt=states.rackBake;
      assert(receipt.sameShape && receipt.fullFactoryRestored && receipt.sameHardware,'Baked rack geometry/factory finish changed');
      assert(receipt.coated>0 && receipt.coated===states.m81.held.paintedVertices,'Rack paint mask differs from held geometry');
      assert(camo.painted.every(p=>states.m81.held.painted.some(h=>h[2]===p[2] && h[2])), 'Wrong rack swatch');
    }else{
      assert(camo.painted.length>0 && camo.painted.length===factory.painted.length,name+' housing missing');
      assert(camo.painted.every((p,i)=>p[2] && p[2]!==factory.painted[i][2]),name+' missing pattern');
    }
    console.log('PASS',name,camo.painted.length,'coated surfaces,',camo.factory.length,'factory surfaces across factory/M81/restore');
  }
  if(id==='chainsaw'){
    assert.deepEqual(states.motion.factory,states.motion.m81);
    assert.deepEqual(states.motion.factory,states.motion.restored);
    console.log('PASS live motor heat material and chain instances persist; Armory intentionally excludes saw from wall rack');
  }
  assert.deepEqual(page.errors,[]);
}finally{await browser.close();await server.close()}
