// Exercise the actual collar fitter on the exact three meshes captured in the previous game build.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {trimPanelBack}=await import('../../studio/weapon-longarms.js');
const src=fs.readFileSync(new URL('../../studio/weapon-sidearms.js',import.meta.url),'utf8');
const begin=src.indexOf('const waspFrontSkins ='),end=src.indexOf('const waspPadSkins =',begin);assert(begin>=0&&end>begin);
const {setArtworkHeatRange}=await import('../../studio/weapon-model-hooks.js');
const fit=new Function('trimPanelBack','setArtworkHeatRange',src.slice(begin,end)+';return fitWaspFrontArt;')(trimPanelBack,setArtworkHeatRange);
const ref=JSON.parse(fs.readFileSync(new URL('visible-repairs/uzi/clear-wasp-collar-before/reference-surfaces.json',import.meta.url)));
const group=new G.Group(),loader=new G.BufferGeometryLoader(),[host,collar,barrel]=ref.meshes.map(({position,geometry})=>{
 const m=new G.Mesh(loader.parse(geometry));m.position.fromArray(position);group.add(m);return m;
});
group.scale.fromArray(ref.scale);group.updateMatrixWorld(true);
const originals=[collar.geometry.clone(),barrel.geometry.clone()];fit(G,host,collar,barrel);
const solids=[collar,barrel].map(m=>visiblePieces(m,1.8/1.655));const gaps=[host,barrel].map(m=>visibleSurfaceGap(m,collar,1.8/1.655));
console.log('triangles',[collar,barrel].map(m=>m.geometry.attributes.position.count/3),'closed',solids.map(s=>s.map(p=>p.closed)),'gaps',gaps);
for(const cell of solids.flat().filter(p=>!p.closed)){
 const edges=new Map();
 for(const f of cell.faces)for(let j=0;j<3;j++){
   const k=(j+1)%3,key=[f.ids[j],f.ids[k]].sort((a,b)=>a-b).join(',');
   const e=edges.get(key)||{count:0,ends:[f.p[j],f.p[k]].map(p=>cell.mesh.worldToLocal(p.clone().multiplyScalar(1.655/1.8)).toArray())};
   e.count++;edges.set(key,e);
 }
 console.log('Bad edges',JSON.stringify([...edges.values()].filter(e=>e.count!==2).slice(0,12)));
}
const qa=fs.readFileSync(new URL('stock-mount-proof.mjs',import.meta.url),'utf8');
const exterior=new Function(qa.slice(qa.indexOf('function exteriorSamples('),qa.indexOf('export function stockMountProof'))+';return exteriorSamples')();
const samples=g=>{const a=g.attributes,rows=[];for(let i=0;i<a.position.count;i++)if(a.position.getZ(i)>.340011){
  const p=[a.position.getX(i),a.position.getY(i),a.position.getZ(i),a.normal.getX(i),a.normal.getY(i),a.normal.getZ(i),a.uv.getX(i),a.uv.getY(i)];
  rows.push(p.map(n=>Math.round(n*1e7)));
}return rows;};
const fresh=samples(collar.geometry),missing=[];
for(const key of new Set(samples(originals[0]).map(p=>p.join(',')))){
  const v=key.split(',').map(Number);
  const nearest=fresh.reduce((best,p)=>{const delta=p.map((x,i)=>x-v[i]),d=Math.max(...delta.map(Math.abs));return d<best.d?{d,delta}:best;},{d:Infinity});
  if(nearest.d)missing.push({p:v,delta:nearest.delta});
}
console.log('missing',JSON.stringify(missing.slice(0,6)));
console.log('exterior',exterior(collar,originals[0],2,1,.34001,true),exterior(barrel,originals[1],2,1,.35501,true));
assert(solids.every(c=>c.length===1&&c[0].closed)&&gaps.every(g=>!g.penetrating&&g.upperMm<.01));
