// GB-275 minigun half: third-person hold onto GP-20024's side peg. Framed on the gun in world space.
// Usage: node qa/2026-11-03-GB-275/drive-minigun.mjs <before|after|tag>   (through the game-test slot)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-275'], O = process.argv[2] || 'before';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
fs.mkdirSync(`qa/2026-11-03-GB-275/${O}`, { recursive: true });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true})); return 'ok'");
const w = 'minigun';
const take = `if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); await new Promise(r=>setTimeout(r,2500)); return T.getCurrentWeapon();`;
console.log('took', cam('eval', take).trim().split('\n').pop());
const AIM = `const V=()=>new T.THREE.Vector3(),m=T.getMarine(),g=T.weaponMeshes.minigun;let out=[];for(let k=0;k<4;k++){g.updateMatrixWorld(true);const c=g.localToWorld(V().set(0,0,0)),a=g.localToWorld(V().set(0,0,1)).sub(c).setY(0).normalize(),f=V();m.getWorldDirection(f);const p=m.getWorldPosition(V());T.setAimYawDbg(Math.atan2(f.x,f.z));T.aimPointDbg(p.x+f.x*15,p.y+1.1,p.z+f.z*15);out.push([+f.x.toFixed(2),+f.z.toFixed(2),+a.x.toFixed(2),+a.z.toFixed(2)]);await new Promise(r=>setTimeout(r,1200));}return 'AIMED'+JSON.stringify(out)+'END';`;
console.log('aim', cam('eval', AIM).trim().split('\n').pop());
const PROBE = `V=()=>new T.THREE.Vector3(),g=T.weaponMeshes.minigun,H=T.getShoulderDbg().holds.minigun,HD=T.handsDbg;g.updateMatrixWorld(true);const gp=HD.gripPoint;const hR=gp('R',V()),hL=gp('L',V());const P=a=>g.localToWorld(V().set(...a));const ag=P(H.grip),af=P(H.fore),peg=P([-0.304,0.012,0.16]),rg=P([0,-0.017,-0.52]),tr=P([0,0.04,-0.43]),c=P([0,0,0]);const fw=V();T.getMarine().getWorldDirection(fw);const r=a=>a.toArray().map(v=>+v.toFixed(3));return 'PROBE'+JSON.stringify({grip:H.grip,fore:H.fore,trig:H.trig,hold:H.hold,twist:H.twist,scale:g.scale.x,R:r(hR),L:r(hL),dR:+hR.distanceTo(ag).toFixed(3),dL:+hL.distanceTo(af).toFixed(3),dLpeg:+hL.distanceTo(peg).toFixed(3),dRrear:+hR.distanceTo(rg).toFixed(3),dRtrig:+hR.distanceTo(tr).toFixed(3),peg:r(peg),rear:r(rg),trigW:r(tr),c:r(c),f:r(fw),lx:r(P([-1,0,0]).sub(c).setY(0).normalize()),gf:r(P([0,0,1]).sub(c).setY(0).normalize())})+'END';`;
const CANDS = process.argv[3] ? JSON.parse(fs.readFileSync(process.argv[3], 'utf8')) : [{ tag: '' }];
for (const cand of CANDS) {
const { tag, hands, ...ov } = cand; const O2 = tag ? `${O}/${tag}` : O; fs.mkdirSync(`qa/2026-11-03-GB-275/${O2}`, { recursive: true });
if (hands) cam('eval', `const HS=T.handsDbg.HANDS; if ('skip' in ${JSON.stringify(hands)}) HS.skip.minigun=${JSON.stringify(hands.skip)}; if (${JSON.stringify(hands.fore || null)}) HS.fore.minigun=${JSON.stringify(hands.fore || null)}; else delete HS.fore.minigun; return 'hands'`);
cam('eval', AIM);
if (Object.keys(ov).length) { cam('eval', `Object.assign(T.getShoulderDbg().holds.minigun, ${JSON.stringify(ov)}); await new Promise(r=>setTimeout(r,1200)); return 'set'`); }
const pr = cam('eval', PROBE).match(/PROBE(.*)END/);
console.log(O, 'probe', pr && pr[1]);
const j = pr && JSON.parse(pr[1]);
fs.writeFileSync(`qa/2026-11-03-GB-275/${O2}/mg-probe.json`, pr ? pr[1] : '{}');
if (j) {
  const f = j.gf, l = j.lx;   // gun-local -X (the peg side, the marine's left), as a world direction
  const add = (p, ...t) => p.map((v, i) => +(v + t.reduce((s, [k, d]) => s + k * d[i], 0)).toFixed(3));
  const up = [0, 1, 0];
  const shot = (name, from, look) => cam('shot', 'player', '--cam', from.join(','), '--look', look.join(','), '--out', `qa/2026-11-03-GB-275/${O2}/mg-${name}.png`);
  const c = j.c, peg = j.peg, rg = j.rear;
  shot('side-left', add(c, [2.4, l], [0.3, up]), c);
  shot('side-right', add(c, [-2.4, l], [0.3, up]), c);
  shot('top', add(c, [2.6, up], [0.15, f]), c);
  shot('three-left', add(c, [1.7, l], [1.5, f], [0.7, up]), c);
  shot('three-rear', add(c, [1.2, l], [-2.0, f], [0.7, up]), c);
  shot('peg-left', add(peg, [0.7, l], [0.15, up]), peg);
  shot('peg-top', add(peg, [0.8, up], [0.12, l]), peg);
  shot('peg-front', add(peg, [0.9, f], [0.25, l], [0.1, up]), peg);
  shot('peg-close-left', add(peg, [0.38, l], [0.05, up]), peg);
  shot('peg-close-front', add(peg, [0.42, f], [0.12, l], [0.05, up]), peg);
  shot('peg-close-back', add(peg, [-0.42, f], [0.12, l], [0.08, up]), peg);
  shot('peg-close-under', add(peg, [-0.3, up], [0.2, l], [0.1, f]), peg);
  shot('rear-right', add(rg, [-0.8, l], [0.2, up]), rg);
  shot('rear-close-right', add(rg, [-0.4, l], [0.05, up], [-0.1, f]), rg);
  shot('rear-close-top', add(rg, [0.45, up], [-0.15, l]), rg);
  shot('rear-top', add(rg, [0.9, up], [-0.1, f]), rg);
}
}
cam('stop');