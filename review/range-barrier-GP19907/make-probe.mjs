import fs from 'node:fs';
const p='review/range-barrier-GP19907/';
let s=fs.readFileSync(p+'verify.mjs','utf8');
s=s.slice(0,s.indexOf(' proof.console='))+`
for(const w of ['pistol','m4','ak','shotgun','sniper','launcher','minigun','flamer','chainsaw']) {
const r=await E.ev("begin('"+w+"');const i=T.rangeDbg.read().plan.ids[0];aim(i);__step(120);const m=T.getMuzzleWorld().clone();const tr=await import('/review/range-barrier-GP19907/training-ballistics.js');const hit=tr.traceTraining(T.trainingDbg.tg(),m,__target);fire(30);return {w:'"+w+"',m:m.toArray(),target:__target.toArray(),hit,stats:T.rangeDbg.read().stats};"); console.log(JSON.stringify(r));
}
}finally{await E.close();}process.exit(0);
`;
fs.writeFileSync(p+'probe.mjs',s);
