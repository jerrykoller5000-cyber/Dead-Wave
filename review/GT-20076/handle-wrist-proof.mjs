import {makeAa12Model,makeSniperModel} from '../../studio/weapon-longarms.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

function pointSet(geometry,keep) {
  const {position:p,normal:n,uv}=geometry.attributes, out=new Set();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
    if(keep(x,y,z))out.add([x,y,z,n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i)].join(','));
  }
  return out;
}
function compare(original,mesh,keep){
  const a=pointSet(original,keep),b=pointSet(mesh.geometry,keep);
  const missing=[...a].filter(v=>!b.has(v)),added=[...b].filter(v=>!a.has(v));
  if(a.size<8||missing.length||added.length)throw Error('Original exterior differs '+JSON.stringify([a.size,b.size,missing.length,added.length]));
  original.computeBoundingBox();mesh.geometry.computeBoundingBox();
  return {exterior:a.size,original:[original.boundingBox.min.toArray(),original.boundingBox.max.toArray()],
    final:[mesh.geometry.boundingBox.min.toArray(),mesh.geometry.boundingBox.max.toArray()]};
}
export function checkHandleWrist(T,id){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext();
  const old=new Map();
  const model=({aa12:makeAa12Model,sniper:makeSniperModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const kit=ctx.gunKit(root);
    return {...kit,slab(points,w,mat,opts){
      const m=kit.slab(points,w,mat,opts);
      if(id==='sniper' && ((w===.048&&points.length>15)||(w===.003&&Math.abs(opts?.x)===.0235)))old.set(m,m.geometry.clone());
      if(id==='sniper' && w===.056 && points[0][0]===-.239){
        const original=ctx.gunKit(new G.Group()).slab([[-.245,.014],[-.026,.014],[-.026,-.04],[-.245,-.04]],w,mat,opts);
        old.set(m,original.geometry);
      }
      return m;
    }};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  const target=i=>model.children[i];
  const gaps=(pairs)=>pairs.map(([i,j])=>{
    const a=target(i),b=target(j),pieces=visiblePieces(a),gap=visibleSurfaceGap(a,b,1.8/1.655);
    if(pieces.length!==1||!pieces[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Bad seat '+JSON.stringify({id,i,j,pieces:pieces.length,closed:pieces[0].closed,gap}));
    return {i,j,gap};
  });
  if(id==='aa12'){
    const kit=ctx.gunKit(new G.Group()),original=kit.slab(ctx.gunBand([[-.17,.09],[-.153,.143],[-.138,.151],[.188,.151],[.217,.13],[.225,.09]],.009),.04,ctx.gunDark,{bevel:.003});
    return {handle:compare(original.geometry,target(16),(_x,y)=>y>.13),fits:gaps([[16,1]])};
  }
  if(old.size!==4)throw Error('Missing original wrist or palm geometry '+old.size);
  const open=[87,88,90,105].flatMap(i=>visiblePieces(target(i),1.8/1.655).filter(s=>!s.closed).map(s=>{
    const edges=new Map();for(const f of s.faces)for(let j=0;j<3;j++){
      const ends=[f.p[j],f.p[(j+1)%3]].map(v=>v.toArray().map(c=>c.toFixed(8)).join(',')).sort().join('|');
      edges.set(ends,(edges.get(ends)||0)+1);
    }
    return [i,[...edges].filter(([,count])=>count!==2).slice(0,5)];
  }));
  if(open.length)throw Error('Upper wrist or grip has open edges '+JSON.stringify(open));
  const palm=target(87),wrist=target(105);
  return {palm:compare(old.get(palm),palm,(_x,y)=>y<-.09),
    cheeks:[88,90].map(i=>{const m=target(i),sign=Math.sign(m.position.x);
      return compare(old.get(m),m,(x,y)=>y<-.09&&sign*x>.00055);}),
    wrist:compare(old.get(wrist),wrist,(_x,y,z)=>y>-.029&&z>-.222),
    fits:gaps([[87,2],[88,87],[90,87],[105,2],[105,1]])};
}
