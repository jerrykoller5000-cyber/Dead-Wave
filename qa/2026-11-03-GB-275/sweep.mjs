// GB-275 minigun: live sweep of WEAPON_HOLD.minigun candidates (mutates the live object in the page only; nothing saved).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-275'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const cands = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true})); return 'ok'");
cam('eval', `if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'minigun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('minigun')); await new Promise(r=>setTimeout(r,150)); } if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); await new Promise(r=>setTimeout(r,2500)); return 'ok'`);
if (process.env.GB275_UP) cam('eval', "const HS=T.handsDbg.HANDS; HS.skip.minigun=false; HS.fore.minigun='up'; return 'up'");
const out = [];
for (const c of cands) {
  const body = `const V=()=>new T.THREE.Vector3(),m=T.getMarine(),g=T.weaponMeshes.minigun,H=T.getShoulderDbg().holds.minigun,HD=T.handsDbg;const C=${JSON.stringify(c)};const HS=T.handsDbg.HANDS;if(C.hands==='up'){HS.skip.minigun=false;HS.fore.minigun='up';}else if(C.hands==='skip'){HS.skip.minigun=true;delete HS.fore.minigun;}delete C.hands;Object.assign(H,C);const f=V();m.getWorldDirection(f);const p=m.getWorldPosition(V());T.aimPointDbg(p.x+f.x*15,p.y+1.1,p.z+f.z*15);await new Promise(r=>setTimeout(r,900));g.updateMatrixWorld(true);const gp=HD.gripPoint;const hR=gp('R',V()),hL=gp('L',V());const P=a=>g.localToWorld(V().set(...a));const rel=w=>[+(w.x-p.x).toFixed(3),+(w.y-p.y).toFixed(3),+(w.z-p.z).toFixed(3)];const rg=P([0,-0.017,-0.52]),peg=P([-0.304,0.012,0.16]);const RC=new T.THREE.Raycaster(),wm=Object.values(T.weaponMeshes).concat([m.userData.elbowLG&&m.userData.elbowLG.parent,m.userData.elbowRG&&m.userData.elbowRG.parent].filter(Boolean)),meshes=[];m.traverse(o=>{if(!o.isMesh)return;let q=o,skip=false;while(q){if(wm.includes(q)){skip=true;break;}q=q.parent;}if(!skip)meshes.push(o);});const gfw=P([0,0,1]).sub(P([0,0,0])).normalize();let pen=-9,penAt=null,hits=0;for(const gx of [-0.12,-0.06,0,0.06,0.12])for(const gy of [-0.11,-0.055,0,0.055,0.11]){const pt=P([gx,gy,-0.45]);const o=pt.clone().addScaledVector(gfw,1.3);RC.set(o,gfw.clone().negate());RC.far=1.3+0.6;const hit=RC.intersectObjects(meshes,false)[0];if(hit){hits++;const along=1.3-hit.distance;if(along>pen){pen=along;penAt=[gx,gy];}}}return 'PR'+JSON.stringify({pen:+pen.toFixed(3),penAt,hits,C,dRrear:+hR.distanceTo(rg).toFixed(3),dLpeg:+hL.distanceTo(peg).toFixed(3),rear:rel(rg),peg:rel(peg),housingRear:rel(P([0,0,-0.45])),housingFront:rel(P([0,0,0.225])),hR:rel(hR),hL:rel(hL),ammo:rel(P([0.2,-0.08,-0.02]))})+'END'`;
  const m = cam('eval', body).match(/PR(.*)END/);
  out.push(m ? JSON.parse(m[1]) : { C: c, err: 'nomatch' });
  console.log(JSON.stringify(out[out.length - 1]));
}
fs.writeFileSync(process.argv[3] || 'qa/2026-11-03-GB-275/sweep-out.json', JSON.stringify(out, null, 1));
cam('stop');