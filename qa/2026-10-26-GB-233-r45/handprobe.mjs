import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-233'];
const cam = (...a) => { try { return execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim(); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const OV = process.argv[4] || 'null';
const w = process.argv[2] || 'flamer', fp = process.argv[3] !== 'tp';
const HANDS = `const V=()=>new T.THREE.Vector3(); const H=T.getShoulderDbg().holds['${w}'], g=T.weaponMeshes['${w}'], gp=T.handsDbg.gripPoint; const r=gp('R',V()).distanceTo(g.localToWorld(V().set(...H.grip))); const l=Array.isArray(H.fore)?gp('L',V()).distanceTo(g.localToWorld(V().set(...H.fore))):-1; const lg=gp('L',V()).distanceTo(g.localToWorld(V().set(...H.grip)));`;
cam('start', '--match');
cam('eval', "{TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 1}");
console.log(cam('eval', `{const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='${w}';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150));} await new Promise(r=>setTimeout(r,1800)); if(${OV}) Object.assign(T.fpHeavyHipDbg()['${w}'],${OV}); T.setViewFirstDbg(${fp}); await new Promise(r=>setTimeout(r,1200)); T.marineIdleDbg().reset(); ${HANDS} return 'hip R(grip) '+r.toFixed(3)+' L(fore) '+l.toFixed(3)+' L(grip) '+lg.toFixed(3)}`));
console.log(cam('eval', `{const T=TT; T.marineIdleDbg().reset(); T.setMouseFireDbg(true); const out=[]; for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,200)); ${HANDS} out.push('F '+r.toFixed(3)+'/'+l.toFixed(3)); } T.setMouseFireDbg(false); await new Promise(r=>setTimeout(r,600)); return out.join(' | ')}`));
 console.log(cam('eval', `{const T=TT; T.setAmmoDbg('${w}',0); await new Promise(r=>setTimeout(r,50)); if(!T.isReloading()) window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR'})); const out=[]; for(let i=0;i<14;i++){ await new Promise(r=>setTimeout(r,180)); ${HANDS} out.push((T.isReloading()?'R':'-')+' '+r.toFixed(3)+'/'+l.toFixed(3)); } return out.join(' | ')}`));
cam('stop');


