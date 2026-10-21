(function () {
  const T = window.TT;
  const tex = T.getGroundDetailTex && T.getGroundDetailTex();
  if (!tex || !T.getGroundDetail()) { window.__detail = null; window.__shade = null; return; }
  const c = tex.image; const N = c.width;
  const d = c.getContext('2d').getImageData(0, 0, N, N).data;
  const mips = [];
  let cur = new Float32Array(N * N * 3);
  for (let i = 0; i < N * N; i++) for (let k = 0; k < 3; k++) cur[i * 3 + k] = d[i * 4 + k] / 255;
  mips.push({ n: N, a: cur });
  let n = N;
  while (n > 1) {
    const h = n / 2, nx = new Float32Array(h * h * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < h; x++) for (let k = 0; k < 3; k++) {
      nx[(y * h + x) * 3 + k] = (cur[((2 * y) * n + 2 * x) * 3 + k] + cur[((2 * y) * n + 2 * x + 1) * 3 + k] + cur[((2 * y + 1) * n + 2 * x) * 3 + k] + cur[((2 * y + 1) * n + 2 * x + 1) * 3 + k]) / 4;
    }
    mips.push({ n: h, a: nx }); cur = nx; n = h;
  }
  function samp(u, v, fpTex) {
    const lvl = Math.max(0, Math.min(mips.length - 1, Math.round(Math.log2(Math.max(1e-6, fpTex)))));
    const m = mips[lvl], q = m.n;
    let x = u * q - 0.5, y = v * q - 0.5;
    const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
    const W = (i) => ((i % q) + q) % q;
    const o = [0, 0, 0];
    const idx = (xx, yy) => (W(yy) * q + W(xx)) * 3;
    const i00 = idx(x0, y0), i10 = idx(x0 + 1, y0), i01 = idx(x0, y0 + 1), i11 = idx(x0 + 1, y0 + 1);
    for (let k = 0; k < 3; k++) {
      const a = m.a[i00 + k] + (m.a[i10 + k] - m.a[i00 + k]) * tx;
      const b = m.a[i01 + k] + (m.a[i11 + k] - m.a[i01 + k]) * tx;
      o[k] = a + (b - a) * ty;
    }
    return o;
  }
  const S = T.GROUND_DETAIL_SCALE;
  const ss = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const cl = (x) => Math.max(0, Math.min(1, x));
  window.__shade = function (wx, wz, dist, base, worn, wear) {
    const fp = dist * (window.__camK || 0.001); // metres per pixel
    const A = samp(wx * S.fine, wz * S.fine, fp * N * S.fine);
    const B = samp(wx * S.mid + 0.31, wz * S.mid + 0.77, fp * N * S.mid);
    const C = samp(wx * S.macro + 0.62, wz * S.macro + 0.19, fp * N * S.macro);
    const near = 1 - ss(30, 120, dist);
    const amp = near * 0.45 + 0.55;
    const green = cl((base[1] - Math.max(base[0] * 0.85, base[2])) / (base[1] + 0.02) * 3.0);
    const grassD = (A[0] - 0.5) * 0.24 + (B[0] - 0.5) * 0.5;
    const gritD = (A[1] - 0.5) * 0.3 + (B[1] - 0.5) * 0.5;
    const m = C[2] - 0.5;
    const tint = [1 + m * green * 0.25, 1 + m * 0.08, 1 - m * green * 0.2];
    const dm = (gritD + (grassD - gritD) * green) * amp + 1;
    const cm = (C[0] - 0.5) * 0.12 + 1;
    const g = [0, 1, 2].map(k => base[k] * dm * tint[k] * cm);
    const jitter = ((B[2] - 0.5) * 0.7 + (A[2] - 0.5) * 0.35) * 0.45;
    const w = wear + jitter;
    const cut = ss(0.44, 0.56, w);
    const fringe = ss(0.2, 0.46, w) * (1 - cut) * 0.7;
    const fr = [1.12, 1.06, 0.85];
    const tr = g.map((v, k) => v * (1 + (fr[k] - 1) * fringe));
    const tm = (gritD * 1.1 * amp + 1) * (1 - ss(0.85, 1.0, wear) * 0.1);
    const t = worn.map(v => v * tm);
    return [0, 1, 2].map(k => tr[k] + (t[k] - tr[k]) * cut);
  };
})();

(function () {
  const T = window.TT;
  const tt = T.getTreeTex && T.getTreeTex();
  if (!tt || !tt.on) { window.__shadeTree = null; return; }
  const grab = (tex) => { const c = tex.image; return { n: c.width, d: c.getContext('2d').getImageData(0, 0, c.width, c.height).data }; };
  const L = grab(tt.leaf), B = grab(tt.bark);
  const s = (g, u, v) => { u -= Math.floor(u); v -= Math.floor(v); const x = Math.floor(u * g.n) % g.n, y = Math.floor((1 - v) * g.n) % g.n; return g.d[(y * g.n + x) * 4] / 255; };
  const ss = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
  const tri = (g, sc, sy, x, y, z, n) => { const w = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])]; const ws = w[0] + w[1] + w[2] + 1e-4; return (s(g, z * sc, y * sc * sy) * w[0] + s(g, x * sc, z * sc) * w[1] + s(g, x * sc, y * sc * sy) * w[2]) / ws; };
  window.__shadeTree = function (tk, x, y, z, n, dist) {
    const near = tk === 3 ? 1 - ss(20, 80, dist) : 1 - ss(25, 90, dist);
    if (tk === 3) { const g = tri(B, 0.55, 1.0, x, y, z, n); return 1 + (g - 0.55) * (near * 0.45 + 0.3); }
    if (tk === 1) { const l = tri(L, 0.5, 1, x, y, z, n); return 1 + (l - 0.55) * (near * 0.45 + 0.35); }
    window.__crack = ss(0.62, 0.3, tri(B, 1.6, 0.3, x, y, z, n)) * 0.85 + 0.15;
    const b = tri(B, 1.6, 0.3, x, y, z, n); const bk = 1 + (b - 0.55) * (near * 0.5 + 0.25);
    const lum = (window.__vcLum || 0); const pale = ss(0.42, 0.62, lum);
    const mk = 1 - ss(0.4, 0.28, tri(B, 1.3, 3.0, x, y, z, n)) * 0.8;
    return bk + (mk - bk) * pale;
  };
})();
