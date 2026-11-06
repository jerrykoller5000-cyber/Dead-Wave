import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-280'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.skipGrace&&T.skipGrace(); const px=10,pz=10,gy=T.sampleHeight(px,pz); T.player.position.set(px,gy,pz); T.levelGroundRect(px-30,pz-30,px+30,pz+30,gy,6); await wait(800); return 'ok'");
const r = cam('eval', `T.clearZombies(); const px=10,pz=10; for (let i=0;i<60&&!T.bruteGetUpDbg({}).loaded;i++) await wait(100); const z=T.spawnZombie(px+1,pz+7,'brute',true,true); z.mesh.position.set(px+1,T.sampleHeight(px+1,pz+7),pz+7); z.riseT=0; z.speed=0; z.baseSpeed=0; await wait(500); const u=z.mesh.userData; const THREE=await import('three'); z.mesh.updateWorldMatrix(true,true); const wp=(o)=>{const v=new THREE.Vector3();o.getWorldPosition(v);return [+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)];}; const skins=u.skinMeshes||[]; const bones=skins[0]?skins[0].skeleton.bones:[]; return JSON.stringify({scale:z.scale, meshScale:[z.mesh.scale.x,z.mesh.scale.y,z.mesh.scale.z], bgScale:z.scale/(z.mesh.scale.y||1), hipsLocal:[...u.hips.position], hipsW:wp(u.hips), armLW:wp(u.armLG), mesh:wp(z.mesh), skinN:skins.length, armLBone:bones.indexOf(u.armLG), boneN:bones.length, hitH:z.hitH});`);
console.log(r.split('\n').filter(Boolean).pop());
cam('stop');
