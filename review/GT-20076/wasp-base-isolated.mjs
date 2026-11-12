import fs from 'node:fs';
import assert from 'node:assert/strict';
import {waspGripTrimGeometry} from '../../studio/weapon-wasp-trim.js';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const prototype=process.argv.includes('--trim');
const fit=prototype?(await import('./wasp-trim-prototype.mjs')).fitWaspTrim:
  (T,grip,trim)=>{trim.geometry=waspGripTrimGeometry(T);};
const ref=JSON.parse(read('visible-repairs/uzi/clear-wasp-base-before/reference.json')),root=new G.Group(),loader=new G.BufferGeometryLoader();
const [grip,bell,cap]=ref.parts.map(({p,q,g})=>{const mesh=new G.Mesh(loader.parse(g));mesh.position.fromArray(p);mesh.quaternion.fromArray(q);root.add(mesh);return mesh;});
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);
const original=grip.geometry,originalBand=bell.geometry;fit(G,grip,bell,cap);const current=grip.geometry;
const sideSrc=read('tang-cheek-proof.mjs'),sideSkin=new Function(sideSrc.slice(sideSrc.indexOf('function sideSkin('),sideSrc.indexOf('export function checkTangCheek'))+';return sideSkin;')();
const inv=bell.matrix.clone().invert(),proxies=(g,rim)=>[grip,bell,cap].map(m=>({position:new G.Vector3(),geometry:(m===grip?g:m===bell?rim:m.geometry).clone().applyMatrix4(inv.clone().multiply(m.matrix))}));
const old=proxies(original,originalBand),now=proxies(current,bell.geometry);
const closed=visiblePieces(grip,1.8/1.655).map(p=>p.closed),gap=visibleSurfaceGap(grip,bell,1.8/1.655);
console.log('solids',closed,'rim',visiblePieces(bell,1.8/1.655).map(p=>p.closed),'contact',gap,'trim triangles',bell.geometry.attributes.position.count/3);
for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1],['y',-1]]){
 const a=sideSkin(G,old,axis,sign),b=sideSkin(G,now,axis,sign);
 const buckets=[{},{},{}];
 for(let i=0;i<127;i++)for(let j=0;j<161;j++){
  const h=axis==='y'?-.03517+j*.00044:-.01113+j*.000144;
  const k=axis==='z'?-.03504+i*.000556:-.05517+i*.000875;
  const p=a(k,h),q=b(k,h),d=buckets[h<-.001?0:h>.001?2:1];
  if(!Number.isFinite(p)&&!Number.isFinite(q))continue;
  if(!Number.isFinite(p)||!Number.isFinite(q)){d.missing=(d.missing||0)+1;d.missingAt=[k,h];continue;}
  if(p-q>(d.max||0)){d.max=p-q;d.at=[k,h,p,q];}
  if(q-p>(d.out||0))d.out=q-p;
 }
 console.log(axis,sign,JSON.stringify(buckets));
 assert(buckets.every(b=>!b.missing&&(b.max||0)<1e-6&&(b.out||0)<1e-6));
}
for(const cell of visiblePieces(bell,1.8/1.655).filter(c=>!c.closed)){
 const edges=new Map();
 for(const face of cell.faces)for(let i=0;i<3;i++){
   const j=(i+1)%3,key=[face.ids[i],face.ids[j]].sort((a,b)=>a-b).join(',');
   const e=edges.get(key)||{n:0,points:[face.p[i],face.p[j]].map(v=>bell.worldToLocal(v.clone().multiplyScalar(1.655/1.8)).toArray().map(x=>+x.toFixed(8)))};
   e.n++;edges.set(key,e);
 }
 const bad=[...edges.values()].filter(e=>e.n!==2);
 console.log('edge defects',bad.length,JSON.stringify(bad.slice(0,12)));
 if(process.argv.includes('--trace')){const first=[...edges].find(([,v])=>v.n!==2)?.[0];if(first){const [a,b]=first.split(',').map(Number);for(const face of cell.faces)if(face.ids.includes(a)&&face.ids.includes(b))console.log('adjacent',face.p.map(v=>bell.worldToLocal(v.clone().multiplyScalar(1.655/1.8)).toArray()));}}
}
const bandCells=visiblePieces(bell,1.8/1.655);
assert(closed.length&&closed.every(Boolean)&&bandCells.length===1&&bandCells[0].closed&&!gap.penetrating&&gap.upperMm<.5);
if(prototype&&process.argv.includes('--inspect-size')){
  const {position:p,normal:n,uv}=bell.geometry.attributes,tuples=new Map(),indices=[];
  for(let i=0;i<p.count;i++){
    const t=[p.getX(i),p.getY(i),p.getZ(i),n.getX(i),n.getY(i),n.getZ(i),uv.getX(i),uv.getY(i)];
    const k=t.join(',');
    if(!tuples.has(k))tuples.set(k,{id:tuples.size,t});
    indices.push(tuples.get(k).id);
  }
  const data={vertices:[...tuples.values()].map(v=>v.t),indices};
  const text=JSON.stringify(data);
  fs.writeFileSync(new URL('visible-repairs/uzi/clear-wasp-base-after/trim-mesh.json',import.meta.url),text+'\n');
  console.log('trim geometry',p.count/3,'triangles',tuples.size,'unique vertices',text.length,'bytes in JSON');
}
