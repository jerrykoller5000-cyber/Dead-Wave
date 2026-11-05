import fs from 'fs';
const P = 'index.html';
const raw = fs.readFileSync(P, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) throw new Error('BOM');
const EOL = raw.includes('\r\n') ? '\r\n' : '\n';
const L = raw.split(EOL);
const at = L.findIndex(l => l === '    function ZombieShape(mesh, x, z, tk, def, vr, hp, riseDur) {');
if (at < 0 || L.filter(l => l.includes('function ZombieShape(')).length !== 1) throw new Error('anchor');
const F = 'hp x z speed baseSpeed scale riseT riseDur hitH armor attackCd attackWindup swingT meleeMult fireResist sprintT rushT hitReact hitDirX hitDirZ staggerVX staggerVZ flashT deathT deathDirX deathDirZ roleArmorAdd roleFireAdd _tickAcc paceMul paceNight paceU hzRecoilT hzRecoilCd hzStaggerCd stuckT _hzReach _rim fogKeepT lineGo guardianProgressT buffT lineLostT gaitMul'.split(' ');
const ins = [
  '      // GB-272 (V8 --log-maps): a field first written a whole number (Smi) and later a fraction (0.22, dt) changes its representation to',
  '      // double, and V8 then deprecates every map after it: with 250 fields that is a 200+ map chain, and every function that reads',
  '      // a zombie deoptimizes (about 60-100 each time, 20+ times in the first minute of a night-20 fight). So the fields that carry',
  '      // fractions are written 0.5 first (a double from the start); the real values below follow, unchanged. Add a field that gets a',
  '      // fraction later to this list.',
];
const w = []; for (let i = 0; i < F.length; i += 6) w.push('      ' + F.slice(i, i + 6).map(k => 'this.' + k + ' = 0.5;').join(' '));
L.splice(at + 1, 0, ...ins, ...w);
fs.writeFileSync(P, L.join(EOL), { encoding: 'utf8' });
console.log('inserted', ins.length + w.length, 'lines after', at + 1, 'fields', F.length);
