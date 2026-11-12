import fs from 'node:fs';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import * as G from '../../vendor/three/three.core.js';
import {visiblePieces,visibleSurfaceGap} from '../../tools/tests/weapon-seating.js';
assert(process.env.DW_GAME_TEST_TOKEN);
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../../vendor/three/three.core.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {trimPanelBack,clipArtworkProfile}=await import('../../studio/weapon-longarms.js');
const {topTuples}=await import('./surface-tuples.mjs');
const read=f=>fs.readFileSync(new URL(f,import.meta.url),'utf8');
const src=read('../../studio/weapon-heavy.js'),start=src.indexOf('const sawBootSkins ='),end=src.indexOf('export function makeChainsawModel',start);
assert(start>=0&&end>start);
const fit=new Function('trimPanelBack','clipArtworkProfile',src.slice(start,end)+';return fitSawBoot;')(trimPanelBack,clipArtworkProfile);
const ref=JSON.parse(read('visible-repairs/chainsaw/clear-saw-boot-before/reference.json'));
const loader=new G.BufferGeometryLoader(),root=new G.Group();
const [cowl,intake,boot]=ref.meshes.map(({g,p,q})=>{
 const m=new G.Mesh(loader.parse(g));m.position.fromArray(p);m.quaternion.fromArray(q);root.add(m);return m;
});
root.scale.fromArray(ref.scale);root.updateMatrixWorld(true);
const old=boot.geometry;fit(G,boot);const now=boot.geometry;
const cells=visiblePieces(boot,1.8/1.655).map(c=>c.closed);
const contacts=[cowl,intake].map(p=>visibleSurfaceGap(boot,p,1.8/1.655));
const [roof,plate,before,after]=[cowl,intake,boot,boot].map((m,i)=>topTuples((i===2?old:m.geometry).clone().applyMatrix4(m.matrix)));
let maxIn=0,maxOut=0,maxNormal=0,maxUV=0,visible=0,preserved=0,missing=0,worst;
for(let i=0;i<119;i++)for(let j=0;j<173;j++){
 const x=.030077+i*.000254,z=-.254079+j*.000251,p=before(x,z),q=after(x,z),h=Math.max(roof(x,z)?.[0]??-Infinity,plate(x,z)?.[0]??-Infinity);
 const a=Math.max(h,p?.[0]??-Infinity),b=Math.max(h,q?.[0]??-Infinity);
 if(!Number.isFinite(a)&&!Number.isFinite(b))continue;
 if(!Number.isFinite(a)||!Number.isFinite(b)){missing++;continue;}
 if(maxIn<a-b){maxIn=a-b;worst=[x,z,a,b,h];}maxOut=Math.max(maxOut,b-a);
 if(!p||p[0]<=h+1e-7)continue;visible++;if(!q||Math.abs(p[0]-q[0])>1e-7)continue;
 preserved++;for(let k=1;k<=3;k++)maxNormal=Math.max(maxNormal,Math.abs(p[k]-q[k]));
 for(let k=4;k<=5;k++)maxUV=Math.max(maxUV,Math.abs(p[k]-q[k]));
}
console.log({cells,contacts,preserved,visible,missing,maxIn,maxOut,maxNormal,maxUV,worst});
assert(cells.length===1&&cells[0]&&contacts.every(g=>!g.penetrating&&g.upperMm<.5)&&!missing&&maxOut<1e-7);
