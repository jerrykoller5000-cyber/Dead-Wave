import {makeM4Model} from '../../studio/weapon-longarms.js';
import {makeChainsawModel} from '../../studio/weapon-heavy.js';
import {visiblePieces} from '../../tools/tests/weapon-seating.js';

export function checkCollars(ctx,id) {
  const records=[];
  function observe(mesh,name,coords){
    const before=mesh.geometry.clone();
    records.push({mesh,name,coords,before});
    return mesh;
  }
  ({m4:makeM4Model,chainsaw:makeChainsawModel}[id])({...ctx,finishGun:g=>g,mergeRigidMeshes:()=>{},gunKit:root=>{
    const k=ctx.gunKit(root);return {...k,slab(points,w,m,opts){
      const mesh=k.slab(points,w,m,opts);
      if(id==='m4' && w===.012 && points.length===5 && opts?.x===.0445/2)observe(mesh,'window panel',(x,y)=>x);
      if(id==='m4' && w===.048 && points.length===4 && opts?.bevel===.006)observe(mesh,'collar sides',(x,y)=>Math.abs(x)-.0475/2);
      return mesh;
    },box(...args){
      const mesh=k.box(...args);
      if(id==='chainsaw' && args[0]===.072 && args[1]===.02 && args[2]===.04)observe(mesh,'rear plate',(x,y)=>y+.085-.094);
      return mesh;
    }};
  }});
  if(records.length!==(id==='m4'?2:1))throw Error('Missing original artwork');
  function samples(geo,coords){
    const {position:p,normal:n,uv:u}=geo.attributes,s=new Set();
    for(let i=0;i<p.count;i++)if(coords(p.getX(i),p.getY(i))>1e-7)s.add([p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),u.getX(i),u.getY(i)].join(','));
    return s;
  }
  return records.map(({mesh,name,coords,before})=>{
    const a=samples(before,coords),b=samples(mesh.geometry,coords);
    const lost=[...a].filter(t=>!b.has(t)).length,added=[...b].filter(t=>!a.has(t)).length;
    const pieces=visiblePieces(mesh),closed=pieces.every(p=>p.closed);
    if(!a.size||lost||added||!closed||pieces.length!==(name==='collar sides'?2:1))throw Error(name+' exterior or closure '+JSON.stringify({lost,added,closed,count:pieces.length}));
    return {name,exteriorSamples:a.size,lost,added,closed,islands:pieces.length};
  });
}
