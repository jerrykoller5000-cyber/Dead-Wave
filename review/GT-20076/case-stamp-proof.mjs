import {makeAkModel} from '../../studio/weapon-longarms.js';
import {makeFlamerModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap,artworkFingerprint} from '../../tools/tests/weapon-seating.js';

function samples(g,keep=()=>true){
  const {position:p,normal:n,uv:u}=g.attributes,keys=new Set();
  for(let i=0;i<p.count;i++)if(keep(p,i))keys.add([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),u.getX(i),u.getY(i)].join(','));
  return keys;
}
function triangles(G,g,offset) {
  const p=g.attributes.position,ix=g.index,out=[];
  for(let i=0;i<(ix?ix.count:p.count);i+=3){
    const verts=[0,1,2].map(j=>new G.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j).add(offset));
    out.push({verts,box:new G.Box3().setFromPoints(verts)});
  }
  return out;
}
function openEdges(s){
  const edges=new Map();
  for(const f of s.faces)for(let j=0;j<3;j++){
    const key=[f.p[j],f.p[(j+1)%3]].map(p=>p.toArray().map(x=>x.toFixed(8)).join(',')).sort().join('|');
    edges.set(key,(edges.get(key)||0)+1);
  }
  return [...edges].filter(([,n])=>n!==2).slice(0,8);
}
export function checkCaseStamp(T,id,oldHash){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),old=new Map();
  const model=({flamer:makeFlamerModel,ak:makeAkModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(...a){const m=k.slab(...a);if(id==='flamer'&&a[1]===.11&&a[0][0][0]===-.17)old.set(m,m.geometry.clone());return m;},
      box(...a){const m=k.box(...a);if(id==='ak'&&a[0]===.003&&a[1]===.016&&a[2]===.07)old.set(m,m.geometry.clone());return m;}};
  }});
  model.visible=true;model.scale.copy(T.weaponMeshes[id].scale);model.updateMatrixWorld(true);
  if(id==='ak'){
    if(old.size!==2)throw Error('Expected two original stamped sides');
    return [...old].map(([m,g])=>{
      const side=Math.sign(m.position.x),keep=(p,i)=>side*(m.position.x+p.getX(i))>.0230001;
      const a=samples(g,keep),b=samples(m.geometry,keep),gap=visibleSurfaceGap(m,model.children[0],1.8/1.655);
      if(!a.size||a.size!==b.size||[...a].some(k=>!b.has(k))||!visiblePieces(m)[0].closed||gap.penetrating||gap.upperMm>.01)throw Error('Stamp exterior or contact differs');
      return {side,outsideSamples:a.size,gap};
    });
  }
  const host=model.children[0],tank=model.userData.fuelCan.children[0],original=old.get(host),final=host.geometry;
  const pieces=visiblePieces(host,1.8/1.655);
  if(pieces.length!==1||!pieces[0].closed)throw Error('Case is open '+JSON.stringify(pieces.map(p=>[p.faces.length,openEdges(p)])));
  const gap=visibleSurfaceGap(host,tank,1.8/1.655);
  if(gap.penetrating||gap.upperMm>.01)throw Error('Case and tank crossed or parted '+JSON.stringify(gap));
  host.geometry=original;
  const u=model.userData,hash=artworkFingerprint(visiblePieces(model,1.8/1.655,[u.flash,u.flashLight,u.laser,u.flare].filter(Boolean)));
  host.geometry=final;
  if(hash!==oldHash)throw Error('Unrelated geometry changed '+hash+' vs '+oldHash);
  const oldExterior=samples(original,(p,i)=>p.getY(i)>-.030),newExterior=samples(final,(p,i)=>p.getY(i)>-.030);
  // Every original sample on the upper housing and sides still exists. Only the recessed floor adds new ones.
  if(oldExterior.size<50||[...oldExterior].some(k=>!newExterior.has(k)))throw Error('Exterior case sample moved');
  const before=triangles(G,original,host.position),after=triangles(G,final,host.position),pack=triangles(G,tank.geometry,tank.position);
  const ray=new G.Ray(new G.Vector3(),new G.Vector3(0,1,0)),hit=new G.Vector3();
  function height(faces,x,z,top){
    let y=top?-Infinity:Infinity;
    for(const f of faces){
      const b=f.box;if(x<b.min.x||z<b.min.z||x>b.max.x||z>b.max.z)continue;
      if(ray.intersectTriangle(...f.verts,false,hit))y=top?Math.max(y,hit.y):Math.min(y,hit.y);
    }
    return y;
  }
  let checked=0,raised=0,maximumError=0,maximumLift=0;
  for(let ix=0;ix<57;ix++)for(let iz=0;iz<81;iz++){
    const x=-.054+(.108/57)*(ix+.37),z=-.13+(.42/81)*(iz+.43);
    ray.origin.set(x,-.5,z);
    const prior=height(before,x,z,false),actual=height(after,x,z,false),tankTop=height(pack,x,z,true);
    const error=Math.abs(actual-Math.max(prior,tankTop));
    if(!Number.isFinite(error)||error>2e-6)throw Error('Incorrect case boundary '+JSON.stringify({x,z,prior,actual,tankTop,error}));
    maximumError=Math.max(maximumError,error);maximumLift=Math.max(maximumLift,actual-prior);
    if(actual-prior>1e-6)raised++;checked++;
  }
  if(raised<100)throw Error('Pocket was not exercised');
  return {oldHash,unchangedOriginalUpperSamples:oldExterior.size,checked,raised,maximumError,maximumLift,
    originalTriangles:before.length,finalTriangles:after.length,closed:true,gap};
}
