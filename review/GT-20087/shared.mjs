import {makeM4Model,makeAa12Model} from '../../studio/weapon-longarms.js';
import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {rememberGloveOutline,applyViewGloveOutline} from './first-eye-only.mjs';
import {auditWeapon} from '../../tools/tests/weapon-seating.js';

function faces(G,root){
  root.updateWorldMatrix(true,true);
  const inverse=root.matrixWorld.clone().invert(),points=[],seen=new Set(),p=new G.Vector3();
  root.traverse(o=>{
    if(!o.isMesh || !o.geometry.attributes.position)return;
    const transform=inverse.clone().multiply(o.matrixWorld),pos=o.geometry.attributes.position,ix=o.geometry.index;
    points.length=0;
    for(let i=0;i<pos.count;i++){
      p.fromBufferAttribute(pos,i).applyMatrix4(transform);
      points.push([p.x,p.y,p.z].map(n=>Math.round(n*1e5+.173)).join(','));
    }
    for(let i=0;i<(ix?ix.count:pos.count);i+=3)seen.add([0,1,2].map(j=>points[ix?ix.getX(i+j):i+j]).sort().join('|'));
  });
  return seen;
}

export function verifyShared(T,id){
  const G=T.THREE,base=T.inspectHost().builders.weaponContext(),candidates=[];
  const build={m4:makeM4Model,uzi:makeUziModel,aa12:makeAa12Model}[id];
  const g=build({...base,finishGun:o=>o,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=base.gunKit(root);return {...kit,slab(points,width,material,options){
      const o=kit.slab(points,width,material,options);
      if(width===(id==='uzi'?.032:.03) && points.length===(id==='uzi'?18:12) && !options?.parent)
        candidates.push({o,original:o.geometry.clone()});
      return o;
    }};
  }});
  const changed=candidates.filter(({o,original})=>original.attributes.position.array.some((n,i)=>n!==o.geometry.attributes.position.array[i]));
  if(changed.length!==1)throw Error('Expected one revised native guard for '+id+', found '+changed.length);
  const {o,original}=changed[0],mesh=new G.Mesh(original,o.material),privateCopy=new G.Group();
  mesh.position.copy(o.position);mesh.quaternion.copy(o.quaternion);mesh.scale.copy(o.scale);privateCopy.add(mesh);
  rememberGloveOutline(G,id,mesh);
  if(applyViewGloveOutline(G,privateCopy,id)!==1)throw Error('Comparison copy missing outline');
  const geometry=o.geometry,observed=geometry.attributes.position.array,recorded=mesh.geometry.attributes.position.array;
  const expected=faces(G,o);
  let maxDifference=0;for(let i=0;i<observed.length;i++)maxDifference=Math.max(maxDifference,Math.abs(observed[i]-recorded[i]));
  if(maxDifference>1e-7)throw Error('Shared outline differs from the photographed outline: '+maxDifference);
  const copies={world:T.weaponMeshes[id],eye:T.viewmodelDbg().gun.root,carry:T.carryGunCopyDbg(id).children[0]};
  const matches={};
  for(const [name,root] of Object.entries(copies)){
    const drawn=faces(G,root);
    matches[name]=[...expected].filter(face=>drawn.has(face)).length;
    if(matches[name]!==expected.size)throw Error(name+' matched '+matches[name]+' / '+expected.size+' native guard faces');
  }
  g.visible=true;g.scale.copy(T.weaponMeshes[id].scale);
  const u=g.userData,options={metresPerUnit:1.8/1.655,ignore:[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)};
  o.geometry=original;const before=auditWeapon(g,options);o.geometry=geometry;const after=auditWeapon(g,options);
  const key=row=>[row.a,row.b].sort().join('|'),old=new Set(before.rawOverlaps.map(key));
  const added=after.rawOverlaps.filter(p=>!old.has(key(p)));
  if(added.length || after.loose.length!==before.loose.length || before.parts!==after.parts || before.openSurfaces!==after.openSurfaces)
    throw Error('New raw intersection or lost support: '+JSON.stringify(added));
  return {id,maxDifference,expectedFaces:expected.size,matches,rawBefore:before.rawOverlaps.length,rawAfter:after.rawOverlaps.length,
     added,parts:after.parts,open:after.openSurfaces,loose:after.loose.length};
}
