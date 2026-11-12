import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
import {fitGwGrip} from './gw-grip-fit.mjs';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {splitArtworkRows,clipArtworkProfile}=await import('../../studio/weapon-longarms.js');
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const ref=JSON.parse(read('visible-repairs/m4/clear-gw-grip-before/reference.json')),root=new G.Group(),loader=new G.BufferGeometryLoader();
const [grip,lower,guard]=ref.parts.map(({p,q,g})=>{const m=new G.Mesh(loader.parse(g));m.position.fromArray(p);m.quaternion.fromArray(q);root.add(m);return m;});
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);
const original=grip.geometry;fitGwGrip(G,grip,splitArtworkRows,clipArtworkProfile);const current=grip.geometry;
const cells=visiblePieces(grip,1.8/1.655),gap=visibleSurfaceGap(grip,lower,1.8/1.655);
console.log('closed',cells.map(p=>p.closed),'gap',gap,'triangles',current.attributes.position.count/3);
const sideSrc=read('tang-cheek-proof.mjs'),sideSkin=new Function(sideSrc.slice(sideSrc.indexOf('function sideSkin('),sideSrc.indexOf('export function checkTangCheek'))+';return sideSkin;')();
for(const [axis,sign] of [['x',1],['x',-1],['z',1],['z',-1]]){
  const parts=[grip,lower,guard];grip.geometry=original;const a=sideSkin(G,parts,axis,sign);
  grip.geometry=current;const b=sideSkin(G,parts,axis,sign);let lost=0,added=0,ins=0,out=0,worst;
  for(let i=0;i<157;i++)for(let j=0;j<143;j++){
    const z=axis==='x'?-.195113+i*.00098:-.025113+i*.00032,y=-.08813+j*.00054,p=a(z,y),q=b(z,y);
    if(!Number.isFinite(p)&&!Number.isFinite(q))continue;
    if(!Number.isFinite(p)){added++;continue;}if(!Number.isFinite(q)){lost++;continue;}
    if(p-q>ins){ins=p-q;worst=[z,y,p,q];}out=Math.max(out,q-p);
  }
  console.log(axis,sign,{lost,added,ins,out,worst});
}
for(const cell of cells.filter(c=>!c.closed)){
  const edges=new Map();
  for(const face of cell.faces)for(let i=0;i<3;i++){
    const j=(i+1)%3,k=[face.ids[i],face.ids[j]].sort((a,b)=>a-b).join(',');
    const e=edges.get(k)||{n:0,ends:[face.p[i],face.p[j]].map(v=>grip.worldToLocal(v.clone().multiplyScalar(1.655/1.8)).toArray().map(x=>+x.toFixed(8)))};
    e.n++;edges.set(k,e);
  }
  const bad=[...edges.values()].filter(e=>e.n!==2);console.log('edge defects',bad.length,JSON.stringify(bad.slice(0,6)));
}
assert(cells.length===1&&cells[0].closed&&!gap.penetrating&&gap.upperMm<.5);
