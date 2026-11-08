// GB-308: exact-line edit of makeRevolverModel (CRLF preserved, no BOM).
import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF) throw new Error('BOM');
let text = raw.toString('utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
if (lines.some((l) => l.includes('GB-308 fidelity'))) { console.log(JSON.stringify({ already: true })); process.exit(0); }

function find(pred, from = 0) { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; return -1; }

const start = find((l) => l.includes('export function makeRevolverModel'));
if (start < 0) throw new Error('makeRevolverModel not found');
const end = find((l) => l.includes('export function makeUziModel'), start);
const kLine = find((l) => /const K = gunKit\(gun\);/.test(l), start);
if (kLine < 0) throw new Error('gunKit');
if (!lines.slice(start, start + 15).some((l) => l.includes('gunDetail(ctx)'))) {
  lines.splice(kLine + 1, 0, '  const D = gunDetail(ctx);   // GB-308 / CL-309 helpers');
}

// Replace floating side-plate cyl screws with D.screw (exact old line).
const screwLine = find((l) => l.includes('side-plate screws'), start);
if (screwLine < 0) throw new Error('side-plate screws line');
lines[screwLine] = '  for (const sx of [-1, 1]) for (const [y, z] of [[0.086, -0.062], [0.02, -0.058]]) D.screw(gun, sx * 0.0330, y, z, { axis: \'x\', side: sx, r: 0.0030, head: 0.0015, kind: \'slot\' });   // GB-308: attached side-plate screws (was floating cyl)';

// Replace grip panel face cyl with D.screw
const gripScrew = find((l) => l.includes('grip screw on the wood panel'), start);
if (gripScrew < 0) throw new Error('grip screw');
lines[gripScrew] = '    D.screw(gun, sx * 0.0324, -0.072, -0.03, { axis: \'x\', side: sx, r: 0.0028, head: 0.0014, kind: \'slot\' });   // GB-308: grip screw attached';

// Replace rear sight boxes with adjustable rear (blade + elevation screws) — find the two-box line
const rear = find((l) => l.includes('for (const sx of [-1, 1]) K.box(0.012, 0.012, 0.014, gunDark, sx * 0.012, 0.117, -0.05);'), start);
if (rear < 0) throw new Error('rear sight boxes');
lines.splice(rear, 1,
  '  // GB-308: adjustable rear sight (blade in a notch base + two elevation screws) — yardstick: ramp front + adjustable rear.',
  '  K.slab([[-0.012, 0.112], [0.012, 0.112], [0.012, 0.118], [-0.012, 0.118]], 0.022, gunDark, { bevel: 0.001, z: -0.052 });',
  '  for (const sx of [-1, 1]) K.box(0.0045, 0.010, 0.012, gunDark, sx * 0.0085, 0.120, -0.052, 0, 0, 0, null, 0.0006);   // ears',
  '  K.box(0.010, 0.0045, 0.010, steelMat, 0, 0.122, -0.052, 0, 0, 0, null, 0.0005);   // blade',
  '  for (const sx of [-1, 1]) D.screw(gun, sx * 0.014, 0.114, -0.052, { axis: \'y\', side: 1, r: 0.0018, head: 0.0010, kind: \'slot\' });'
);

// Crane pivot: already a cyl; swap to D.screw
const cranePivot = find((l) => l.includes('K.cyl(.0032, .0032, .0016, gunAccent, -.0368, .002, .058'), start);
if (cranePivot < 0) throw new Error('crane pivot');
lines[cranePivot] = '  D.screw(gun, -0.0335, 0.002, 0.058, { axis: \'x\', side: -1, r: 0.0030, head: 0.0015, kind: \'slot\' });   // GB-308: crane pivot screw attached';

// Insert fidelity block just before gunEffects
const effects = find((l) => l.includes('gunEffects(gun,'), start);
if (effects < 0) throw new Error('gunEffects');
const block = [
  '  // --- GB-308 fidelity (D-121 / docs/fps/fidelity.md revolver list) ---',
  '  // Top strap serrations: a short row of ribs across the strap over the cylinder (yardstick).',
  '  D.ribs(gun, { x: 0, y: 0.114, z: 0.02, axis: \'y\', side: 1, along: \'z\', count: 9, pitch: 0.006, w: 0.018, h: 0.0011, t: 0.0014, mat: D.mats.dark });',
  '  // Panel line along the underlug seam (no bare >3 cm face).',
  '  D.groove(gun, { x: 0, y: 0.050, z: 0.20, axis: \'y\', side: -1, along: \'z\', len: 0.18, w: 0.0007 });',
  '  // Ejector-rod shroud collar (distinct part on the underlug nose; rod itself stays on the cylinder).',
  '  K.cyl(0.009, 0.009, 0.014, steelMat, 0, 0.046, 0.078, null, 14);',
  '  K.cyl(0.0075, 0.0075, 0.008, gunDark, 0, 0.046, 0.086, null, 12);',
];
lines.splice(effects, 0, ...block);

fs.writeFileSync(FILE, lines.join(nl));
console.log(JSON.stringify({ ok: true, lines: lines.length, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));