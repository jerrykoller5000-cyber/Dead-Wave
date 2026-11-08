// GB-309: exact-line edit of makeUziModel (CRLF preserved, no BOM).
import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF) throw new Error('BOM');
let text = raw.toString('utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
if (lines.some((l) => l.includes('GB-309 fidelity'))) { console.log(JSON.stringify({ already: true })); process.exit(0); }

function find(pred, from = 0) { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; return -1; }

const start = find((l) => l.includes('export function makeUziModel'));
if (start < 0) throw new Error('makeUziModel not found');
const end = find((l) => l.includes('export function makeKnifeModel'), start);
if (end < 0) throw new Error('makeKnifeModel not found');

const kLine = find((l) => /const K = gunKit\(gun\);/.test(l), start);
if (kLine < 0) throw new Error('gunKit');
if (!lines.slice(start, start + 15).some((l) => l.includes('gunDetail(ctx)'))) {
  lines.splice(kLine + 1, 0, '  const D = gunDetail(ctx);   // GB-309 / CL-309 helpers');
}

const start2 = find((l) => l.includes('export function makeUziModel'));

const rivLine = find((l) => l.includes("for (const z of [-.112, .073]) K.cyl(.0038, .0038, .002, gunAccent, sx * .0514, -.025, z"), start2);
if (rivLine < 0) throw new Error('side rivet cyls');
lines[rivLine] = "    for (const z of [-.112, .073]) D.rivet(gun, sx * .0505, -.025, z, { axis: 'x', side: sx, r: 0.0032, mat: D.mats.dark });   // GB-309: spot welds (was floating accent cyl)";

const magBox = find((l) => l.includes('K.box(0.006, 0.02, 0.02, gunDark, -0.052, -0.02, 0.0);'), start2);
if (magBox < 0) throw new Error('mag box');
lines.splice(magBox, 1,
  '  // GB-309: mag release in the grip (paddle + button on the left) — yardstick.',
  '  K.box(0.0045, 0.014, 0.022, gunDark, -0.0415, -0.048, 0.010, 0, 0, 0, null, 0.001);   // paddle',
  "  D.screw(gun, -0.0435, -0.048, 0.010, { axis: 'x', side: -1, r: 0.0036, head: 0.0018, kind: 'button', mat: D.mats.bright });"
);

const selCyl = find((l) => l.includes("K.cyl(.01, .01, .003, gunAccent, -.0515, .033, .006, null, 16, 'x');"), start2);
if (selCyl < 0) throw new Error('selector cyl');
lines[selCyl] = "  D.screw(gun, -0.0505, 0.033, 0.006, { axis: 'x', side: -1, r: 0.0085, head: 0.0022, kind: 'slot', mat: D.mats.dark });   // GB-309: selector dial (attached)";

const effects = find((l) => l.includes('gunEffects(gun,'), start2);
if (effects < 0) throw new Error('gunEffects');
const block = [
  '  // --- GB-309 fidelity (D-121 / docs/fps/fidelity.md Wasp list) ---',
  '  // Extra stamped receiver ribs (horizontal) + spot welds along the seam (yardstick).',
  '  for (const sx of [-1, 1]) {',
  "    D.ribs(gun, { x: sx * 0.0498, y: 0.028, z: 0.10, axis: 'x', side: sx, along: 'z', count: 7, pitch: 0.014, w: 0.012, h: 0.0010, t: 0.0022, mat: D.mats.dark });",
  "    D.ribs(gun, { x: sx * 0.0498, y: 0.028, z: -0.075, axis: 'x', side: sx, along: 'z', count: 5, pitch: 0.014, w: 0.012, h: 0.0010, t: 0.0022, mat: D.mats.dark });",
  '    for (const [y, z] of [[0.014, -0.116], [0.014, 0.198], [0.042, -0.116], [0.042, 0.198], [0.060, -0.05], [0.060, 0.12]]) {',
  "      D.rivet(gun, sx * 0.0502, y, z, { axis: 'x', side: sx, r: 0.0026, mat: D.mats.dark });",
  '    }',
  '  }',
  '  // Top cocking knob slot between the sight ears (yardstick); the work knob rides in this groove.',
  "  D.groove(gun, { x: 0, y: 0.098, z: 0.05, axis: 'y', side: 1, along: 'z', len: 0.26, w: 0.010 });",
  '  K.box(0.014, 0.0035, 0.24, gunDark, 0, 0.094, 0.05, 0, 0, 0, null, 0.0004);   // recessed channel floor',
  '  // Strap / sling loop at the rear of the receiver (yardstick).',
  '  K.tor(0.011, 0.0022, gunDark, 0, 0.018, -0.152, Math.PI / 2, 0, 0, null, Math.PI * 2, 14);',
  '  K.box(0.016, 0.006, 0.004, gunMid, 0, 0.018, -0.140, 0, 0, 0, null, 0.0008);   // loop mount',
  "  // Lower receiver seam line both sides (yardstick: the lower's seam).",
  "  for (const sx of [-1, 1]) D.groove(gun, { x: sx * 0.0492, y: -0.017, z: 0.04, axis: 'x', side: sx, along: 'z', len: 0.30, w: 0.0009 });",
  '  // Threaded muzzle thread protector (distinct collar over the existing threads; bore disc stays).',
  '  K.cyl(0.0155, 0.0155, 0.014, gunDark, 0, 0.03, 0.468, null, 16);',
  '  K.cyl(0.0135, 0.0135, 0.006, gunMid, 0, 0.03, 0.476, null, 14);',
  '  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; flatDetail(THREE, gun, gunAccent, .0022, .0022, .012, Math.cos(a) * .0158, .03 + Math.sin(a) * .0158, .468, a); }',
  '  // Front sight post kept (GB-259); knob stays gun.userData.work (GB-269 / card).',
];
lines.splice(effects, 0, ...block);

fs.writeFileSync(FILE, lines.join(nl));
console.log(JSON.stringify({ ok: true, lines: lines.length, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));