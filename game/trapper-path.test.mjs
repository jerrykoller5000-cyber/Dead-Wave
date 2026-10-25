import test from 'node:test';
import assert from 'node:assert/strict';
import { TRAPPER, rowZ, sideSign, sideName, calledForDay, createTrapperPath, buildTrapperYardParts } from './trapper-path.js';

test('trapper-path deals 8 rows of left/right safe stones and horseshoes, new each run', () => {
  let s = 17;
  const rnd = () => { s = (s * 48271) % 2147483647; return (s - 1) / 2147483646; };
  const p = createTrapperPath(rnd);
  assert.equal(p.state.safe.length, 8);
  assert.ok(p.state.safe.every((v) => v === 0 || v === 1));
  assert.ok(p.state.safe.includes(0) && p.state.safe.includes(1), 'both sides appear in the 8-row pattern');

  for (let r = 0; r < TRAPPER.ROWS; r++) {
    const leftPost = p.postLocal(r, 0), rightPost = p.postLocal(r, 1);
    assert.equal(leftPost.horseshoe, p.safeSide(r) === 0);
    assert.equal(rightPost.horseshoe, p.safeSide(r) === 1);
    assert.notEqual(leftPost.horseshoe, rightPost.horseshoe, 'exactly one post per row has the horseshoe');
  }

  const first = p.state.safe.join(',');
  let changed = false;
  for (let i = 0; i < 8 && !changed; i++) {
    p.reset(rnd);
    if (p.state.safe.join(',') !== first) changed = true;
  }
  assert.ok(changed, 'reset deals a new pattern');
});

test('walking the safe stones from row 0 to row 7 unlocks the hatch without snapping', () => {
  const p = createTrapperPath(Math.random);
  p.reset(Math.random, [0, 1, 0, 0, 1, 0, 1, 1]);
  assert.equal(p.unlocked(), false);

  // Teleporting directly to the hatch before walking rows 0..7 keeps it locked:
  const atHatchEarly = p.step(0, 1.5, 0.016);
  assert.equal(atHatchEarly.kind, 'locked-hatch');
  assert.equal(p.unlocked(), false);

  // Walk each safe stone in order (including diagonal crossings):
  for (let r = 0; r < TRAPPER.ROWS; r++) {
    const st = p.stoneLocal(r, p.safeSide(r));
    if (r > 0) {
      const prev = p.stoneLocal(r - 1, p.safeSide(r - 1));
      const mid = p.step((prev.x + st.x) * 0.5, (prev.z + st.z) * 0.5, 0.05);
      assert.equal(mid.kind, 'safe', `midpoint bridge between row ${r - 1} and ${r} is safe`);
    }
    const res = p.step(st.x, st.z, 0.05);
    if (r < TRAPPER.ROWS - 1) {
      assert.equal(res.kind, 'safe');
    } else {
      assert.equal(res.kind, 'unlocked');
    }
  }
  assert.equal(p.unlocked(), true);
  assert.equal(p.state.snaps, 0);
});

test('a wrong stone or stepping into the leaves snaps a bear trap (25 damage, 3 s hold, 4-6 dead)', () => {
  const p = createTrapperPath(Math.random);
  p.reset(Math.random, [0, 1, 0, 1, 0, 1, 0, 1]);

  // Step onto Row 0's wrong stone (side 1):
  const wrong0 = p.stoneLocal(0, 1);
  const snap1 = p.step(wrong0.x, wrong0.z, 0.016, { grounded: true, day: 1 });
  assert.equal(snap1.kind, 'snap');
  assert.equal(snap1.reason, 'wrong-stone');
  assert.equal(snap1.row, 0);
  assert.equal(snap1.damage, 25);
  assert.equal(snap1.holdS, 3.0);
  assert.equal(snap1.called, 4);
  assert.equal(p.held(), true);

  // Held for 3.0 seconds:
  const h1 = p.step(wrong0.x, wrong0.z, 1.5);
  assert.equal(h1.kind, 'held');
  assert.ok(Math.abs(h1.holdT - 1.5) < 1e-6);
  assert.equal(p.held(), true);

  // Release after 3.0 s; stepping off the same row's sprung trap does not double-snap that row:
  const rel = p.step(wrong0.x, wrong0.z, 1.6);
  assert.equal(p.held(), false);
  assert.equal(rel.kind, 'escaping');

  // Stepping onto row 0's safe stone clears escapeRow, so stepping into the leaves between row 0 and row 1 snaps:
  const good0 = p.stoneLocal(0, 0);
  const safe0 = p.step(good0.x, good0.z, 0.016, { grounded: true, day: 1 });
  assert.equal(safe0.kind, 'safe');
  assert.equal(p.state.escapeRow, null);
  const midLeaf = p.step(0.95, (rowZ(0) + rowZ(1)) * 0.5 + 1e-6, 0.016, { grounded: true, day: 1 });
  assert.equal(midLeaf.kind, 'snap');
  assert.equal(midLeaf.reason, 'leaves');
  p.step(0.95, (rowZ(0) + rowZ(1)) * 0.5 + 1e-6, 3.1, { grounded: true, day: 1 });

  // Stepping into the leaves off the stones in Row 2 snaps a leaf trap:
  const leafZ = rowZ(2);
  const snap2 = p.step(0.98, leafZ, 0.016, { grounded: true, day: 20 });
  assert.equal(snap2.kind, 'snap');
  assert.equal(snap2.reason, 'leaves');
  assert.equal(snap2.row, 2);
  assert.equal(snap2.damage, 25);
  assert.equal(snap2.called, 6);
  assert.equal(p.state.snaps, 3);
});

test('calledForDay scales from 4 on day 1 to 6 on day 20, and helpers work', () => {
  assert.equal(calledForDay(1), 4);
  assert.equal(calledForDay(10), 5);
  assert.equal(calledForDay(20), 6);
  assert.equal(sideSign(0), -1);
  assert.equal(sideSign(1), 1);
  assert.equal(sideName(0), 'left');
  assert.equal(sideName(1), 'right');
});

test('buildTrapperYardParts constructs 8-row trapper yard with 16 stones, 16 posts, horseshoes, leaf traps and fence colliders', () => {
  const mkVec = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }, setScalar(s) { this.x = s; this.y = s; this.z = s; return this; } });
  class Node3D {
    constructor() { this.children = []; this.position = mkVec(); this.rotation = mkVec(); this.scale = mkVec(); this.userData = {}; }
    add(...kids) { this.children.push(...kids); return this; }
  }
  class Geo {
    constructor() {
      this.attributes = { position: { count: 8, getX: () => 0.3, getY: () => 0, getZ: () => 0.3, setXYZ() {}, needsUpdate: false } };
    }
    clone() { return new Geo(); }
    setAttribute() {}
    computeVertexNormals() {}
  }
  const THREE = {
    DoubleSide: 2,
    Group: class extends Node3D {},
    Mesh: class extends Node3D { constructor(g, m) { super(); this.geometry = g; this.material = m; } },
    MeshStandardMaterial: class { constructor(opts) { Object.assign(this, opts); } },
    MeshBasicMaterial: class { constructor(opts) { Object.assign(this, opts); } },
    BoxGeometry: Geo,
    PlaneGeometry: Geo,
    CylinderGeometry: Geo,
    ConeGeometry: Geo,
    SphereGeometry: Geo,
    TorusGeometry: Geo,
    DodecahedronGeometry: Geo,
    BufferGeometry: Geo,
    BufferAttribute: class {},
    Float32BufferAttribute: class {}
  };
  const trapperPart = (geo, mat, lx, y, lz) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(lx, y, lz);
    return m;
  };
  const trapperBar = (parts, a, b, r, mat) => {
    const m = new THREE.Mesh(new Geo(), mat);
    m.position.set((a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5, (a[2] + b[2]) * 0.5);
    parts.push(m);
    return m;
  };
  const built = buildTrapperYardParts(THREE, {
    groundAtLocal: () => 2.1,
    toWorld: (lx, lz) => ({ x: -25.49 + lx, z: 41.21 + lz, y: 2.1 }),
    cy0: 2.1,
    trapperPart,
    trapperBar,
    rule: TRAPPER
  });
  assert.equal(built.stones.length, 16);
  assert.equal(built.posts.length, 16);
  assert.ok(built.colliderSpots.length >= 20);
  assert.ok(built.parts.length > 200);
  for (let r = 0; r < TRAPPER.ROWS; r++) {
    const rowStones = built.stones.filter((s) => s.row === r);
    const rowPosts = built.posts.filter((p) => p.row === r);
    assert.equal(rowStones.length, 2);
    assert.equal(rowPosts.length, 2);
    assert.equal(rowPosts[0].side, 0);
    assert.equal(rowPosts[1].side, 1);
  }
});
