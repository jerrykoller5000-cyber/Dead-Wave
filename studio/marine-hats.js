// CL-197 (Jerry, 2026-10-15: "better fitted hats for the marine"). The hats used to be authored against numbers that
// were never the head's: the crown stood 2-3 cm out from the skull all round with a gap of hair under it, and the bill
// sat half-way up the crown. Every hat here is lofted from the head's own outline (ui/marine-face.js headRadiusAt):
// the same plan as the head, a clearance of about a centimetre (hair is 3 to 11 mm thick), the band on the brow line
// and the bill on the band. Ring rows are [y, half-width, front, back], bottom to top; head-local space like the rest
// of the head (the caller's hatG sits at the origin of the head group, y in marine space).
import { headRadiusAt } from '../ui/marine-face.js';

const SEG = 40;
// One point of a ring: the same plan as the head's rings (blunt in front, rounder behind).
function planPoint(w, f, b, a, round = 1) {
  const c = Math.cos(a), s = Math.sin(a);
  return [w * s, c >= 0 ? f * Math.pow(c, .55 * round + (1 - round)) : -b * Math.pow(-c, .8 * round + (1 - round))];
}
// A ring row [y, w, f, b] at height y, taken from the head with a clearance, and held at the width it has at
// `holdY` (a flat-topped cap does not shrink with the skull above the brow).
export function hatRing(y, clearance, holdY) {
  const [w, f, b] = headRadiusAt(Math.min(y, holdY == null ? y : holdY));
  return [y, w + clearance, f + clearance, b + clearance];
}
function loft(T, rings, mat, addCast, { side = false, closeTop = true } = {}) {
  const p = [], uv = [], ix = [];
  rings.forEach(([y, w, f, b, oct = 0], r) => {
    for (let j = 0; j <= SEG; j++) {
      const a = -Math.PI + j / SEG * Math.PI * 2;
      let [x, z] = planPoint(w, f, b, a);
      // CL-198: `oct` draws the ring toward an octagon (the 8-point cover's crown), flats front, back and sides
      if (oct) { const q = ((a + Math.PI / 8) % (Math.PI / 4) + Math.PI / 4) % (Math.PI / 4) - Math.PI / 8, k = Math.cos(Math.PI / 8) / Math.cos(q); x *= 1 + oct * (k - 1); z *= 1 + oct * (k - 1); }
      p.push(x, y, z); uv.push(j / SEG, y * 4);
    }
  });
  for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < SEG; j++) {
    const a = r * (SEG + 1) + j, b = a + SEG + 1;
    ix.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); g.computeVertexNormals();
  // one shared normal where the loft's first and last column meet (the back), as on the head
  const N = g.attributes.normal, cols = SEG + 1;
  for (let r = 0; r < rings.length; r++) {
    const a = r * cols, b = a + cols - 1, x = N.getX(a) + N.getX(b), y = N.getY(a) + N.getY(b), z = N.getZ(a) + N.getZ(b), l = Math.hypot(x, y, z) || 1;
    N.setXYZ(a, x / l, y / l, z / l); N.setXYZ(b, x / l, y / l, z / l);
  }
  if (closeTop) for (let j = 0; j < cols; j++) N.setXYZ((rings.length - 1) * cols + j, 0, 1, 0);
  return addCast(new T.Mesh(g, mat));
}
// A bill: a flat curved tongue from the band, drooping a little toward its tip.
function bill(T, mat, addCast, { y, z0, w, d, thick = .007, droop = .02 }) {
  const s = new T.Shape(); s.moveTo(-w * .5, 0); s.quadraticCurveTo(-w * .56, d * .7, -w * .34, d); s.quadraticCurveTo(0, d * 1.13, w * .34, d); s.quadraticCurveTo(w * .56, d * .7, w * .5, 0); s.closePath();
  const edge = s.getPoints(12); edge.pop(); const v = [], ix = [], n = edge.length;
  for (const h of [0, thick]) { v.push(0, d * .45, h); for (const p of edge) v.push(p.x, p.y, h); }
  for (let j = 0; j < n; j++) { const a = j + 1, b = (j + 1) % n + 1, q = n + 1; ix.push(0, b, a, q, q + a, q + b, a, b, q + a, b, q + b, q + a); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(v.length / 3 * 2), 2)); g.setIndex(ix);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), zz = p.getY(i), t = p.getZ(i); p.setXYZ(i, x, y - t - .012 * (x / (w * .5)) ** 2 - droop * zz / d, zz + z0); }
  g.computeVertexNormals(); return addCast(new T.Mesh(g, mat));
}
// Where the ring table has its surface at height y (for hardware sewn to the outside of the crown).
function ringAt(rings, y) {
  let i = 1; while (i < rings.length - 1 && rings[i][0] < y) i++;
  const a = rings[i - 1], b = rings[i], t = Math.max(0, Math.min(1, (y - a[0]) / (b[0] - a[0] || 1)));
  return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t];
}

export function buildMarineHats(T, { hatG, part, dress, mats, addCast, rmesh, cyl, put }) {
  const { capW, capBandW, patchInk, strapMat } = mats;
  const at = (grp, mesh, x, y, z, rx = 0, ry = 0, rz = 0) => put(grp, mesh, x, y, z, rx, ry, rz);
  const R = hatRing;

  // The 8-point cover (patrol cap). CL-198 (Jerry, 2026-10-15: the hats "look good and natural"): it read as a drum, a
  // cylinder with a contrasting band. The Marine cover is one camo fabric, a stiff crown that flares a little to a flat
  // top folded into eight points, a short stiff bill and the emblem on the front. The crown keeps the width it has at
  // the brow (it doesn't follow the skull in), and the top is an octagon with crisp corners.
  const cover = dress.hats.cover = part(hatG);
  const top = (y, grow, oct) => { const [, w, f, b] = R(1.545, .0105, 1.505); return [y, w + grow, f + grow * 1.1, b + grow, oct]; };
  const coverRings = [R(1.483, .0105), R(1.505, .0105), top(1.53, .002, .15), top(1.556, .006, .55), top(1.578, .01, .95), top(1.583, .0095, 1), top(1.5845, .002, 1), [1.585, 0, 0, 0]];
  cover.add(loft(T, coverRings, capW, addCast));
  // the sweatband seam just above the brow, in the cover's own cloth
  { const [w, f, b] = ringAt(coverRings, 1.507), pts = [];
    for (let j = 0; j < 32; j++) { const a = -Math.PI + j / 32 * Math.PI * 2, [x, z] = planPoint(w + .0008, f + .0008, b + .0008, a); pts.push(new T.Vector3(x, 1.507, z)); }
    cover.add(addCast(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, true), 64, .0014, 4, true), capW))); }
  cover.add(bill(T, capW, addCast, { y: 1.5, z0: .108, w: .215, d: .072, droop: .02, thick: .006 }));
  const cf = ringAt(coverRings, 1.538)[1];
  at(cover, rmesh(.032, .028, .005, strapMat, .003), 0, 1.538, cf + .0025);   // the emblem, black

  // The boonie: a soft bucket crown with a brim all round, a band, grommets and a chin cord.
  const boonie = dress.hats.boonie = part(hatG);
  const boonieRings = [R(1.488, .0135), R(1.515, .0135, 1.5), [1.55, .1255, .1405, .1215], [1.58, .1, .115, .096], [1.5875, 0, 0, 0]];
  boonie.add(loft(T, boonieRings, capW, addCast));
  boonie.add(loft(T, [R(1.492, .0166, 1.5), R(1.52, .0166, 1.5)], capW, addCast, { closeTop: false }));   // the foliage band, the hat's own cloth
  {
    const base = R(1.4915, .0135), rows = [[1.4915, 0], [1.4875, .045], [1.4785, .092]];
    const brim = loft(T, rows.map(([y, d]) => [y, base[1] + d, base[2] + d * 1.05, base[3] + d * .95]), capW, addCast, { closeTop: false });
    capW.side = T.DoubleSide; boonie.add(brim);
  }
  for (const sx of [-1, 1]) for (const z of [-.05, .05]) {
    // On the crown where it is at z, not where it is at z = 0 (AG-81: they stood 4-6 mm off the narrowed crown).
    const [w, f, b] = ringAt(boonieRings, 1.552), c = z >= 0 ? Math.pow(Math.min(1, z / f), 1 / .55) : -Math.pow(Math.min(1, -z / b), 1 / .8);
    const x = w * Math.sqrt(Math.max(0, 1 - c * c));
    at(boonie, cyl(.009, .009, .006, patchInk, 8), sx * (x + .0008), 1.552, z, 0, 0, Math.PI / 2);
  }
  for (const sx of [-1, 1]) at(boonie, rmesh(.006, .12, .006, strapMat, .002), sx * .144, 1.43, .03, 0, 0, sx * -.12);   // chin cord

  // The ballcap, worn forwards or backwards: a rounded dome with six panel seams, a button and a bill.
  const ballRings = [R(1.495, .0105), R(1.52, .0105, 1.502), R(1.55, .006, 1.502), [1.575, .1085, .1245, .1055], [1.592, .083, .095, .079], [1.6, .04, .046, .038], [1.6025, 0, 0, 0]];
  const ballcap = (grp) => {
    grp.add(loft(T, ballRings, capW, addCast));
    grp.add(bill(T, capW, addCast, { y: 1.508, z0: .112, w: .205, d: .108, droop: .026 }));
    at(grp, cyl(.012, .013, .008, capBandW, 8), 0, 1.6, 0);
    for (let j = 0; j < 6; j++) {
      const a = j / 6 * Math.PI * 2;
      // Along the dome as the loft draws it (straight between its rows), not a spline through the rows, which bowed out
      // of the dome between 1.52 and 1.575 (AG-81).
      const rows = ballRings.slice(1).map(([y, w, f, b]) => { const [x, z] = planPoint(w + .0009, f + .0009, b + .0009, a); return new T.Vector3(x, y, z); });
      const pts = [];
      for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < 4; k++) pts.push(rows[r].clone().lerp(rows[r + 1], k / 4));
      pts.push(rows[rows.length - 1]);
      grp.add(addCast(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'centripetal'), 24, .0012, 3, false), capBandW)));
    }
    {   // the strap at the back, a band round the dome's own curve (a straight box stood proud at its corners: AG-81)
      const [w, f, b] = ringAt(ballRings, 1.525), arc = [];
      for (let k = 0; k <= 8; k++) { const [x, z] = planPoint(w + .002, f + .002, b + .002, Math.PI + (k / 8 - .5) * .7); arc.push(new T.Vector3(x, 1.525, z)); }
      const strap = addCast(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(arc), 16, .0045, 4, false), strapMat));
      strap.scale.set(1, 3, 1); strap.position.y = 1.525 * (1 - 3);   // a flat band about 2.7 cm tall, round the curve
      grp.add(strap);
    }
  };
  ballcap(dress.hats.ballcap = part(hatG));
  const back = dress.hats.ballcapBack = part(hatG);
  back.rotation.y = Math.PI;
  ballcap(back);
}
