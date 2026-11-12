import {makeShotgunModel} from '../../studio/weapon-longarms.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

export function inspectPumpCrown(ctx){
  let mesh,original;
  const g=makeShotgunModel({...ctx,finishGun:o=>o,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,lathe(profile,mat,opts){
      const piece=k.lathe(profile,mat,opts);
      if(opts?.seg===18 && profile.length>30 && opts.parent){
        mesh=piece;original=piece.geometry.attributes.position.array.slice();
      }
      return piece;
    }};
  }});
  if(!mesh)throw Error('Missing native pump skin');
  const pos=mesh.geometry.attributes.position.array,u=g.userData;
  const seam=.0145-u.basePumpPos.y;let fixed=0,moved=0,maxDrop=0,landmark=null;
  for(let i=0;i<pos.length;i+=3){
    if(pos[i]!==original[i]||pos[i+2]!==original[i+2])throw Error('Side or length displacement');
    const change=original[i+1]-pos[i+1];
    if(original[i+1]<=seam && change!==0)throw Error('Lower hand surface moved');
    if(change<0)throw Error('Upper skin lifted');
    if(change===0)fixed++;else moved++;
    if(change>maxDrop){maxDrop=change;landmark={original:Array.from(original.slice(i,i+3)),revised:Array.from(pos.slice(i,i+3))};}
  }
  const chunks=visiblePieces(mesh);
  if(chunks.length!==1||!chunks[0].closed||!moved||!fixed)throw Error('Invalid fitted render skin');
  return {fixed,moved,maxDrop,landmark,root:u.basePumpPos.toArray(),closed:chunks[0].closed};
}
