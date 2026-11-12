import {makeChainsawModel,makeLauncherModel} from '../../studio/weapon-heavy.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';

export function checkHeavySides(T,id){
  const G=T.THREE,ctx=T.inspectHost().builders.weaponContext(),graphics=[];
  const model=({chainsaw:makeChainsawModel,launcher:makeLauncherModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);
    return {...k,slab(p,w,m,o){
      const mesh=k.slab(p,w,m,o);
      if(id==='launcher' && w===.004 && Math.abs(o?.x||0)===.026 && p.length===4)graphics.push({mesh,original:mesh.geometry.clone(),surface:.026});
      return mesh;
    },box(...args){
      const mesh=k.box(...args);
      if(id==='chainsaw'&&args[0]===.05&&args[1]===.09&&args[2]===.1)graphics.push({mesh,original:mesh.geometry.clone(),surface:.1435});
      return mesh;
    }};
  }});
  model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.set(1,1,1);model.updateMatrixWorld(true);
  if(graphics.length!==(id==='launcher'?2:1))throw Error('Missing target art '+id);
  const rows=graphics.map(({mesh,original,surface})=>{
    const side=Math.sign(mesh.position.x);
    function samples(g){
      const {position:p,normal:n,uv:u}=g.attributes,tuples=new Set();
      for(let i=0;i<p.count;i++)if(side*(mesh.position.x+p.getX(i))>surface+1e-7)
        tuples.add([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),u.getX(i),u.getY(i)].join(','));
      return tuples;
    }
    const a=samples(original),b=samples(mesh.geometry),pieces=visiblePieces(mesh);
    if(!a.size||a.size!==b.size||[...a].some(v=>!b.has(v))||pieces.length!==1||!pieces[0].closed)throw Error('Lost outward painting samples '+id);
    original.computeBoundingBox();mesh.geometry.computeBoundingBox();
    const at=box=>side>0?box.min.x:-box.max.x;
    return {side,outerSamples:a.size,open:false,innerShift:at(mesh.geometry.boundingBox)-at(original.boundingBox)};
  });
  const ids=id==='launcher'?[[45,44],[49,44]]:[[43,28],[53,52],[54,53]];
  const gaps=ids.map(([a,b])=>visibleSurfaceGap(model.children[a],model.children[b],1.8/1.655));
  if(gaps.some(g=>g.penetrating||g.upperMm>.5))throw Error('Bad seating '+JSON.stringify({id,gaps}));
  const outward=id==='chainsaw'?[53,54].map(i=>new G.Box3().setFromObject(model.children[i],true).max.x):[];
  if(outward.length&&(Math.abs(outward[0]-.166)>1e-7||Math.abs(outward[1]-.177)>1e-7))throw Error('Side cap silhouette moved');
  return {rows,gaps,outward};
}
