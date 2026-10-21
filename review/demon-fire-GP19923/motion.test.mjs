import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../../vendor/three/three.core.js';
import {attachZombieAbilityVisuals,updateZombieAbilityVisuals} from '../../game/zombie-ability-visuals.js';
function demon(){const g=new T.Group(),u=g.userData;u.torso=new T.Group();g.add(u.torso);for(const side of ['L','R']){const arm=u['arm'+side+'G']=new T.Group(),elbow=arm.userData.elbowG=new T.Group();arm.add(elbow);u.torso.add(arm);}const rig=attachZombieAbilityVisuals(T,g,'demon');return{z:{mesh:g,alive:true},rig};}
test('fire holds exactly on pause and reproduces the same frame after seeking',()=>{
 const {z,rig}=demon(),geo=rig.cache.flameGeo;
 updateZombieAbilityVisuals(z,.27);const p=geo.attributes.position.array.slice(),c=geo.attributes.color.array.slice();
 updateZombieAbilityVisuals(z,.27);assert.deepEqual(geo.attributes.position.array,p);assert.deepEqual(geo.attributes.color.array,c);
 updateZombieAbilityVisuals(z,4);updateZombieAbilityVisuals(z,.27);assert.deepEqual(geo.attributes.position.array,p);assert.deepEqual(geo.attributes.color.array,c);
});
test('motion changes tips and traveling heat within 80ms while tongue roots remain pinned',()=>{
 const {z,rig}=demon(),geo=rig.cache.flameGeo,F=geo.userData.fire;
 updateZombieAbilityVisuals(z,.30);const p=geo.attributes.position.array.slice(),c=geo.attributes.color.array.slice();
 updateZombieAbilityVisuals(z,.38);let move=0,heat=0;
 for(const tongue of F.tongues){for(let j=0;j<F.sides;j++)for(let axis=0;axis<3;axis++){const i=(tongue.start+j)*3+axis;assert.equal(geo.attributes.position.array[i],p[i]);}const tip=tongue.start+(F.levels.length-1)*F.sides;for(let j=0;j<3;j++)move=Math.max(move,Math.abs(geo.attributes.position.array[tip*3+j]-p[tip*3+j]));}
 for(let i=0;i<c.length;i++)heat=Math.max(heat,Math.abs(geo.attributes.color.array[i]-c[i]));
 assert(move>.08,'visible tip movement in a short normal-speed interval');assert(heat>.12,'heat visibly travels rather than remaining flat orange');
});
test('embers rise away from the palm and every fire vertex stays within its culling bounds',()=>{
 const {z,rig}=demon(),geo=rig.cache.flameGeo,F=geo.userData.fire,ember=F.sparks[0].start;
 updateZombieAbilityVisuals(z,.10);const y=geo.attributes.position.getY(ember);updateZombieAbilityVisuals(z,.18);assert(geo.attributes.position.getY(ember)>y+.1);
 const p=geo.attributes.position,b=geo.boundingSphere;
 for(let n=0;n<300;n++){updateZombieAbilityVisuals(z,n/30);for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);assert([x,y,z].every(Number.isFinite));assert(Math.hypot(x-b.center.x,y-b.center.y,z-b.center.z)<=b.radius);}}
});
