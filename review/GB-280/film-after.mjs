import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
fs.mkdirSync('review/GB-280/after-fix', { recursive: true });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(1000); return 'ok'");
const Us = [0.25, 0.4, 0.55, 0.7, 0.97];
cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100); const z=T.spawnZombie(px+1,pz+7,'brute',true,true); z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.ttSpawn=false; z.speed=z.baseSpeed=0; z.hp=z.maxHp=5000; await wait(600); window.__z=z; const yaw=z.mesh.rotation.y; T.damageZombie(z,60,{kind:'explosive',dir:{x:Math.sin(yaw),z:Math.cos(yaw)}}); const t0=Date.now(); while(Date.now()-t0<8000){ await wait(30); if(z.knockKeyed&&z.knockT>0&&z.knockT<=z.knockRise) break; if(!(z.knockT>0)) break; } if(!window.__holdTimer) window.__holdTimer=setInterval(()=>{const h=window.__hold; if(h&&h.z.knockT>0) h.z.knockT=h.t;},4); return 'ready'`);
const rows=[];
for (const u of Us) {
  const nn = String(Math.round(u*100)).padStart(3,'0');
  const mid = cam('eval', `window.__hold={z:window.__z,t:${(1.4*(1-u)).toFixed(4)}}; await wait(500); const z=window.__z,d=T.bruteGetUpDbg(z),my=z.mesh.position.y; const rel=(p)=>p?+(p[1]-my).toFixed(3):null; const row={u:d.u,hips:+z.mesh.userData.hips.position.y.toFixed(3),handL:rel(d.live&&d.live.handL),handR:rel(d.live&&d.live.handR),xyz:'xyz:'+z.mesh.position.x.toFixed(3)+','+(my+0.85).toFixed(3)+','+z.mesh.position.z.toFixed(3)}; return JSON.stringify(row);`);
  const row = JSON.parse(mid.split('\n').filter(Boolean).pop());
  rows.push(row);
  console.log('ROW', JSON.stringify(row));
  cam('shot', row.xyz, '--yaw', '90', '--pitch', '8', '--zoom', '1.35', '--out', `review/GB-280/after-fix/side-${nn}.png`);
  cam('shot', row.xyz, '--yaw', '40', '--pitch', '14', '--zoom', '1.35', '--out', `review/GB-280/after-fix/q-${nn}.png`);
}
fs.writeFileSync('review/GB-280/after-fix/rows.json', JSON.stringify(rows,null,2));
cam('eval', 'window.__hold=null; return "done"');
cam('stop');