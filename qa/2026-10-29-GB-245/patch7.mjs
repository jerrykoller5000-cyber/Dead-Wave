import fs from 'node:fs'; import crypto from 'node:crypto';
const FILE='index.html'; const buf=fs.readFileSync(FILE);
const got=crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const s=buf.toString('utf8');
const EDITS=[
 ['side-key', `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1, cant: 1, hip: 0 };`,
  `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, side: 0, tip: 0, turn: 1, cant: 1, hip: 0 };`],
 ['side-apply', `        P.x += (e[4] * FP_RELOAD_LIFT.up + e[8] * FP_RELOAD_LIFT.in) * rw;`,
  `        P.x += (e[0] * FP_RELOAD_LIFT.side + e[4] * FP_RELOAD_LIFT.up + e[8] * FP_RELOAD_LIFT.in) * rw;`],
 ['side-apply-z', `        P.z += (e[6] * FP_RELOAD_LIFT.up + e[10] * FP_RELOAD_LIFT.in) * rw;`,
  `        P.z += (e[2] * FP_RELOAD_LIFT.side + e[6] * FP_RELOAD_LIFT.up + e[10] * FP_RELOAD_LIFT.in) * rw;`],
];
let out=s,bad=0;
for(const [n,a,b] of EDITS){const c=out.split(a).length-1;console.log((c===1?'ok   ':'FAIL ')+n+' x'+c);if(c!==1){bad++;continue;}out=out.replace(a,()=>b);}
if(bad)process.exit(1);
const now=crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();if(now!==got){console.error('changed');process.exit(1);}
fs.writeFileSync(FILE,out,'utf8');
console.log('wrote '+crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase());