import {makeM4Model, makeAa12Model} from '../../studio/weapon-longarms.js';

export function readOutline(T, id) {
  const G=T.THREE, ctx=T.inspectHost().builders.weaponContext(), seen=[];
  ({m4:makeM4Model, aa12:makeAa12Model}[id])({...ctx, finishGun:g=>g, mergeRigidMeshes:()=>{}, gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit, slab(points,width,mat,options){
      const o=kit.slab(points,width,mat,options);
      if(width===.03 && points.length===12 && !options?.parent)seen.push([o,o.geometry.attributes.position.array.slice()]);
      return o;
    }};
  }});
  const found=seen.filter(([o,original])=>original.some((n,i)=>n!==o.geometry.attributes.position.array[i]));
  if(found.length!==1)throw Error('Ambiguous guard '+id);
  const o=found[0][0], positions=Array.from(o.geometry.attributes.position.array);
  function triangles(root){
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert(), faces=new Set(), vector=new G.Vector3();
    root.traverse(obj=>{
      if(!obj.isMesh || !obj.geometry.attributes.position)return;
      const m=inverse.clone().multiply(obj.matrixWorld),pos=obj.geometry.attributes.position,ix=obj.geometry.index,points=[];
      for(let i=0;i<pos.count;i++)points.push(vector.fromBufferAttribute(pos,i).applyMatrix4(m).toArray().map(n=>Math.round(n*1e5+.173)).join(','));
      for(let i=0;i<(ix?ix.count:pos.count);i+=3)faces.add([0,1,2].map(j=>points[ix?ix.getX(i+j):i+j]).sort().join('|'));
    });
    return faces;
  }
  const expected=triangles(o),copies={};
  for(const [name,root] of Object.entries({world:T.weaponMeshes[id],eye:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg(id).children[0]})){
    const actual=triangles(root);
    copies[name]=[...expected].filter(t=>actual.has(t)).length;
    if(copies[name]!==expected.size)throw Error('Missing triangles on '+name);
  }
  return {positions,copies,faces:expected.size,pin:T.weaponMeshes[id].userData.triggerPin};
}
