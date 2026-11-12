import {makeChainsawModel,makeMinigunModel} from '../../studio/weapon-heavy.js';
import {artworkFingerprint,visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function samples(G,geometry,rotation,include){
  const {position:p,normal:n,uv}=geometry.attributes,keys=new Set(),v=new G.Vector3(),normal=new G.Vector3();
  for(let i=0;i<p.count;i++){
    v.fromBufferAttribute(p,i).applyQuaternion(rotation);normal.fromBufferAttribute(n,i).applyQuaternion(rotation);
    if(include(v))keys.add([...v.toArray(),...normal.toArray(),uv.getX(i),uv.getY(i)].map(x=>Math.round(x*1e6)).join(','));
  }return keys;
}
function barDepth(y){
  const radius=.05;
  for(let i=1;i<=8;i++){
    const a=-Math.PI/2+(i-1)*Math.PI/8,b=a+Math.PI/8;
    const h=radius*Math.sin(a),next=radius*Math.sin(b);
    if(y<=next+1e-8)return -.02+radius*(Math.cos(a)+(Math.cos(b)-Math.cos(a))*(y-h)/(next-h));
  }
  throw Error('Outside nose');
}
export function checkNoseArch(T,id,baseline,pictures=false){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),edits=[],posts=new Map();
  const g=(id==='chainsaw'?makeChainsawModel:makeMinigunModel)({...ctx,finishGun:r=>r,mergeRigidMeshes:()=>{},gunKit:r=>{
    const k=ctx.gunKit(r);return {...k,box(...args){
      const m=k.box(...args);
      if(id==='minigun'&&args[0]===.03&&args[1]===.12&&args[2]===.03&&args[5]===.18)posts.set(args[6],m);
      return m;
    },cyl(...args){
      const m=k.cyl(...args);
      const found=id==='chainsaw'?args[0]===.05&&args[2]===.03&&args[6]===.90:args[0]===.018&&args[2]===.047&&args[5]===.155;
      if(found)edits.push({m,old:m.geometry.clone(),rotation:m.quaternion.clone(),post:posts.get(args[6])});
      return m;
    }};
  }});
  if(edits.length!==(id==='chainsaw'?1:2))throw Error('Missing artwork '+id+' '+edits.length);
  for(const e of edits){e.now=e.m.geometry;e.finalRotation=e.m.quaternion.clone();}
  g.visible=true;g.scale.copy(T.weaponMeshes[id].scale);
  const show=phase=>{
    for(const e of edits){e.m.geometry=phase==='before'?e.old:e.now;e.m.quaternion.copy(phase==='before'?e.rotation:e.finalRotation);}
    g.updateMatrixWorld(true);
  };
  const u=g.userData,ignore=[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean);
  show('before');const hash=artworkFingerprint(visiblePieces(g,1.8/1.655,ignore));show('after');
  if(hash!==baseline)throw Error('Whole original model differs '+id+' '+hash+' / '+baseline);
  if(pictures)return {hash,model:g,show};
  const results=edits.map(e=>{
    // Positions after rotation are in parent space before the object's translation.
    const keep=id==='chainsaw'?p=>p.z>=barDepth(p.y)-1e-7:p=>Math.abs(p.x)>.02349;
    const old=samples(G,e.old,e.rotation,keep),next=samples(G,e.now,e.finalRotation,keep);
    const missing=[...old].filter(x=>!next.has(x));
    if(old.size<10||missing.length)throw Error('Lost exterior artwork '+id+' '+old.size+' '+missing.length+' '+missing.slice(0,3).join(' / '));
    const parts=visiblePieces(e.m),host=id==='chainsaw'?e.m.parent.children[0]:e.post;
    if(!host||parts.length!==(id==='chainsaw'?1:2)||parts.some(p=>!p.closed))throw Error('Missing support or closed end '+JSON.stringify({id,host:!!host,closed:parts.map(p=>p.closed)}));
    const gaps=parts.map(p=>{
      const geometry=new G.BufferGeometry();
      geometry.setAttribute('position',new G.Float32BufferAttribute(p.faces.flatMap(f=>f.p.flatMap(v=>v.toArray())),3));
      const copy=new G.Mesh(geometry,e.m.material);
      const gap=visibleSurfaceGap(copy,host,1.8/1.655);
      geometry.dispose();if(gap.penetrating||gap.upperMm>.5)throw Error('Unseated '+id+' '+JSON.stringify(gap));
      return gap;
    });
    // A subset of the old convex cylinder cannot introduce a new contact as the chain moves.
    const radius=id==='chainsaw'?.05:.018,half=id==='chainsaw'?.015:.0235,sides=id==='chainsaw'?14:10;
    const bound=radius*Math.cos(Math.PI/sides),v=new G.Vector3(),inverse=e.rotation.clone().invert(),p=e.now.attributes.position;
    let outside=0;
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i).applyQuaternion(e.finalRotation).applyQuaternion(inverse);
      outside=Math.max(outside,Math.abs(v.y)-half);
      for(let j=0;j<sides;j++){
        const a=(j+.5)*2*Math.PI/sides;
        outside=Math.max(outside,v.x*Math.sin(a)+v.z*Math.cos(a)-bound);
      }
    }
    if(outside>1e-7)throw Error('Final art extends past the original cylinder '+id+' '+outside);
    return {exterior:old.size,gaps,maxOutsideOriginal:outside,triangles:e.now.attributes.position.count/3};
  });
  return {hash,results,chainTeeth:id==='chainsaw'?u.chainTeeth.length:undefined};
}
