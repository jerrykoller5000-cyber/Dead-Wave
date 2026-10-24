// GB-225 scratch: the sniper's scope overlay at the shot (first person and third-person scope), and the heavies at the FP hip.
import { execFileSync } from 'node:child_process';
const A = ['--agent', 'grokbot', '--task', 'GB-225'], O = 'qa/2026-10-24-GB-225';
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const pr = (r) => console.log(r.split('\n').filter((l) => l.includes('GB225')).join('\n'));
const css = "const e=document.getElementById('scopeOverlay'), c=getComputedStyle(e), r=e.getBoundingClientRect(), L=document.getElementById('scopeZoomLabel'), lc=L&&getComputedStyle(L); const top=document.elementFromPoint(innerWidth/2, innerHeight/2); return 'GB225 '+TAG+' '+JSON.stringify({opacity:c.opacity, inline:e.style.opacity, display:c.display, visibility:c.visibility, z:c.zIndex, position:c.position, rect:[r.x,r.y,r.width,r.height].map(Math.round), bgLen:c.backgroundImage.length, label:lc&&{opacity:lc.opacity,display:lc.display,z:lc.zIndex,text:L.textContent}, bodyCls:document.body.className, centerTop:top&&(top.id||top.tagName), canvasZ:getComputedStyle(document.querySelector('canvas')).zIndex, fp:(()=>{const f=T.fpDbg();return {first:f.first,ads:f.ads}})(), cur:T.getCurrentWeapon()});";
const pick = (w) => `T.setHp(100000); T.clearZombies&&T.clearZombies(); T.grantAllWeapons(); if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== '${w}'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('${w}')); await new Promise(r=>setTimeout(r,150)); } if (T.marineIdleDbg) T.marineIdleDbg().reset(); await new Promise(r=>setTimeout(r,2500));`;
cam('start', '--match');
// first person, down the scope
pr(cam('eval', `${pick('sniper')} T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,1500)); T.setZoomHeldDbg(true); const t0=Date.now(); while (T.fpDbg().ads < 0.99 && Date.now()-t0 < 6000) await new Promise(r=>setTimeout(r,100)); await new Promise(r=>setTimeout(r,600)); const TAG='fp-scope'; ${css}`));
cam('shot', '--live', '--ui', '--out', `${O}/scope-fp-sniper.png`);
pr(cam('eval', `const TAG='fp-scope-after-shot'; ${css}`));
// third person, the scope
pr(cam('eval', `T.setZoomHeldDbg(false); await new Promise(r=>setTimeout(r,800)); T.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,1500)); if (T.marineIdleDbg) T.marineIdleDbg().reset(); T.setZoomHeldDbg(true); await new Promise(r=>setTimeout(r,2000)); const TAG='tp-scope'; ${css}`));
cam('shot', '--live', '--ui', '--out', `${O}/scope-tp-sniper.png`);
pr(cam('eval', `const TAG='tp-scope-after-shot'; ${css}`));
cam('eval', "T.setZoomHeldDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
// the heavies at the first-person hip (CL-251)
for (const w of ['minigun', 'chainsaw']) {
  pr(cam('eval', `${pick(w)} T.setViewFirstDbg(true); await new Promise(r=>setTimeout(r,2000)); const f=T.fpDbg(); return 'GB225 hip ${w} '+JSON.stringify({cur:T.getCurrentWeapon(), first:f.first, ads:f.ads, tune:T.fpTuneDbg()});`));
  cam('shot', '--live', '--ui', '--out', `${O}/fp-hip-${w}.png`);
  cam('eval', "T.setViewFirstDbg(false); await new Promise(r=>setTimeout(r,800)); return 1");
}
cam('stop');