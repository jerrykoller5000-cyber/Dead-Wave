// game/story-gates.js - CL-296 (D-111 order 3; docs/specs/story-gates.md). Jerry, 1.2: "we are going to have to work on
// gating certain locations and making the player do something before accessing them. If you run around sprinting right
// off the bat you discover every location very quickly."
//
// Under ?gates=1 each story place whose woods leave a way round its chain gate gets a ring of the bands' stone wall at
// its clearing's edge, with a gate where each of its own trails comes in. The ring gate is the chain gate
// (game/chain-gates.js): it opens with that gate's key, and once open stays open for the run.
//
// Pure: no DOM, no three. The page builds the band (game/wall-bands.js makeWallBand), the gate's look and its solids.
// Layout is rule 10 (Claude): a ring is computed, not hand-placed, and a place with no ring that fits gets none.

const TAU = Math.PI * 2;

// place: the name in the logs; gate: the chain gate it opens with; poi: its centre; site: its objective site's id.
// Clarke's truck (the padlock is on the toolbox itself) and the trapper's camp (already a fenced yard) get none.
export const STORY_RINGS = Object.freeze([
  { place: 'depot', gate: 'depot-shed', lead: 'generator', poi: (P) => P.sheds && P.sheds[2], site: 'objective:fuel-depot' },
  { place: 'mast', gate: 'mast-yard', lead: 'relay', poi: (P) => P.mast, site: 'objective:radio-repair' },
  { place: 'convoy', gate: 'road-barrier', lead: 'medical', poi: (P) => P.wrecks && P.wrecks[0], site: 'objective:medical-convoy' },
  { place: 'hikers', gate: 'trail-chain', lead: 'missing', poi: (P) => P.campsites && P.campsites[1], site: 'objective:hikers-cache' },
  { place: 'rangers', gate: 'ranger-gate', lead: 'search', poi: (P) => P.campsites && P.campsites[0], site: 'objective:ranger-cache' },
].map((r) => Object.freeze(r)));

export const RING = Object.freeze({
  rMax: 18, rMin: 11, rStep: 0.5,   // the clearing is ~14 m (the scatter's nearPOI); a ring at clearing + 4 when it fits
  width: 1.8,                        // collision: the stone is 1.28 m at the base
  step: 0.8,                         // the ring's points
  bandClear: 3,                      // off every other band's face
  fencePad: 1.2,                     // a broken fence run stops this short of the wall (clipFenceToRing)
  poiClear: 6,                       // off every other place
  pathClear: 3,                      // off every trail that isn't the place's own
  siteMargin: 4,                     // the site and its approach this far inside
  ownEnd: 4,                         // a trail is the place's own when one of its ends is this close to the centre or site
  gateBodyR: 0.45, gateSpacing: 0.5, // the gate's solids across the gap
});

function distToPolySq(x, z, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], dx = b.x - a.x, dz = b.z - a.z, q = dx * dx + dz * dz;
    const t = q > 0 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / q)) : 0;
    const px = a.x + t * dx - x, pz = a.z + t * dz - z;
    best = Math.min(best, px * px + pz * pz);
  }
  return best;
}

export function ringPoints(cx, cz, r, step = RING.step) {
  const n = Math.max(12, Math.ceil(TAU * r / step));
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = TAU * (i % n) / n; pts.push({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r }); }
  return pts;
}

// Where a trail crosses the circle (cx, cz, r): the first crossing walking from the place outwards.
export function trailCrossing(path, cx, cz, r) {
  const d = (q) => Math.hypot(q.x - cx, q.z - cz);
  const fromEnd = d(path[path.length - 1]) < d(path[0]);
  const pts = fromEnd ? path.slice().reverse() : path;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], da = d(a), db = d(b);
    if ((da - r) * (db - r) > 0) continue;
    // Solve |a + t(b - a) - c| = r for t in [0, 1].
    const fx = a.x - cx, fz = a.z - cz, ex = b.x - a.x, ez = b.z - a.z;
    const A = ex * ex + ez * ez, B = 2 * (fx * ex + fz * ez), C = fx * fx + fz * fz - r * r;
    const disc = Math.max(0, B * B - 4 * A * C), s = Math.sqrt(disc);
    let t = A > 0 ? (-B + s) / (2 * A) : 0;
    if (t < 0 || t > 1) t = A > 0 ? (-B - s) / (2 * A) : 0;
    t = Math.max(0, Math.min(1, t));
    const x = a.x + ex * t, z = a.z + ez * t, len = Math.sqrt(A) || 1;
    return { x, z, tx: ex / len, tz: ez / len };
  }
  return null;
}

// The rings that fit. `bands` are the bands already built ({ kind, width, pts }), `pois` every place as {kind, x, z},
// `sites` the objective sites ({ id, x, z, ax, az }), `isWater(x, z)` wet ground.
// `solids` are what already stands ({ x, z, radius }: a camp's props, rocks); the trees come later and keep off the ring
// by its `near`.
export function planStoryRings({ POI, PATHS, sites = [], bands = [], solids = [], isWater = () => false, places = STORY_RINGS, opts = {} }) {
  const o = { ...RING, ...opts };
  const rings = [], skipped = [];
  const pois = [];
  for (const [kind, v] of Object.entries(POI || {})) {
    if (kind === 'signs' || kind === 'fences' || kind === 'sandbags') continue;   // props, not places
    for (const p of (Array.isArray(v) ? v : [v])) if (p && Number.isFinite(p.x) && Number.isFinite(p.z)) pois.push({ kind, x: p.x, z: p.z });
  }
  const bandLines = bands.filter((b) => b && b.pts && b.pts.length > 1);

  for (const spec of places) {
    const c = spec.poi(POI || {});
    if (!c) { skipped.push({ place: spec.place, why: 'no place' }); continue; }
    const site = sites.find((s) => s.id === spec.site) || null;
    const inside = [{ x: c.x, z: c.z }];
    if (site) { inside.push({ x: site.x, z: site.z }); if (Number.isFinite(site.ax)) inside.push({ x: site.ax, z: site.az }); }
    const own = [], other = [];
    for (const path of PATHS || []) {
      if (!path || path.length < 2 || path.deck) continue;
      const ends = [path[0], path[path.length - 1]];
      const near = ends.some((e) => inside.some((q) => Math.hypot(e.x - q.x, e.z - q.z) < o.ownEnd));
      (near ? own : other).push(path);
    }
    if (!own.length) { skipped.push({ place: spec.place, why: 'no trail of its own' }); continue; }
    const centres = [{ x: c.x, z: c.z }];
    if (site) centres.push({ x: (c.x + site.x) / 2, z: (c.z + site.z) / 2 }, { x: site.x, z: site.z });
    let best = null;
    const tried = {};
    for (let r = o.rMax; r >= o.rMin - 1e-6 && !best; r -= o.rStep) {
      for (const cc of centres) {
        const w = fits(cc, r);
        if (w === true) { best = { cx: cc.x, cz: cc.z, r }; break; }
        tried[w] = (tried[w] || 0) + 1;
      }
    }
    if (!best) { skipped.push({ place: spec.place, why: Object.entries(tried).sort((a, b) => b[1] - a[1]).map(([k, n]) => k + ' x' + n).join(', ') }); continue; }
    rings.push(build(spec, best, own));

    function fits(cc, r) {
      for (const q of inside) if (Math.hypot(q.x - cc.x, q.z - cc.z) > r - o.siteMargin) return 'site outside';
      for (const p of pois) {
        if (Math.hypot(p.x - c.x, p.z - c.z) < 0.5) continue;   // the place itself
        if (Math.hypot(p.x - cc.x, p.z - cc.z) < r + o.poiClear) return 'place ' + p.kind;
      }
      for (const path of other) {
        const hw = path.hw ?? 0.85, lim = r + o.width * 0.5 + hw + o.pathClear;
        if (distToPolySq(cc.x, cc.z, path) < lim * lim) return 'trail';
      }
      for (const sd of solids) {
        if (sd.wallBand) continue;
        const d = Math.abs(Math.hypot(sd.x - cc.x, sd.z - cc.z) - r);
        if (d < o.width * 0.5 + (sd.radius || 0) + 0.4) return 'a solid on the line';
      }
      const pts = ringPoints(cc.x, cc.z, r, 1);
      for (const q of pts) {
        if (isWater(q.x, q.z)) return 'water';
        for (const b of bandLines) {
          const lim = o.width * 0.5 + (b.width || 2) * 0.5 + o.bandClear;
          if (distToPolySq(q.x, q.z, b.pts) < lim * lim) return 'band ' + (b.kind || '');
        }
        // a trail of its own may cross the ring only once (the gate), never run along it
      }
      for (const path of own) {
        let n = 0;
        for (let i = 1; i < path.length; i++) {
          const da = Math.hypot(path[i - 1].x - cc.x, path[i - 1].z - cc.z), db = Math.hypot(path[i].x - cc.x, path[i].z - cc.z);
          if ((da - r) * (db - r) <= 0) n++;
        }
        if (n !== 1) return 'own trail crosses ' + n + 'x';
      }
      return true;
    }
  }
  return { rings, skipped };

  function build(spec, at, own) {
    const { cx, cz, r } = at;
    const pts = ringPoints(cx, cz, r, o.step);
    const gaps = [], gates = [];
    own.forEach((path, i) => {
      const halfWidth = (path.hw ?? 0.85) + 1;
      gaps.push({ id: spec.place + '-gate-' + i, kind: 'trail', pts: path, halfWidth });
      const x = trailCrossing(path, cx, cz, r);
      if (!x) return;
      // The gate stands along the ring at the crossing: across the trail, its span the band's cut either side.
      const ax = -(x.z - cz) / r, az = (x.x - cx) / r;     // the ring's tangent there
      const half = halfWidth + o.width * 0.5 + 0.35;      // makeWallBand drops solids this close to the trail
      const solids = [];
      const n = Math.max(2, Math.ceil(2 * half / o.gateSpacing));
      for (let k = 0; k <= n; k++) {
        const s = -half + 2 * half * k / n;
        solids.push({ x: x.x + ax * s, z: x.z + az * s, r: o.gateBodyR });
      }
      gates.push({ x: x.x, z: x.z, ax, az, yaw: Math.atan2(ax, az), half: halfWidth, span: half, solids });
    });
    const near = (x, z, pad = 0) => Math.abs(Math.hypot(x - cx, z - cz) - r) < o.width * 0.5 + pad;
    const contains = (x, z) => Math.hypot(x - cx, z - cz) < r;
    return { place: spec.place, gate: spec.gate, lead: spec.lead, cx, cz, r, width: o.width, pts, gaps, gates, near, contains };
  }
}

// The ring a point stands in, or null.
export function storyRingAt(rings, x, z) {
  for (const ring of rings || []) if (ring.contains(x, z)) return ring;
  return null;
}

// The camps' broken fence runs (POI.fences, built after the bands) are planned before the rings; one that would run
// through a ring's wall keeps its part on the camp's side and stops `pad` short of it. Returns true when it changed.
export function clipFenceToRing(f, ring, pad = RING.fencePad) {
  if (!f || !ring || !Number.isFinite(f.ax)) return false;
  const lim = ring.width * 0.5 + pad, N = 60;
  const at = (t) => ({ x: f.ax + (f.bx - f.ax) * t, z: f.az + (f.bz - f.az) * t });
  const ok = [];
  for (let i = 0; i <= N; i++) { const p = at(i / N); ok.push(Math.abs(Math.hypot(p.x - ring.cx, p.z - ring.cz) - ring.r) > lim); }
  if (ok.every(Boolean)) return false;
  let best = null;
  for (let i = 0; i <= N; i++) {
    if (!ok[i]) continue;
    let j = i; while (j + 1 <= N && ok[j + 1]) j++;
    const mid = at((i + j) / 2 / N), inside = Math.hypot(mid.x - ring.cx, mid.z - ring.cz) < ring.r;
    const run = { i, j, len: j - i, inside };
    if (!best || (run.inside && !best.inside) || (run.inside === best.inside && run.len > best.len)) best = run;
    i = j;
  }
  if (!best || best.len < 6) return false;   // under ~a tenth of it: leave it, the check will say
  const a = at(best.i / N), b = at(best.j / N);
  f.ax = a.x; f.az = a.z; f.bx = b.x; f.bz = b.z; f.clipped = ring.place;
  return true;
}
