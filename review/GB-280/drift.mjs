import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(800); return 'ok'");
const raw = cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100);
const z=T.spawnZombie(px+1,pz+7,'brute',true,true);
z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.ttSpawn=false; z.speed=z.baseSpeed=0; z.hp=z.maxHp=5000; await wait(500);
const yaw=z.mesh.rotation.y; T.damageZombie(z,60,{kind:'explosive',dir:{x:Math.sin(yaw),z:Math.cos(yaw)}});
const t0=Date.now();
while(Date.now()-t0<8000){ await wait(30); if(z.knockKeyed&&z.knockT>0&&z.knockT<=z.knockRise) break; if(!(z.knockT>0)) break; }
// advance ~0.4 of get-up naturally (~20 frames)
const logs=[]; const orig=console.warn; console.warn=(...a)=>{ if(String(a[0]).startsWith('GB280-hips')) logs.push(a[1]); return orig.apply(console,a); };
for(let k=0;k<25;k++) await wait(16);
console.warn=orig;
const ud=z.mesh.userData;
return JSON.stringify({n:logs.length, first:logs[0], mid:logs[Math.floor(logs.length/2)], last:logs[logs.length-1], hipsNow:ud.hips.position.toArray(), u:z._bgu});`);
console.log(raw.split('\n').filter(Boolean).pop());
cam('stop');