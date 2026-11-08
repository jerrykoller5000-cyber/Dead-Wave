// GB-316: exact-line edit of makePistolModel / makeRevolverModel / makeUziModel (CRLF preserved, no BOM).
import fs from 'node:fs';
const FILE = 'studio/weapon-sidearms.js';
const raw = fs.readFileSync(FILE);
if (raw[0] === 0xEF) throw new Error('BOM');
const text = raw.toString('utf8');
const nl = text.includes('\r\n') ? '\r\n' : '\n';
const lines = text.split(/\r?\n/);
if (lines.some((l) => l.includes('GB-316 (J23)') || l.includes('GB-316 (J24)') || l.includes('GB-316 (J25)'))) {
  console.log(JSON.stringify({ already: true }));
  process.exit(0);
}

function find(pred, from = 0) {
  for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i;
  return -1;
}
function must(pred, msg, from = 0) {
  const i = find(pred, from);
  if (i < 0) throw new Error(msg);
  return i;
}

const pStart = must((l) => l.includes('export function makePistolModel'), 'makePistolModel');
const rStart = must((l) => l.includes('export function makeRevolverModel'), 'makeRevolverModel', pStart);
const uStart = must((l) => l.includes('export function makeUziModel'), 'makeUziModel', rStart);
const kStart = must((l) => l.includes('export function makeKnifeModel'), 'makeKnifeModel', uStart);

// --- J23 pistol ---
const tang = must((l) => l.includes('v2: a short tang, not a spike'), 'pistol tang', pStart);
if (tang >= rStart) throw new Error('pistol tang out of range');
lines[tang] = '  K.slab([[-0.06, 0.008], [-0.098, 0.006], [-0.110, 0.000], [-0.108, -0.010], [-0.096, -0.022], [-0.078, -0.036], [-0.058, -0.052], [-0.042, -0.040], [-0.036, -0.028], [-0.026, -0.010]], 0.044, gunPoly, { bevel: 0.010, segs: 4 });   // GB-316 (J23): tang flows into the backstrap';

const ribs = must((l) => l.includes('D.ribs(gun, { x: 0, y: -0.10, z: -0.068'), 'pistol backstrap ribs', pStart);
if (ribs >= rStart) throw new Error('pistol ribs out of range');
lines[ribs] = '  // GB-316 (J23): backstrap texture follows the rake (the old D.ribs sat at one z and floated off the strap).';
lines.splice(ribs + 1, 0, '  gripRidges(K, gunDark, -0.02, -0.08, 0.18, 0.1, 0.3, [0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82, 0.90], -0.031, 0.028, 0.0014, 0.0022);');

const undercut = must((l) => l.includes('K.slab([[0.028, -0.026], [0.046, -0.026], [0.044, -0.038], [0.026, -0.036]], 0.026, gunPoly'), 'pistol undercut', pStart);
if (undercut >= rStart) throw new Error('pistol undercut out of range');
lines.splice(undercut + 1, 0, '  K.slab([[0.018, -0.020], [0.040, -0.022], [0.048, -0.034], [0.040, -0.048], [0.022, -0.044], [0.012, -0.030]], 0.036, gunPoly, { bevel: 0.006, segs: 3 });   // GB-316 (J23): web from guard into the front strap');

const grooves = must((l) => l.includes('K.box(0.022, 0.014, 0.010, gunDark, 0, yy, 0.026, 0.3, 0, 0, null, 0.002)'), 'pistol finger grooves', pStart);
if (grooves >= rStart) throw new Error('pistol grooves out of range');
// replace the 3-line for-loop (for / const yy / K.box / }) with rake-following insets
const loopStart = grooves - 3;
if (!lines[loopStart].includes('for (let i = 0; i < 3; i++)')) throw new Error('pistol groove loop start: ' + lines[loopStart]);
if (!lines[loopStart + 1].includes('const yy = -0.048 - i * 0.028')) throw new Error('pistol groove yy');
if (!lines[loopStart + 4].trim().startsWith('}')) throw new Error('pistol groove loop end: ' + lines[loopStart + 4]);
lines.splice(loopStart, 5,
  '  // GB-316 (J23): finger grooves follow the raked front strap (the old boxes sat at one z and floated low down).',
  '  for (const u of [0.28, 0.44, 0.60]) {',
  '    const sr = Math.sin(0.3), cr = Math.cos(0.3), uu = (u - 0.5) * 0.18, vv = 0.028 * (0.1 / 0.08);',
  '    K.box(0.022, 0.012, 0.008, gunDark, 0, -0.08 - uu * cr - vv * sr, -0.02 - uu * sr + vv * cr, 0.3, 0, 0, null, 0.002);',
  '  }'
);

// --- J24 revolver ---
const wood = must((l) => l.includes('woodMat, {bevel: .018, segs: 5}'), 'revolver wood grip', rStart);
if (wood >= uStart) throw new Error('revolver wood out of range');
if (!lines[wood].includes('[-.046, -.166]')) throw new Error('revolver wood unexpected: ' + lines[wood].slice(0, 80));
lines[wood] = '  K.slab([[.025, -.008], [.02, -.026], [.012, -.043], [.01, -.06], [.005, -.083], [-.001, -.103], [-.008, -.128], [-.012, -.150], [-.014, -.168], [-.028, -.174], [-.050, -.176], [-.074, -.176], [-.092, -.170], [-.098, -.156], [-.094, -.136], [-.088, -.127], [-.085, -.101], [-.079, -.076], [-.071, -.052], [-.066, -.027], [-.066, -.009], [-.062, -.002], [-.043, -.003], [-.02, -.004]], .064, woodMat, {bevel: .016, segs: 5});   // GB-316 (J24): Python-style flattened, wider butt';

lines.splice(wood + 1, 0, '  K.slab([[.020, -.006], [.008, -.020], [-.010, -.028], [-.040, -.026], [-.058, -.016], [-.062, -.004], [-.048, .000], [-.020, -.002], [.008, -.004]], .062, steelMat, {bevel: .010, segs: 3});   // GB-316 (J24): frame strap blending onto the wood');

const underlug = must((l) => l.includes('GB-233 r4: underlug slimmer with the barrel'), 'revolver underlug', rStart);
if (underlug >= uStart) throw new Error('revolver underlug out of range');
lines.splice(underlug + 1, 0, '  K.slab([[.072, .082], [.098, .084], [.108, .070], [.100, .042], [.078, .038], [.070, .050]], .030, steelMat, {bevel: .006, segs: 3});   // GB-316 (J24): underlug roots into the frame');

const rod = must((l) => l.includes('K.cyl(0.006, 0.006, 0.1, steelMat, 0, -0.004, 0.08, cylinder, 12)'), 'revolver ejector rod', rStart);
if (rod >= uStart) throw new Error('revolver rod out of range');
if (!lines[rod + 1].includes('K.cyl(.007, .007, .018, gunAccent, 0, -0.004, .123, cylinder, 12)')) throw new Error('revolver rod tip');
lines[rod] = '  K.cyl(0.0055, 0.0055, 0.248, steelMat, 0, -0.004, 0.186, cylinder, 12);   // GB-316 (J24): punch/ejector rod the length of the underlug';
lines[rod + 1] = '  K.cyl(0.0070, 0.0070, 0.016, gunAccent, 0, -0.004, 0.312, cylinder, 12);   // rod tip proud of the underlug nose';

const hammerGrp = must((l) => l.includes('const hammer = K.group(0, 0.085, -0.08)'), 'revolver hammer group', rStart);
if (hammerGrp >= uStart) throw new Error('revolver hammer out of range');
lines.splice(hammerGrp, 0,
  '  // GB-316 (J24): hammer channel cut into the frame (the spur no longer sits on a closed back with no cutout).',
  '  K.box(0.018, 0.022, 0.028, gunDark, 0, 0.094, -0.070, 0, 0, 0, null, 0.001);   // slot floor',
  '  for (const sx of [-1, 1]) K.box(0.0035, 0.026, 0.030, steelMat, sx * 0.010, 0.095, -0.070, 0, 0, 0, null, 0.0008);   // slot cheeks'
);

const hammerSlab = must((l) => l.includes('K.slab([[0.01, -0.03], [0.012, -0.004], [0.008, 0.01], [0.002, 0.016]'), 'revolver hammer slab', rStart);
if (hammerSlab >= uStart) throw new Error('revolver hammer slab out of range');
lines[hammerSlab] = '  K.slab([[0.012, -0.028], [0.014, -0.006], [0.010, 0.008], [0.002, 0.014], [-0.010, 0.018], [-0.022, 0.020], [-0.032, 0.016], [-0.038, 0.008], [-0.036, 0.002], [-0.026, 0.002], [-0.016, 0.000], [-0.010, -0.010], [-0.008, -0.028]], 0.014, gunDark, { bevel: 0.003, segs: 3, parent: hammer });   // GB-316 (J24): fuller hammer body seated in the channel';

// --- J25 Wasp ---
const envelope = must((l) => l.includes('K.slab([[-.177, .019], [-.147, .019], [-.131, .032], [-.142, .049]'), 'wasp envelope', uStart);
if (envelope >= kStart) throw new Error('wasp envelope out of range');
lines[envelope] = '  K.slab([[-.150, .016], [-.118, .016], [-.114, .034], [-.124, .050], [-.148, .052], [-.156, .036]], .028, gunMid, {x: .051, bevel: .005, segs: 3});   // GB-316 (J25): side pad seated on the receiver (was a floating rear blob)';

const frontEar = must((l) => l.includes('K.slab([[.182, .096], [.182, .136], [.190, .150], [.206, .150]'), 'wasp front sight ears', uStart);
if (frontEar >= kStart) throw new Error('wasp front ears out of range');
lines[frontEar] = '    K.slab([[.182, .088], [.182, .136], [.190, .150], [.206, .150], [.212, .136], [.212, .088]], .006, gunDark, {x: sx * .016, bevel: .0015, segs: 2});   // GB-316 (J25): ears sit on the top cover';

const hoodTop = must((l) => l.includes('K.box(.026, .004, .014, gunDark, 0, .135, .198)'), 'wasp front hood', uStart);
if (hoodTop >= kStart) throw new Error('wasp hood out of range');
lines.splice(hoodTop + 1, 0, '  K.box(0.034, 0.010, 0.032, gunDark, 0, 0.092, 0.197, 0, 0, 0, null, 0.002);   // GB-316 (J25): front-sight base on the receiver');

const guard = must((l) => l.includes('K.slab(gunBand([[0.09, -0.036], [0.094, -0.064], [0.072, -0.078], [0.028, -0.078], [0.014, -0.062]], 0.007), 0.03, gunDark'), 'wasp trigger guard', uStart);
if (guard >= kStart) throw new Error('wasp guard out of range');
lines[guard] = '  K.slab(gunBand([[0.088, -0.034], [0.096, -0.042], [0.100, -0.056], [0.094, -0.070], [0.078, -0.080], [0.052, -0.082], [0.030, -0.076], [0.018, -0.062], [0.016, -0.046]], 0.0075), 0.032, gunDark, { bevel: 0.005, segs: 3 });   // GB-316 (J25): smoother moulded guard';
lines.splice(guard + 1, 0,
  '  K.slab([[0.012, -0.030], [0.036, -0.032], [0.040, -0.050], [0.024, -0.058], [0.008, -0.046]], 0.028, gunPoly, { bevel: 0.005, segs: 3 });   // guard root into the front strap',
  '  K.box(0.068, 0.010, 0.108, gunPoly, 0, UZI_GY - 0.48 * UZI_GH * Math.cos(UZI_RAKE), UZI_GZ - 0.48 * UZI_GH * Math.sin(UZI_RAKE), UZI_RAKE, 0, 0, null, 0.003);   // GB-316 (J25): clean magwell flare at the base'
);

const slot = must((l) => l.includes("D.groove(gun, { x: 0, y: 0.098, z: 0.05, axis: 'y', side: 1, along: 'z', len: 0.26, w: 0.010 })"), 'wasp top slot', uStart);
if (slot >= kStart) throw new Error('wasp slot out of range');
if (!lines[slot + 1].includes('recessed channel floor')) throw new Error('wasp slot floor');
lines[slot] = "  D.groove(gun, { x: 0, y: 0.098, z: 0.04, axis: 'y', side: 1, along: 'z', len: 0.28, w: 0.016 });";
lines[slot + 1] = '  K.box(0.024, 0.010, 0.26, gunDark, 0, 0.090, 0.04, 0, 0, 0, null, 0.0006);   // GB-316 (J25): deeper top cocking slot / chamber';
lines.splice(slot + 2, 0,
  '  K.box(0.016, 0.006, 0.10, gunMid, 0, 0.093, 0.06, 0, 0, 0, null, 0.0004);   // bolt body visible in the slot',
  '  K.box(0.004, 0.030, 0.058, gunDark, 0.0492, 0.030, 0.085, 0, 0, 0, null, 0.0008);   // GB-316 (J25): right ejection port',
  '  K.box(0.002, 0.024, 0.050, gunRubber, 0.0506, 0.030, 0.085, 0, 0, 0, null, 0.0004);   // port interior'
);

const loop = must((l) => l.includes('K.tor(0.011, 0.0022, gunDark, 0, 0.018, -0.152'), 'wasp sling loop', uStart);
if (loop >= kStart) throw new Error('wasp loop out of range');
if (!lines[loop + 1].includes('loop mount')) throw new Error('wasp loop mount');
lines[loop] = '  K.tor(0.010, 0.0022, gunDark, 0, 0.022, -0.145, Math.PI / 2, 0, 0, null, Math.PI * 2, 14);   // GB-316 (J25): loop on the rear face';
lines[loop + 1] = '  K.box(0.018, 0.010, 0.008, gunMid, 0, 0.022, -0.136, 0, 0, 0, null, 0.001);   // loop mount seated on the butt';

fs.writeFileSync(FILE, lines.join(nl));
console.log(JSON.stringify({ ok: true, lines: lines.length, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));
