import {makeM4Model} from '../../studio/weapon-longarms.js';

export function verifyGuardAndCarrier(T){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),candidates=[];
  makeM4Model({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(p,w,m,o){
      const mesh=k.slab(p,w,m,o);
      if(w===.03&&p.length===12&&!o?.parent)candidates.push([mesh,mesh.geometry.attributes.position.array.slice()]);
      return mesh;
    }};
  }});
  const found=candidates.filter(([mesh,old])=>old.some((v,i)=>v!==mesh.geometry.attributes.position.array[i]));
  if(found.length!==1)throw Error('Ambiguous original guard');
  function faces(root,visit) {
    root.updateWorldMatrix(true,true);const inv=root.matrixWorld.clone().invert(),v=new G.Vector3();
    root.traverse(o=>{
      if(!o.isMesh||!o.geometry.attributes.position)return;
      const m=inv.clone().multiply(o.matrixWorld),p=o.geometry.attributes.position,ix=o.geometry.index,points=[];
      for(let i=0;i<p.count;i++)points.push(v.fromBufferAttribute(p,i).applyMatrix4(m).toArray().map(n=>Math.round(n*1e5+.173)).join(','));
      for(let i=0;i<(ix?ix.count:p.count);i+=3)visit([0,1,2].map(j=>points[ix?ix.getX(i+j):i+j]).sort().join('|'),o);
    });
  }
  const expected=new Set();faces(found[0][0],key=>expected.add(key));
  const copies={};
  for(const [name,root] of Object.entries({world:T.weaponMeshes.m4,eye:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg('m4').children[0]})){
    const matches=new Set(),coated=new Set();
    faces(root,(key,o)=>{if(expected.has(key)){matches.add(key);if(o.material.userData.gunPaintId==='m4')coated.add(key);}});
    if(matches.size!==expected.size)throw Error('Lost guard face '+name+' '+matches.size+'/'+expected.size);
    copies[name]={faces:matches.size,painted:coated.size};
  }
  const gun=T.weaponMeshes.m4,parts=gun.userData.recoilBoltParts,copy=new Map(T.viewmodelDbg().gun.pairs);
  const look=m=>[m.material.color.getHex(),m.material.roughness,m.material.metalness,m.material.flatShading,!!m.material.map,m.material.userData.gunPaintId||null];
  const on=parts.map(look);
  T.dressGuns({guns:{}});
  const off=parts.map(look);
  T.dressGuns({guns:{m4:'multicam'}});
  const restored=parts.map(look);
  if(JSON.stringify(on)!==JSON.stringify(off)||JSON.stringify(on)!==JSON.stringify(restored)||
    parts.some((m,i)=>!copy.has(m)||m.material.map||m.material.userData.gunPaintId||copy.get(m).material.map||on[i][0]!==[0x505255,0x747e85][i]))throw Error('Carrier changed with camouflage '+JSON.stringify({on,off,restored}));
  if(!T.getGunFurniture().m4.every(m=>m.map))throw Error('Selected exterior paint missing');
  return {expectedGuardFaces:expected.size,copies,factoryCarrier:on,exteriorMaterials:T.getGunFurniture().m4.length};
}
