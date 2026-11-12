import {makeM4Model} from '../../studio/weapon-longarms.js';
import {makeRevolverModel} from '../../studio/weapon-sidearms.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {comparePlanarBack} from './panel-surface.mjs';

export function checkWoodBoundary(T,id){
  const ctx=T.inspectHost().builders.weaponContext(),panels=[];
  const g=({revolver:makeRevolverModel,m4:makeM4Model}[id])({...ctx,finishGun:o=>o,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(p,w,m,o){
      const mesh=k.slab(p,w,m,o);
      if(id==='m4' && w===.004 && p.length===4 && Math.abs(o?.x||0)===.029)panels.push({mesh,orig:mesh.geometry.clone()});
      return mesh;
    }};
  }});
  g.visible=true;g.scale.copy(T.weaponMeshes[id].scale);g.updateMatrixWorld(true);
  if(id==='revolver'){
    const frame=g.children[0],stock=g.children[76],gap=visibleSurfaceGap(frame,stock,1.8/1.655);
    const f=visiblePieces(frame),w=visiblePieces(stock);
    if(f.length!==1||w.length!==1||!f[0].closed||!w[0].closed||gap.penetrating||gap.upperMm>.5)throw Error('Frame/wood contact '+JSON.stringify(gap));
    const old=ctx.gunKit(new T.THREE.Group()).slab([[-.021,.1],[-.05,.109],[-.064,.104],[-.074,.093],[-.08,.076],[-.082,.054],[-.08,.032],[-.075,.014],[-.066,.001],[-.046,-.005],[-.021,-.004]],.064,frame.material,{bevel:.011,segs:4});
    g.scale.set(1,1,1);g.updateMatrixWorld(true);old.updateMatrixWorld(true);
    const ray=new T.THREE.Raycaster(),origin=new T.THREE.Vector3(),dir=new T.THREE.Vector3();
    let maxIn=0,maxOut=0,matched=0,samples=0;
    for(const side of [-1,1])for(let j=0;j<49;j++)for(let k=0;k<47;k++){
      const y=-.012+j*.0015,z=-.087+k*.0015;
      ray.set(origin.set(.11*side,y,z),dir.set(-side,0,0));
      const extent=o=>{const h=ray.intersectObject(o,false)[0];return h?side*h.point.x:-Infinity;};
      const wood=extent(stock),a=Math.max(wood,extent(old)),b=Math.max(wood,extent(frame));
      if(!Number.isFinite(a)||!Number.isFinite(b))continue;
      const d=b-a;maxIn=Math.max(maxIn,-d);maxOut=Math.max(maxOut,d);if(Math.abs(d)<1e-7)matched++;samples++;
    }
    return {gap,frameTriangles:f[0].faces.length,stockTriangles:w[0].faces.length,contactSamples:samples,matched,maxIn,maxOut};
  }
  if(panels.length!==2)throw Error('Missing GW-4 stock stripes');
  const comb=g.getObjectByName('GW-4 comb');
  return panels.map(({mesh,orig})=>{
    const row=comparePlanarBack(mesh,orig,.029),gap=visibleSurfaceGap(mesh,comb,1.8/1.655);
    if(!row.closed||row.missing||row.added||row.outerMotion||gap.penetrating||gap.upperMm>.5)throw Error('Stock stripe '+JSON.stringify({row,gap}));
    return {...row,gap};
  });
}
