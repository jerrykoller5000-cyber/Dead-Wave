// CL-334 g (J101 round 6, Jerry 10 Nov: "Hands will need a sixth round of revision. A highly highly detailed one"): the
// first-person hand's detail maps, painted from the hand's own layout (studio/marine-hand.js DETAIL_ATLAS): what the
// surface is too coarse to carry. On the skin: the wrinkles over the middle and end knuckles, the creases on the palm side
// of every joint, the palm's three lines and the wrist's, the fingertips' ridges, the skin's grain; the knuckles a little
// red, the palm lighter, the creases darker. On the glove: its weave, the seams down the fingers' sides and round the palm
// with their stitches, the palm's grip panel. Written by tools/hand-bake.mjs as PNGs in assets/hand/ (normal and colour).
import zlib from 'node:zlib';

let FINGER_X = [0.0256, 0.0077, -0.0100, -0.0259], PALM_LEN = 0.079;   // set from the hand by paintHandDetail
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const gauss = (x, w) => Math.exp(-(x * x) / (w * w));
// a little value noise (2D, hashed lattice), for the grain
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), tx = x - xi, ty = y - yi, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const grain = (x, y, s) => (vnoise(x / s, y / s) - 0.5) + 0.5 * (vnoise(x / (s * 0.47) + 17.3, y / (s * 0.47) - 9.1) - 0.5);

// The patterns: height (metres, + out of the skin) and the colour's multiplier [r, g, b], at a point given in the chart's
// own measures. Digit: u along it from its knuckle (m), th round it (0 the pad's side, pi the nail's), circumference C (m).
function digitSkin(D, u, th) {
  const [l0, l1, l2] = D.lens, j1 = l0, j2 = l0 + l1, ct = Math.cos(th);
  const back = clamp((-ct - 0.55) / 0.35, 0, 1), front = clamp((ct + 0.05) / 0.45, 0, 1);
  let h = 0, crease = 0, red = 0, pink = 0;
  const var1 = 0.65 + 0.35 * vnoise(th * 2.3 + D.total * 300, 3.1);   // a crease is never even all round
  const groove = (c, w, depth, mask) => { const g = gauss(u - c, w) * mask * var1; h -= depth * 0.7 * g; crease += g * mask; };
  if (!D.thumb) {
    // over the middle knuckle: four crescent wrinkles, the middle ones longest
    for (let k = 0; k < 4; k++) {
      const c = j1 - 0.0024 + k * 0.0012 + 0.0011 * (1 + ct);   // they bow toward the hand at their ends
      const len = clamp((-ct - (0.62 + 0.07 * Math.abs(k - 1.5))) / 0.2, 0, 1);
      groove(c, 0.00026, 0.00011, len);
    }
    // over the end knuckle: two or three
    for (let k = 0; k < 3; k++) groove(j2 - 0.0011 + k * 0.0011 + 0.0008 * (1 + ct), 0.00022, 0.00008, clamp((-ct - (0.7 + 0.08 * k)) / 0.18, 0, 1));
    // the palm side: two creases at the middle joint, one at the end joint, two at the finger's root
    const fm = clamp((ct - 0.15) / 0.4, 0, 1);
    groove(j1 - 0.0013, 0.00022, 0.00019, fm); groove(j1 + 0.0007, 0.0002, 0.00015, fm);
    groove(j2 + 0.0003, 0.0002, 0.00016, fm);
    groove(0.0105, 0.00028, 0.00017, fm); groove(0.0128, 0.00022, 0.0001, fm * 0.8);
    // the fingertip's ridges, round the pad's middle
    const pc = D.total - 0.0075, pr = Math.hypot((u - pc) * 1.0, th * 0.0085 / 1.2);
    h += 0.000018 * Math.cos(pr / 0.00046 * 2 * Math.PI) * gauss(pr, 0.006) * clamp((ct - 0.2) / 0.4, 0, 1);
    red += 0.6 * gauss(u - j1, 0.004) * back + 0.4 * gauss(u - j2, 0.003) * back + 0.5 * gauss(u, 0.005) * back;
    pink += gauss(u - (D.total - 0.006), 0.006) * front;
  } else {
    // the thumb: wrinkles over its end joint, creases at its knuckle and end joint
    for (let k = 0; k < 3; k++) groove(j2 - 0.0012 + k * 0.0012 + 0.0009 * (1 + ct), 0.00025, 0.0001, clamp((-ct - (0.6 + 0.08 * k)) / 0.2, 0, 1));
    const fm = clamp((ct - 0.15) / 0.4, 0, 1);
    groove(j2 + 0.0002, 0.00022, 0.00018, fm); groove(j1 + 0.0004, 0.00025, 0.00015, fm); groove(j1 + 0.0026, 0.0002, 0.0001, fm * 0.7);
    const pc = D.total - 0.008, pr = Math.hypot(u - pc, th * 0.009 / 1.2);
    h += 0.000018 * Math.cos(pr / 0.00046 * 2 * Math.PI) * gauss(pr, 0.0065) * clamp((ct - 0.2) / 0.4, 0, 1);
    red += 0.45 * gauss(u - j2, 0.003) * back + 0.35 * gauss(u - j1, 0.004) * back;
    pink += gauss(u - (D.total - 0.006), 0.006) * front;
  }
  return { h, crease: clamp(crease, 0, 1), red: clamp(red, 0, 1), pink: clamp(pink, 0, 1), palm: front };
}
// The palm's chart: sF (m) round from the face's middle (+ toward the thumb), sB from the back's, v wrist 0 to knuckles 1.
function palmSkin(sF, sB, v) {
  let h = 0, crease = 0;
  const onFace = clamp(1 - Math.abs(sF) / 0.042, 0, 1) > 0 ? smooth(0.044, 0.034, Math.abs(sF)) : 0;
  const line = (d, w, depth, mask) => { const g = gauss(d, w) * mask * (0.6 + 0.4 * vnoise(v * 40, 7.7)); h -= depth * 0.75 * g; crease += g; };
  // the distal transverse crease (the "heart" line): from the little finger's edge, rising to between index and middle
  { const t = smooth(-0.04, 0.012, sF), vv = 0.79 + 0.11 * t; line(v - vv, 0.0085, 0.0002 * 1, onFace * smooth(0.016, 0.008, sF) * smooth(-0.046, -0.036, sF)); }
  // the proximal transverse crease (the "head" line): from the thumb's edge across, falling toward the little finger's side
  { const t = smooth(-0.024, 0.038, sF), vv = 0.64 + 0.15 * t; line(v - vv, 0.008, 0.00019, onFace * smooth(-0.03, -0.022, sF)); }
  // the thenar crease (the "life" line): round the thumb's mound from the radial edge down to the wrist's middle
  { const t = clamp((0.79 - v) / 0.71, 0, 1), sv = 0.006 + 0.028 * (1 - t * t); line(sF - sv, 0.00075, 0.00021, onFace * smooth(0.8, 0.76, v) * smooth(0.04, 0.09, v)); }
  // the wrist's creases
  line(v - 0.015, 0.006, 0.0001, onFace); line(v - 0.06, 0.006, 0.00007, onFace);
  // a few small lines the palm has (fixed, not random)
  line(sF + 0.012 - 0.04 * (v - 0.55), 0.0006, 0.00006, onFace * gauss(v - 0.5, 0.12));
  const back = smooth(0.046, 0.03, Math.abs(sB));
  // the back of the hand (sB grows toward the little finger's side): the extensor tendons fanning from the wrist to each
  // knuckle, the veins of the back's network between them, the skin wrinkled a little over each knuckle head
  let vein = 0;
  if (back > 0) {
    for (const fx of FINGER_X) {
      const xl = -fx * (0.45 + 0.55 * Math.min(1, v / 0.96));
      h += 0.00012 * gauss(sB - xl, 0.0026) * smooth(0.25, 0.65, v) * smooth(0.98, 0.88, v) * back;
      // over the knuckle head: two or three short arcs
      for (let k = 0; k < 3; k++) { const e = (sB + fx) / 0.0045, c = 0.95 + k * 0.014 + 0.01 * e * e; h -= 0.00005 * gauss(v - c, 0.004) * gauss(sB + fx, 0.0045) * back; }
    }
    const path = (pts) => {   // the distance (m) from a polyline in (sB, v * the palm's length)
      let best = 1;
      for (let k = 0; k + 1 < pts.length; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1], px = sB, py = v * PALM_LEN;
        const dx = bx - ax, dy = (by - ay) * PALM_LEN, t = clamp(((px - ax) * dx + (py - ay * PALM_LEN) * dy) / (dx * dx + dy * dy), 0, 1);
        best = Math.min(best, Math.hypot(px - ax - dx * t, py - ay * PALM_LEN - dy * t));
      }
      return best;
    };
    const veins = [
      [[-0.006, 0.05], [0.000, 0.3], [0.006, 0.58], [0.010, 0.8], [0.012, 0.9]],
      [[0.014, 0.08], [0.018, 0.35], [0.022, 0.62], [0.026, 0.84]],
      [[-0.022, 0.02], [-0.026, 0.3], [-0.029, 0.55], [-0.031, 0.7]],
      [[0.006, 0.58], [0.014, 0.6], [0.022, 0.62]],
      [[0.000, 0.3], [-0.012, 0.42], [-0.02, 0.62], [-0.016, 0.86]]
    ];
    for (const pv of veins) { const d = path(pv); const g = gauss(d, 0.0019); h += 0.00016 * g * back; vein = Math.max(vein, g * back); }
  }
  return { h, crease: clamp(crease, 0, 1), face: onFace, back, vein };
}
function digitGlove(D, u, th, C) {
  const ct = Math.cos(th), st = Math.sin(th);
  let h = 0, seam = 0;
  // the seams down each side (at th = +-pi/2), a raised bead with stitches every 2.2 mm
  for (const side of [1, -1]) {
    const dth = Math.atan2(Math.sin(th - side * Math.PI / 2), Math.cos(th - side * Math.PI / 2)) * C / (2 * Math.PI);
    const bead = gauss(dth, 0.0005);
    const stitch = 0.5 + 0.5 * Math.cos(u / 0.0022 * 2 * Math.PI);
    h += 0.00022 * bead + 0.00006 * bead * stitch - 0.00008 * gauss(Math.abs(dth) - 0.0009, 0.0003);
    seam += bead;
  }
  // round the fingertip, where the end cap is sewn on
  const capU = D.total - 0.0105; h += 0.00012 * gauss(u - capU, 0.0004) * clamp((ct + 0.2) / 0.5, 0, 1); seam += gauss(u - capU, 0.0004) * clamp((ct + 0.2) / 0.5, 0, 1);
  // creases where it folds: the palm side of each joint
  const fm = clamp((ct + 0.2) / 0.4, 0, 1);
  h -= 0.00012 * (gauss(u - D.lens[0], 0.0006) + gauss(u - D.lens[0] - D.lens[1], 0.0005)) * fm;
  return { h, seam: clamp(seam, 0, 1), st };
}
function palmGlove(sF, sB, v, P) {
  let h = 0, seam = 0;
  // the grip panel on the palm (a separate piece, a seam round it)
  const inPanel = smooth(0.033, 0.03, Math.abs(sF)) * smooth(0.2, 0.24, v) * smooth(1.02, 0.97, v);
  const edge = gauss(Math.abs(sF) - 0.0315, 0.0006) * smooth(0.18, 0.24, v) * smooth(1.04, 0.98, v) + gauss(v - 0.22, 0.008) * smooth(0.034, 0.028, Math.abs(sF));
  h += 0.00018 * edge + 0.00005 * inPanel; seam += edge;
  // the side seams (round the hand's edges, a quarter round from the face's middle)
  for (const side of [1, -1]) { const b = gauss(sF - side * P / 4, 0.0006); h += 0.0002 * b; seam += b; }
  return { h, seam: clamp(seam, 0, 1), panel: inPanel };
}

// Paint: { normal, colour } (RGBA bytes, W x H, row 0 the top) for the skin or the glove.
export function paintHandDetail(info, kind) {
  const A = info.atlas, W = A.W, H = A.H;
  FINGER_X = info.fingersX; PALM_LEN = info.palmLen;
  const hgt = new Float32Array(W * H), col = new Float32Array(W * H * 3), mmX = new Float32Array(W * H), mmY = new Float32Array(W * H);
  for (let py = 0; py < H; py++) {
    const y = 1 - (py + 0.5) / H, V = (y - A.vPad) / (1 - 2 * A.vPad);
    for (let px = 0; px < W; px++) {
      const x = (px + 0.5) / W;
      let c = 0; for (let k = A.charts.length - 1; k >= 0; k--) if (x >= A.charts[k].x0) { c = k; break; }
      const ch = A.charts[c], wi = ch.w * (1 - 2 * A.gutter);
      let U = (x - ch.x0 - ch.w * A.gutter) / wi; U -= Math.floor(U);   // the gutters run the pattern on round
      const i = py * W + px;
      let h = 0, r = 0.965, g = 0.965, b = 0.965;
      if (c === 0) {
        const v = info.palmV[0] + V * (info.palmV[1] - info.palmV[0]), R = info.palmRow(clamp(v, 0, 1.05));
        let sF = (U - R.qFace) * R.P, sB = (U - R.qBack) * R.P;
        sF -= Math.round(sF / R.P) * R.P; sB -= Math.round(sB / R.P) * R.P;
        // the right hand's +x is the thumb's side; the chart runs round from the little finger's edge: sF > 0 toward the thumb
        mmX[i] = R.P / (wi * W); mmY[i] = info.palmLen * (info.palmV[1] - info.palmV[0]) / ((1 - 2 * A.vPad) * H);
        const fade = smooth(-0.04, 0.03, v) * smooth(1.08, 1.0, v);
        if (kind === 'skin') {
          const S = palmSkin(sF, sB, v);
          h = S.h * fade + 0.000016 * grain(sF, v * info.palmLen, 0.0006) + 0.00001 * grain(sF * 1.7, v * info.palmLen * 1.7, 0.00025);
          const k = 1 - 0.11 * S.crease * fade;
          r = (0.95 + 0.05 * S.face) * k; g = (0.94 + 0.05 * S.face) * k; b = (0.93 + 0.04 * S.face) * k;
          // the back: a little darker and warmer over the knuckles
          const kn = S.back * smooth(0.82, 0.97, v) * smooth(1.08, 1.0, v);
          r *= 1 - 0.02 * S.back - 0.025 * S.vein; g *= 1 - 0.05 * kn - 0.02 * S.back - 0.012 * S.vein; b *= 1 - 0.06 * kn - 0.02 * S.back + 0.01 * S.vein;
        } else {
          const S = palmGlove(sF, sB, v, R.P);
          h = S.h * fade + 0.000025 * Math.sin(sF / 0.0007 * 2 * Math.PI) * Math.sin(v * info.palmLen / 0.0007 * 2 * Math.PI);
          const k = 1 - 0.25 * S.seam;
          r = g = b = (0.98 - 0.12 * S.panel) * k;
        }
      } else {
        const D = info.digits[c - 1], u = -D.inset + V * (D.total + D.inset + 0.0014), th = U * 2 * Math.PI - Math.PI / 2;
        const P = D.prof(clamp(u, 0, D.total), D.total), C = Math.PI * (P.rx + (P.rf + P.rb) / 2);
        mmX[i] = C / (wi * W); mmY[i] = (D.total + D.inset + 0.0014) / ((1 - 2 * A.vPad) * H);
        const fade = smooth(-0.004, 0.004, u) * smooth(D.total + 0.0012, D.total - 0.002, u);
        if (kind === 'skin') {
          const S = digitSkin(D, u, th);
          h = S.h * fade + 0.000014 * grain(th * C / (2 * Math.PI), u, 0.0005) + 0.000008 * grain(th * C / Math.PI, u * 2, 0.0002);
          const k = 1 - 0.12 * S.crease * fade;
          r = (0.96 + 0.03 * S.palm) * k; g = (0.955 - 0.07 * S.red - 0.05 * S.pink + 0.02 * S.palm) * k; b = (0.95 - 0.08 * S.red - 0.06 * S.pink + 0.01 * S.palm) * k;
        } else {
          const S = digitGlove(D, u, th, C);
          h = S.h * fade + 0.000025 * Math.sin(th * C / (2 * Math.PI) / 0.0007 * 2 * Math.PI) * Math.sin(u / 0.0007 * 2 * Math.PI);
          r = g = b = 0.98 * (1 - 0.25 * S.seam);
        }
      }
      hgt[i] = h; col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    }
  }
  // the normals from the height, each step in metres (a texel is mmX across, mmY along: they differ chart to chart)
  const normal = new Uint8Array(W * H * 4), colour = new Uint8Array(W * H * 4);
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const i = py * W + px, l = py * W + Math.max(0, px - 1), rr = py * W + Math.min(W - 1, px + 1), up = Math.max(0, py - 1) * W + px, dn = Math.min(H - 1, py + 1) * W + px;
    const dx = (hgt[rr] - hgt[l]) / (2 * (mmX[i] || 1e-4)), dy = (hgt[up] - hgt[dn]) / (2 * (mmY[i] || 1e-4));   // +y up the image (the map's v)
    const nx = -dx, ny = -dy, nz = 1, L = Math.hypot(nx, ny, nz);
    normal[i * 4] = Math.round((nx / L * 0.5 + 0.5) * 255); normal[i * 4 + 1] = Math.round((ny / L * 0.5 + 0.5) * 255); normal[i * 4 + 2] = Math.round((nz / L * 0.5 + 0.5) * 255); normal[i * 4 + 3] = 255;
    for (let k = 0; k < 3; k++) colour[i * 4 + k] = Math.round(clamp(col[i * 3 + k], 0, 1) * 255);
    colour[i * 4 + 3] = 255;
  }
  return { W, H, normal, colour };
}

// A PNG (RGBA 8-bit) from bytes, row 0 the top.
export function encodePNG(W, H, rgba) {
  const crcT = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c; }
  const crc = (buf) => { let c = -1; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type, 'ascii'), len = Buffer.alloc(4), cr = Buffer.alloc(4); len.writeUInt32BE(data.length); cr.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, cr]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(rgba.buffer, rgba.byteOffset + y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
