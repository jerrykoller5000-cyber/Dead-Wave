import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
fs.mkdirSync('review/GB-280/once', { recursive: true });
console.log(cam('start', '--match').slice(-60));
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(1000); return 'ok'");
const raw = cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100);
const z=T.spawnZombie(px+1,pz+7,'brute',true,true);
z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.ttSpawn=false; z.speed=z.baseSpeed=0; z.hp=z.maxHp=5000;
await wait(800);
const ud=z.mesh.userData;
const snap=()=>({hips:ud.hips.position.toArray().map(v=>+v.toFixed(4)), mesh:z.mesh.position.toArray().map(v=>+v.toFixed(3)), armLx:+ud.armLG.rotation.x.toFixed(3), armRx:+ud.armRG.rotation.x.toFixed(3)});
const before=snap();
// Drive get-up the same way the game does, but WITHOUT knockT/hold: create, plan, pose once.
const { createBruteGetUp, fetchBruteGetUp } = await import('/combat/brute-getup.js');
const getup = await fetchBruteGetUp();
const scale = z.scale / (z.mesh.scale.y || 1);
const g = createBruteGetUp(z.mesh, scale, getup);
z.mesh.updateWorldMatrix(true,true);
const U=0.45;
g.pose(U, z.hitH);
const d=T.bruteGetUpDbg; // may not see z._bg
const my=z.mesh.position.y;
const THREE=await import('three');
const handL=ud.armLG.userData.elbowG?.children?.find(c=>c.name==='handEndL') || ud.armLG;
// ensure ends exist via points
const pts = g.points();
const tg = g.targets();
const rel=(p)=>[+(p[0]-z.mesh.position.x).toFixed(3),+(p[1]-my).toFixed(3),+(p[2]-z.mesh.position.z).toFixed(3)];
const after=snap();
const skin=ud.skinMesh; let skinBox=null;
if(skin){ const b=new THREE.Box3().setFromObject(skin); skinBox={miny:+b.min.y.toFixed(3),maxy:+b.max.y.toFixed(3),hmin:+(b.min.y-my).toFixed(3),hmax:+(b.max.y-my).toFixed(3)}; }
return JSON.stringify({before, after, scale:+scale.toFixed(4), plant:g.plant(U), u:g.u, over:g.overridden, hitH:g.hitH,
  live:{handL:rel(pts.handL),handR:rel(pts.handR),shoulderL:rel(pts.shoulderL),pelvis:rel(pts.pelvis),chest:rel(pts.chest)},
  tgt:{handL:rel(tg.handL),handR:rel(tg.handR),pelvis:rel(tg.pelvis)},
  skinBox, baseHipsY:ud.baseHipsY});`);
fs.writeFileSync('review/GB-280/once/pose-once.json', raw.split('\n').filter(Boolean).pop());
console.log(raw.split('\n').filter(Boolean).pop());
// screenshot with live:brute centred, after forcing the same pose each frame via hold on a real knockdown AND also a direct pose loop
cam('stop');