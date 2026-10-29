// world/first-people.js — the valley's first people, told without words (CL-107, D-70, docs/story.md §2, §7).
// Claude's. Long before the settlers, a people found the heart under the lake, carved the eight stones round the
// Pit and sealed the Marrow cave with a carved door. They are buried in the hill's barrow. What is left of them:
//
//   pickStoneSites(cands, opts)        the standing stones' sites: the highest clear ground, spaced apart (pure)
//   makeLichenTexture(doc, seed)       the weathered, lichen-spotted stone the menhirs share
//   buildStandingStone(T, o)           a menhir carved with one glyph on the face that looks at the lake
//   buildRingStone(T, o)               the broad slab carved with the ring of eight round the dark (the heart)
//   buildMarrowDoor(T, o)              the cracked stone door across the Marrow cave's mouth, the ring carved on it
//   buildOfferings(T, o)               cairns, a stone bowl of old ash, an antler, a crown-stone at the barrow
//   GLOW                               how bright the carvings get by night, by day and on a silenced day
//
// The carvings are dark grooves by day and give a faint cold light at night, the colour of the Pit's runes; on a
// silenced day (the secret, D-56) they go nearly dark with the rest of the tone. Nothing here moves anything that
// was already in the world (rule 10): the sites come from the terrain alone, the shapes from their own dice.
import { drawGlyph, RUNE_COUNT } from './runes.js';

export const GLOW = Object.freeze({ NIGHT: 1, DAY: 0.04, SILENCED: 0.06, RATE: 1.2 });
export const RUNE_LIGHT = 0x9eeeff;
export const GROOVE = 0x3c3b35;

// The carvings are unlit overlays whose colour runs from the groove's dark (day) to the Pit's cold light (night):
// no emissive maps (the WebGL fallback drops them). `level` is 0..1.
export function tintCarvings(T, mats, level) {
  const dark = new T.Color(GROOVE), lit = new T.Color(RUNE_LIGHT);
  for (const m of mats) m.color.copy(dark).lerp(lit, Math.max(0, Math.min(1, level)));
}

// ---------------------------------------------------------------------------------------------------------------
// Sites. `cands` is a list of { x, z, y, clear } (y: the ground's height, clear: nothing standing within reach);
// the highest come first, no two closer than `sep`.
export function pickStoneSites(cands, { count = 4, sep = 70 } = {}) {
  const ok = cands.filter((c) => c.clear !== false).sort((a, b) => b.y - a.y || a.x - b.x || a.z - b.z);
  const out = [];
  for (const c of ok) {
    if (out.every((o) => Math.hypot(o.x - c.x, o.z - c.z) >= sep)) out.push(c);
    if (out.length >= count) break;
  }
  return out;
}

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Textures.
// CL-267 (docs/asset-principles.md: breakup at three scales; docs/art-direction.md §3: natural surfaces under 45%
// saturation): the stone mottled in broad soft patches, its grain, the rain's streaks; the lichen in colonies, not
// confetti: a few rosettes of fine grey-green specks, heaviest on the weather-beaten top (the canvas's top is the
// stone's), a rare muted ochre one, and moss darkening the foot. (Before: 70 opaque blots of four colours, spread evenly.)
export function makeLichenTexture(doc, seed = 0x11c4e) {
  const rnd = mulberry(seed);
  const W = 256, H = 512;
  const cv = doc.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#8b887c'; g.fillRect(0, 0, W, H);
  const blob = (x, y, r, fill) => {   // a soft-edged patch
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, fill); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (let i = 0; i < 26; i++) {          // broad mottling, lighter and darker
    const v = rnd() < 0.5 ? 'rgba(160,156,142,0.22)' : 'rgba(84,82,74,0.2)';
    blob(rnd() * W, rnd() * H, 30 + rnd() * 70, v);
  }
  for (let i = 0; i < 1400; i++) {        // the grain of the stone
    const v = 105 + Math.floor(rnd() * 70);
    g.fillStyle = `rgba(${v},${v - 4},${v - 13},0.28)`;
    g.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 4, 1 + rnd() * 2);
  }
  for (let i = 0; i < 16; i++) {          // rain streaks from the top, wandering a little, fading toward the foot
    let x = rnd() * W; const y0 = rnd() * 140, len = 90 + rnd() * 300, w = 0.8 + rnd() * 2.2, a = 0.05 + rnd() * 0.08;
    for (let y = y0; y < y0 + len; y += 6) {
      x += (rnd() - 0.5) * 1.6;
      g.fillStyle = `rgba(58,56,48,${(a * (1 - (y - y0) / len)).toFixed(3)})`; g.fillRect(x, y, w, 6);
    }
  }
  const foot = g.createLinearGradient(0, H * 0.72, 0, H);   // damp and moss at the foot
  foot.addColorStop(0, 'rgba(62,70,44,0)'); foot.addColorStop(1, 'rgba(62,70,44,0.55)');
  g.fillStyle = foot; g.fillRect(0, H * 0.72, W, H * 0.28);
  // The colonies: each a rosette of fine specks round a centre, denser in the middle, fringed at the edge.
  const kinds = [
    { c: [140, 144, 118], n: 9 },          // grey-green crust, the common one
    { c: [162, 162, 148], n: 5 },          // pale grey
    { c: [116, 124, 92], n: 3 },           // a darker leafy green
    { c: [150, 120, 76], n: 1.2, small: true },   // a muted ochre, rare and small
  ];
  const total = kinds.reduce((a, k) => a + k.n, 0);
  const colonies = 18 + Math.floor(rnd() * 6);
  for (let i = 0; i < colonies; i++) {
    let pick = rnd() * total, kind = kinds[0];
    for (const k of kinds) { if ((pick -= k.n) <= 0) { kind = k; break; } }
    const cx = rnd() * W, cy = Math.pow(rnd(), 1.8) * H * 0.9;   // most near the top
    const R = (kind.small ? 5 : 9) + rnd() * (kind.small ? 8 : 24), [r, gg, b] = kind.c;
    // the crust: a flat, ragged-edged patch, a darker rim where it grows outward
    const edge = []; for (let k = 0; k < 22; k++) edge.push(R * (0.7 + rnd() * 0.45));
    const ring = (sc) => { g.beginPath(); for (let k = 0; k < 22; k++) { const a = (k / 22) * Math.PI * 2, d = edge[k] * sc; const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.85; if (k) g.lineTo(x, y); else g.moveTo(x, y); } g.closePath(); };
    ring(1); g.fillStyle = `rgba(${r - 22},${gg - 22},${b - 20},0.4)`; g.fill();
    ring(0.86); g.fillStyle = `rgba(${r},${gg},${b},0.55)`; g.fill();
    const specks = Math.floor(R * 6);
    for (let k = 0; k < specks; k++) {   // its surface: fine flecks a shade either side
      const a = rnd() * Math.PI * 2, d = R * 0.85 * Math.sqrt(rnd());
      const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.85, s = 0.6 + rnd() * 1.6;
      const v = Math.floor((rnd() - 0.5) * 26);
      g.fillStyle = `rgba(${r + v},${gg + v},${b + v},${0.3 + rnd() * 0.3})`;
      g.beginPath(); g.arc(x, y, s, 0, Math.PI * 2); g.fill();
    }
    for (let k = 0; k < 5; k++) {        // and a few outliers starting beyond it
      const a = rnd() * Math.PI * 2, d = R * (1.1 + rnd() * 0.6);
      g.fillStyle = `rgba(${r},${gg},${b},0.45)`;
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.85, 1 + rnd() * 2.2, 0, Math.PI * 2); g.fill();
    }
  }
  return cv;
}

// One glyph carved: white strokes on clear, for an alpha map and a glow map at once.
export function makeGlyphCarving(doc, k, px = 128) {
  const cv = doc.createElement('canvas');
  cv.width = cv.height = px;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, px, px);
  drawGlyph(g, k, px / 2, px / 2, px * 0.78, { color: '#ffffff', width: 2.6 });
  return cv;
}

// The ring of eight round the dark, the way the stones stand round the Pit (stone k at k/8 of a turn, east first,
// counter-clockwise seen from above; on a carving, east is to the right and the turn runs up). Two canvases:
// `color` (stone with dark grooves; `stone` sets the stone colour, or null for clear) and `glow` (the grooves in
// white on clear, the dark disc faint: the overlay that turns from groove to light at night).
// CL-267: `base` (a canvas, tiled `tiles` across, full height) paints the stone instead of the flat `stone` colour, and
// `scale` shrinks the ring inside a canvas that covers more than the ring (the Marrow door's whole face).
export function makeRingCarving(doc, { px = 512, stone = '#d3cdb9', groove = '#5b574d', base = null, tiles = 2, scale = 1 } = {}) {
  const mk = () => { const c = doc.createElement('canvas'); c.width = c.height = px; return c; };
  const color = mk(), glow = mk();
  const C = color.getContext('2d'), G = glow.getContext('2d');
  const m = px / 2, R = px * 0.34 * scale, gs = px * 0.15 * scale;
  if (base) {
    const tw = px / tiles;
    for (let i = 0; i < tiles; i++) C.drawImage(base, i * tw, 0, tw, px);
  } else if (stone) {
    C.fillStyle = stone; C.fillRect(0, 0, px, px);
    const rnd = mulberry(0x51e7);
    for (let i = 0; i < 500; i++) {
      const v = 175 + Math.floor(rnd() * 50);
      C.fillStyle = `rgba(${v},${v - 6},${v - 20},0.3)`;
      C.fillRect(8 + rnd() * (px - 16), 8 + rnd() * (px - 16), 2 + rnd() * 8, 1 + rnd() * 4);
    }
  } else C.clearRect(0, 0, px, px);
  G.clearRect(0, 0, px, px);
  const paint = (g, col, w) => {
    g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.arc(m, m, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(m, m, R * 1.42, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < RUNE_COUNT; k++) {
      const a = (k / RUNE_COUNT) * Math.PI * 2, x = m + Math.cos(a) * R * 1.21, y = m - Math.sin(a) * R * 1.21;
      drawGlyph(g, k, x, y, gs, { color: col, width: 2.4 });
    }
  };
  paint(C, groove, (px / 90) * scale);
  paint(G, '#ffffff', (px / 90) * scale);
  // The dark at the middle: what the ring holds down.
  C.fillStyle = '#26241f'; C.beginPath(); C.arc(m, m, R * 0.62, 0, Math.PI * 2); C.fill();
  G.fillStyle = 'rgba(255,255,255,0.05)'; G.beginPath(); G.arc(m, m, R * 0.62, 0, Math.PI * 2); G.fill();
  return { color, glow };
}

// ---------------------------------------------------------------------------------------------------------------
// Meshes. `T` is three.js; `o.doc` the document for canvases; `o.rnd` the shape's dice.
function roughBlock(T, w, h, t, rnd, { taper = 0.35, crown = 0.18, jitter = 0.05 } = {}) {
  const geo = new T.BoxGeometry(w, h, t, 3, 6, 2);
  geo.translate(0, h / 2, 0);
  const p = geo.attributes.position;
  const bumps = [rnd(), rnd(), rnd(), rnd()].map((v) => v * 6.28);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const f = y / h;
    const s = 1 - taper * f * f;
    x *= s; z *= s;
    if (f > 0.8) y -= crown * h * ((Math.abs(x) / (w / 2)) ** 2) * (f - 0.8) * 5;   // a worn, rounded top
    const n = Math.sin(x * 3.1 + bumps[0]) * Math.cos(y * 2.3 + bumps[1]) + Math.sin(z * 4.7 + y * 1.7 + bumps[2]) * 0.6;
    x += n * jitter; z += Math.cos(y * 2.9 + bumps[3]) * jitter * 0.8;
    p.setXYZ(i, x, Math.max(0, y), z);
  }
  geo.computeVertexNormals();
  return geo;
}

function carvingMaterial(T, tex) {
  return new T.MeshBasicMaterial({
    color: GROOVE, map: tex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
  });
}

// A menhir, 2.2-3 m, leaning a little, with glyph `k` on its lake side (+Z) and a fallen companion at its foot.
export function buildStandingStone(T, { doc, rnd, k, stoneMat, carvingTex }) {
  const g = new T.Group();
  const h = 2.2 + rnd() * 0.8, w = 0.75 + rnd() * 0.25, t = 0.42 + rnd() * 0.12;
  const taper = 0.32;
  const stone = new T.Mesh(roughBlock(T, w, h, t, rnd, { taper }), stoneMat);
  stone.name = 'first-stone';
  stone.rotation.set((rnd() - 0.5) * 0.12, 0, (rnd() - 0.5) * 0.1);
  stone.position.y = -0.25;              // set into the ground
  g.add(stone);
  const tex = carvingTex(k);
  const mat = carvingMaterial(T, tex);
  const cy = h * 0.55, size = w * 0.8;
  const zf = (t / 2) * (1 - taper * (cy / h) ** 2) + 0.02;
  const carve = new T.Mesh(new T.PlaneGeometry(size, size), mat);
  carve.name = 'first-carving';
  carve.position.set(0, cy, zf);
  stone.add(carve);
  if (rnd() < 0.85) {                    // a smaller stone, long fallen, half sunk in the turf
    const fallen = new T.Mesh(roughBlock(T, 0.55, 1.4, 0.35, rnd, { taper: 0.2 }), stoneMat);
    fallen.rotation.set(Math.PI / 2 - 0.08, 0, rnd() * 6.28);
    fallen.position.set(1.4 + rnd() * 0.8, 0.05, -0.6 + rnd() * 1.2);
    g.add(fallen);
  }
  return { group: g, glow: [mat], height: h, radius: w * 0.55 };
}

// The ring stone: a broad slab on the highest ground, the ring of eight carved round the dark, facing the lake.
export function buildRingStone(T, { doc, rnd, stoneMat, ring }) {
  const g = new T.Group();
  const w = 3.4, h = 2.7, t = 0.7;
  const slab = new T.Mesh(roughBlock(T, w, h, t, rnd, { taper: 0.12, crown: 0.1, jitter: 0.06 }), stoneMat);
  slab.name = 'ring-stone';
  slab.position.y = -0.3;
  g.add(slab);
  const mat = carvingMaterial(T, new T.CanvasTexture(ring.glow));
  const carve = new T.Mesh(new T.PlaneGeometry(2.3, 2.3), mat);
  carve.name = 'ring-carving';
  carve.position.set(0, 1.25, t / 2 * (1 - 0.12 * 0.21) + 0.03);
  g.add(carve);
  // Two low kerbstones in front, the way an old altar would have stood.
  for (const sx of [-1, 1]) {
    const kerb = new T.Mesh(roughBlock(T, 0.9, 0.45, 0.5, rnd, { taper: 0.1, crown: 0.05 }), stoneMat);
    kerb.position.set(sx * 1.1, -0.15, 1.3 + rnd() * 0.2);
    kerb.rotation.y = (rnd() - 0.5) * 0.4;
    g.add(kerb);
  }
  return { group: g, glow: [mat], height: h, radius: w * 0.5 };
}

// ---------------------------------------------------------------------------------------------------------------
// The Marrow cave's door. `edge` is the mouth's outline (from the right foot over the top to the left foot, cave-
// local x, y), `lean` the mouth's centre for inflating it. The door is two leaves of pale stone split by a crack
// that opens at the foot into a ragged hole: the dead squeeze out through it at night (the waking); he can't.
export const MARROW_DOOR = Object.freeze({ z: -0.5, depth: 0.42, holeHalf: 0.55, holeTop: 1.25, crackTop: 2.5, inflate: 0.14 });
export function crackLine(rnd, h) {
  const pts = [];
  const D = MARROW_DOOR;
  const steps = 14;
  let x = 0;
  for (let i = 0; i <= steps; i++) {
    const y = (i / steps) * h;
    let half;
    if (y <= D.holeTop) half = D.holeHalf - (D.holeHalf - 0.3) * (y / D.holeTop);
    else if (y <= D.crackTop) half = 0.3 - 0.24 * ((y - D.holeTop) / (D.crackTop - D.holeTop));
    else half = 0.06 - 0.04 * ((y - D.crackTop) / (h - D.crackTop));
    if (i > 0 && y > D.holeTop) x += (rnd() - 0.5) * 0.32;
    x = Math.max(-0.35, Math.min(0.35, x));
    pts.push({ x, y, half: Math.max(0.015, half) });
  }
  return pts;
}

// Where the outline crosses height y on one side: `side` is the run of points from the foot to the top.
function outlineX(side, y) {
  if (y <= side[0][1]) return side[0][0];
  for (let i = 1; i < side.length; i++) {
    const [x0, y0] = side[i - 1], [x1, y1] = side[i];
    if (y <= y1) return y1 === y0 ? x1 : x0 + (x1 - x0) * ((y - y0) / (y1 - y0));
  }
  return side[side.length - 1][0];
}
function crackAt(crack, y) {
  if (y <= crack[0].y) return crack[0];
  for (let i = 1; i < crack.length; i++) {
    const a = crack[i - 1], b = crack[i];
    if (y <= b.y) { const t = (y - a.y) / ((b.y - a.y) || 1); return { x: a.x + (b.x - a.x) * t, half: a.half + (b.half - a.half) * t }; }
  }
  return crack[crack.length - 1];
}
// A leaf as rows of [x0, x1] spans from the floor to the top: its face (+Z, uv = x, y in metres, for the carving)
// and its body (the back and the two edges: the crack's edge is what you see down the crack).
// CL-267: `cols` splits each row of the face, and `relief(x, y)` pushes it out and in (metres; 0 at the leaf's edges,
// so the face still meets its sides): a hewn face, not a sheet of glass.
export function leafGeometries(T, rows, depth, cols = 1, relief = null) {
  const fp = [], fu = [], fi = [], bp = [], bi = [];
  rows.forEach(({ y, x0, x1 }) => {
    for (let c = 0; c <= cols; c++) {
      const x = x0 + (x1 - x0) * (c / cols), edge = Math.min(x - x0, x1 - x, y) / 0.18;
      const dz = relief ? relief(x, y) * Math.max(0, Math.min(1, edge)) : 0;
      fp.push(x, y, depth + dz); fu.push(x, y);
    }
  });
  for (let r = 0; r + 1 < rows.length; r++) for (let c = 0; c < cols; c++) {
    const a = r * (cols + 1) + c, b = a + cols + 1;
    fi.push(a, a + 1, b + 1, a, b + 1, b);
  }
  // body: per row four corners: front x0, back x0, back x1, front x1
  rows.forEach(({ y, x0, x1 }) => bp.push(x0, y, depth, x0, y, 0, x1, y, 0, x1, y, depth));
  for (let r = 0; r + 1 < rows.length; r++) {
    const a = r * 4, b = a + 4;
    bi.push(a, b, b + 1, a, b + 1, a + 1);          // the x0 edge
    bi.push(a + 1, b + 1, b + 2, a + 1, b + 2, a + 2); // the back
    bi.push(a + 2, b + 2, b + 3, a + 2, b + 3, a + 3); // the x1 edge
  }
  const mk = (pos, idx, uv) => {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    if (uv) g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  return { face: mk(fp, fi, fu), body: mk(bp, bi, null) };
}

export function buildMarrowDoor(T, { doc, rnd, edge, height }) {
  const D = MARROW_DOOR;
  const cy = height * 0.35;
  const big = edge.map(([x, y]) => {
    const dx = x, dy = y - cy, len = Math.hypot(dx, dy) || 1;
    return [x + (dx / len) * D.inflate, Math.max(0, y + (dy / len) * D.inflate)];
  });
  const n = big.length - 1, mid = Math.round(n / 2);
  const rightSide = big.slice(0, mid + 1);              // the right foot to the top
  const leftSide = big.slice(mid).reverse();            // the left foot to the top
  const topY = Math.max(big[mid][1], ...big.map((p) => p[1]));
  const crack = crackLine(rnd, topY);
  const rowsL = [], rowsR = [], NR = 30;
  for (let i = 0; i <= NR; i++) {
    const y = (i / NR) * topY;
    const c = crackAt(crack, y);
    const xr = outlineX(rightSide, y), xl = outlineX(leftSide, y);
    const rin = c.x + c.half, lin = c.x - c.half;
    rowsR.push({ y, x0: Math.min(rin, xr), x1: xr });
    rowsL.push({ y, x0: xl, x1: Math.max(xl, lin) });
  }

  // The ring carved across both leaves, centred over the hole.
  // CL-267: the canvas covers the whole face (the stone the menhirs are, weathered, damp at the foot), not just the
  // ring's square (outside it the face was one flat colour, pale as plaster); the ring the same size as before.
  const Rc = Math.max(4.5, topY * 0.6);
  const ring = makeRingCarving(doc, { px: 1024, base: makeLichenTexture(doc, 0x3a77), tiles: 2, scale: 2.0 / Rc, groove: '#3f3c34' });
  const ringCy = Math.min(topY - 2.1, Math.max(D.crackTop + 0.4, topY * 0.55));
  const colorTex = new T.CanvasTexture(ring.color), glowTex = new T.CanvasTexture(ring.glow);
  for (const tex of [colorTex, glowTex]) {
    tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
    tex.repeat.set(1 / (2 * Rc), 1 / (2 * Rc));
    tex.offset.set(0.5, 0.5 - ringCy / (2 * Rc));
  }
  const face = new T.MeshStandardMaterial({ color: 0xffffff, map: colorTex, roughness: 0.95 });
  const overlay = carvingMaterial(T, glowTex);   // the grooves again, unlit: dark by day, cold light at night
  const side = new T.MeshStandardMaterial({ color: 0x8a8678, roughness: 0.98, side: T.DoubleSide });
  const relief = (x, y) => 0.035 * Math.sin(x * 1.7 + y * 0.9) * Math.sin(y * 2.3 - x * 0.6) + 0.012 * Math.sin(x * 7.1 + y * 5.3);
  const group = new T.Group();
  group.name = 'marrow-door';
  for (const [rows, name] of [[rowsR, 'marrow-door-right'], [rowsL, 'marrow-door-left']]) {
    const { face: fg, body: bg } = leafGeometries(T, rows, D.depth, 10, relief);
    const leaf = new T.Group();
    leaf.name = name;
    leaf.position.z = D.z;
    const glyphs = new T.Mesh(fg, overlay);
    glyphs.position.z = 0.004;
    leaf.add(new T.Mesh(fg, face), new T.Mesh(bg, side), glyphs);
    group.add(leaf);
  }
  // The crack's light: a thin sheet of cold light just behind the door, seen through the crack and the hole.
  // Its brightness is its colour (black by day, cold light at night), so it reads as a dark gap until the dark comes.
  const lightMat = new T.MeshBasicMaterial({ color: RUNE_LIGHT, side: T.DoubleSide, fog: true });
  lightMat.color.multiplyScalar(0.005);
  // CL-267 (AG-152: a rectangle, its top corners showed above the arch's apex): the door's own outline, a little in.
  const outline = new T.Shape();
  big.forEach(([x, y], i) => { const px = x * 0.92, py = Math.max(0, y * 0.97); if (i) outline.lineTo(px, py); else outline.moveTo(px, py); });
  outline.closePath();
  const sheet = new T.Mesh(new T.ShapeGeometry(outline), lightMat);
  sheet.name = 'marrow-crack-light';
  sheet.position.set(0, 0, D.z - 0.35);
  group.add(sheet);
  return { group, glow: [overlay], light: lightMat, crack, ringCy, topY, rows: { left: rowsL, right: rowsR } };
}

// ---------------------------------------------------------------------------------------------------------------
// The barrow's offerings: small things left at the hill cave's door by people long gone. `spots` are cave-local
// { x, y, z } on the ground; the crown-stone carries glyph 5 (the crown: the barrow king).
export function buildOfferings(T, { rnd, spots, stoneMat, carvingTex }) {
  const g = new T.Group();
  g.name = 'barrow-offerings';
  const flat = new T.MeshStandardMaterial({ color: 0x8a8576, roughness: 0.95 });
  const bone = new T.MeshStandardMaterial({ color: 0xd8d1bb, roughness: 0.85 });
  const ash = new T.MeshStandardMaterial({ color: 0x2a2724, roughness: 1 });
  const glow = [];
  spots.forEach((s, i) => {
    const kind = ['cairn', 'bowl', 'cairn', 'antler', 'crown'][i % 5];
    const o = new T.Group();
    o.position.set(s.x, s.y, s.z);
    o.rotation.y = rnd() * 6.28;
    if (kind === 'cairn') {
      let y = 0;
      for (let k = 0; k < 4; k++) {
        const r = 0.28 - k * 0.055;
        const st = new T.Mesh(new T.DodecahedronGeometry(r, 0), flat);
        st.scale.set(1, 0.42, 1 + rnd() * 0.2);
        y += r * 0.42;
        st.position.set((rnd() - 0.5) * 0.06, y, (rnd() - 0.5) * 0.06);
        st.rotation.y = rnd() * 6.28;
        y += r * 0.38;
        o.add(st);
      }
    } else if (kind === 'bowl') {
      const pts = [];
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * (Math.PI / 2); pts.push(new T.Vector2(0.06 + Math.sin(a) * 0.24, (1 - Math.cos(a)) * 0.16)); }
      const bowl = new T.Mesh(new T.LatheGeometry(pts, 10), stoneMat);
      bowl.material = flat;
      o.add(bowl);
      const cinders = new T.Mesh(new T.CircleGeometry(0.22, 10), ash);
      cinders.rotation.x = -Math.PI / 2; cinders.position.y = 0.11;
      o.add(cinders);
    } else if (kind === 'antler') {
      const beam = new T.Mesh(new T.CylinderGeometry(0.025, 0.04, 0.7, 5), bone);
      beam.rotation.z = Math.PI / 2 - 0.15; beam.position.y = 0.05;
      o.add(beam);
      for (let k = 0; k < 3; k++) {
        const tine = new T.Mesh(new T.CylinderGeometry(0.012, 0.022, 0.22, 4), bone);
        tine.position.set(-0.22 + k * 0.2, 0.13, 0.02);
        tine.rotation.z = -0.5;
        o.add(tine);
      }
    } else {
      const crown = new T.Mesh(roughBlock(T, 0.42, 0.6, 0.2, rnd, { taper: 0.25, crown: 0.2, jitter: 0.015 }), stoneMat);
      o.add(crown);
      const mat = carvingMaterial(T, carvingTex(5));
      glow.push(mat);
      const c = new T.Mesh(new T.PlaneGeometry(0.32, 0.32), mat);
      c.position.set(0, 0.34, 0.1 * (1 - 0.25 * 0.3) + 0.02);
      o.add(c);
      o.rotation.y = 0;
    }
    g.add(o);
  });
  return { group: g, glow };
}
