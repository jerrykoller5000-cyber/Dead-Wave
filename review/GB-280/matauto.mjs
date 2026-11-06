import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
cam('start', '--match');
cam('eval', "T.setHp(1e5); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(600); return 1");
const raw = cam('eval', `T.clearZombies(); const z=T.spawnZombie(11,17,'brute',true,true); z.mesh.position.set(11,T.sampleHeight(11,17),17); z.riseT=0; z.speed=0; z.hp=5000; await wait(400);
const ud=z.mesh.userData;
const yaw=z.mesh.rotation.y; T.damageZombie(z,60,{kind:'explosive',dir:{x:Math.sin(yaw),z:Math.cos(yaw)}});
const t0=Date.now(); while(Date.now()-t0<8000){ await wait(30); if(z.knockKeyed&&z.knockT>0&&z.knockT<=z.knockRise) break; }
for(let k=0;k<15;k++) await wait(16);
const rows=[];
for (const [n,o] of [['mesh',z.mesh],['hips',ud.hips],['torso',ud.torso],['armLG',ud.armLG],['armRG',ud.armRG]]) {
  rows.push({n, auto:o.matrixAutoUpdate, pos:o.position.toArray().map(v=>+v.toFixed(4)), mw14:+o.matrixWorld.elements[14].toFixed(3), m14:+o.matrix.elements[14].toFixed(3)});
}
// after forced update
z.mesh.updateWorldMatrix(true,true);
const after=[];
for (const [n,o] of [['hips',ud.hips],['armLG',ud.armLG]]) after.push({n, pos:o.position.toArray().map(v=>+v.toFixed(4)), mw14:+o.matrixWorld.elements[14].toFixed(3)});
return JSON.stringify({u:z._bgu, over:z._bg&&z._bg.overridden, rows, after});`);
console.log(raw.split('\n').filter(Boolean).pop());
cam('stop');