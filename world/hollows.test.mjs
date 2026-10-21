import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutWarren, buildWarren, WARREN_THEMES, HOLLOW } from './hollows.js';

const reach = (plan) => {
  const byKey = new Map(plan.cells.map((c) => [c.i + ',' + c.j, c]));
  const D = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const start = plan.cells[plan.mouthCell], seen = new Set([start]), q = [start];
  while (q.length) { const c = q.shift(); c.open.forEach((o, s) => { if (!o) return; const d = byKey.get((c.i + D[s][0]) + ',' + (c.j + D[s][1])); assert.ok(d, 'an open side leads somewhere'); assert.ok(d.open[(s + 2) % 4], 'links go both ways'); if (!seen.has(d)) { seen.add(d); q.push(d); } }); }
  return seen;
};

for (const theme of WARREN_THEMES) {
  test(theme + ': three depths of the right size, all reachable from the mouth', () => {
    const p = layoutWarren(theme);
    const byDepth = [1, 2, 3].map((d) => p.cells.filter((c) => c.depth === d && c.kind !== 'ramp').length);
    assert.ok(byDepth[0] >= 10 && byDepth[0] <= 12, 'Galleries ' + byDepth[0]);
    assert.ok(byDepth[1] >= 8 && byDepth[1] <= 10, 'Narrows ' + byDepth[1]);
    assert.ok(byDepth[2] >= 4 && byDepth[2] <= 7, 'Deep ' + byDepth[2]);
    assert.equal(reach(p).size, p.cells.length, 'every cell reachable');
    assert.equal(p.cells.filter((c) => c.kind === 'deep').length, 4);
    assert.equal(p.ramps.length, 2);
    assert.equal(p.exits.boltHoles.length, 3);
    assert.deepEqual(p.exits.boltHoles.map((b) => b.depth), [1, 2, 3]);
    assert.equal(p.points.tags.length, HOLLOW.TAGS[theme]);
    assert.ok(p.points.crates.length >= 3 && p.points.crates.length <= 5, 'crates ' + p.points.crates.length);
    assert.ok(p.points.sleepers.length >= 6, 'sleepers ' + p.points.sleepers.length);
  });
  test(theme + ': the same layout every run', () => {
    assert.deepEqual(JSON.stringify(layoutWarren(theme)), JSON.stringify(layoutWarren(theme)));
  });
  test(theme + ': built, every point stands on a floor and outside the rock, and the flow field reaches them', () => {
    const w = buildWarren(theme);
    const inRock = (p) => w.solids.some((s) => p.x > s.minX && p.x < s.maxX && p.z > s.minZ && p.z < s.maxZ);
    const pts = [w.entry, w.exits.mouth, w.exits.deep, ...w.exits.boltHoles, w.points.strongbox, w.points.set, ...w.points.crates, ...w.points.tags, ...w.points.nests, ...w.points.sleepers];
    for (const p of pts) {
      const y = w.groundAt(p.x, p.z);
      assert.ok(y != null && Math.abs(y - p.y) < 0.01, 'on the floor: ' + JSON.stringify(p) + ' y ' + y);
      assert.ok(!inRock(p), 'not in rock: ' + JSON.stringify(p));
    }
    // The flow field: every point's square is walkable and joined to the entry's.
    const n = w.nav, sq = (p) => Math.floor((p.z - n.oz) / n.cell) * n.w + Math.floor((p.x - n.ox) / n.cell);
    const seen = new Uint8Array(n.w * n.h), q = [sq(w.entry)]; seen[q[0]] = 1;
    while (q.length) { const k = q.pop(), a = k % n.w, b = (k / n.w) | 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = a + da, y = b + db; if (x < 0 || y < 0 || x >= n.w || y >= n.h) continue; const kk = y * n.w + x; if (!seen[kk] && n.walkable[kk]) { seen[kk] = 1; q.push(kk); } } }
    for (const p of [w.exits.deep, w.points.strongbox, ...w.exits.boltHoles, ...w.points.tags, ...w.points.crates]) assert.ok(seen[sq(p)], 'walkable to ' + JSON.stringify(p));
    assert.ok(w.group.children.length > 5);
    w.dispose();
  });
}

// CL-99 v3 (docs/story.md §8): nine tags (2, 2, 2, 2, 1), as GP-83 counts them; the husks; FOB Threshold's crates in
// place of the old ambulance; the iron warren's cut wall and the hikers' rope and lights.
test('v3: nine tags, the husks, the crates, the iron warren\'s breach', () => {
  assert.deepEqual({ ...HOLLOW.TAGS }, { root: 2, shale: 2, iron: 2, wet: 2, hill: 1 });
  for (const theme of WARREN_THEMES) {
    const w = buildWarren(theme);
    const husks = w.group.userData.husks || [];
    assert.ok(husks.length >= 6, theme + ': husks ' + husks.length);
    const kinds = new Set(husks.map((h) => h.userData.what));
    assert.ok(kinds.has('boot') || kinds.has('jacket'), theme + ': a hiker\'s boot or a ranger\'s jacket shows');
    assert.ok(w.group.getObjectByName('fob-crates'), theme + ': FOB Threshold\'s crates');
    const O = w.group.position;
    for (const h of husks) {
      const floor = w.groundAt(h.position.x + O.x, h.position.z + O.z) - O.y;   // the floor under it, in the group's frame
      assert.ok(h.position.y - 2.3 > floor + 2.5, theme + ': hung overhead, its foot ' + (h.position.y - 2.3 - floor).toFixed(1) + ' m up');
    }
    if (theme === 'iron') { assert.ok(w.group.getObjectByName('iron-wall-cut') && w.group.getObjectByName('hikers-rope') && w.group.getObjectByName('hikers-headlamp')); }
    else assert.ok(!w.group.getObjectByName('iron-wall-cut'));
    w.dispose();
  }
});
