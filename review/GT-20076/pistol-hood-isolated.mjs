import fs from 'node:fs';
import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {splitArtworkRows,trimPanelBack}=await import('../../studio/weapon-longarms.js');
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const src=read('../../studio/weapon-sidearms.js');
const s=src.indexOf('const pistolTopPanels ='),e=src.indexOf('export function makePistolModel',s);
assert(s>=0&&e>s);
const fit=new Function('splitArtworkRows','trimPanelBack',src.slice(s,e)+';return fitPistolTopPanel;')(splitArtworkRows,trimPanelBack);
const ref=JSON.parse(read('visible-repairs/pistol/clear-pistol-hood-before/reference-surfaces.json'));
const root=new G.Group(),loader=new G.BufferGeometryLoader(),[body,panel,barrel,...grooves]=ref.meshes.map(({position,geometry})=>{
 const g=geometry.type==='BoxGeometry'?G.BoxGeometry.fromJSON(geometry):loader.parse(geometry);
 const m=new G.Mesh(g);m.position.fromArray(position);root.add(m);return m;
});
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);const original=panel.geometry;
fit(G,panel,.074);
const solids=visiblePieces(panel,1.8/1.655);
const gaps=[body,grooves[1],barrel].map(m=>visibleSurfaceGap(panel,m,1.8/1.655));
console.log('closed',solids.map(s=>s.closed),'gaps',gaps,'triangles',panel.geometry.attributes.position.count/3);
for(const cell of solids.filter(c=>!c.closed)){
 const edges=new Map();
 for(const f of cell.faces)for(let i=0;i<3;i++){
   const j=(i+1)%3,key=[f.ids[i],f.ids[j]].sort((a,b)=>a-b).join(',');
   const entry=edges.get(key)||{n:0,ends:[f.p[i],f.p[j]].map(v=>panel.worldToLocal(v.clone().multiplyScalar(1.655/1.8)).toArray())};entry.n++;edges.set(key,entry);
 }
 console.log('edge defects',JSON.stringify([...edges.values()].filter(v=>v.n!==2).slice(0,12)));
}
const fn=read('tang-cheek-proof.mjs'),sideSkin=new Function(fn.slice(fn.indexOf('function sideSkin('),fn.indexOf('export function checkTangCheek'))+';return sideSkin')();
const live=panel.geometry,parts=[body,panel,barrel,...grooves],rest=[body,...grooves].map(m=>m.position.z);
let maxIn=0,maxOut=0,lost=0,occupied=0,worst;
for(const t of [0,.025,.05,.075,.1,.125,.13]){
 [body,...grooves].forEach((m,i)=>m.position.z=rest[i]-t);
 panel.geometry=original;const a=sideSkin(G,parts,'y');
 panel.geometry=live;const b=sideSkin(G,parts,'y');
 for(let i=0;i<111;i++)for(let j=0;j<73;j++){
   const z=.044117+i*.0005,x=-.014113+j*.00039,old=a(z,x),now=b(z,x);
   if(!Number.isFinite(old)&&!Number.isFinite(now))continue;occupied++;
   if(!Number.isFinite(old)||!Number.isFinite(now)){lost++;continue;}
   maxIn=Math.max(maxIn,old-now);if(now-old>maxOut){maxOut=now-old;worst=[t,z,x,old,now];}
 }
}
console.log({occupied,lost,maxIn,maxOut,worst});
assert(solids.length===1&&solids[0].closed&&gaps.every(g=>!g.penetrating)&&gaps[0].upperMm<.01&&!lost&&maxOut<1e-7);
