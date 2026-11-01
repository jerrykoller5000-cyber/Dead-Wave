// CU-210 (CL-287 W2): the valley field. Same 1.25 m cell, same climb, same
// no-corner-cut Dijkstra as the player field in index.html. The caller fills
// blocked, height and cost. This file does not know about trees, walls or the page.
export const NAV_CELL = 1.25;
export const NAV_CLIMB = 0.47;
export const NAV_CLEAR = 0.45;

const NB = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
];

export function makeNavField(n, ox = 0, oz = 0) {
  const cells = n * n;
  return {
    n, cell: NAV_CELL, ox, oz,
    blocked: new Uint8Array(cells),
    h: new Float32Array(cells),
    cost: new Float32Array(cells),
    dist: new Float32Array(cells),
    heapK: new Float32Array(cells * 8),
    heapV: new Int32Array(cells * 8),
    ready: false,
  };
}

export function navIndex(F, x, z) {
  const i = Math.floor((x - F.ox) / F.cell);
  const j = Math.floor((z - F.oz) / F.cell);
  if (i < 0 || j < 0 || i >= F.n || j >= F.n) return -1;
  return j * F.n + i;
}

export function markNavCircle(F, cx, cz, r) {
  const cell = F.cell, n = F.n;
  const i0 = Math.max(0, Math.floor((cx - r - F.ox) / cell));
  const i1 = Math.min(n - 1, Math.floor((cx + r - F.ox) / cell));
  const j0 = Math.max(0, Math.floor((cz - r - F.oz) / cell));
  const j1 = Math.min(n - 1, Math.floor((cz + r - F.oz) / cell));
  const r2 = r * r;
  for (let j = j0; j <= j1; j++) {
    const wz = F.oz + (j + 0.5) * cell - cz;
    for (let i = i0; i <= i1; i++) {
      const wx = F.ox + (i + 0.5) * cell - cx;
      if (wx * wx + wz * wz < r2) F.blocked[j * n + i] = 1;
    }
  }
}

export function paintNavDisc(F, cx, cz, r, cost, pick) {
  const cell = F.cell, n = F.n;
  const i0 = Math.max(0, Math.floor((cx - r - F.ox) / cell));
  const i1 = Math.min(n - 1, Math.floor((cx + r - F.ox) / cell));
  const j0 = Math.max(0, Math.floor((cz - r - F.oz) / cell));
  const j1 = Math.min(n - 1, Math.floor((cz + r - F.oz) / cell));
  const r2 = r * r;
  for (let j = j0; j <= j1; j++) {
    const wz = F.oz + (j + 0.5) * cell - cz;
    for (let i = i0; i <= i1; i++) {
      const wx = F.ox + (i + 0.5) * cell - cx;
      if (wx * wx + wz * wz > r2) continue;
      const k = j * n + i;
      F.cost[k] = pick(F.cost[k], cost);
    }
  }
}

export function paintNavSegment(F, x0, z0, x1, z1, radius, cost) {
  const dx = x1 - x0, dz = z1 - z0;
  const len = Math.hypot(dx, dz);
  const step = F.cell * 0.5;
  const n = Math.max(1, Math.ceil(len / step));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    paintNavDisc(F, x0 + dx * t, z0 + dz * t, radius, cost, Math.min);
  }
}

// Seed every open cell within seedR of (seedX, seedZ). Costs are per-cell
// multipliers (trail 0.6, ground 1, woods 1.6, wet 2.5). A 0 cost counts as 1.
export function buildNavField(F, seedX, seedZ, seedR) {
  const n = F.n, cell = F.cell;
  const hk = F.heapK, hv = F.heapV;
  F.dist.fill(Infinity);
  F.ready = false;
  let hn = 0;
  const push = (key, v) => {
    if (hn >= hk.length) throw new Error('nav heap full');
    let c = hn++;
    while (c > 0) {
      const p = (c - 1) >> 1;
      if (hk[p] <= key) break;
      hk[c] = hk[p]; hv[c] = hv[p]; c = p;
    }
    hk[c] = key; hv[c] = v;
  };
  if (seedR > 0) {
    const i0 = Math.max(0, Math.floor((seedX - seedR - F.ox) / cell));
    const i1 = Math.min(n - 1, Math.floor((seedX + seedR - F.ox) / cell));
    const j0 = Math.max(0, Math.floor((seedZ - seedR - F.oz) / cell));
    const j1 = Math.min(n - 1, Math.floor((seedZ + seedR - F.oz) / cell));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const k = j * n + i;
      if (F.blocked[k]) continue;
      const wx = F.ox + (i + 0.5) * cell - seedX;
      const wz = F.oz + (j + 0.5) * cell - seedZ;
      if (wx * wx + wz * wz > seedR * seedR) continue;
      F.dist[k] = 0;
      push(0, k);
    }
    if (hn === 0) return F;
  } else {
    const src = navIndex(F, seedX, seedZ);
    if (src < 0) return F;
    F.blocked[src] = 0;
    F.dist[src] = 0;
    push(0, src);
  }
  while (hn > 0) {
    const key = hk[0], cur = hv[0];
    const lk = hk[--hn], lv = hv[hn];
    let c = 0;
    for (;;) {
      let m = 2 * c + 1;
      if (m >= hn) break;
      if (m + 1 < hn && hk[m + 1] < hk[m]) m++;
      if (hk[m] >= lk) break;
      hk[c] = hk[m]; hv[c] = hv[m]; c = m;
    }
    hk[c] = lk; hv[c] = lv;
    if (key > F.dist[cur]) continue;
    const ci = cur % n, cj = (cur / n) | 0, ch = F.h[cur];
    for (let q = 0; q < 8; q++) {
      const nb = NB[q];
      const ni = ci + nb[0], nj = cj + nb[1];
      if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
      const k = nj * n + ni;
      if (F.blocked[k]) continue;
      if (nb[2] > 1 && (F.blocked[cj * n + ni] || F.blocked[nj * n + ci])) continue;
      const len = nb[2] * cell;
      if (ch - F.h[k] > NAV_CLIMB * len) continue;
      const mult = F.cost[k] > 0 ? F.cost[k] : 1;
      const d = key + len * mult;
      if (d < F.dist[k]) { F.dist[k] = d; push(d, k); }
    }
  }
  F.ready = true;
  return F;
}

// Downhill step. Writes into out. False when this cell has no route.
export function navDir(F, x, z, out) {
  if (!F.ready) return false;
  const k = navIndex(F, x, z);
  if (k < 0) return false;
  const n = F.n, cell = F.cell;
  const ci = k % n, cj = (k / n) | 0;
  let tk = -1;
  if (F.dist[k] === Infinity) {
    let bd = Infinity;
    for (let dj = -2; dj <= 2; dj++) {
      for (let di = -2; di <= 2; di++) {
        const ni = ci + di, nj = cj + dj;
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        const kk = nj * n + ni;
        if (F.dist[kk] === Infinity) continue;
        const wx = F.ox + (ni + 0.5) * cell - x;
        const wz = F.oz + (nj + 0.5) * cell - z;
        const d2 = wx * wx + wz * wz;
        if (d2 < bd) { bd = d2; tk = kk; }
      }
    }
    if (tk < 0) return false;
  } else {
    let best = F.dist[k];
    for (let q = 0; q < 8; q++) {
      const nb = NB[q];
      const ni = ci + nb[0], nj = cj + nb[1];
      if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
      if (nb[2] > 1 && (F.blocked[cj * n + ni] || F.blocked[nj * n + ci])) continue;
      const kk = nj * n + ni;
      if (F.dist[kk] < best) { best = F.dist[kk]; tk = kk; }
    }
    if (tk < 0) return false;
  }
  const tx = F.ox + ((tk % n) + 0.5) * cell;
  const tz = F.oz + (((tk / n) | 0) + 0.5) * cell;
  const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz);
  if (l < 1e-4) return false;
  out.x = dx / l; out.z = dz / l;
  return true;
}

// A module worker, so a rebuild can leave the frame. Blob import needs an
// http(s) URL; file:// and a refused Worker come back null and the caller
// runs buildNavField itself.
export function startNavWorker() {
  try {
    if (typeof Worker === 'undefined' || typeof URL === 'undefined') return null;
    const href = new URL('./nav-field.js', import.meta.url).href;
    if (!/^https?:/i.test(href)) return null;
    const src = `import { makeNavField, buildNavField } from ${JSON.stringify(href)};
self.onmessage = (e) => {
  const m = e.data;
  const F = makeNavField(m.n, m.ox, m.oz);
  F.blocked.set(new Uint8Array(m.blocked));
  F.h.set(new Float32Array(m.h));
  F.cost.set(new Float32Array(m.cost));
  buildNavField(F, m.seedX, m.seedZ, m.seedR);
  self.postMessage({ seq: m.seq, dist: F.dist }, [F.dist.buffer]);
};
`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    return new Worker(url, { type: 'module' });
  } catch (_) {
    return null;
  }
}
