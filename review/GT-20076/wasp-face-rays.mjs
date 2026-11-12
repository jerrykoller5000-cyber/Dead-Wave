import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
assert(process.env.DW_GAME_TEST_TOKEN);
const vendor=new URL('../../vendor/three/three.core.js',import.meta.url).href;
registerHooks({resolve(s,c,next){return s==='three'?{url:vendor,shortCircuit:true}:next(s,c);}});
const G=await import(vendor),{slab}=await import('../../core/geometry.js');
const geo=slab([[.18,-.002],[.187,-.013],[.319,-.016],[.334,-.009],[.34,.001],[.34,.058],[.331,.067],[.185,.07],[.18,.061]],.08,.016,4);
const mesh=new G.Mesh(geo,new G.MeshBasicMaterial({side:G.DoubleSide}));mesh.updateMatrixWorld(true);
for(const [x,y,z] of [[.0396871417760849,.05469584837555885,.2290000021457672],[.03999999910593033,.055449322817542876,.22749999910593033]]){
  const ray=new G.Raycaster(new G.Vector3(.10,y,z),new G.Vector3(-1,0,0));
  const hits=ray.intersectObject(mesh,false).filter(h=>h.point.x>0).map(h=>[h.point.x,h.face.normal.x,h.faceIndex]);
  console.log({x,y,z,hits});
}

// Sweep only the nine drawn graphics against their source mesh.
for(const bevel of [.016,.015,.014,.013,.012,.011,.010,.009,.008]){
 const outline=[[.18,-.002],[.187,-.013],[.319,-.016],[.334,-.009],[.34,.001],[.34,.058],[.331,.067],[.185,.07],[.18,.061]];
 const solid=new G.Mesh(slab(outline,.08,bevel,4),new G.MeshBasicMaterial({side:G.DoubleSide}));solid.updateMatrixWorld(true);
 let double=0,total=0;
 for(let i=3;i<12;i++)for(const f of [.00035,.0015,.00265])for(let n=0;n<192;n++){
   const z=.19+i*.012+f,y=-.007+(n+.239)*.068/192;
   const ray=new G.Raycaster(new G.Vector3(.10,y,z),new G.Vector3(-1,0,0));
   const hits=ray.intersectObject(solid,false).filter(h=>h.point.x>0);
   if(hits.length>1 && Math.max(...hits.map(h=>h.point.x))-Math.min(...hits.map(h=>h.point.x))>1e-7)double++;
   total++;
 }
 console.log('bevel',bevel,'overlapped outer samples',double,'/',total);
}
