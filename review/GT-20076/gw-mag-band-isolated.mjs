import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {trimPanelBack,clipArtworkProfile}=await import('../../studio/weapon-longarms.js');
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const src=read('../../studio/weapon-longarms.js'),html=read('../../index.html');
const fit=new Function('trimPanelBack','clipArtworkProfile',src.slice(src.indexOf('const m4MagazineBandSkins ='),src.indexOf('export function makeM4Model'))+';return fitM4MagazineBand')(trimPanelBack,clipArtworkProfile);
const gunBand=new Function('hypot',html.slice(html.indexOf('function gunBand('),html.indexOf('function gripOutline('))+';return gunBand')(Math.hypot);
const outlines=new Function('gunBand',src.match(/  const ribOutlines = [^\n]+/)[0]+';return ribOutlines')(gunBand);
const {curve}=await import('../../core/geometry.js');
const magOutline=new Function('profileCurve',src.slice(src.indexOf('  const magOutline ='),src.indexOf('  K.slab(magOutline,'))+';return magOutline')(curve);
const ref=JSON.parse(read('visible-repairs/m4/clear-gw-mag-bands-before/reference-surfaces.json'));
const root=new G.Group(),loader=new G.BufferGeometryLoader(),parts=ref.meshes.map(({position,geometry})=>{
  const m=new G.Mesh(loader.parse(geometry));m.position.fromArray(position);root.add(m);return m;
});
const bands=ref.indices.map(i=>parts[i]),ribs=ref.ribs.map(i=>parts[i]),host=parts[0],old=bands.map(m=>m.geometry);
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);
for(const m of bands)fit(G,m,outlines,magOutline);
const fresh=bands.map(m=>m.geometry);
const show=phase=>bands.forEach((m,i)=>m.geometry=(phase==='before'?old:fresh)[i]);
const t=read('tang-cheek-proof.mjs');
const sideSkin=new Function(t.slice(t.indexOf('function sideSkin('),t.indexOf('export function checkTangCheek'))+';return sideSkin')();
const q=read('gw-mag-band-proof.mjs');
if(process.argv.includes('--profiles')){
 const front=sideSkin(G,[host],'z',1),rear=sideSkin(G,[host],'z',-1);
 for(const [index,band] of bands.entries()){
  const bandFront=sideSkin(G,[{position:band.position,geometry:old[index]}],'z',1);
  const bandRear=sideSkin(G,[{position:band.position,geometry:old[index]}],'z',-1);
  const rows=[];
  for(const dy of [-.0021,-.0014,0,.0014,.0021]){
   const y=band.position.y+dy;
   rows.push([dy,...[0,.014,.014+.004*Math.SQRT1_2,.01799999].map(x=>[front(x,y),-rear(x,y),bandFront(x,y),-bandRear(x,y)].map(n=>Number.isFinite(n)?+n.toFixed(8):null))]);
  }
  console.log('HOST',index,JSON.stringify(rows));
 }
 process.exit(0);
}
const profile=new Function('sideSkin',q.slice(q.indexOf('function bandProfiles('),q.indexOf('export function checkMagBands'))+';return bandProfiles')(sideSkin)(G,parts,bands,show);
const solids=bands.map(m=>visiblePieces(m,1.8/1.655)),gaps=bands.map(m=>[host,...ribs].map(p=>visibleSurfaceGap(m,p,1.8/1.655)));
console.log('triangles',fresh.map(g=>g.attributes.position.count/3),'closed',solids.map(s=>s.map(c=>c.closed)),'crossings',gaps.map(g=>g.map(x=>x.penetrating?'cross':x.upperMm)));
console.log('outline',profile);
for(const [i,set] of solids.entries())for(const cell of set.filter(c=>!c.closed)){
 const edges=new Map();
 for(const f of cell.faces)for(let j=0;j<3;j++){
   const k=(j+1)%3,key=[f.ids[j],f.ids[k]].sort((a,b)=>a-b).join(',');
   const e=edges.get(key)||{uses:0,ends:[f.p[j],f.p[k]].map(p=>cell.mesh.worldToLocal(p.clone().multiplyScalar(1.655/1.8)).toArray())};e.uses++;edges.set(key,e);
 }
 console.log('unmatched',i,JSON.stringify([...edges.values()].filter(e=>e.uses!==2).slice(0,3)));
}
assert(solids.every(s=>s.length&&s.every(p=>p.closed))&&gaps.flat().every(g=>!g.penetrating&&g.upperMm<.01));
assert(Object.values(profile).every(p=>!p.lost&&!p.added&&p.maxOut<1e-7&&p.maxIn<.0002));
