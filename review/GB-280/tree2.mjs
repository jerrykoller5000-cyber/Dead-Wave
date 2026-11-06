import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const U = 0.45;
fs.mkdirSync('review/GB-280/tree2', { recursive: true });
console.log(cam('start', '--match').slice(-80));
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(1200); return 'ok'");
cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100); const z=T.spawnZombie(px+1,pz+7,'brute',true,true); z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.ttSpawn=false; z.speed=z.baseSpeed=0; z.hp=z.maxHp=5000; await wait(600); window.__z=z; const yaw=z.mesh.rotation.y; T.damageZombie(z,60,{kind:'explosive',dir:{x:Math.sin(yaw),z:Math.cos(yaw)}}); if(!window.__holdTimer) window.__holdTimer=setInterval(()=>{const h=window.__hold; if(h&&h.z.knockT>0) h.z.knockT=h.t;},4); return 'spawned'`);
cam('eval', `window.__hold={z:window.__z,t:${(1.4*(1-U)).toFixed(4)}}; await wait(700); return 'held'`);
const raw = cam('eval', `const z=window.__z, THREE=await import('three');
z.mesh.updateWorldMatrix(true,true);
const my=z.mesh.position.y, mx=z.mesh.position.x, mz=z.mesh.position.z;
const d=T.bruteGetUpDbg(z);
const u=z.mesh.userData;
const pathOf=(o)=>{const a=[]; let p=o; while(p){a.unshift(p.name||p.type); p=p.parent; if(a.length>12)break;} return a.join('/');};
const rows=[];
z.mesh.traverse(o=>{
  if(!o.isMesh) return;
  o.geometry && o.geometry.computeBoundingBox();
  const b=o.geometry && o.geometry.boundingBox;
  const c=b?b.getCenter(new THREE.Vector3()):new THREE.Vector3();
  if(b) o.localToWorld(c);
  const bb=new THREE.Box3().setFromObject(o);
  const near = Math.abs(c.y - my) < 4; // within 4m of mesh origin height
  rows.push({n:o.name||'(mesh)', path:pathOf(o), wy:+c.y.toFixed(2), hy:+(c.y-my).toFixed(2), near, vis:o.visible, miny:+bb.min.y.toFixed(2), maxy:+bb.max.y.toFixed(2),
    underArm: !!(o===u.armLG||o===u.armRG|| (function(){let p=o;while(p){if(p===u.armLG||p===u.armRG)return true;p=p.parent;}return false;})()),
    underHips: !!(function(){let p=o;while(p){if(p===u.hips)return true;p=p.parent;}return false;})()
  });
});
const near = rows.filter(r=>r.near);
const far = rows.filter(r=>!r.near);
const hipsWP=u.hips.getWorldPosition(new THREE.Vector3());
const hipsLoc=u.hips.position.toArray().map(v=>+v.toFixed(3));
return JSON.stringify({
  u:d.u, over:d.overridden, mesh:[+mx.toFixed(3),+my.toFixed(3),+mz.toFixed(3)],
  hipsLocal:hipsLoc, hipsWorld:[+hipsWP.x.toFixed(2),+hipsWP.y.toFixed(2),+hipsWP.z.toFixed(2)],
  nNear:near.length, nFar:far.length,
  near:near.slice(0,40),
  farSample:far.slice(0,15),
  udKeys:Object.keys(u).filter(k=>/arm|leg|hip|torso|head|hand|fist|claw|plate/i.test(k)),
  torsoKids:(u.torso?u.torso.children:[]).map(c=>({n:c.name||c.type, kids:c.children.length, isMesh:!!c.isMesh})),
  meshKids:z.mesh.children.map(c=>({n:c.name||c.type, kids:c.children.length}))
});`);
fs.writeFileSync('review/GB-280/tree2/dump.json', raw.split('\n').filter(Boolean).pop());
console.log(raw.split('\n').filter(Boolean).pop().slice(0, 5000));
cam('eval', 'window.__hold=null; return 1');
console.log(cam('stop').slice(-40));