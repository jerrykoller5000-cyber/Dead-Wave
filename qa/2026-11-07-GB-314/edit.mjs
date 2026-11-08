// GB-314: aa12 supportPose + support y nudge; Wasp MAC-10 grip box (GB-309b). LF for poses, CRLF for sidearms.
import fs from 'node:fs';

// --- viewmodel-poses.js (LF) ---
{
  const FILE = 'game/viewmodel-poses.js';
  const raw = fs.readFileSync(FILE);
  if (raw[0] === 0xEF) throw new Error('BOM poses');
  let text = raw.toString('utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);
  const i = lines.findIndex((l) => l.includes('aa12: { grip:') && l.includes('support:'));
  if (i < 0) throw new Error('aa12 sockets line missing');
  const j = i + 1;
  if (!lines[j] || !lines[j].includes('supportPose')) throw new Error('aa12 supportPose missing');
  // Extra 8 mm lower so the palm clears the 62 mm handguard (probe palmD was -9.5 mm at Claude's -0.047).
  lines[i] = '  aa12: { grip: [0, -0.145, -0.166], support: [0, -0.055, 0.36], magFoot: [0, -0.415, 0.05], work: [-0.058, 0.05, 0.18],   // CL-313 + GB-314: support 20 mm lower than pre-GB-312 (-0.035); palm clear of 62 mm handguard';
  lines[j] = '    supportPose: { f: [[1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0], [1.45, 1.668, 1.378, 0]], t: [1.45, -0.15, 0.87] } },   // GB-314 fit after socket drop';
  fs.writeFileSync(FILE, lines.join(nl));
  console.log(JSON.stringify({ poses: true, aa12Line: i + 1, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));
}

// --- weapon-sidearms.js (CRLF): Wasp MAC-10 rectangular grip ---
{
  const FILE = 'studio/weapon-sidearms.js';
  const raw = fs.readFileSync(FILE);
  if (raw[0] === 0xEF) throw new Error('BOM sidearms');
  let text = raw.toString('utf8');
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r?\n/);

  function find(pred, from = 0) { for (let i = from; i < lines.length; i++) if (pred(lines[i], i)) return i; return -1; }

  // Add gripRidges helper after shapedGrip if missing.
  if (!lines.some((l) => l.includes('function gripRidges'))) {
    const sg = find((l) => l.includes('function shapedGrip'));
    if (sg < 0) throw new Error('shapedGrip');
    // shapedGrip is 7 lines (through closing brace); insert after its block
    let end = sg;
    while (end < lines.length && !/^\}$/.test(lines[end].trim())) end++;
    const helper = [
      '// GB-314 / CL-312 b: ridges across a grip strap (same helper as studio/weapon-longarms.js).',
      'function gripRidges(K, mat, cz, cy, h, d, rake, us, v, w, t = 0.003, along = 0.0025) {',
      '  const sr = Math.sin(rake), cr = Math.cos(rake), k = d / 0.08;',
      '  return us.map((u) => {',
      '    const uu = (u - 0.5) * h, vv = v * k;',
      '    return K.box(w, along, t, mat, 0, cy - uu * cr - vv * sr, cz - uu * sr + vv * cr, rake, 0, 0, null, 0.0008);',
      '  });',
      '}'
    ];
    lines.splice(end + 1, 0, ...helper);
  }

  const uzi = find((l) => l.includes('export function makeUziModel'));
  if (uzi < 0) throw new Error('makeUziModel');
  if (lines.slice(uzi, uzi + 120).some((l) => l.includes('GB-314') && l.includes('MAC-10'))) {
    console.log(JSON.stringify({ uziAlready: true }));
  } else {
    // Replace grip block: from "// Grip. The safety" through the side-panel loop, keep mag release + selector.
    const gripStart = find((l) => l.includes('// Grip. The safety is the same polymer'), uzi);
    const magRel = find((l) => l.includes('GB-309: mag release in the grip'), uzi);
    if (gripStart < 0 || magRel < 0) throw new Error('grip block markers ' + gripStart + ' ' + magRel);
    // Keep mag release line and after; replace gripStart .. magRel-1
    const newGrip = [
      '  // Grip. GB-309b / GB-314 (Jerry: check and fix all pistol grips; fidelity.md line 11): a MAC-10 rectangular',
      '  // box round its magazine — 33 mm wide x 55 deep at the game scale (builder 0.062 x 0.104), square-cornered',
      '  // 6-8 mm bevels, front-strap serrations, flat backstrap, floorplate flush with the base. Centre line / h /',
      '  // rake unchanged so the palm point and WEAPON_HOLD.uzi stay; mag part name unchanged.',
      '  const UZI_GZ = -0.030, UZI_GD = 0.104, UZI_GH = 0.16, UZI_GY = -0.1, UZI_RAKE = 0.22;',
      '  K.slab(shapedGrip(UZI_GZ, UZI_GY, UZI_GH, UZI_GD, UZI_RAKE, [',
      '    [-0.04, 0.026], [0.12, 0.026], [0.35, 0.026], [0.58, 0.026], [0.82, 0.026], [0.98, 0.024],',
      '    [1.02, 0.008], [1.02, -0.008], [0.98, -0.024], [0.75, -0.026], [0.45, -0.026], [0.18, -0.026],',
      '    [-0.02, -0.026], [-0.06, -0.010], [-0.05, 0.010]',
      '  ]), 0.062, gunPoly, { bevel: 0.007, segs: 2 });',
      '  gripRidges(K, gunDark, UZI_GZ, UZI_GY, UZI_GH, UZI_GD, UZI_RAKE, [0.42, 0.52, 0.62, 0.72, 0.82], 0.025, 0.048, 0.0028, 0.0022);   // front-strap serrations',
      '  // Flat base cap (mag floorplate reads flush with it).',
      '  K.box(0.050, 0.003, 0.090, gunDark, 0, UZI_GY - 0.52 * UZI_GH * Math.cos(UZI_RAKE), UZI_GZ - 0.52 * UZI_GH * Math.sin(UZI_RAKE), UZI_RAKE, 0, 0, null, 0.0006);',
      '  K.slab(gunBand([[0.09, -0.036], [0.094, -0.064], [0.072, -0.078], [0.028, -0.078], [0.014, -0.062]], 0.007), 0.03, gunDark, { bevel: 0.004 });   // moulded guard',
      '  // GB-175: trigger face toward the grip, tip curling forward (the convention Jerry set on the revolver and sniper).',
      '  // GB-180: a solid trigger blade (wide at the root, tapering to the curled tip), not a wire, moved to mid-guard.',
      '  K.slab([[0.0574, -0.0411], [0.0492, -0.0532], [0.0498, -0.0617], [0.0582, -0.0692], [0.0538, -0.0748], [0.0422, -0.0663], [0.0388, -0.0508], [0.0466, -0.0349]], 0.011, gunAccent, { bevel: 0.002 });',
      '  // Side panels: flat faces on the rectangular grip (something on every face).',
      '  for (const sx of [-1, 1]) {',
      '    const panel = shapedGrip(UZI_GZ, UZI_GY, UZI_GH, UZI_GD, UZI_RAKE, [[0.18, 0.014], [0.50, 0.014], [0.82, 0.012], [0.86, -0.012], [0.50, -0.014], [0.18, -0.012]]);',
      '    K.slab(panel, 0.0016, gunPoly, { x: sx * 0.0315, bevel: 0.0006 });',
      '  }'
    ];
    lines.splice(gripStart, magRel - gripStart, ...newGrip);
    fs.writeFileSync(FILE, lines.join(nl));
    console.log(JSON.stringify({ uzi: true, gripStart: gripStart + 1, eol: nl === '\r\n' ? 'CRLF' : 'LF' }));
  }
}