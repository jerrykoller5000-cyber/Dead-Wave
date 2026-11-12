import {makeAkModel} from '../../studio/weapon-longarms.js';

function collectFaces(G,root,innerMatrix,anchor=root) {
  root.updateWorldMatrix(true,true);
  const inverse=anchor.matrixWorld.clone().invert(),v=new G.Vector3(),result=new Map();
  if(innerMatrix)inverse.premultiply(innerMatrix.clone().invert());
  root.traverse(mesh=>{
    const geo=mesh.geometry;
    if(!mesh.isMesh||!geo?.attributes.position)return;
    const p=geo.attributes.position,index=geo.index,m=inverse.clone().multiply(mesh.matrixWorld);
    const points=Array.from({length:p.count},(_,i)=>v.fromBufferAttribute(p,i).applyMatrix4(m).toArray().map(x=>Math.round(x*1e5+.173)).join(','));
    for(let i=0;i<(index?.count??p.count);i+=3){
      const key=[0,1,2].map(j=>points[index?index.getX(i+j):i+j]).sort().join('|');
      let matches=result.get(key);
      if(!matches)result.set(key,matches=new Set());
      matches.add(mesh);
    }
  });
  return result;
}

function rackFaces(T,id) {
  const display=T.scene.getObjectByName('training-armory').getObjectByName('armoryRack');
  const rack=display.children.find(o=>o.userData.rackKind===id);
  if(!rack)throw Error('Missing rack copy '+id);
  const inner=T.carryGunCopyDbg(id).children[0];inner.updateMatrix();
  // Factory surfaces can be merged into the parent display. Use the gun's
  // anchor to express the entire rack in this gun's coordinates.
  return collectFaces(T.THREE,display,inner.matrix,rack);
}

export function tubeCoverage(T){
  const id='shotgun',world=T.weaponMeshes[id],tube=world.userData.tubeExt,report={visible:!!tube?.visible,faces:0,world:0,eye:0,rack:0,rackPresent:0};
  if(!report.visible)return report;
  // Camera setup steps the live pose. Rebuild the rack and take its centring
  // transform in the same frame that the baked triangles are compared.
  T.armoryDbg.refreshRack(true);
  const carry=T.carryGunCopyDbg(id).children[0],carryTube=carry.getObjectByName('extendedTube');
  report.carryTubeVisible=carryTube?.visible;
  const copies=new Map(T.viewmodelDbg().gun.pairs),rack=rackFaces(T,id),mats=T.getGunFurniture()[id],map=mats[0].map;
  const eligible=m=>m?.userData.gunPaintId===id&&m?.map&&m.map===map;
  const tubeMeshes=new Set();tube.traverse(o=>{if(o.isMesh)tubeMeshes.add(o);});
  const worldFaces=collectFaces(T.THREE,world);
  report.sharedModelFaces=[...worldFaces.keys()].filter(k=>rack.has(k)).length;
  report.totalModelFaces=worldFaces.size;
  const carryPoints=collectFaces(T.THREE,carry);
  report.carryFaces=0;
  for(const [key,owners] of worldFaces)for(const part of owners){
    if(!tubeMeshes.has(part))continue;
    report.faces++;
    if(carryPoints.has(key))report.carryFaces++;
    if(eligible(part.material))report.world++;
    const view=copies.get(part);
    // The view builds its own material and intentionally owns its userData.
    // Check the texture actually bound on that draw and the mirrored UV array.
    const uv=part.geometry.attributes.uv,viewUV=view?.geometry.attributes.uv;
    if(map&&view?.material.map===map&&viewUV&&uv&&viewUV.count===uv.count)report.eye++;
    const hits=rack.get(key);
    if(hits){report.rackPresent++;if([...hits].some(h=>eligible(h.material)))report.rack++;}
  }
  return report;
}

export function coverage(T) {
  const ctx=T.inspectHost().builders.weaponContext();
  const raw=makeAkModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  const actual=T.weaponMeshes.ak;
  raw.userData.opticPlate.visible=!!actual.userData.opticPlate?.visible;
  const G=T.THREE,expected=collectFaces(G,raw),actualFaces=collectFaces(G,actual),eye=T.viewmodelDbg().gun;
  const copies=new Map(eye.pairs),registry=T.getGunFurniture().ak;
  const rows=new Map(),missing=[],rack=rackFaces(T,'ak');
  for(const [key,owners] of expected)for(const mesh of owners){
    const role=mesh.material.userData.weaponFinishRole;
    if(!role&&mesh.material.name!=='KR-7 walnut')continue;
    const name=role||'factory wood';
    let row=rows.get(name);
    if(!row)rows.set(name,row={faces:0,world:0,eye:0,rack:0,rackPresent:0,absent:0,wrong:0});
    row.faces++;
    const hits=actualFaces.get(key);
    if(!hits){row.absent++;continue;}
    const matches=Array.from(hits).filter(h=>role?h.material.userData.weaponFinishRole===role&&registry.includes(h.material)&&h.material.map===registry[0].map:h.material.name==='KR-7 walnut'&&h.material.map&&!h.material.userData.gunPaintId);
    const display=rack.get(key);
    if(display){row.rackPresent++;if([...display].some(h=>role?h.material.userData.weaponFinishRole===role&&h.material.map===registry[0].map:h.material.name==='KR-7 walnut'&&h.material.map&&!h.material.userData.gunPaintId))row.rack++;}
    if(matches.length)row.world++;
    else {row.wrong++;if(missing.length<12)missing.push([mesh.name,mesh.parent.name,role,[...hits].map(h=>h.material.name)]);}
    if(matches.some(h=>copies.get(h)?.material?.map===h.material.map))row.eye++;
  }
  const materials=registry.map(m=>({role:m.userData.weaponFinishRole,id:m.userData.gunPaintId,mapped:!!m.map}));
  const tags=[];actual.traverse(o=>{if(o.material?.userData.gunPaintId==='ak')tags.push([o.name,o.parent.name,o.material.userData.weaponFinishRole,o.geometry.attributes.position.count]);});
  return {rawCoverage:Object.fromEntries(rows),missing,materials,tags,hasOptic:!!actual.userData.fittedOptic};
}
