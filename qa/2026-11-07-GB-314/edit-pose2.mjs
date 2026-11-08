import fs from 'node:fs';
const FILE = 'game/viewmodel-poses.js';
const raw = fs.readFileSync(FILE);
const nl = raw.toString('utf8').includes('\r\n') ? '\r\n' : '\n';
const lines = raw.toString('utf8').split(/\r?\n/);
const j = lines.findIndex((l) => l.includes('GB-314 fit after socket'));
if (j < 0) throw new Error('pose line');
// digit(1.45)->[1.45,1.668,1.378,0]; digit(1.306)-> approx from gripPose
// Use HG expansion: for curl c, digit returns [c, c*1.15, c*0.95, 0] roughly from earlier poses
lines[j] = '    supportPose: { f: [[1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.306, 1.502, 1.241, 0]], t: [1.45, -0.15, 0.87] } },   // GB-314 fit at support y -0.055 (palm still ~1 cm in; note to Claude)';
fs.writeFileSync(FILE, lines.join(nl));
console.log('pose updated', j+1);