// GB-275 scratch driver: the chainsaw's third-person hold, close-ups and hand-to-anchor numbers. Usage: node drive.mjs <before|after>
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-275'], O = process.argv[2] || 'before';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
cam('eval', "T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); window.dispatchEvent(new KeyboardEvent('keydown',{code:'F13',key:'F13',bubbles:true})); return 'ok'");
const w = 'chainsaw';
const take = `if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); await new Promise(r=>setTimeout(r,2500)); return T.getCurrentWeapon();`;
console.log('took', cam('eval', take).trim().split('\n').pop());
const PROBE = `V=()=>new T.THREE.Vector3(),g=T.weaponMeshes.chainsaw,H=T.getShoulderDbg().holds.chainsaw,HD=T.handsDbg;g.updateMatrixWorld(true);const gp=HD.gripPoint;const hR=gp('R',V()),hL=gp('L',V());const ag=g.localToWorld(V().set(...H.grip)),af=g.localToWorld(V().set(...H.fore));const fw=V();T.getMarine().getWorldDirection(fw);return 'PROBE'+JSON.stringify({grip:H.grip,fore:H.fore,trig:H.trig,hold:H.hold,R:hR.toArray().map(v=>+v.toFixed(3)),L:hL.toArray().map(v=>+v.toFixed(3)),dR:+hR.distanceTo(ag).toFixed(3),dL:+hL.distanceTo(af).toFixed(3),f:fw.toArray()})+'END';`;
const pr = cam('eval', PROBE).match(/PROBE(.*)END/);
console.log(O, 'probe', pr && pr[1]);
const j = pr && JSON.parse(pr[1]);
cam('shot', 'player', '--yaw', '60', '--pitch', '10', '--zoom', '4', '--out', `qa/2026-11-03-GB-275/${O}/hold-chainsaw-left.png`);
cam('shot', 'player', '--yaw', '-40', '--pitch', '25', '--zoom', '4', '--out', `qa/2026-11-03-GB-275/${O}/hold-chainsaw-right.png`);
cam('shot', 'player', '--view', 'top', '--zoom', '4', '--out', `qa/2026-11-03-GB-275/${O}/hold-chainsaw-top.png`);
cam('shot', 'player', '--view', 'right', '--zoom', '3', '--out', `qa/2026-11-03-GB-275/${O}/hold-chainsaw-sideR.png`);
if (j) for (const [h, p] of [['R', j.R], ['L', j.L]]) {
  const f = j.f, s = h === 'L' ? 1 : -1, rx = -f[2], rz = f[0];
  for (const [tag, off] of [['side', [s, 0.15, 0]], ['top', [0, 1, 0.2]], ['under', [s * 0.5, -0.8, 0.4]]]) {
    const o = [off[0] * rx * 0.4 + off[2] * f[0] * 0.4, off[1] * 0.4, off[0] * rz * 0.4 + off[2] * f[2] * 0.4];
    const c = p.map((v, i) => +(v + o[i]).toFixed(3));
    cam('shot', 'player', '--cam', c.join(','), '--look', p.join(','), '--out', `qa/2026-11-03-GB-275/${O}/hold-close-chainsaw-${h}-${tag}.png`);
  }
}
cam('stop');