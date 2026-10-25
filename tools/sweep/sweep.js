// tools/sweep/sweep.js — CL-255 (D-88, docs/world-design.md): the placement and transition sweep's numbers.
// Evaluated in the game page by tools/sweep/run.mjs (real three.js; the page records who added each scene object).
// Lists every placed thing by place, with its footprint, height, the ground under it, and the suspects: floating,
// hanging off a slope, buried, overlapping another thing, standing in water, on a trail, a collider with nothing to
// see, a solid-looking thing with no collider, a prompt or approach crowded or walled in, uneven tree spacing.
// Suspects, not verdicts: every one gets looked at in the shots before anything moves.
(async () => {
  const T = window.TT, THREE = T.THREE, scene = T.scene, P = T.POI;
  scene.updateMatrixWorld(true);
  const H = (x, z) => T.sampleHeight(x, z);
  const r2 = (v) => Math.round(v * 100) / 100;
  const findings = [];
  const note = (kind, sev, msg, o = {}) => findings.push({ kind, sev, msg, ...o });

  // ---- geometry helpers (xz footprints are convex polygons) ---------------------------------------------------
  const hull = (pts) => {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop(); return lo.concat(up);
  };
  const area = (poly) => { let a = 0; for (let i = 0; i < poly.length; i++) { const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length]; a += x1 * z2 - x2 * z1; } return Math.abs(a) / 2; };
  const clip = (subject, clipper) => {   // Sutherland-Hodgman, both convex, counter-clockwise
    let out = subject;
    for (let i = 0; i < clipper.length && out.length; i++) {
      const A = clipper[i], B = clipper[(i + 1) % clipper.length], inp = out; out = [];
      const side = (p) => (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0]);
      for (let j = 0; j < inp.length; j++) {
        const P1 = inp[j], P2 = inp[(j + 1) % inp.length], s1 = side(P1), s2 = side(P2);
        if (s1 >= 0) out.push(P1);
        if ((s1 >= 0) !== (s2 >= 0)) { const t = s1 / (s1 - s2); out.push([P1[0] + (P2[0] - P1[0]) * t, P1[1] + (P2[1] - P1[1]) * t]); }
      }
    }
    return out;
  };
  const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; let t = L ? ((px - ax) * dx + (pz - az) * dz) / L : 0; t = Math.max(0, Math.min(1, t)); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  const inPoly = (x, z, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
  const polyDist = (x, z, poly) => { if (poly.length > 2 && inPoly(x, z, poly)) return 0; let d = Infinity; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length]; d = Math.min(d, segDist(x, z, a[0], a[1], b[0], b[1])); } return d; };
  const circle = (x, z, r, n = 8) => Array.from({ length: n }, (_, i) => [x + Math.cos(i / n * Math.PI * 2) * r, z + Math.sin(i / n * Math.PI * 2) * r]);

  // ---- who built it: the call stack the page recorded when it was added to the scene -------------------------
  const siteOf = (o) => { let q = o; while (q && !(q.userData && q.userData.sweepSite)) q = q.parent; return q ? q.userData.sweepSite : ''; };
  const siteCache = new Map();
  const parseSite = (st) => {
    if (siteCache.has(st)) return siteCache.get(st);
    const out = [];
    for (const raw of st.split('\n').slice(2)) {
      const f = raw.trim(); if (!f.startsWith('at ')) continue;
      const m = f.match(/^at (?:(.*?) \()?(.*?):(\d+):\d+\)?$/); if (!m) continue;
      let file = m[2].replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '');
      if (/^\.sweep-/.test(file)) file = 'index.html';
      if (file.includes('vendor/')) continue;
      out.push(((m[1] || '').replace(/^(Object|Array|Map)\./, '').replace(/^new /, '') || '(top)') + '@' + file + ':' + m[3]);
      if (out.length >= 3) break;
    }
    siteCache.set(st, out); return out;
  };

  // ---- the places ---------------------------------------------------------------------------------------------
  const places = [];
  const place = (id, name, x, z, r = 22) => { if (Number.isFinite(x) && Number.isFinite(z)) places.push({ id, name, x: r2(x), z: r2(z), r }); };
  const v3 = new THREE.Vector3();
  if (T.house && T.house.group) { T.house.group.getWorldPosition(v3); place('hq', 'FOB Threshold (the HQ)', v3.x, v3.z, 34); }
  const campName = { ranger: 'Ranger Camp', hikers: 'Hikers Camp', trapper: 'Trapper Camp' };
  (P.campsites || []).forEach((c, i) => place('camp-' + (c.style || i), campName[c.style] || 'Campsite ' + (i + 1), c.x, c.z));
  (P.cabins || []).forEach((c, i) => place('cabin-' + (i + 1), 'Cabin ' + (i + 1), c.x, c.z, 18));
  if (P.tower) place('tower', 'Watchtower', P.tower.x, P.tower.z, 18);
  if (P.graveyard) place('graveyard', 'Graveyard', P.graveyard.x, P.graveyard.z, 22);
  if (P.dock) place('dock', 'Dock', P.dock.x, P.dock.z, 18);
  (P.bridges || []).forEach((b, i) => place('bridge-' + (i + 1), 'Bridge ' + (i + 1), b.x, b.z, 14));
  (P.sheds || []).forEach((s, i) => place('hut-' + (i + 1), 'Hut ' + (i + 1) + (i === 2 ? ' (fuel depot)' : ''), s.x, s.z, 16));
  (P.wrecks || []).forEach((w, i) => place('wreck-' + (i + 1), i === 0 ? 'Ambulance wreck (medical convoy)' : 'Utility truck wreck', w.x, w.z, 16));
  if (P.mast) place('mast', 'Radio mast', P.mast.x, P.mast.z, 24);
  (P.caves || []).forEach((c, i) => place('cave-' + (i + 1), c.name || 'Cave ' + (i + 1), c.x, c.z, 16));
  // The history props' named pieces that stand away from every place above become places of their own.
  const hp = scene.getObjectByName('history-props');
  if (hp) for (const c of hp.children) {
    if (!c.name) continue; c.getWorldPosition(v3);
    if (!places.some((p) => Math.hypot(p.x - v3.x, p.z - v3.z) < p.r + 6)) place('h-' + c.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase(), c.name, v3.x, v3.z, 14);
  }
  // The ground where the report's cameras stand (tools/sweep/report.mjs: four sides at his eye height, above, night).
  for (const p of places) {
    const r = Math.max(10, Math.min(p.r || 20, 30));
    p.camG = { north: r2(H(p.x, p.z + r)), east: r2(H(p.x + r, p.z)), south: r2(H(p.x, p.z - r)), west: r2(H(p.x - r, p.z)), centre: r2(H(p.x, p.z)), night: r2(H(p.x + r * 0.7, p.z + r * 0.7)) };
  }
  const placeOf = (x, z) => {
    let best = null, bd = Infinity;
    for (const p of places) { const d = Math.hypot(p.x - x, p.z - z); if (d <= p.r && d / p.r < bd) { bd = d / p.r; best = p; } }
    if (best) return best.id;
    return 'wild:' + Math.round(x / 50) * 50 + ',' + Math.round(z / 50) * 50;
  };

  // ---- the placed things ----------------------------------------------------------------------------------------
  const items = [];
  const trees = T.trees || [], rocks = T.rocks || [];
  const treeGroups = new Set(trees.map((t) => t.group).filter(Boolean));
  const rockMeshes = new Set(rocks.map((r) => r.mesh).filter(Boolean));
  const AIR = /bird|flock|cloud|smoke|rain|leaf|leaves|firefl|bug|moth|sky|moon|star|heron|plane|aircraft|lightning|flare|spark|ember|dust|mist|fog|beam|halo|glow|laser|impact|pool|light/i;
  const lb = new THREE.Box3(), gb = new THREE.Box3(), mm = new THREE.Matrix4(), inv = new THREE.Matrix4();
  let hidden = 0, skipped = { surfaces: 0, lights: 0, tiny: 0 };
  const corners = (b) => [[b.min.x, b.min.y, b.min.z], [b.max.x, b.min.y, b.min.z], [b.min.x, b.max.y, b.min.z], [b.max.x, b.max.y, b.min.z], [b.min.x, b.min.y, b.max.z], [b.max.x, b.min.y, b.max.z], [b.min.x, b.max.y, b.max.z], [b.max.x, b.max.y, b.max.z]];
  const addItem = (kind, label, site, poly, y0, y1, extra = {}) => {
    poly = hull(poly);
    if (poly.length < 3) return null;
    let cx = 0, cz = 0; for (const [x, z] of poly) { cx += x; cz += z; } cx /= poly.length; cz /= poly.length;
    const it = { i: items.length, kind, label, site, poly: poly.map(([x, z]) => [r2(x), r2(z)]), cx: r2(cx), cz: r2(cz), y0: r2(y0), y1: r2(y1), h: r2(y1 - y0), area: r2(area(poly)), place: placeOf(cx, cz), ...extra };
    // The ground under it: the footprint's corners, its edges' midpoints and its centre.
    const samples = [[cx, cz]];
    for (let k = 0; k < poly.length; k++) { const a = poly[k], b = poly[(k + 1) % poly.length]; samples.push(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); }
    let gMin = Infinity, gMax = -Infinity; for (const [x, z] of samples) { const g = H(x, z); gMin = Math.min(gMin, g); gMax = Math.max(gMax, g); }
    it.gMin = r2(gMin); it.gMax = r2(gMax); it.gC = r2(H(cx, cz));
    const deck = T.platformHeightAt ? T.platformHeightAt(cx, cz, y1 + 0.5) : null;
    if (deck != null) it.deck = r2(deck);
    const wd = T.waterDepthAt ? T.waterDepthAt(cx, cz) : 0; if (wd > 0.05) it.water = r2(wd);
    items.push(it); return it;
  };
  // What isn't placed scenery: wildlife and effects that move or are parked in pools, the batches the trees and the
  // ground cover are drawn from (the trees come from their records), the grass.
  const NOT_SCENERY = /makeOutlineBox|makeGrenadeArc|buildCellMark|^mark@|ensureRabbitMound@index.html:1010[0-9]|spawnOne|spawnSchool|spawnBugs|spawnWildlife|acquireEffectMesh|acquireMoteMesh|warmEffectPools|spawnChunks|spawnGib|spawnFlame|spawnMote|bakeFoliageChunks|buildTreeBatches|scatterWaterLife/;
  // A placed thing is split into the objects it is made of: its meshes' pieces (vertices welded by position, then
  // connected), clustered by touch. A campsite baked into one mesh comes out as its tents, its logs and its fire ring;
  // a cabin, whose walls, roof and door all touch, stays one object.
  const WELD = 600;   // 1/600 m
  const piecesOf = (c, toWorld, out) => {
    const g = c.geometry, pos = g.attributes.position, n = pos.count;
    if (n > 250000) { if (!g.boundingBox) g.computeBoundingBox(); out.push(boxPiece(g.boundingBox, toWorld)); return; }
    const parent = new Int32Array(n); for (let k = 0; k < n; k++) parent[k] = k;
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    const join = (a, b) => { a = find(a); b = find(b); if (a !== b) parent[a] = b; };
    const weld = new Map();
    for (let k = 0; k < n; k++) { const kk = Math.round(pos.getX(k) * WELD) + ',' + Math.round(pos.getY(k) * WELD) + ',' + Math.round(pos.getZ(k) * WELD); const w = weld.get(kk); if (w === undefined) weld.set(kk, k); else join(k, w); }
    const idx = g.index;
    if (idx) for (let t = 0; t + 2 < idx.count; t += 3) { join(idx.getX(t), idx.getX(t + 1)); join(idx.getX(t), idx.getX(t + 2)); }
    else for (let t = 0; t + 2 < n; t += 3) { join(t, t + 1); join(t, t + 2); }
    const boxes = new Map();
    for (let k = 0; k < n; k++) { const r = find(k); let b = boxes.get(r); if (!b) { b = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]; boxes.set(r, b); } const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k); if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (z < b[2]) b[2] = z; if (x > b[3]) b[3] = x; if (y > b[4]) b[4] = y; if (z > b[5]) b[5] = z; }
    for (const b of boxes.values()) out.push(boxPiece(new THREE.Box3(new THREE.Vector3(b[0], b[1], b[2]), new THREE.Vector3(b[3], b[4], b[5])), toWorld));
  };
  const boxPiece = (b, toWorld) => {
    const pts = corners(b).map((c) => v3.set(c[0], c[1], c[2]).applyMatrix4(toWorld).toArray());
    let x0 = Infinity, y0 = Infinity, z0 = Infinity, x1 = -Infinity, y1 = -Infinity, z1 = -Infinity;
    for (const [x, y, z] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); z0 = Math.min(z0, z); x1 = Math.max(x1, x); y1 = Math.max(y1, y); z1 = Math.max(z1, z); }
    return { pts: pts.map((p) => [p[0], p[2]]), y0, y1, aabb: [x0, y0, z0, x1, y1, z1] };
  };
  const clusters = (pieces) => {
    const n = pieces.length, par = Array.from({ length: n }, (_, k) => k);
    const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const E = 0.04;
    // A floor, a deck or a foundation slab doesn't join what stands on it: the HQ's yard comes apart into its things.
    const slab = (q) => q.aabb[4] - q.aabb[1] < 0.35 && (q.aabb[3] - q.aabb[0]) * (q.aabb[5] - q.aabb[2]) > 3;
    const order = pieces.map((p, k) => k).sort((a, b) => pieces[a].aabb[0] - pieces[b].aabb[0]);
    for (let ii = 0; ii < n; ii++) {
      const a = pieces[order[ii]].aabb;
      for (let jj = ii + 1; jj < n; jj++) {
        const b = pieces[order[jj]].aabb; if (b[0] > a[3] + E) break;
        if (slab(pieces[order[ii]]) || slab(pieces[order[jj]])) continue;
        if (b[1] <= a[4] + E && b[4] >= a[1] - E && b[2] <= a[5] + E && b[5] >= a[2] - E) { const ra = f(order[ii]), rb = f(order[jj]); if (ra !== rb) par[ra] = rb; }
      }
    }
    const groups = new Map(); for (let k = 0; k < n; k++) { const r = f(k); if (!groups.has(r)) groups.set(r, []); groups.get(r).push(pieces[k]); }
    return [...groups.values()];
  };
  let parts = 0;
  const itemize = (o, depth) => {
    if (!o.visible) { hidden++; return; }
    if (o.isLight || o.isCamera) { skipped.lights++; return; }
    if (o.isPoints || o.isLine || o.isSprite) return;
    if (treeGroups.has(o) || rockMeshes.has(o) || o.name === 'rock-batch' || o.name === 'ground-sectors') return;
    const site = parseSite(siteOf(o));
    const overlayOnly = (() => { let any = false, solid = false; o.traverseVisible((c) => { if (!c.isMesh) return; any = true; for (const m of [].concat(c.material || [])) if (!(m.transparent && (m.depthWrite === false || m.opacity < 0.05))) solid = true; }); return any && !solid; })();
    if (overlayOnly) { skipped.overlay = (skipped.overlay || 0) + 1; return; }
    if (o === T.player || o.name === 'zombie-skin' || o.name === 'killer-rabbit' || (o.userData && (o.userData.zombie || o.userData.isZombie))) { skipped.actors = (skipped.actors || 0) + 1; return; }
    if (NOT_SCENERY.test(site.join(' '))) { skipped.notScenery = (skipped.notScenery || 0) + 1; return; }
    o.updateMatrixWorld(true);
    if (o.isInstancedMesh) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const n = Math.min(o.count, 3000);
      for (let k = 0; k < n; k++) {
        o.getMatrixAt(k, mm); mm.premultiply(o.matrixWorld);
        const pc = boxPiece(o.geometry.boundingBox, mm);
        if (pc.y1 - pc.y0 > 400) { skipped.surfaces++; continue; }
        if (area(hull(pc.pts)) < 0.002 && pc.y1 - pc.y0 < 0.01) { skipped.tiny++; continue; }
        addItem('instance', (o.name || 'instanced') + '#' + k, site, pc.pts, pc.y0, pc.y1, { inst: true });
      }
      return;
    }
    // A big unnamed container is not a thing: its children are.
    inv.copy(o.matrixWorld).invert(); lb.makeEmpty();
    o.traverseVisible((c) => { if (!c.isMesh || !c.geometry || !c.geometry.attributes || !c.geometry.attributes.position) return; if (!c.geometry.boundingBox) c.geometry.computeBoundingBox(); gb.copy(c.isInstancedMesh ? (c.computeBoundingBox(), c.boundingBox) : c.geometry.boundingBox); if (gb.isEmpty()) return; mm.multiplyMatrices(inv, c.matrixWorld); gb.applyMatrix4(mm); lb.union(gb); });
    if (lb.isEmpty()) return;
    const whole = boxPiece(lb, o.matrixWorld), span = Math.max(whole.aabb[3] - whole.aabb[0], whole.aabb[5] - whole.aabb[2]);
    const kids = o.children.filter((c) => c.visible);
    if (span > 45 && kids.length > 1 && depth < 4 && !o.isMesh) { for (const c of kids) itemize(c, depth + 1); return; }
    if (span > 300) { skipped.surfaces++; return; }
    const label0 = (o.name || (o.isMesh ? 'mesh' : 'group')) + (depth ? ' in ' + (o.parent.name || 'group') : '');
    const pieces = [];
    o.traverseVisible((c) => { if (c.isMesh && !c.isInstancedMesh && c.geometry && c.geometry.attributes && c.geometry.attributes.position) piecesOf(c, c.matrixWorld, pieces); });
    parts += pieces.length;
    const groups = span > 4 && pieces.length > 1 ? clusters(pieces) : [pieces];
    const itemId = items.length;
    const subs = []; const sb = new THREE.Box3();
    o.traverse((c) => { if (c === o || !c.name || subs.length >= 60 || !c.visible) return; sb.setFromObject(c); if (sb.isEmpty()) return; const cc = sb.getCenter(new THREE.Vector3()), sz = sb.getSize(new THREE.Vector3()); subs.push({ name: c.name, c: [r2(cc.x), r2(cc.y), r2(cc.z)], size: [r2(sz.x), r2(sz.y), r2(sz.z)] }); });
    groups.forEach((gp, gi) => {
      const pts = [].concat(...gp.map((p) => p.pts));
      const y0 = Math.min(...gp.map((p) => p.y0)), y1 = Math.max(...gp.map((p) => p.y1));
      addItem(o.isMesh ? 'mesh' : 'group', label0 + (groups.length > 1 ? ' · part ' + (gi + 1) + '/' + groups.length : ''), site, pts, y0, y1, { thing: itemId, pieces: gp.length, ...(gi === 0 && subs.length ? { subs } : {}) });
    });
  };
  for (const o of scene.children) itemize(o, 0);
  for (const t of trees) {   // the records' sizes are already scaled
    if (!t.alive) continue;
    const g = t.group, y = g ? g.position.y : H(t.x, t.z);
    addItem('tree', 'tree:' + t.kind, ['tree records'], circle(t.x, t.z, Math.max(0.12, t.trunkRadius || 0.3)), y, y + (t.canopyTop || 4), { tree: true });
    if (t.canopyRadius) addItem('canopy', 'canopy:' + t.kind, ['tree records'], circle(t.x, t.z, t.canopyRadius, 10), y + (t.canopyBottom || 2), y + (t.canopyTop || 4), { canopy: true });
  }
  for (const r of rocks) {
    if (!r.alive) continue;
    const y = r.mesh ? r.mesh.position.y : H(r.x, r.z);
    addItem('rock', 'rock:' + (r.kind || ''), ['rock records'], circle(r.x, r.z, r.radius / 0.88, 8), y, y + r.height, { rock: true });
  }

  // ---- spatial index ----------------------------------------------------------------------------------------------
  const CELL = 8, grid = new Map();
  const key = (i, j) => i + ',' + j;
  for (const it of items) {
    const xs = it.poly.map((p) => p[0]), zs = it.poly.map((p) => p[1]);
    it.bb = [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
    for (let i = Math.floor(it.bb[0] / CELL); i <= Math.floor(it.bb[2] / CELL); i++) for (let j = Math.floor(it.bb[1] / CELL); j <= Math.floor(it.bb[3] / CELL); j++) {
      const k = key(i, j); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(it);
    }
  }
  const near = (x0, z0, x1, z1) => { const s = new Set(); for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++) for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) for (const it of grid.get(key(i, j)) || []) s.add(it); return s; };
  const ccw = (poly) => { let a = 0; for (let i = 0; i < poly.length; i++) { const [x1, z1] = poly[i], [x2, z2] = poly[(i + 1) % poly.length]; a += x1 * z2 - x2 * z1; } return a > 0 ? poly : poly.slice().reverse(); };
  for (const it of items) it.pc = ccw(it.poly);
  const at = (it) => [it.cx, r2(it.y0), it.cz];
  const airborne = (it) => AIR.test(it.label) || it.y0 - it.gMax > 6;

  // ---- 1. floating, hanging, buried ------------------------------------------------------------------------------
  for (const it of items) {
    if (it.canopy || airborne(it)) continue;
    const float = it.y0 - it.gMax, hang = it.y0 - it.gMin, buried = it.gMin - it.y0;
    const onDeck = it.deck != null && Math.abs(it.deck - it.y0) < 0.3;
    // What it stands on, if anything: something under its underside with at least minA of shared footprint.
    const supportOf = (minA) => {
      for (const o of near(it.bb[0], it.bb[1], it.bb[2], it.bb[3])) {
        if (o === it || o.canopy) continue;
        if (o.y1 < it.y0 - 0.3 || o.y0 > it.y0 + 0.05) continue;
        if (o.y1 > it.y0 + 0.15 && o.y0 > it.y0 - 0.05) continue;
        const a = area(clip(it.pc, o.pc)); if (a > minA) return o;
      }
      return null;
    };
    if (float > 0.12 && !onDeck) {
      const support = supportOf(0.02);
      let attached = null;
      if (!support) for (const o of near(it.bb[0] - 0.2, it.bb[1] - 0.2, it.bb[2] + 0.2, it.bb[3] + 0.2)) {
        if (o === it || o.canopy) continue;
        const gx = Math.max(0, o.bb[0] - it.bb[2], it.bb[0] - o.bb[2]), gz = Math.max(0, o.bb[1] - it.bb[3], it.bb[1] - o.bb[3]), gy = Math.max(0, o.y0 - it.y1, it.y0 - o.y1);
        if (Math.max(gx, gz, gy) <= 0.12 && o.y0 < it.y0 + 0.01) { attached = o; break; }
      }
      if (support) it.restsOn = support.i;
      else if (attached) it.attachedTo = attached.i;
      else note('floating', float > 0.5 ? 2 : 1, `${it.label} floats ${r2(float)} m above the ground (its whole footprint)`, { a: it.i, place: it.place, at: at(it) });
    } else if (hang > 0.25 && !onDeck && it.h < 8 && !it.tree && !it.rock) {
      // CL-256: a plank on its joist, a joist on its posts (a post's footprint is small): built up off the slope, not
      // hanging.
      const support = supportOf(0.005);
      if (support) it.restsOn = support.i;
      else note('hangs', hang > 0.6 ? 2 : 1, `${it.label}: one side ${r2(hang)} m off the ground on a slope (ground ${it.gMin} to ${it.gMax} under it)`, { a: it.i, place: it.place, at: at(it) });
    }
    if (buried > 0.6 && it.h < 2.5 && !it.rock && !it.tree && it.water == null) note('buried', 1, `${it.label} sits ${r2(buried)} m below the ground's lowest point under it (${r2(it.h)} m tall)`, { a: it.i, place: it.place, at: at(it) });
    if (it.water != null && it.water > 0.2 && !/dock|bridge|boat|lily|fish|pier|reed|post|pile|buoy|water|lake|river|stream|grate/i.test(it.label + ' ' + it.site.join(' '))) note('water', 1, `${it.label} stands in ${it.water} m of water`, { a: it.i, place: it.place, at: at(it) });
  }

  // ---- 2. overlapping things -------------------------------------------------------------------------------------
  const seen = new Set();
  for (const a of items) {
    if (a.h < 0.08 || airborne(a) || a.area > 150) continue;   // a hill-sized shape's hull isn't its shape: by eye
    for (const b of near(a.bb[0], a.bb[1], a.bb[2], a.bb[3])) {
      if (b.i <= a.i || b.h < 0.08 || airborne(b) || b.area > 150) continue;
      if (a.canopy && b.canopy) continue;
      if ((a.canopy && b.tree) || (b.canopy && a.tree)) continue;
      if (a.restsOn === b.i || b.restsOn === a.i) continue;
      if (a.thing != null && a.thing === b.thing) continue;
      const yo = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); if (yo < 0.15) continue;
      const k = a.i + ':' + b.i; if (seen.has(k)) continue; seen.add(k);
      const ov = area(clip(a.pc, b.pc)); if (ov < 0.03) continue;
      const share = ov / Math.max(1e-6, Math.min(a.area, b.area));
      if (share < 0.25) continue;
      const canopyHit = a.canopy || b.canopy;
      const other = a.canopy ? b : a, can = a.canopy ? a : b;
      if (canopyHit && other.h < 2.2) continue;   // a canopy over something low is shade, not a clip
      const sev = share > 0.6 && yo > 0.5 ? 2 : 1;
      const msg = canopyHit ? `${can.label}'s branches through ${other.label} (${r2(share * 100)} % of the smaller footprint, ${r2(yo)} m of height)`
        : `${a.label} and ${b.label} overlap: ${r2(share * 100)} % of the smaller footprint, ${r2(yo)} m of height`;
      note(canopyHit ? 'branches' : 'overlap', sev, msg, { a: a.i, b: b.i, place: a.place, at: [r2((a.cx + b.cx) / 2), r2(Math.max(a.y0, b.y0)), r2((a.cz + b.cz) / 2)] });
    }
  }

  // ---- 3. colliders and what you see ------------------------------------------------------------------------------
  const solids = T.worldSolids || [];
  // CL-256 batch 2: the ring of solids round a cave hill's foot ("the hill is not for climbing") is named for what it is.
  const hillRing = new Set(); for (const c of P.caves || []) for (const s of c.hillSolids || []) hillRing.add(s);
  for (const s of solids) {
    if (!(s.radius > 0)) continue;
    let seenIt = false;
    for (const it of near(s.x - s.radius, s.z - s.radius, s.x + s.radius, s.z + s.radius)) {
      if (it.canopy) continue;
      if (it.y1 < s.y0 - 0.2 || it.y0 > s.y1 + 0.2) continue;
      if (polyDist(s.x, s.z, it.poly) <= s.radius + 0.05) { seenIt = true; break; }
    }
    // A collider at the foot of a rise is the hill or the cliff itself: the ground is what you see there.
    if (!seenIt) { const g0 = H(s.x, s.z); let rise = 0; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, r = s.radius + 1.5; rise = Math.max(rise, H(s.x + Math.cos(a) * r, s.z + Math.sin(a) * r) - g0); } if (rise > 1.2 || g0 >= s.y1 - 0.2) seenIt = true; }
    if (!seenIt && hillRing.has(s)) { note('hill-ring', 1, `a solid of the cave hill's foot ring where the slope is gentle: he stops on a visible slope`, { place: placeOf(s.x, s.z), at: [r2(s.x), r2(s.y0), r2(s.z)] }); continue; }
    if (!seenIt) note('invisible-wall', s.y1 - s.y0 > 0.8 ? 2 : 1, `a collider (r ${r2(s.radius)} m, ${r2(s.y0)} to ${r2(s.y1)} m) with nothing visible there`, { place: placeOf(s.x, s.z), at: [r2(s.x), r2(s.y0), r2(s.z)] });
  }
  const sgrid = new Map();
  for (const s of solids) { const k = key(Math.floor(s.x / CELL), Math.floor(s.z / CELL)); if (!sgrid.has(k)) sgrid.set(k, []); sgrid.get(k).push(s); }
  const solidsNear = (x, z, r) => { const out = []; for (let i = Math.floor((x - r - 3) / CELL); i <= Math.floor((x + r + 3) / CELL); i++) for (let j = Math.floor((z - r - 3) / CELL); j <= Math.floor((z + r + 3) / CELL); j++) for (const s of sgrid.get(key(i, j)) || []) out.push(s); return out; };
  for (const it of items) {
    if (it.canopy || it.tree || it.rock || it.inst || airborne(it) || it.h < 1.2 || it.area < 0.5 || it.deck != null) continue;
    const hit = solidsNear(it.cx, it.cz, 3).some((s) => s.y1 > it.y0 && s.y0 < it.y1 && polyDist(s.x, s.z, it.poly) <= s.radius);
    if (!hit && it.place !== 'hq') note('no-collider', 1, `${it.label} (${r2(it.h)} m tall, ${it.area} m²) has no collider: he walks through it`, { a: it.i, place: it.place, at: at(it) });
  }

  // ---- 4. on the trails --------------------------------------------------------------------------------------------
  const paths = T.PATHS || [];
  for (const it of items) {
    if (it.canopy || airborne(it) || it.h < 0.4 || it.inst) continue;
    let d = Infinity;
    // A trail ends at the place it leads to: its last few metres at either end don't count.
    for (const pl of paths) for (let k = 0; k + 1 < pl.length; k++) {
      const a = pl[k], b = pl[k + 1];
      const end = (q) => Math.min(Math.hypot(q.x - pl[0].x, q.z - pl[0].z), Math.hypot(q.x - pl[pl.length - 1].x, q.z - pl[pl.length - 1].z));
      if (end(a) < 6 && end(b) < 6) continue;
      if (Math.max(a.x, b.x) < it.bb[0] - 2 || Math.min(a.x, b.x) > it.bb[2] + 2 || Math.max(a.z, b.z) < it.bb[1] - 2 || Math.min(a.z, b.z) > it.bb[3] + 2) continue;
      for (const [x, z] of it.poly.concat([[it.cx, it.cz]])) d = Math.min(d, segDist(x, z, a.x, a.z, b.x, b.z));
      if (inPoly(a.x, a.z, it.poly) || inPoly(b.x, b.z, it.poly)) d = 0;
    }
    if (d < 0.6) note('on-trail', it.h > 1 ? 2 : 1, `${it.label} stands on a trail (${r2(d)} m from its line)`, { a: it.i, place: it.place, at: at(it) });
  }

  // ---- 5. the things he uses: room to stand and reach --------------------------------------------------------------
  const uses = [];
  if (window.objectiveSitesFrom) for (const s of window.objectiveSitesFrom(P, H)) uses.push({ name: s.id, x: s.x, z: s.z, ax: s.ax, az: s.az });
  for (const k of ['HQ_ARMORY_FRONT', 'HQ_CIF_FRONT', 'HQ_PANEL_FRONT', 'HQ_WINDOW_FRONT']) { const v = T[k]; if (v && Number.isFinite(v.x)) uses.push({ name: k, x: v.x, z: v.z, ax: v.x, az: v.z }); }
  { const L = T.relayDbg && T.relayDbg.vault && T.relayDbg.vault(); if (L && L.keypadAt) uses.push({ name: 'relay-vault keypad', x: L.keypadAt.x, z: L.keypadAt.z }); }
  for (const n of ['sato-note', 'bolt-cutters', 'ranger-search-log', 'ranger-keypad', 'ranger-radio', 'trapper-path', 'insulated-boots', 'holy-reliquary', 'rabbit-mound', 'trailhead-board']) {
    const o = scene.getObjectByName(n); if (!o) continue; o.getWorldPosition(v3); uses.push({ name: n, x: v3.x, z: v3.z });
  }
  const useRows = [];
  for (const u of uses) {
    const blocked = (x, z) => solidsNear(x, z, 0.5).some((s) => Math.hypot(s.x - x, s.z - z) < s.radius + 0.42);
    let open = 0; const dirs = 12;
    for (let k = 0; k < dirs; k++) { const a = k / dirs * Math.PI * 2; if (!blocked(u.x + Math.cos(a) * 0.95, u.z + Math.sin(a) * 0.95)) open++; }
    const stand = u.ax != null ? !blocked(u.ax, u.az) : null;
    const crowd = [...near(u.x - 1.2, u.z - 1.2, u.x + 1.2, u.z + 1.2)].filter((it) => !it.canopy && it.h > 0.5 && polyDist(u.x, u.z, it.poly) < 1.0).map((it) => it.label);
    const row = { name: u.name, place: placeOf(u.x, u.z), x: r2(u.x), z: r2(u.z), openOf12: open, standClear: stand, crowd: crowd.slice(0, 8) };
    useRows.push(row);
    if (open <= 3 || stand === false) note('reach', open <= 1 || stand === false ? 2 : 1, `${u.name}: ${open} of 12 ways in are open at 0.95 m${stand === false ? '; the spot he stands on is inside a collider' : ''}`, { place: row.place, at: [row.x, r2(H(u.x, u.z)), row.z] });
  }

  // ---- 6. spacing: the trees (Clark-Evans: about 1 random, under 1 clustered, well over 1 evenly spaced) ---------
  const spacing = [];
  {
    const pts = trees.filter((t) => t.alive).map((t) => [t.x, t.z]);
    const cells = new Map();
    for (const p of pts) { const k = Math.round(p[0] / 80) + ',' + Math.round(p[1] / 80); if (!cells.has(k)) cells.set(k, []); cells.get(k).push(p); }
    for (const [k, list] of cells) {
      if (list.length < 8) continue;
      let sum = 0; for (const p of list) { let d = Infinity; for (const q of list) if (q !== p) d = Math.min(d, Math.hypot(p[0] - q[0], p[1] - q[1])); sum += d; }
      const xs = list.map((p) => p[0]), zs = list.map((p) => p[1]);
      const A = Math.max(1, (Math.max(...xs) - Math.min(...xs)) * (Math.max(...zs) - Math.min(...zs)));
      const R = (sum / list.length) / (0.5 / Math.sqrt(list.length / A));
      spacing.push({ cell: k, n: list.length, R: r2(R) });
      if (R > 1.45) note('even-spacing', 1, `the trees round ${k} (×80 m) are evenly spaced (Clark-Evans R ${r2(R)}, ${list.length} trees): rule 3, clusters not grids`, { place: placeOf(k.split(',')[0] * 80, k.split(',')[1] * 80), at: [Math.round(k.split(',')[0] * 80), 0, Math.round(k.split(',')[1] * 80)] });
    }
  }

  // ---- 7. the places to each other -----------------------------------------------------------------------------
  const gaps = places.map((p) => { let best = null, bd = Infinity; for (const q of places) { if (q === p) continue; const d = Math.hypot(p.x - q.x, p.z - q.z); if (d < bd) { bd = d; best = q; } } return { place: p.id, nearest: best && best.id, d: r2(bd) }; });

  const byPlace = {};
  for (const it of items) (byPlace[it.place] = byPlace[it.place] || []).push(it.i);
  for (const it of items) { delete it.pc; delete it.bb; }
  return JSON.stringify({ when: new Date().toISOString(), places, gaps, items, findings, uses: useRows, spacing, byPlace, stats: { items: items.length, parts, hidden, skipped, solids: solids.length, trees: trees.length, rocks: rocks.length, paths: paths.length } });
})()
