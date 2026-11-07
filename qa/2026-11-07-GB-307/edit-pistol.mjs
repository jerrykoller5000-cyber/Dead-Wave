// GB-307: exact-line edit of studio/weapon-sidearms.js makePistolModel (CRLF preserved, no BOM).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const FILE = path.join(ROOT, 'studio', 'weapon-sidearms.js');
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF && raw[1] === 0xBB && raw[2] === 0xBF) throw new Error('BOM present');
let text = raw.toString('utf8');
const crlf = text.includes('\r\n');
const nl = crlf ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);

function findLine(pred, from = 0) {
  for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i;
  return -1;
}

if (lines.some((l) => l.includes('GB-307 fidelity'))) {
  console.log(JSON.stringify({ already: true }));
  process.exit(0);
}

// 1) Import gunDetail before first function.
const firstFn = findLine((l) => l.startsWith('function shapedGrip'));
if (firstFn < 0) throw new Error('shapedGrip not found');
if (!lines.some((l) => l.includes("from './gun-detail.js'"))) {
  lines.splice(firstFn, 0, "import { gunDetail } from './gun-detail.js';", '');
}

// 2) const D = gunDetail(ctx) after gunKit.
let pistolStart = findLine((l) => l.includes('export function makePistolModel'));
let kLine = findLine((l) => /const K = gunKit\(gun\);/.test(l), pistolStart);
if (kLine < 0) throw new Error('gunKit line not found');
if (!lines.slice(pistolStart, pistolStart + 40).some((l) => l.includes('gunDetail(ctx)'))) {
  const indent = lines[kLine].match(/^\s*/)[0];
  lines.splice(kLine + 1, 0, `${indent}const D = gunDetail(ctx);   // GB-307 / CL-309 helpers`);
}

pistolStart = findLine((l) => l.includes('export function makePistolModel'));
const effectsLine = findLine((l) => l.includes('gunEffects(gun,'), pistolStart);
if (effectsLine < 0) throw new Error('gunEffects not found');

// 3) Fidelity block just before gunEffects (mag, slide, frame all in scope).
const block = [
  `  // --- GB-307 fidelity (D-121 / docs/fps/fidelity.md pistol list) ---`,
  `  // Mag witness holes: six recessed windows each side of the body (bases inside the mag wall).`,
  `  for (const sx of [-1, 1]) {`,
  `    for (let i = 0; i < 6; i++) {`,
  `      const yy = 0.055 - i * 0.022;`,
  `      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.0032, 12), gunRubber);`,
  `      hole.rotation.z = Math.PI / 2;`,
  `      hole.position.set(sx * (0.0200 - 0.0006), yy, 0);   // sunk 0.6 mm into the wall`,
  `      hole.castShadow = hole.receiveShadow = true;`,
  `      mag.add(hole);`,
  `    }`,
  `  }`,
  `  // Backstrap texture: shallow polymer ribs down the grip's rear (no bare strap).`,
  `  D.ribs(gun, { x: 0, y: -0.10, z: -0.068, axis: 'z', side: -1, along: 'y', count: 11, pitch: 0.011, w: 0.030, h: 0.0010, t: 0.0020, mat: D.mats.polymer });`,
  `  // Undercut trigger guard: a high-hold bite where the guard meets the front strap.`,
  `  K.slab([[0.028, -0.026], [0.046, -0.026], [0.044, -0.038], [0.026, -0.036]], 0.026, gunPoly, { bevel: 0.002 });`,
  `  // Muzzle crown: recessed ring at the barrel tip (sits on the barrel; bore disc stays).`,
  `  K.cyl(0.0136, 0.0122, 0.0032, gunMid, 0, 0.05, 0.3092, frame, 16);`,
  `  K.cyl(0.0108, 0.0108, 0.0015, gunDark, 0, 0.05, 0.3108, frame, 14);`,
  `  // Slide-stop lever (left): a recognisable paddle over the existing stop post, sunk into the frame face.`,
  `  K.slab([[-0.014, -0.003], [0.020, -0.003], [0.022, 0.003], [0.016, 0.007], [-0.012, 0.005]], 0.0020, gunDark, { x: -0.0228, y: 0.004, z: 0.055, bevel: 0.0007 });`,
  `  D.screw(gun, -0.0226, 0.004, 0.040, { axis: 'x', side: -1, r: 0.0022, head: 0.0011, kind: 'slot' });`,
  `  // Takedown lever: keyed tabs both sides + one through-pin (base inside the frame).`,
  `  for (const sx of [-1, 1]) {`,
  `    K.slab([[-0.009, -0.0035], [0.009, -0.0035], [0.009, 0.0035], [-0.009, 0.0035]], 0.0016, gunDark, { x: sx * 0.0228, y: -0.018, z: 0.018, bevel: 0.0005 });`,
  `  }`,
  `  D.pin(gun, 0, -0.018, 0.018, { axis: 'x', len: 0.048, r: 0.0013 });`,
  `  // Extractor claw in the port's right wall (attached to the slide).`,
  `  K.slab([[0.000, -0.003], [0.011, -0.001], [0.013, 0.003], [0.001, 0.005]], 0.0015, gunMid, { x: 0.0226, y: 0.010, z: -0.004, parent: slide, bevel: 0.0004 });`,
  `  // Panel lines on the slide top and the dust-cover seam (yardstick: no bare >3 cm face).`,
  `  D.groove(slide, { x: 0, y: 0.024, z: 0.05, axis: 'y', side: 1, along: 'z', len: 0.20, w: 0.0007 });`,
  `  D.groove(gun, { x: 0, y: 0.012, z: 0.14, axis: 'y', side: 1, along: 'z', len: 0.14, w: 0.0007 });`,
  `  // Front-strap finger grooves (three recesses, polymer-dark).`,
  `  for (let i = 0; i < 3; i++) {`,
  `    const yy = -0.048 - i * 0.028;`,
  `    K.slab([[0.020, -0.009], [0.032, -0.007], [0.032, 0.007], [0.020, 0.009]], 0.009, gunDark, { y: yy, z: 0.020, bevel: 0.0018, rx: 0.3 });`,
  `  }`,
  `  // Grip-panel screws (attached; CL-309 sink).`,
  `  for (const sx of [-1, 1]) {`,
  `    D.screw(gun, sx * 0.0268, -0.052, -0.018, { axis: 'x', side: sx, r: 0.0025, head: 0.0012, kind: 'slot' });`,
  `    D.screw(gun, sx * 0.0268, -0.108, -0.026, { axis: 'x', side: sx, r: 0.0025, head: 0.0012, kind: 'slot' });`,
  `  }`,
  `  // Deeper cut under the existing slide serrations so they read machined, not painted on.`,
  `  for (const sx of [-1, 1]) {`,
  `    D.ribs(slide, { x: sx * 0.0228, y: -0.004, z: -0.095, axis: 'x', side: sx, along: 'z', count: 8, pitch: 0.009, w: 0.017, h: 0.0008, t: 0.0011, mat: D.mats.dark });`,
  `    D.ribs(slide, { x: sx * 0.0228, y: -0.004, z: 0.220, axis: 'x', side: sx, along: 'z', count: 5, pitch: 0.009, w: 0.015, h: 0.0008, t: 0.0011, mat: D.mats.dark });`,
  `  }`,
  ``,
];

lines.splice(effectsLine, 0, ...block);

const final = lines.join(nl);
const outText = final.endsWith('\n') ? final : final + nl;
fs.writeFileSync(FILE, outText, { encoding: 'utf8' });
const check = fs.readFileSync(FILE);
if (check[0] === 0xEF) throw new Error('wrote BOM');
const s = check.toString('utf8');
console.log(JSON.stringify({
  bytes: check.length,
  crlf: s.includes('\r\n'),
  lines: s.split(/\r?\n/).length,
  hasImport: s.includes("from './gun-detail.js'"),
  hasFidelity: s.includes('GB-307 fidelity'),
  hasWitness: s.includes('witness holes'),
  hasCrown: s.includes('Muzzle crown'),
  hasBackstrap: s.includes('Backstrap'),
  slideNameKept: /userData\.slide\s*=\s*slide/.test(s),
  magNameKept: /userData\.mag\s*=\s*mag/.test(s),
}));
