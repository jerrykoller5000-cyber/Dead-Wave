// GB-313: seat revolver rear-sight blade/ears/screws on the notch base (t333 floats). CRLF preserved, no BOM.
import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF) throw new Error('BOM');
let text = raw.toString('utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);

function find(pred, from = 0) { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; return -1; }

const start = find((l) => l.includes('export function makeRevolverModel'));
if (start < 0) throw new Error('makeRevolverModel not found');
const mark = find((l) => l.includes('GB-308: adjustable rear sight'), start);
if (mark < 0) throw new Error('rear sight block missing');
if (lines[mark].includes('GB-313')) { console.log(JSON.stringify({ already: true })); process.exit(0); }

const base = mark + 1, ears = mark + 2, blade = mark + 3, screws = mark + 4;
for (const [i, tip] of [[base, 'K.slab'], [ears, 'K.box'], [blade, 'blade'], [screws, 'D.screw']]) {
  if (!lines[i] || !lines[i].includes(tip === 'blade' ? 'blade' : tip)) {
    throw new Error('unexpected rear-sight line ' + i + ': ' + (lines[i] || '(missing)'));
  }
}

lines[mark] = '  // GB-308/GB-313: adjustable rear sight — blade + ears + elevation screws seated ON the notch base (t333: no floats).';
lines[base] = '  K.slab([[-0.013, 0.112], [0.013, 0.112], [0.013, 0.120], [-0.013, 0.120]], 0.026, gunDark, { bevel: 0.001, z: -0.050 });';
lines[ears] = '  for (const sx of [-1, 1]) K.box(0.0045, 0.008, 0.012, gunDark, sx * 0.0085, 0.118, -0.050, 0, 0, 0, null, 0.0006);   // ears on base';
lines[blade] = '  K.box(0.010, 0.005, 0.009, steelMat, 0, 0.1195, -0.050, 0, 0, 0, null, 0.0005);   // blade in notch (GB-313 seated)';
lines[screws] = "  for (const sx of [-1, 1]) D.screw(gun, sx * 0.009, 0.120, -0.050, { axis: 'y', side: 1, r: 0.0018, head: 0.0010, kind: 'slot' });   // GB-313: on base top";

fs.writeFileSync(FILE, lines.join(nl));
console.log(JSON.stringify({ ok: true, mark: mark + 1, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));