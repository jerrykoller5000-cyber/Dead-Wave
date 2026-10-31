// GB-248 edit 4: one committed attack at a time for the colossus. Its claw swing no longer starts inside the slam's
// wind-up or follow-through (it snapped the raised arms down mid-wind-up), and the slam waits for a swing to finish.
import fs from 'node:fs';
const src = fs.readFileSync('index.html', 'utf8');
const rep = (a, b) => { const n = src.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ': ' + a.slice(0, 80)); return [a, b]; };
const edits = [
  rep("&& !bruteStep?.busy && z.attackWindup <= 0 && !rising && !z.abilityBusy && tactics !== 'bomb') {   // GB-43, GP-19858",
      "&& !bruteStep?.busy && z.attackWindup <= 0 && !rising && !z.abilityBusy && tactics !== 'bomb' && !(z.slamWind > 0) && !(z.slamFollowT > 0 && z.typeKey === 'colossus')) {   // GB-43, GP-19858; GB-248: not inside the colossus's slam"),
  rep("            if (wantSlam && z.slamCd <= 0) {",
      "            if (wantSlam && z.slamCd <= 0 && !(z.attackWindup > 0) && !(z.swingT > 0)) {   // GB-248: a claw swing finishes first"),
];
let out = src;
for (const [a, b] of edits) out = out.replace(a, b);
fs.writeFileSync('index.html', out, 'utf8');
console.log('ok');
