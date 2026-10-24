// GB-223 scratch: why t188 reads the flamer and chainsaw hands off their anchors (state at the read + shots).
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-223'], O = 'qa/2026-10-23-GB-223';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
for (const w of ['flamer', 'chainsaw', 'launcher']) {
  console.log(cam('eval', `const T=TT; T.grantAllWeapons&&T.grantAllWeapons(); T.setHp&&T.setHp(1e5); T.clearZombies&&T.clearZombies(); T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); const p=T.player.position; for(let i=0;i<120;i++){T.aimTarget.set(p.x,T.sampleHeight(p.x,p.z)+1.25,p.z+10); await new Promise(r=>setTimeout(r,30));} const V=()=>new T.THREE.Vector3(); const H=T.getShoulderDbg().holds['${w}'], g=T.weaponMeshes['${w}'], gp=T.handsDbg.gripPoint; const r=gp('R',V()).distanceTo(g.localToWorld(V().set(...H.grip))); const l=Array.isArray(H.fore)?gp('L',V()).distanceTo(g.localToWorld(V().set(...H.fore))):null; return 'PR ${w} '+JSON.stringify({cur:T.getCurrentWeapon(), swap:T.getSwapDbg(), draw:T.drawDbg&&T.drawDbg(), carry:T.carryDbg&&T.carryDbg(), r:+r.toFixed(3), l:l&&+l.toFixed(3), sh:H.sh, level:H.level}).slice(0,700)`));
  cam('shot', 'player', '--out', `${O}/t188-probe-${w}.png`);
}
cam('stop');
