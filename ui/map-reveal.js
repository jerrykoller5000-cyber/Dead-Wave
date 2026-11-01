// CU-198 (CL-287 W1, D-105): the valley map fills in where he has walked.
// Cells are about 8 m. Ground within about 35 m of his path is revealed.
// A place is found the first time he steps into its clearing, about 14 m.

export const REVEAL_CELL = 8;
export const REVEAL_RADIUS = 35;
export const FIND_RADIUS = 14;

const SITE_CARD = {
  'radio-repair': 'mast',
  'medical-convoy': 'convoy',
  'ranger-cache': 'rangers',
  'hikers-cache': 'hikers',
  'trapper-cache': 'trapper',
  'fuel-depot': 'fuel',
  'wreck-salvage': 'clarke',
};

export function cardKeyForLandmark(row) {
  const k = row && row.key;
  if (k === 'map.tower') return 'firetower';
  if (k === 'map.graveyard') return 'graveyard';
  if (k === 'map.mast') return 'mast';
  if (k === 'map.dock') return 'dock';
  if (k === 'map.ranger') return 'rangers';
  if (k === 'map.hikers') return 'hikers';
  if (k === 'map.trapper') return 'trapper';
  if (k === 'map.cabin') return (row.z || 0) >= 0 ? 'northCabin' : 'southwestCabin';
  if (k === 'map.pit' || k === 'map.hq') return null;
  if (k === 'hollow.theme.iron' || k === 'map.marrow') return 'mine';
  return null;
}

export function cardKeyForSite(id) {
  const bare = String(id || '').replace(/^objective:/, '');
  return SITE_CARD[bare] || null;
}

export function createRevealGrid({ cell = REVEAL_CELL, radius = 235, revealR = REVEAL_RADIUS, findR = FIND_RADIUS } = {}) {
  const n = Math.ceil((radius * 2) / cell);
  const origin = -radius;
  let revealed = new Uint8Array(n * n);
  const found = new Set();
  const at = (i, j) => j * n + i;
  const cellOf = (x, z) => {
    const i = Math.floor((x - origin) / cell);
    const j = Math.floor((z - origin) / cell);
    if (i < 0 || j < 0 || i >= n || j >= n) return -1;
    return at(i, j);
  };
  function mark(x, z, r) {
    const i0 = Math.floor((x - r - origin) / cell);
    const i1 = Math.floor((x + r - origin) / cell);
    const j0 = Math.floor((z - r - origin) / cell);
    const j1 = Math.floor((z + r - origin) / cell);
    let added = 0;
    const r2 = r * r;
    for (let j = j0; j <= j1; j++) {
      if (j < 0 || j >= n) continue;
      for (let i = i0; i <= i1; i++) {
        if (i < 0 || i >= n) continue;
        const cx = origin + (i + 0.5) * cell;
        const cz = origin + (j + 0.5) * cell;
        if ((cx - x) * (cx - x) + (cz - z) * (cz - z) > r2) continue;
        const k = at(i, j);
        if (!revealed[k]) { revealed[k] = 1; added++; }
      }
    }
    return added;
  }
  function consider(id, x, z, px, pz, newly) {
    if (id == null || found.has(id)) return;
    if (Math.hypot(x - px, z - pz) > findR) return;
    found.add(id);
    newly.push(id);
  }
  return {
    cell, n, origin, revealR, findR,
    reset() { revealed = new Uint8Array(n * n); found.clear(); },
    revealAround(x, z) { return mark(x, z, revealR); },
    seen(x, z) { const k = cellOf(x, z); return k >= 0 && revealed[k] === 1; },
    count() { let nOn = 0; for (const v of revealed) nOn += v; return nOn; },
    packed() {
      const on = [];
      for (let k = 0; k < revealed.length; k++) if (revealed[k]) on.push(k);
      return on;
    },
    unpack(on) {
      revealed = new Uint8Array(n * n);
      for (const k of on || []) if (k >= 0 && k < revealed.length) revealed[k] = 1;
    },
    found() { return [...found]; },
    restoreFound(ids) { for (const id of ids || []) found.add(id); },
    // Landmarks and objective sites. Returns the card ids found on this step, once each.
    visit(rows, sites, x, z) {
      const newly = [];
      for (const row of rows || []) consider(cardKeyForLandmark(row), row.x, row.z, x, z, newly);
      for (const site of sites || []) {
        const c = site && (site.centre || site);
        if (!c || c.x == null) continue;
        consider(cardKeyForSite(site.id), c.x, c.z, x, z, newly);
      }
      return newly;
    },
  };
}

// Dark unknown over the bake. ctx is already in bake-pixel space.
export function fillUnknown(ctx, grid, worldToBake, bakeScale) {
  const { n, origin, cell } = grid;
  const s = cell * bakeScale;
  ctx.fillStyle = 'rgba(6, 8, 12, 0.94)';
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (grid.seen(origin + (i + 0.5) * cell, origin + (j + 0.5) * cell)) continue;
      // Bake +x is world -x and bake +y is world -z, so the cell's low corner is its high world x and z.
      const p = worldToBake(origin + (i + 1) * cell, origin + (j + 1) * cell);
      ctx.fillRect(p.x, p.y, s + 0.75, s + 0.75);
    }
  }
}
