import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.core.js';
import {createGroundFoliage} from './ground-foliage.js';
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
