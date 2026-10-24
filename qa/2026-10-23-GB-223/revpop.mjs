// GB-223 scratch: the revolver reload frame by frame (inspector), the support hand leaving and rejoining the grip.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
const A = ['--agent', 'grokbot', '--task', 'GB-223'], O = 'qa/2026-10-23-GB-223/revolver-pop';
fs.mkdirSync(O, { recursive: true });
const cam = (...a) => execFileSync(process.execPath, ['tools/camera.mjs', ...a, ...A], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
cam('start', '--inspect');
console.log(cam('eval', "await DWInspect.show('marine'); DWInspect.marine.weapon('revolver'); await new Promise(r=>setTimeout(r,1500)); await DWInspect.marine.play('reload-revolver', { loop: false }); DWInspect.pause(); return JSON.stringify(DWInspect.marine.state()).slice(0,300)"));
const log = [];
for (let i = 0; i < 44; i++) {
  const r = cam('eval', "await DWInspect.stepAsync(3); const M=window.TT?TT.getMarine():null; const ud=M&&M.userData; let p=null; if(ud){const w=ud.elbowLG.userData.wrist||ud.elbowLG; p=w.getWorldPosition(new TT.THREE.Vector3()).toArray().map(v=>+v.toFixed(4));} return 'FR '+JSON.stringify({p, st:(DWInspect.marine.state()||{}).t})");
  const m = r.match(/FR (.*)/); log.push(m ? m[1] : '?');
  cam('shot', 'marine', '--yaw', '35', '--pitch', '15', '--zoom', '3.2', '--lookY', '0.35', '--out', `${O}/f${String(i).padStart(2, '0')}.png`);
}
fs.writeFileSync(O + '/frames.jsonl', log.join('\n'));
cam('stop');
