import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import {createGroundFoliage,plantRoots,seatPlant} from './ground-foliage.js';
const art=createGroundFoliage(THREE);
test('plant geometry is deterministic, finite, nondegenerate and bounded without random draws',()=>{
 const examples=[['blade',[.08,.4],5],['fern',[.25,.5],11],['shrub',[.3],72],['flower',[.08],12],['flowerStem',[.25],6],['mushroomCap',[.09],64]];
 for(const [name,args,budget]of examples){const a=art[name](...args),b=art[name](...args),p=a.attributes.position,n=a.attributes.normal,indices=a.index.array;assert.deepEqual(p.array,b.attributes.position.array,name+' deterministic');assert(indices.length/3<=budget,name+' triangle budget');assert([...p.array,...n.array].every(Number.isFinite),name+' finite');assert(a.boundingSphere.radius>0&&a.boundingSphere.radius<1,name+' bounded');for(const i of new Set(indices))assert(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))>.8,name+' normal');a.dispose();b.dispose();}
});
test('grass roots stay centered, blades taper to a curved tip, fern leaflets spread to both sides',()=>{
 const g=art.blade(.08,.4),p=g.attributes.position;assert.equal(p.getZ(0),0);assert(p.getZ(1)>0);assert(p.getZ(p.count-1)>.1);assert(p.getY(0)<0&&p.getY(p.count-1)>0);
 const fern=art.fern(.25,.5).attributes.position;assert([...fern.array].every(Number.isFinite));let min=0,max=0;for(let i=0;i<fern.count;i++){min=Math.min(min,fern.getX(i));max=Math.max(max,fern.getX(i));assert(fern.getY(i)>=0);}assert(min<-.1&&max>.1);
});
test('plant colouring stays within valid linear colour range and changes no geometry',()=>{
 for(const kind of ['grass','fern','bush','flower','mushroom']){const g=art.blade(.08,.4).toNonIndexed(),pos=g.attributes.position.array.slice();g.setAttribute('color',new THREE.Float32BufferAttribute(new Array(g.attributes.position.count*3).fill(.4),3));art.shade(new THREE.Mesh(g),kind);const c=g.attributes.color.array;assert(c.every(v=>v>=0&&v<=1));assert(new Set(c).size>1);assert.deepEqual(g.attributes.position.array,pos);}
});

test('independent roots keep attachments and pollinator landings through a terrain edit',()=>{
 const stem=x=>{const m=new THREE.Mesh(art.flowerStem(.25));m.position.x=x;return m;};
 const low=stem(-.4),high=stem(.4),petal=new THREE.Mesh(art.flower(.07));
 petal.position.set(.45,.24,.02);petal.userData.plantRoot=high.position;
 const roots=plantRoots([low,high,petal],3);
 assert.equal(roots.length,2);
 const first=roots[0].end, end=roots[1].end, start=5;
 const pos=new THREE.Float32BufferAttribute(new Float32Array((end+start+1)*3),3);
 for(let i=0;i<end;i++)pos.setY(start+i,i>=first?.3:.1);
 const plant={x:10,z:-4,roots,landing:{y:3.25}};
 const plane=(x,z)=>3+(x-10)*.6-(z+4)*.4;
 assert(seatPlant(plant,pos,start,plane));
 assert(Math.abs(pos.getY(start)+.14)<1e-6);
 assert(Math.abs(pos.getY(start+end-1)-.54)<1e-6);
 assert(Math.abs(plant.landing.y-3.01)<1e-6);
 assert(!seatPlant(plant,pos,start,plane));
 assert(seatPlant(plant,pos,start,(x,z)=>plane(x,z)-.6));
 assert(Math.abs(plant.landing.y-2.41)<1e-6);
 assert.equal(pos.getY(start-1),0);assert.equal(pos.getY(start+end),0);
});

test('all eight fern leaflets join the drawn midrib and meadow flower silhouettes differ',()=>{
 const width=.24,height=.48,p=art.fern(width,height).attributes.position;
 // First three faces make the basal ribbon and pointed distal section.
 for(let i=9;i<p.count;i+=3) {
   const t=p.getZ(i)/(height*1.14), y=t<.5?.68*t:.34-.28*(t-.5);
   assert(Math.abs(p.getY(i)-height*y)<1e-6);
 }
 assert.equal(p.count,33);
 const daisy=art.flower(.07,6,.22),poppy=art.flower(.07,4,.65);
 assert.equal(daisy.index.count/3,12);assert.equal(poppy.index.count/3,8);
});

test('each mushroom dome closes underneath at its stalk collar',()=>{
 for (const dome of [.47,.64,.83]) {
   const g=art.mushroomCap(.09,dome), p=g.attributes.position, collar=p.count-1;
   assert.equal(p.getX(collar),0);assert.equal(p.getZ(collar),0);
   assert(p.getY(collar)<0 && p.getY(0)>.04);
   assert.equal(Array.from(g.index.array).filter(i=>i===collar).length,8);
 }
});

test('both ends of a loose twig rest on the hillside before and after chunk baking',()=>{
 const plant={x:12,z:8,roots:[{x:.3,z:.1,end:2,ground:0,axis:{x:1,z:0,half:.2,slope:0,lift:0}}]};
 const pos=new THREE.Float32BufferAttribute([.1,.01,.1,.5,.01,.1],3);
 const hillside=(x,z)=>2+.45*(x-12)-.15*(z-8);
 assert(seatPlant(plant,pos,0,hillside));
 for(let i=0;i<2;i++) {
   const x=pos.getX(i)+12,z=pos.getZ(i)+8;
   assert(Math.abs(pos.getY(i)-hillside(x,z)-.01)<.00001);
   pos.setX(i,x);pos.setZ(i,z);
 }
 plant.chunk={};
 const edited=(x,z)=>1-.35*(x-12)+.2*(z-8);
 assert(seatPlant(plant,pos,0,edited));
 for(let i=0;i<2;i++) assert(Math.abs(pos.getY(i)-edited(pos.getX(i),pos.getZ(i))-.01)<.00001);
 assert.equal(seatPlant(plant,pos,0,edited),false);
});
