// GB-275: does the minigun hold edit cause t298's 4-7 mm eye-ease miss? Live A/B in one page (nothing saved).
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-275'];
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--match');
const NEW = { twist: 1.0, hold: [-0.3, -0.25, 0.34], grip: [0, -0.017, -0.52], fore: [-0.304, 0.012, 0.16] };
const OLD = { twist: 0.6, hold: [-0.3, -0.3, 0.2], grip: [0, 0.2, -0.28], fore: [0, 0.14, -0.05] };
const body = (V) => `return (async()=>{const wt=(ms)=>new Promise(r=>setTimeout(r,ms));const T=window.TT;const H=T.getShoulderDbg().holds.minigun;Object.assign(H,${JSON.stringify(V)});
if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i=0;i<16&&T.getCurrentWeapon()!=='minigun';i++){T.setWeapon(T.WEAPON_ORDER.indexOf('minigun'));await wt(150);}
const weapon=T.getCurrentWeapon();T.setViewFirstDbg(true);await wt(3000);T.flightHold(true);T.flightReset();const dt=1/30,frames=20/dt;
for(let i=0;i<frames;i++){const keys=['KeyW'];let dx=0,zoom=false;if(i>=200&&i<320)dx=1.5;if(i>=320&&i<480){keys.push('ShiftLeft');zoom=true;}T.flightInput({keys,dx,dy:0,zoom});T.stepFrame(dt);}
const clip=T.flightClip('ab');const saved=clip.frames.map(f=>({cx:f.cx,cy:f.cy,cz:f.cz,dt:f.dt}));T.flightRestore(clip);let lateC=0,worstC=0;
for(let i=0;i<saved.length;i++){T.stepFrame(saved[i].dt);const c=T.camera.position,f=saved[i];const dc=Math.hypot(c.x-f.cx,c.y-f.cy,c.z-f.cz);if(dc>worstC)worstC=dc;if(i>=16&&dc>lateC)lateC=dc;}
return 'AB'+JSON.stringify({weapon,lateC:+lateC.toFixed(5),worstC:+worstC.toFixed(5)})+'END';})();`;
for (const [n, V] of [['OLD', OLD], ['NEW', NEW], ['OLD', OLD], ['NEW', NEW]]) {
  const m = cam('eval', body(V)).match(/AB(.*)END/);
  console.log(n, m ? m[1] : 'nomatch');
}
cam('stop');