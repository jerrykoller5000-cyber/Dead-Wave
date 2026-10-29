import fs from 'node:fs'; import crypto from 'node:crypto';
const FILE='index.html'; const buf=fs.readFileSync(FILE);
const got=crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const s=buf.toString('utf8');
const EDITS=[
 ['cant-key', `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1, hip: 0 };   // GB-245: hip is a door, off: the shoulder reload is the one that can keep the grip in view`,
  `    const FP_RELOAD_LIFT = { up: 0.06, in: 0, tip: 0, turn: 1, cant: 1, hip: 0 };   // GB-245 tuning doors: up/in (camera space), tip (muzzle down), turn (GB-233's tilt), cant (the roll), hip (the carry, off)`],
 ['cant-apply', `      const rlTip = viewFirst ? FP_RELOAD_LIFT.tip * fpReloadLiftW : 0;   // GB-245: the muzzle dips, which brings the grip and the magwell up to him`,
  `      const rlTip = viewFirst ? FP_RELOAD_LIFT.tip * fpReloadLiftW : 0;   // GB-245: the muzzle dips, which brings the grip and the magwell up to him
      const rlCant = viewFirst ? 1 + (FP_RELOAD_LIFT.cant - 1) * fpReloadLiftW : 1;   // GB-245: the roll, tunable`],
 ['cant-use', `      _hE.set(reloadMountOff.rx * rlT + rlTip + recoilKick.rx, reloadMountOff.ry * rlT + recoilKick.ry, reloadMountOff.rz * rlT + recoilKick.rz);`,
  `      _hE.set(reloadMountOff.rx * rlT + rlTip + recoilKick.rx, reloadMountOff.ry * rlT + recoilKick.ry, reloadMountOff.rz * rlT * rlCant + recoilKick.rz);`],
];
let out=s,bad=0;
for(const [n,a,b] of EDITS){const c=out.split(a).length-1;console.log((c===1?'ok   ':'FAIL ')+n+' x'+c);if(c!==1){bad++;continue;}out=out.replace(a,()=>b);}
if(bad)process.exit(1);
const now=crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase();if(now!==got){console.error('changed');process.exit(1);}
fs.writeFileSync(FILE,out,'utf8');
console.log('wrote '+crypto.createHash('sha256').update(fs.readFileSync(FILE)).digest('hex').toUpperCase()+' '+fs.statSync(FILE).size);