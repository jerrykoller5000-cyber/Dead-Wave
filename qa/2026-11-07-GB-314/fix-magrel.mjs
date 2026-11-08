import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
const nl = raw.toString('utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = raw.toString('utf8').split(/\r?\n/);
const magRel = lines.findIndex((l) => l.includes('GB-309: mag release in the grip'));
if (magRel < 0) throw new Error('mag release');
// Expect: magRel, paddle, screw, old for-loop start ... through closing } before selector
const sel = lines.findIndex((l, i) => i > magRel && l.includes('GB-309: selector dial'));
if (sel < 0) throw new Error('selector');
// Replace magRel..sel-1 with mag release on the new face width only (no old panels)
const block = [
  '  // GB-309/GB-314: mag release on the left grip face (paddle + button) — yardstick; x on the 62 mm box face.',
  '  K.box(0.0045, 0.014, 0.022, gunDark, -0.0335, -0.048, 0.010, 0, 0, 0, null, 0.001);   // paddle',
  '  D.screw(gun, -0.0355, -0.048, 0.010, { axis: \'x\', side: -1, r: 0.0036, head: 0.0018, kind: \'button\', mat: D.mats.bright });'
];
lines.splice(magRel, sel - magRel, ...block);
fs.writeFileSync(FILE, lines.join(nl));
console.log(JSON.stringify({ ok: true, magRel: magRel + 1, removedTo: sel + 1 }));