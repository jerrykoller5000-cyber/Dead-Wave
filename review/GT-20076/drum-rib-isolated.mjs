import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {clipArtworkProfile}=await import('../../studio/weapon-longarms.js');
const {rbox}=await import('../../core/geometry.js');
const src=fs.readFileSync(new URL('../../studio/weapon-longarms.js',import.meta.url),'utf8');
const start=src.indexOf('const drumRibSkins ='),end=src.indexOf('export function makeAa12Model',start);
assert(start>=0&&end>start);
const art=src.slice(start,end);
const ref=JSON.parse(fs.readFileSync(new URL('visible-repairs/aa12/clear-drum-ribs-before/ribs.json',import.meta.url),'utf8'));
const loader=new G.BufferGeometryLoader(),source=loader.parse(ref.source),host=new G.Mesh(loader.parse(ref.host)),root=new G.Group();
root.add(host);root.scale.fromArray(ref.scale);
const study=process.argv.includes('--fit-study');
for(const [intercept,slope] of (study?[[.018,3],[.019,3],[.0195,3],[.020,3],[.0205,3],[.021,3],[.0205,2],[.021,2],[.0215,2],[.022,2],[.020,2.5],[.0205,2.5]]:[[null,null]])){
  const trial=study?art.replace('-.0205 - 2 * y',String(-intercept)+' - '+slope+' * y'):art;
  if(study)assert(art.includes('-.0205 - 2 * y'));
  const fit=new Function('clipArtworkProfile',trial+';return fitDrumRib;')(clipArtworkProfile);
  for(const i of (study?[6,18]:Array.from({length:24},(_,i)=>i))){
  const angle=i*Math.PI/12,rib=new G.Mesh(source);
  rib.position.set(.1495*Math.sin(angle),.1495*Math.cos(angle),0);rib.rotation.z=-angle;
  root.add(rib);fit(G,rib,i);root.updateMatrixWorld(true);
  const solids=visiblePieces(rib,1.8/1.655),gap=visibleSurfaceGap(rib,host,1.8/1.655);
  const gaps=[];
  if(i===6||i===18){
    const side=i===6?1:-1;
    for(const [w,h,d,r,x,z] of [[.009,.047,.027,.003,.145,-.03],[.006,.028,.019,.002,.149,-.032]]){
      const latch=new G.Mesh(rbox(w,h,d,r));latch.position.set(side*x,-.012,z);root.add(latch);root.updateMatrixWorld(true);
      gaps.push(visibleSurfaceGap(rib,latch,1.8/1.655));
    }
    console.log(study?[intercept,slope,i]:i,solids.map(s=>s.closed),gap.upperMm,gaps.map(g=>g.penetrating?'cross':g.upperMm));
  }
  if(!study)assert(solids.length===1&&solids[0].closed&&!gap.penetrating&&gap.upperMm<.02&&gaps.every(g=>!g.penetrating),'drum rib '+i);
}
}
if(!study)console.log('PASS 24 closed rim decorations, including both latch-side ends');
