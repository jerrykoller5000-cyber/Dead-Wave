// GB-310: exact-line edit of makeKnifeModel (CRLF preserved, no BOM).
import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF) throw new Error('BOM');
let text = raw.toString('utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
if (lines.some((l) => l.includes('GB-310 fidelity'))) { console.log(JSON.stringify({ already: true })); process.exit(0); }

function find(pred, from = 0) { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; return -1; }

const start = find((l) => l.includes('export function makeKnifeModel'));
if (start < 0) throw new Error('makeKnifeModel not found');
const end = find((l) => l.startsWith('export function') && !l.includes('makeKnifeModel'), start + 1);
// may be end of file
const fnEnd = end < 0 ? lines.length : end;

// Add gunDetail after gunKit for knife group
const kLine = find((l) => /const K = gunKit\(kn\);/.test(l), start);
if (kLine < 0) throw new Error('gunKit kn');
if (!lines.slice(start, start + 12).some((l) => l.includes('gunDetail(ctx)'))) {
  lines.splice(kLine + 1, 0, '  const D = gunDetail(ctx);   // GB-310 / CL-309 helpers');
}

// Re-find after splice
const start2 = find((l) => l.includes('export function makeKnifeModel'));

// --- Knife fidelity block: insert after skull eye/mouth loop, before "// Machete:" ---
const macheteComment = find((l) => l.includes('// Machete: long, wide'), start2);
if (macheteComment < 0) throw new Error('machete comment');
const knifeBlock = [
  '  // --- GB-310 fidelity (D-121 / docs/fps/fidelity.md knife list) ---',
  '  // Guard pins through the crossguard (attached; yardstick: guard).',
  "  D.pin(kn, 0, 0, -0.018, { axis: 'y', len: 0.032, r: 0.0018, mat: D.mats.steel });",
  "  D.pin(kn, 0, 0, 0.018, { axis: 'y', len: 0.032, r: 0.0018, mat: D.mats.steel });",
  '  // Pommel butt-cap nut (yardstick: pommel).',
  "  D.screw(kn, 0, 0, -0.142, { axis: 'z', side: -1, r: 0.0075, head: 0.0032, kind: 'slot', mat: D.mats.dark });",
  '  // Fuller accent grooves on both faces (yardstick: fuller reads at hip).',
  "  D.groove(kn, { x: 0.0, y: 0.0054, z: 0.18, axis: 'y', side: 1, along: 'z', len: 0.18, w: 0.0010 });",
  "  D.groove(kn, { x: 0.0, y: -0.0054, z: 0.18, axis: 'y', side: -1, along: 'z', len: 0.18, w: 0.0010 });",
  '  // Ricasso panel lines beside the guard (no flat slab).',
  "  D.groove(kn, { x: 0.0, y: 0.0052, z: 0.055, axis: 'y', side: 1, along: 'z', len: 0.028, w: 0.0008 });",
  "  D.groove(kn, { x: 0.0, y: -0.0052, z: 0.055, axis: 'y', side: -1, along: 'z', len: 0.028, w: 0.0008 });",
  '  // Choil notch at the edge near the guard (clip-point knife detail).',
  '  K.box(0.0045, 0.011, 0.012, gunDark, -0.038, 0, 0.048, 0, 0, 0, kn, 0.001);',
  '  // Ridged grip kept via the lathe ridges above (torus accents dropped to stay under 4 k tris).',
  '  // Quillon tip rivets on the crossguard ends.',
  "  D.rivet(kn, 0.048, 0, 0, { axis: 'x', side: 1, r: 0.0028, mat: D.mats.dark });",
  "  D.rivet(kn, -0.048, 0, 0, { axis: 'x', side: -1, r: 0.0028, mat: D.mats.dark });",
];
lines.splice(macheteComment, 0, ...knifeBlock);

// Re-find machete section
const mcKit = find((l) => /const M = gunKit\(mc\);/.test(l), start2);
if (mcKit < 0) throw new Error('gunKit mc');
if (!lines.slice(mcKit, mcKit + 5).some((l) => l.includes('gunDetail(ctx)') || l.includes('const D ='))) {
  // D already in scope from knife; still fine. No second D needed.
}

// Replace brass cyl pins with D.pin (attached)
const brassPins = find((l) => l.includes("for (const z of [-0.11, -0.07, -0.03]) M.cyl(.005, .005, .036, brassMat"), start2);
if (brassPins < 0) throw new Error('brass pins');
lines[brassPins] = "  for (const z of [-0.11, -0.07, -0.03]) D.pin(mc, 0, 0, z, { axis: 'x', len: 0.036, r: 0.0042, mat: D.mats.brass });   // GB-310: attached pins (was floating brass cyl)";

// Insert machete fidelity before the teeth block (GB-235 comment)
const teethComment = find((l) => l.includes('GB-235') && l.includes('Machete serrations'), start2);
if (teethComment < 0) throw new Error('teeth comment');
const macheteBlock = [
  '  // --- GB-310 fidelity (D-121 / docs/fps/fidelity.md machete list) ---',
  '  // Polymer grip mold parting line + finger-swell ribs (yardstick: polymer grip texture).',
  "  D.groove(mc, { x: 0.0162, y: 0.0, z: -0.06, axis: 'x', side: 1, along: 'z', len: 0.14, w: 0.0009 });",
  "  D.groove(mc, { x: -0.0162, y: 0.0, z: -0.06, axis: 'x', side: -1, along: 'z', len: 0.14, w: 0.0009 });",
  "  D.ribs(mc, { x: 0.0164, y: 0.0, z: -0.06, axis: 'x', side: 1, along: 'z', count: 5, pitch: 0.022, w: 0.018, h: 0.0009, t: 0.0020, mat: D.mats.dark });",
  "  D.ribs(mc, { x: -0.0164, y: 0.0, z: -0.06, axis: 'x', side: -1, along: 'z', count: 5, pitch: 0.022, w: 0.018, h: 0.0009, t: 0.0020, mat: D.mats.dark });",
  '  // Bolster face screws on the guard plate (pins already attached above).',
  "  D.screw(mc, 0.024, 0.0, 0.03, { axis: 'x', side: 1, r: 0.0030, head: 0.0016, kind: 'slot', mat: D.mats.dark });",
  "  D.screw(mc, -0.024, 0.0, 0.03, { axis: 'x', side: -1, r: 0.0030, head: 0.0016, kind: 'slot', mat: D.mats.dark });",
  '  // Hang hole / butt ring at the grip rear (common machete detail).',
  '  M.tor(0.010, 0.0020, gunDark, 0, 0, -0.155, Math.PI / 2, 0, 0, mc, Math.PI * 2, 14);',
  '  // Fuller accent on the wide blade (reads at hip; groundBlade fuller kept).',
  "  D.groove(mc, { x: 0.0045, y: 0.0, z: 0.28, axis: 'x', side: 1, along: 'z', len: 0.28, w: 0.0012 });",
  "  D.groove(mc, { x: -0.0045, y: 0.0, z: 0.28, axis: 'x', side: -1, along: 'z', len: 0.28, w: 0.0012 });",
  '  // Teeth (GB-235) kept below; spine stays plain.',
];
lines.splice(teethComment, 0, ...macheteBlock);

fs.writeFileSync(FILE, lines.join(nl));
console.log(JSON.stringify({ ok: true, lines: lines.length, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));
