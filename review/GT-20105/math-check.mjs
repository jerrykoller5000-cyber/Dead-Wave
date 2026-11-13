import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.core.js';
import {clipSurfaceMark,impactAppearance,impactUV,createMuzzleFlashGeometry} from '../../studio/weapon-effects.js';
const bank=[];
function tri(p,a,b){bank.push(...p,...a.map((x,i)=>x-p[i]),...b.map((x,i)=>x-p[i]),0,0,1);}
function rect(x0,x1,y0,y1){tri([x0,y0,0],[x1,y0,0],[x1,y1,0]);tri([x0,y0,0],[x1,y1,0],[x0,y1,0]);}
rect(-.025,.025,-.8,.8);
const narrow=clipSurfaceMark([bank],[0,0,0],[0,0,1],.7,.6,.4);
assert(narrow.triangles>0&&!narrow.truncated);
for(let i=0;i<narrow.positions.length;i+=3){
 assert(Math.abs(narrow.positions[i])<=.025001,'floating outside thin rail');
 assert(Math.abs(narrow.positions[i+2]-.0012)<1e-8,'surface offset wrong');
}
bank.length=0;rect(-.4,-.08,-.4,.4);rect(.08,.4,-.4,.4);
const gap=clipSurfaceMark([bank],[0,0,0],[0,0,1],.7,.7);
for(let i=0;i<gap.positions.length;i+=9){
 const x=(gap.positions[i]+gap.positions[i+3]+gap.positions[i+6])/3;
 assert(Math.abs(x)>=.079999,'triangle bridges empty gap');
}
for(const m of [narrow,gap])assert(m.uv.every(v=>v>=-1e-6&&v<=1+1e-6),'UV outside footprint');
const looks=Array.from({length:8},(_,i)=>impactAppearance(i));assert.equal(new Set(looks.map(v=>v.cell)).size,8);
assert.deepEqual(impactAppearance(2),impactAppearance(2),'appearance must be reproducible');
for(let cell=0;cell<8;cell++)for(const [x,y]of [[-.5,-.5],[.5,.5]])assert(impactUV(cell,x,y).every(v=>v>0&&v<1));
const caliber=k=>impactAppearance(0,false,k).width;
assert(caliber({weapon:'pistol'})<caliber({weapon:'m4'}));
assert(caliber({weapon:'m4'})<caliber({weapon:'shotgun',pellets:1}));
assert(caliber({weapon:'shotgun',pellets:8})<caliber({weapon:'pistol'}));
const geo=createMuzzleFlashGeometry(T,.045);
assert.equal(geo.index.count/3,8);assert(geo.attributes.position.array.every(Number.isFinite));
assert(geo.boundingBox.min.z>=0&&Math.abs(geo.boundingBox.max.z-.144)<1e-6);
console.log('PASS surface clipped to 50mm rail; no geometry across 160mm gap; boundedUVs,8distinct reproducible variants;8-triangle forward-only flash');
