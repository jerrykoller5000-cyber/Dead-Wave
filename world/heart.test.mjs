// world/heart.test.mjs — CL-112: the heart in the Marrow. Its floor, its way in, its columns, its source, and the
// flow field from the way in to every place the fight needs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { HEART, buildHeart, heartGround, heartColumns } from './heart.js';

test('the floor: round, the source a hole, the tunnel climbing to the way back', () => {
  assert.equal(heartGround(0, 0), null);
  assert.equal(heartGround(HEART.SOURCE_R + 0.5, 0), 0);
  assert.equal(heartGround(HEART.R - 0.5, 0), 0);
  assert.equal(heartGround(HEART.R + 1, 0), null);
  const top = heartGround(0, -(HEART.R + HEART.TUNNEL.LEN - 0.1));
  assert.ok(Math.abs(top - HEART.TUNNEL.DROP) < 0.1, 'the tunnel\'s top ' + top);
  assert.equal(heartGround(HEART.TUNNEL.HALF + 0.5, -(HEART.R + 5)), null);
});

test('built: every point on a floor, out of the rock, and the flow field reaches them all from the way in', () => {
  const h = buildHeart({ origin: { x: 10, y: -460, z: 5 }, doc: null });
  const inRock = (p) => h.solids.some((s) => p.x > s.minX && p.x < s.maxX && p.z > s.minZ && p.z < s.maxZ);
  const pts = [h.entry, h.exits.back, h.points.guardian, ...h.points.rise];
  for (const p of pts) {
    const y = h.groundAt(p.x, p.z);
    assert.ok(y != null && Math.abs(y - p.y) < 0.35, 'on the floor: ' + JSON.stringify(p) + ' y ' + y);
    assert.ok(!inRock(p), 'not in rock: ' + JSON.stringify(p));
  }
  assert.equal(h.points.rise.length, 12);
  const n = h.nav, sq = (p) => Math.floor((p.z - n.oz) / n.cell) * n.w + Math.floor((p.x - n.ox) / n.cell);
  const seen = new Uint8Array(n.w * n.h), q = [sq(h.entry)]; seen[q[0]] = 1;
  assert.ok(n.walkable[q[0]], 'the way in is walkable');
  while (q.length) { const k = q.pop(), a = k % n.w, b = (k / n.w) | 0; for (const [da, db] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = a + da, y = b + db; if (x < 0 || y < 0 || x >= n.w || y >= n.h) continue; const kk = y * n.w + x; if (!seen[kk] && n.walkable[kk]) { seen[kk] = 1; q.push(kk); } } }
  for (const p of [h.points.guardian, ...h.points.rise]) assert.ok(seen[sq(p)], 'reached: ' + JSON.stringify(p));
  assert.ok(!n.walkable[sq(h.source)], 'the source is no floor');
  h.dispose();
});

test('the columns stand in a ring, none across the way in, and come down toward the source', () => {
  const cols = heartColumns();
  assert.equal(cols.length, HEART.COLUMNS);
  for (const c of cols) assert.ok(!(c.z < 0 && Math.abs(c.x) < 2.5), 'not across the way in: ' + c.x.toFixed(1));
  const h = buildHeart({ doc: null });
  const before = h.solids.filter((s) => s.kind === 'column').length;
  const s = h.fellColumn(0);
  assert.ok(s && s.kind === 'column-down' && h.columns[0].down);
  assert.equal(h.solids.filter((x) => x.kind === 'column').length, before - 1);
  assert.equal(h.fellColumn(0), null, 'it comes down once');
  // It lies toward the source but leaves the hole's lip clear.
  const c = h.columns[0], d0 = Math.hypot(c.x - h.source.x, c.z - h.source.z);
  const cx = (s.minX + s.maxX) / 2, cz = (s.minZ + s.maxZ) / 2;
  assert.ok(Math.hypot(cx - h.source.x, cz - h.source.z) < d0, 'toward the source');
  h.dispose();
});
