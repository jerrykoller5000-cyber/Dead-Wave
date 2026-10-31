// GB-248 edit 3: the feral's arms in the lunge go on top of GP-19850's claws (applyFeralClaws sets the arms and the
// palms after the poses above), as a pitch about the shoulder, so the claws' palm-down hold rides along with them.
import fs from 'node:fs';
const src = fs.readFileSync('index.html', 'utf8');
const L = src.split('\n');
const find = (starts) => { const i = L.findIndex((l) => l.trim().startsWith(starts)); if (i < 0 || L.slice(i + 1).some((l) => l.trim().startsWith(starts))) throw new Error('not unique: ' + starts); return i; };
const I10 = '          ', I8 = '        ';
const a = find("if (ud.armLG && !parts.armL) { ud.armLG.rotation.x += (armBaseL + armOff - ud.armLG.rotation.x) * w;");
if (!L[a + 1].trim().startsWith("if (ud.armRG && !parts.armR) { ud.armRG.rotation.x += (armBaseR + armOff - ud.armRG.rotation.x) * w;")) throw new Error('armR line');
const c = find("const armOff = 0.55 + (-1.5 - 0.55) * m, elb = -0.95 + 0.8 * m,");
if (c !== a - 1) throw new Error('armOff line');
const k = find("if (poseWork && kind === 'feral') applyFeralClaws(THREE, z, phase, standing ? 0 : walkAmt);");
const callLine = L[k];
// bottom-up
L.splice(k, 1,
  I8 + "const hzReach = z._hzReach || 0; z._hzReach = 0;   // GB-248: the lunge's arms, set in the feral's lunge pose above",
  I8 + "if (poseWork && kind === 'feral') {",
  I10 + "applyFeralClaws(THREE, z, phase, standing ? 0 : walkAmt);   // GP-19850: open, palms-down rakes over final torso pose",
  I10 + "if (hzReach) { if (ud.armLG && !parts.armL) ud.armLG.rotation.x += hzReach; if (ud.armRG && !parts.armR) ud.armRG.rotation.x += hzReach; }   // GB-248: drawn back in the coil, thrown at him in the spring",
  I8 + "}");
L.splice(c, 3,
  I10 + "const lean = 0.45 + 0.17 * m, sink = 0.12 - 0.07 * m, knee = 0.55 - 0.35 * m, look = -0.4 - 0.12 * m;",
  I10 + "z._hzReach = (0.45 + (-1.05 - 0.45) * m) * w;   // the arms: applied over the claws below (applyFeralClaws owns the arms and palms)");
if (!callLine.includes('GP-19850')) throw new Error('call line');
fs.writeFileSync('index.html', L.join('\n'), 'utf8');
console.log('ok', src.split('\n').length, '->', L.length);
