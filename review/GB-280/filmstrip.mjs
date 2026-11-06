import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const ZOOM = process.argv[2] || '1';
const ONLY = process.argv[3] ? JSON.parse(process.argv[3]) : null;
const U = ONLY || [0.03, 0.12, 0.25, 0.4, 0.55, 0.7, 0.85, 0.97];
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(1500); return 'ok'");
for (const mode of (process.argv[4] ? [process.argv[4]] : ['before', 'after'])) {
  const dir = `review/GB-280/${process.argv[5] || ''}${mode}`; fs.mkdirSync(dir, { recursive: true });
  cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100); const z=T.spawnZombie(px+1,pz+7,'brute',true,true); z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.ttSpawn=false; z.speed=z.baseSpeed=0; z.hp=z.maxHp=5000; await wait(600); window.__z=z; const yaw=z.mesh.rotation.y; T.damageZombie(z,60,{kind:'explosive',dir:{x:Math.sin(yaw),z:Math.cos(yaw)}}); ${mode === 'before' ? 'z.knockKeyed=false; z.knockRise=0.55; z.knockDur=0.32+0.9+0.55; z.knockT=z.knockDur; z.knockSpin=0;' : ''} if(!window.__holdTimer) window.__holdTimer=setInterval(()=>{const h=window.__hold; if(h&&h.z.knockT>0) h.z.knockT=h.t;},4); return JSON.stringify({keyed:z.knockKeyed,rise:z.knockRise,dur:z.knockDur,yaw})`).split('\n').slice(-1).forEach((l) => console.log(mode, l));
  const rise = mode === 'before' ? 0.55 : 1.4;
  for (const u of U) {
    const nn = String(Math.round(u * 100)).padStart(3, '0');
    cam('eval', `window.__hold={z:window.__z,t:${(rise * (1 - u)).toFixed(4)}}; await wait(450); const z=window.__z; return JSON.stringify({u:z._bgu, knockT:z.knockT, hitH:+z.hitH.toFixed(2)})`).split('\n').slice(-1).forEach((l) => console.log(mode, nn, l));
    for (const [tag, yaw, pitch] of [['side', 90, 6], ['q', 40, 14]]) cam('shot', 'xyz:11,-1.9,17', '--yaw', String(yaw), '--pitch', String(pitch), '--zoom', ZOOM, '--out', `${dir}/${tag}-${nn}.png`);
  }
  cam('eval', 'window.__hold=null; return "released"');
}
cam('stop');