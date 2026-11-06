import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
fs.mkdirSync('review/GB-280/once', { recursive: true });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(1000); return 'ok'");
const raw = cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100);
const z=T.spawnZombie(px+1,pz+7,'brute',true,true);
z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.ttSpawn=false; z.speed=z.baseSpeed=0; z.hp=z.maxHp=5000;
await wait(600);
const yaw=z.mesh.rotation.y; T.damageZombie(z,60,{kind:'explosive',dir:{x:Math.sin(yaw),z:Math.cos(yaw)}});
// Wait until keyed get-up starts (knockT <= rise)
const t0=Date.now(); let entered=false;
while(Date.now()-t0<8000){
  await wait(30);
  if(z.knockKeyed && z.knockT>0 && z.knockT<=z.knockRise){ entered=true; break; }
  if(!(z.knockT>0)) break;
}
const ud=z.mesh.userData; const my0=z.mesh.position.y;
const atEnter={entered, knockT:z.knockT, rise:z.knockRise, u:z._bgu, hips:ud.hips.position.toArray().map(v=>+v.toFixed(4)), rotX:+z.mesh.rotation.x.toFixed(4), meshY:+my0.toFixed(3)};
// Freeze by setting knockT every frame ourselves for a few samples WITHOUT setInterval
const rows=[];
for (const u of [0.25,0.4,0.55,0.7,0.97]){
  z.knockT = z.knockRise * (1-u);
  // let a few frames run so plan+pose apply
  for(let k=0;k<8;k++) await wait(16);
  const d=T.bruteGetUpDbg(z);
  const my=z.mesh.position.y;
  const rel=(p)=>p?[+(p[0]-z.mesh.position.x).toFixed(3),+(p[1]-my).toFixed(3),+(p[2]-z.mesh.position.z).toFixed(3)]:null;
  rows.push({wantU:u, u:d.u, over:d.overridden, hips:ud.hips.position.toArray().map(v=>+v.toFixed(4)), mesh:[+z.mesh.position.x.toFixed(3),+my.toFixed(3),+z.mesh.position.z.toFixed(3)], rotX:+z.mesh.rotation.x.toFixed(4),
    handL:rel(d.live&&d.live.handL), handR:rel(d.live&&d.live.handR), shoulderL:rel(d.live&&d.live.shoulderL), pelvis:rel(d.live&&d.live.pelvis),
    plant:d.plant, shift:d.shift, hitH:d.hitH});
}
return JSON.stringify({atEnter, rows});`);
fs.writeFileSync('review/GB-280/once/after-knock.json', raw.split('\n').filter(Boolean).pop());
console.log(raw.split('\n').filter(Boolean).pop());
cam('stop');