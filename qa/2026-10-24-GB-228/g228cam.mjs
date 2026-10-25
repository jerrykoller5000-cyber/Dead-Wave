// GB-228 scratch driver: per gun, first person hip / aimed / mid-reload page shots, plus the numbers:
// where the rear and front sight land on screen when aimed (NDC, 0,0 = centre), and each hand's gap to its grip point.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const PH = process.argv[2] || 'before';
const A = ['--agent', 'grokbot', '--task', 'GB-228'], O = 'qa/2026-10-24-GB-228/' + PH;
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const ev = (js) => { try { return cam('eval', '{' + js + '}').split('\n').filter((l) => /^(FP|RL|HD) /.test(l)).join(' '); } catch (e) { return 'ERR ' + String(e.message).slice(0, 300); } };
// rear/front sight tops in gun space (t277 / sight-points.js comments)
const RF = { pistol: [[0,.075,.072],[0,.087,.287]], revolver: [[0,.109,.081],[0,.121,.326]], uzi: [[0,.156,-.087],null], shotgun: [[0,.087,-.129],[0,.081,.915]],
  m4: [[0,.168,.004],[0,.138,.673]], ak: [[0,.095,.218],[0,.097,.84]], aa12: [[0,.18,-.12],[0,.175,.75]], launcher: [[0,.123,.053],[0,.102,.65]], sniper: [null,null], minigun: [null,null], flamer: [null,null], chainsaw: [null,null] };
cam('start', '--match');
ev("TT.setHp(100000); TT.clearZombies&&TT.clearZombies(); TT.grantAllWeapons(); return 'FP ok'");
const HANDS = (w) => `const V=()=>new T.THREE.Vector3(); let hd='na'; try { const H=T.getShoulderDbg().holds['${w}'], g=T.weaponMeshes['${w}'], gp=T.handsDbg.gripPoint; const r=gp('R',V()).distanceTo(g.localToWorld(V().set(...H.grip))); const l=Array.isArray(H.fore)?gp('L',V()).distanceTo(g.localToWorld(V().set(...H.fore))):null; hd='R '+r.toFixed(3)+' L '+(l==null?'-':l.toFixed(3)); } catch(e) { hd='err '+e.message; }`;
for (const w of Object.keys(RF)) {
  const [r, f] = RF[w];
  console.log(ev(`const T=TT; if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } await new Promise(r=>setTimeout(r,2000)); T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1500)); ${HANDS(w)} return 'HD ${w} hip '+hd;`));
  cam('shot', '--live', '--ui', '--out', `${O}/hip-${w}.png`);
  console.log(ev(`const T=TT; T.setZoomHeldDbg(true); const t0=Date.now(); while (T.fpDbg().ads < 0.99 && Date.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,600)); const g=T.weaponMeshes['${w}'], c=T.camera||window.camera; g.updateWorldMatrix(true,false); const P=(a)=>{ if(!a) return '-'; const v=g.localToWorld(new T.THREE.Vector3(...a)).project(c); return v.x.toFixed(3)+','+v.y.toFixed(3); }; ${HANDS(w)} return 'FP ${w} ads '+T.fpDbg().ads.toFixed(2)+' rear '+P(${JSON.stringify(r)})+' front '+P(${JSON.stringify(f)})+' muzzle '+P(g.userData.muzzleLocal?g.userData.muzzleLocal.toArray?g.userData.muzzleLocal.toArray():g.userData.muzzleLocal:null)+' | '+hd;`));
  cam('shot', '--live', '--ui', '--out', `${O}/ads-${w}.png`);
  console.log(ev(`const T=TT; T.setZoomHeldDbg(false); await new Promise(r=>setTimeout(r,900)); if (T.setMagazinesDbg) {} T.setAmmoDbg('${w}',0); await new Promise(r=>setTimeout(r,50)); if (!T.isReloading()) T.startReload&&T.startReload(); const t0=Date.now(); let d=T.getReloadDbg?T.getReloadDbg():null; await new Promise(r=>setTimeout(r,50)); d=T.getReloadDbg?T.getReloadDbg():null; const dur=(d&&(d.dur||d.total||d.time))||1.6; await new Promise(r=>setTimeout(r,Math.max(200,dur*450))); ${HANDS(w)} return 'RL ${w} reloading '+T.isReloading()+' dbg '+JSON.stringify(T.getReloadDbg?T.getReloadDbg():null).slice(0,160)+' | '+hd;`));
  cam('shot', '--live', '--ui', '--out', `${O}/reload-${w}.png`);
  ev("const T=TT; const t0=Date.now(); while (T.isReloading() && Date.now()-t0<8000) await new Promise(r=>setTimeout(r,100)); T.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
}
cam('stop');