import fs from 'node:fs';
import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
import * as G from '../../vendor/three/three.core.js';
import {visibleSurfaceGap,visiblePieces} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(specifier,context,next){
  if(specifier==='three')return {url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true};
  return next(specifier,context);
}});
const {clipArtworkProfile,profileEdgeSplits:frameEdgeSplits}=await import('../../studio/weapon-longarms.js');
function proofFunction(file,name,next,bindings={}){
  const s=fs.readFileSync(new URL(file,import.meta.url),'utf8');
  const part=s.slice(s.indexOf('function '+name+'('),s.indexOf('export function '+next+'('));
  return new Function(...Object.keys(bindings),part+';return '+name)(...Object.values(bindings));
}
const sideSkin=proofFunction('tang-cheek-proof.mjs','sideSkin','checkTangCheek');
const sampleShield=proofFunction('rear-shield-proof.mjs','sampleShield','checkRearShield',{sideSkin});
const sideSource=fs.readFileSync(new URL('../../studio/weapon-sidearms.js',import.meta.url),'utf8');
const packet=JSON.parse(fs.readFileSync(new URL('visible-repairs/revolver/clear-rear-shield-before/reference-surfaces.json',import.meta.url)));
const root=new G.Group(),loader=new G.BufferGeometryLoader(),meshes=packet.meshes.map(({geometry,position})=>{
  const m=new G.Mesh(loader.parse(geometry));m.position.fromArray(position);root.add(m);return m;
});
root.scale.fromArray(packet.scale);root.updateMatrixWorld(true);
const [rear,shield,bridge]=meshes,original=shield.geometry;
const start=sideSource.indexOf('const revolverShieldBacks ='),end=sideSource.indexOf('const revolverLugSkins =',start);
assert(start>=0&&end>start);
const fit=new Function('clipArtworkProfile','frameEdgeSplits',sideSource.slice(start,end)+';return fitShieldToRearFrame;')(clipArtworkProfile,frameEdgeSplits);
fit(G,shield);const result=shield.geometry;
const copy=new G.Mesh(original);fit(G,copy);assert.equal(copy.geometry,result,'Shared shape was rebuilt');
const gaps=[rear,bridge].map(p=>visibleSurfaceGap(shield,p,1.8/1.655));
const cells=visiblePieces(shield,1.8/1.655);
const profile=sampleShield(G,rear,shield,bridge,original);
console.log({triangles:result.attributes.position.count/3,oldTriangles:original.attributes.position.count/3,closed:cells.map(p=>p.closed),gaps,profile});
for(const cell of cells.filter(c=>!c.closed)){
 const edges=new Map();
 for(const f of cell.faces)for(let i=0;i<3;i++){
   const j=(i+1)%3,key=[f.ids[i],f.ids[j]].sort((a,b)=>a-b).join(',');
   const e=edges.get(key)||{uses:0,ends:[f.p[i],f.p[j]].map(v=>shield.worldToLocal(v.clone().multiplyScalar(1.655/1.8)).toArray())};
   e.uses++;edges.set(key,e);
 }
 console.log('unmatched edges',[...edges.values()].filter(e=>e.uses!==2).slice(0,6));
}
assert(cells.length===1&&cells[0].closed&&gaps.every(g=>!g.penetrating&&g.upperMm<.01)&&!profile.added&&!profile.lost&&profile.expansion<1e-7);