const fs = require('fs'), crypto = require('crypto');
const P = 'index.html', raw = fs.readFileSync(P, 'utf8'), st0 = fs.statSync(P).mtimeMs;
const EOL = '\r\n'; if (!raw.includes(EOL)) { console.error('not CRLF'); process.exit(2); }
const L = raw.split(EOL); const h0 = crypto.createHash('sha1').update(raw).digest('hex');
const one = (pred, label) => { const h = []; L.forEach((l, i) => { if (pred(l)) h.push(i); }); if (h.length !== 1) { console.error(label, h.length); process.exit(2); } return h[0]; };
const NEW = fs.readFileSync('qa/2026-11-01-GB-266/mesh2.js', 'utf8').replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n');
// mesh body
const m0 = one((l) => l === "      const k = ironLook, ux = s.ux, uz = s.uz, up = new THREE.Vector3(0, 1, 0);", 'mesh0');
let m1 = m0; while (L[m1] !== "      g.add(fm, sm); return g;") m1++;
if (m1 - m0 > 30) { console.error('mesh end'); process.exit(2); }
L.splice(m0, m1 - m0 + 1, ...NEW);
// water-dominated openings are the river's
const w = one((l) => l === "      for (const band of wallBands) if (band.kind === 'hq-thicket') out.push(...ringGapSpots(band));", 'spots');
L[w] = "      for (const band of wallBands) if (band.kind === 'hq-thicket') out.push(...ringGapSpots(band, { isWater: (x, z) => waterDepthAt(x, z) > 0.05 }));";
const im = one((l) => l.startsWith("    import { ringGapSpots, shortcutSpot, ironPush, ironBlockCircles, nearestSpot, createIronGaps } from './combat/iron-gaps.js';"), 'import');
L[im] = "    import { ringGapSpots, shortcutSpot, ironPush, ironBlockCircles, ironSegs, nearestSpot, createIronGaps } from './combat/iron-gaps.js';   // GB-266";
const db = one((l) => l.startsWith("        spots: () => ironSpots().map((s) => ({ id: s.id, kind: s.kind,"), 'dbg');
L[db] = "        spots: () => ironSpots().map((s) => ({ id: s.id, kind: s.kind, x: s.x, z: s.z, ux: s.ux, uz: s.uz, half: s.half, segs: ironSegs(s).map((g) => ({ x: g.x, z: g.z, ux: g.ux, uz: g.uz, half: g.half })), hung: ironGaps.isHung(s.id) })),";
const out = L.join(EOL);
const now = fs.readFileSync(P, 'utf8');
if (crypto.createHash('sha1').update(now).digest('hex') !== h0 || fs.statSync(P).mtimeMs !== st0) { console.error('changed underneath'); process.exit(4); }
fs.writeFileSync(P, out, 'utf8');
console.log('ok lines', L.length, 'crlf', (out.match(/\r\n/g) || []).length, 'lf', (out.match(/\n/g) || []).length, 'bom', out.charCodeAt(0) === 0xFEFF);