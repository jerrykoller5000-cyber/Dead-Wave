import {clipCheck} from '../../tools/tests/clip-check.js';
import {makeUziModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

// Retain the original assertions; record the component and vertex only when the existing
// check finds a new maximum. The suite's source file is read-only.
export async function locateWaspGlove(T){
  const G=T.THREE,out=[];
  let hit;
  const record=(pt,root,hand,index,worldPoint,distance)=>{
    hit={triangles:pt.P,root:root.matrixWorld.clone().invert(),hand,index,
      point:worldPoint.clone(),distance};
  };
  const marker="where = sd + ' ' + mk + ' in ' + pt.name;";
  const code=clipCheck.toString();
  if(code.split(marker).length!==2)throw Error('Clip observation site moved');
  const observe=new Function('record','return ('+code.replace(marker,marker+'record(pt,V.gun.root,sd+" "+mk,i,v,d);')+')')(record);
  await observe(T,['uzi'],(pass,s)=>out.push((pass?'PASS ':'FAIL ')+s),out);
  if(!hit)return {out};
  const v=new G.Vector3(),bounds=new G.Box3(),bodyPoints=[];
  for(let i=0;i<hit.triangles.length;i+=3){
    v.set(hit.triangles[i],hit.triangles[i+1],hit.triangles[i+2]).applyMatrix4(hit.root);
    bounds.expandByPoint(v);bodyPoints.push(v.clone());
  }
  const ctx=T.inspectHost().builders.weaponContext(),model=makeUziModel({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{}});
  model.updateMatrixWorld(true);
  const candidates=visiblePieces(model).filter(p=>p.faces.length===bodyPoints.length/3).map(p=>{
    const box=new G.Box3();for(const vertex of p.vertices)box.expandByPoint(vertex);
    const bboxError=Math.max(box.min.distanceTo(bounds.min),box.max.distanceTo(bounds.max));
    return {label:p.label,box,error:bboxError,vertices:p.vertices};
  }).sort((a,b)=>a.error-b.error).slice(0,4);
  const nearest=candidates.map(c=>({label:c.label,boundsError:c.error,vertexError:Math.max(...bodyPoints.map(p=>Math.min(...c.vertices.map(v=>p.distanceTo(v)))))}));
  return {out,hand:hit.hand,vertex:hit.index,depthMm:1000*hit.distance,
    gunLocalPoint:hit.point.applyMatrix4(hit.root).toArray(),triangles:bodyPoints.length/3,
    bounds:[bounds.min.toArray(),bounds.max.toArray()],nearest};
}
