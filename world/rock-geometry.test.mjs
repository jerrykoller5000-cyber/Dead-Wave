// world/rock-geometry.test.mjs — AG-407 unit tests for sculpted rock geometry & geological identity.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.webgpu.js';
import {
  GEOLOGY_CATALOG,
  VALLEY_GEOLOGY_IDS,
  pickRockGeology,
  sculptRockGeometry,
  sculptSlabGeometry,
  sculptSpireGeometry,
  buildMenhirGeometry,
  buildFlutedColumnGeometry,
  buildValleyRockParts,
  mergeSculptedRockParts,
  shadeSculptedRock,
  appendSculptedBoulderToAcc,
  buildCompactStoneGeometry,
  mulberry32,
} from './rock-geometry.js';

function assertCleanGeometry(geo, label, minTris = 12) {
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const triCount = geo.index ? geo.index.count / 3 : (pos ? pos.count / 3 : 0);
  assert.ok(pos && triCount >= minTris, `${label}: too few triangles (${triCount})`);
  assert.ok(nrm && nrm.count === pos.count, `${label}: missing/mismatched normals`);
  assert.ok(uv && uv.count === pos.count, `${label}: missing/mismatched UVs`);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    assert.ok(Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z), `${label}: non-finite position at ${i}`);
    const nx = nrm.getX(i), ny = nrm.getY(i), nz = nrm.getZ(i);
    const l = Math.hypot(nx, ny, nz);
    assert.ok(l > 0.95 && l < 1.05, `${label}: non-unit normal len=${l} at ${i}`);
    assert.ok(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i)), `${label}: non-finite UV at ${i}`);
  }
  geo.computeBoundingBox();
  const sz = new THREE.Vector3();
  geo.boundingBox.getSize(sz);
  assert.ok(sz.x > 0.01 && sz.y > 0.01 && sz.z > 0.01, `${label}: degenerate bounding box ${sz.toArray()}`);
}

function assertOutwardWinding(geo, label) {
  const pos = geo.attributes.position;
  const idx = geo.index ? geo.index.array : null;
  const n = idx ? idx.length : pos.count;
  // Compute centroid first so signed volume is translation-invariant
  let cx = 0, cy = 0, cz = 0;
  for (let i = 0; i < pos.count; i++) {
    cx += pos.getX(i); cy += pos.getY(i); cz += pos.getZ(i);
  }
  cx /= pos.count; cy /= pos.count; cz /= pos.count;
  let vol6 = 0;
  for (let i = 0; i < n; i += 3) {
    const ia = idx ? idx[i] : i, ib = idx ? idx[i + 1] : i + 1, ic = idx ? idx[i + 2] : i + 2;
    const ax = pos.getX(ia) - cx, ay = pos.getY(ia) - cy, az = pos.getZ(ia) - cz;
    const bx = pos.getX(ib) - cx, by = pos.getY(ib) - cy, bz = pos.getZ(ib) - cz;
    const cxp = pos.getX(ic) - cx, cyp = pos.getY(ic) - cy, czp = pos.getZ(ic) - cz;
    const crx = by * czp - bz * cyp;
    const cry = bz * cxp - bx * czp;
    const crz = bx * cyp - by * cxp;
    vol6 += ax * crx + ay * cry + az * crz;
  }
  assert.ok(vol6 > 0, `${label}: INSIDE-OUT triangle winding! signedVol*6=${vol6.toFixed(4)}`);
}

test('pickRockGeology covers all 5 valley geologies and respects terrain & cave causality', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    seen.add(pickRockGeology({ x: (i * 19) % 300 - 150, z: (i * 37) % 300 - 150, h: (i % 40), slope: (i % 10) * 0.06, seed: 1000 + i * 73 }));
  }
  for (const id of VALLEY_GEOLOGY_IDS) {
    assert.ok(seen.has(id), `expected geology ${id} to appear across valley scatter`);
  }
  // Cave echo check: near chalk cave strongly favors limestone
  let chalkLime = 0;
  for (let i = 0; i < 80; i++) {
    if (pickRockGeology({ x: 50, z: 50, h: 10, slope: 0.2, seed: 500 + i * 17, nearCaveTheme: 'chalk' }) === 'limestone') chalkLime++;
  }
  assert.ok(chalkLime > 35, `expected strong limestone echo near chalk cave, got ${chalkLime}/80`);
});

test('sculptRockGeometry produces clean, unique, distinct meshes per geology and seed', () => {
  const styles = ['granite', 'basalt', 'sandstone', 'limestone', 'schist', 'river', 'ironstone'];
  const sigs = new Set();
  for (const style of styles) {
    const g1 = sculptRockGeometry(THREE, { radius: 0.7, detail: 2, seed: 42, style });
    const g2 = sculptRockGeometry(THREE, { radius: 0.7, detail: 2, seed: 99, style });
    assertCleanGeometry(g1, `sculpt-${style}-42`, 320);
    assertCleanGeometry(g2, `sculpt-${style}-99`, 320);
    // Verify seed 42 and seed 99 differ meaningfully
    let diff = 0;
    for (let i = 0; i < g1.attributes.position.count; i++) {
      diff += Math.abs(g1.attributes.position.getX(i) - g2.attributes.position.getX(i));
    }
    assert.ok(diff > 10, `${style}: seeds 42 and 99 produced nearly identical geometry`);
    sigs.add(g1.attributes.position.getX(0).toFixed(4) + ',' + g1.attributes.position.getY(5).toFixed(4));
    g1.dispose(); g2.dispose();
  }
  assert.equal(sigs.size, styles.length, 'each geology style should yield a distinct vertex sculpture for the same seed');
});

test('All 5 valley rock archetypes x 5 geologies merge, shade & preserve collision metrics cleanly', () => {
  const kinds = ['erratic', 'angular', 'slab', 'spire', 'cluster'];
  const tintCache = new Map();
  const stoneTint = (hex) => {
    let m = tintCache.get(hex);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: hex }); tintCache.set(hex, m); }
    return m;
  };
  const cA = new THREE.Color(), cB = new THREE.Color();
  const stoneShade = (type, t) => {
    const q = Math.max(-1, Math.min(1, Math.round(t * 5) / 5));
    cA.setHex(type.base).lerp(cB.setHex(q > 0 ? type.light : type.dark), Math.abs(q));
    return cA.getHex();
  };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true });

  for (const geology of VALLEY_GEOLOGY_IDS) {
    for (const kind of kinds) {
      const built = buildValleyRockParts(THREE, {
        s: 1.15, seed: 12345 + kind.length * 91 + geology.length * 37,
        kind, geology, damp: 0.65, stoneTint, stoneShade,
      });
      assert.ok(built.parts.length >= 3, `${geology}/${kind}: too few parts`);
      assert.ok(built.footR > 0.25 && built.footR < 4.5, `${geology}/${kind}: unexpected footR ${built.footR}`);
      assert.ok(built.topY > 0.3 && built.topY < 5.0, `${geology}/${kind}: unexpected topY ${built.topY}`);

      const mesh = mergeSculptedRockParts(THREE, built.parts, mat, { phaseOffset: [0.23, 0.71] });
      shadeSculptedRock(THREE, mesh, { geology, seed: 99, mossAmt: built.mossAmt, lichenAmt: built.lichenAmt });
      assertCleanGeometry(mesh.geometry, `${geology}/${kind}`, 60);
      assert.ok(mesh.geometry.attributes.color, `${geology}/${kind}: missing vertex colors`);
      mesh.geometry.dispose();
    }
  }
});

test('Specialized rock builders (slab, spire, menhir, fluted column, cave boulder, compact stone) are clean & outward-wound', () => {
  const slab = sculptSlabGeometry(THREE, { w: 1.4, h: 0.32, d: 0.9, seed: 7, style: 'sandstone' });
  assertCleanGeometry(slab, 'slab', 60);
  assertOutwardWinding(slab, 'slab');
  slab.dispose();

  const spire = sculptSpireGeometry(THREE, { rBot: 0.4, rTop: 0.16, height: 1.7, seed: 11, style: 'basalt' });
  assertCleanGeometry(spire, 'spire', 60);
  assertOutwardWinding(spire, 'spire');
  assert.ok(spire.boundingBox.min.y < -0.25, `spire must have buried root skirt, min.y=${spire.boundingBox.min.y}`);
  spire.dispose();

  const menhir = buildMenhirGeometry(THREE, 3.4, 2.7, 0.7, mulberry32(42), { taper: 0.12, crown: 0.1, jitter: 0.06, flatFront: true });
  assertCleanGeometry(menhir, 'menhir-ring', 40);
  assertOutwardWinding(menhir, 'menhir-ring');
  // Verify flatFront never bulges past front rune plane (+0.355) & front UVs span properly across X (zero corduroy stretch!)
  const mp = menhir.attributes.position, mn = menhir.attributes.normal, mu = menhir.attributes.uv;
  let minU = Infinity, maxU = -Infinity;
  for (let i = 0; i < mp.count; i++) {
    if (mn.getZ(i) > 0.75 && Math.abs(mp.getX(i)) < 1.2 && mp.getY(i) > 0.4 && mp.getY(i) < 2.2) {
      assert.ok(mp.getZ(i) <= 0.355, `flatFront menhir bulged past carving plane: z=${mp.getZ(i)}`);
      minU = Math.min(minU, mu.getX(i));
      maxU = Math.max(maxU, mu.getX(i));
    }
  }
  assert.ok(maxU - minU > 0.75, `menhir front face UVs collapsed: span=${(maxU - minU).toFixed(3)}`);
  menhir.dispose();

  const col = buildFlutedColumnGeometry(THREE, 0.9, 1.25, 14, 3);
  assertCleanGeometry(col, 'fluted-column', 80);
  assertOutwardWinding(col, 'fluted-column');
  col.dispose();

  const cobble = buildCompactStoneGeometry(THREE, { rx: 0.18, ry: 0.11, rz: 0.15, detail: 1, seed: 55, style: 'river' });
  assertCleanGeometry(cobble, 'river-cobble', 80);
  assertOutwardWinding(cobble, 'river-cobble');
  cobble.dispose();

  const acc = { p: [], n: [], c: [], e: [] };
  appendSculptedBoulderToAcc(THREE, acc, { rock: 0x5d666c, dark: 0x30393f, moss: 0x557744, streak: 0x444d53 }, 2, 1, 3, 1.1, 0.7, 1.0, 29, { style: 'schist', floor: 0 });
  assert.ok(acc.p.length >= 240 * 3, `expected substantial boulder vertices in acc, got ${acc.p.length}`);
  assert.equal(acc.p.length, acc.n.length);
  assert.equal(acc.p.length, acc.c.length);
  assert.equal(acc.p.length / 3, acc.e.length);
});

test('GEOLOGY_CATALOG exposes all 5 valley species with calibrated stats', () => {
  for (const id of VALLEY_GEOLOGY_IDS) {
    const g = GEOLOGY_CATALOG[id];
    assert.ok(g && g.base && g.dark && g.light && g.tough > 0.5 && g.creaseDeg >= 20);
  }
});
