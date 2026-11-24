import test from 'node:test';
import assert from 'node:assert/strict';
import * as FakeThree from '../tools/tests/fakethree.mjs';
import {
  buildDeckTimberPixels,
  buildPilingTimberPixels,
  buildBridgeIronPixels,
  buildRopePixels,
  getBridgeDockTextures,
  orientBoxUVs,
  orientPilingWaterlineUVs,
  chamferedTimberGeo,
  mergeTexturedParts,
} from './bridge-dock-textures.js';

test('Bridge & dock procedural PBR synthesizers are fast, deterministic, and physically varied', () => {
  const t0 = performance.now();
  const deck = buildDeckTimberPixels(512);
  const piling = buildPilingTimberPixels(512);
  const iron = buildBridgeIronPixels(512);
  const rope = buildRopePixels(256);
  const ms = performance.now() - t0;
  console.log(`Bridge/dock full PBR synthesis: ${ms.toFixed(1)} ms`);
  assert.ok(ms < 1200, `synthesis stayed fast (${ms.toFixed(1)} ms)`);

  for (const [name, p] of [['deck', deck], ['piling', piling], ['iron', iron], ['rope', rope]]) {
    assert.equal(p.albedo.length, p.w * p.h * 4, `${name} albedo length`);
    assert.equal(p.orm.length, p.w * p.h * 4, `${name} orm length`);
    assert.equal(p.height.length, p.w * p.h, `${name} height length`);
    let hMin = 1, hMax = 0, rMin = 255, rMax = 0;
    for (let i = 0; i < p.height.length; i++) {
      if (p.height[i] < hMin) hMin = p.height[i];
      if (p.height[i] > hMax) hMax = p.height[i];
      const r = p.orm[i * 4 + 1];
      if (r < rMin) rMin = r;
      if (r > rMax) rMax = r;
    }
    assert.ok(hMax - hMin > 0.2, `${name} has genuine surface relief (${(hMax - hMin).toFixed(3)})`);
    assert.ok(rMax - rMin >= 16, `${name} has roughness variation (${rMin}..${rMax})`);
  }

  // Determinism check
  assert.deepEqual(buildDeckTimberPixels(128).albedo, buildDeckTimberPixels(128).albedo, 'deck timber is deterministic');

  // Piling waterline check: bottom underwater rows (canvas y near h-1 -> v near 0) are darker & smoother than top dry rows (y near 0 -> v near 1)
  const avgRow = (arr, w, y, ch) => {
    let s = 0;
    for (let x = 0; x < w; x++) s += arr[(y * w + x) * 4 + ch];
    return s / w;
  };
  const topLuma = avgRow(piling.albedo, piling.w, 16, 0);
  const botLuma = avgRow(piling.albedo, piling.w, piling.h - 16, 0);
  const topRough = avgRow(piling.orm, piling.w, 16, 1);
  const botRough = avgRow(piling.orm, piling.w, piling.h - 16, 1);
  assert.ok(botLuma < topLuma * 0.65, `submerged piling wood is much darker (${botLuma.toFixed(1)} vs ${topLuma.toFixed(1)})`);
  assert.ok(botRough < topRough * 0.65, `submerged piling wood has wet sheen (${botRough.toFixed(1)} vs ${topRough.toFixed(1)})`);

  // Iron metalness range check (exposed steel vs oxidized rust)
  let mMin = 255, mMax = 0;
  for (let i = 0; i < iron.w * iron.h; i++) {
    const m = iron.orm[i * 4 + 2];
    if (m < mMin) mMin = m;
    if (m > mMax) mMax = m;
  }
  assert.ok(mMax > 180 && mMin < 90, `bridge iron contrasts bare steel (${mMax}) with oxidized rust (${mMin})`);
});

test('getBridgeDockTextures caches per THREE instance and degrades cleanly under fakethree', () => {
  const libA = getBridgeDockTextures(FakeThree);
  const libB = getBridgeDockTextures(FakeThree);
  assert.equal(libA, libB, 'library is WeakMap-cached per THREE');
  assert.ok(libA.mats.deck && libA.mats.piling && libA.mats.iron && libA.mats.rope, 'all 4 PBR materials created');
});

test('UV helpers, chamfered planks, and mergeTexturedParts preserve UVs & vertex colors under real Three.js', async () => {
  const THREE = await import('../vendor/three/three.webgpu.js').catch(() => null);
  if (!THREE) return; // skip if vendored module cannot run in bare Node
  const lib = getBridgeDockTextures(THREE);
  assert.ok(lib.deckTimber.map && lib.deckTimber.normalMap && lib.deckTimber.ormMap, 'DataTextures created');
  assert.equal(lib.deckTimber.ormMap.channel, 0, 'packed ORM uses UV channel 0');
  assert.equal(lib.pilingTimber.map.wrapT, THREE.ClampToEdgeWrapping, 'piling clamps vertically for waterline');

  const plankGeo = chamferedTimberGeo(THREE, 2.7, 0.14, 0.24, 0.012, 'x');
  assert.ok(plankGeo.attributes.uv && plankGeo.attributes.position && plankGeo.attributes.normal, 'chamfered plank has pos/nrm/uv');

  const cyl = new THREE.CylinderGeometry(0.16, 0.2, 4.4, 12);
  orientPilingWaterlineUVs(cyl, -2.1, -1.2);
  let vMin = 1, vMax = 0;
  for (let i = 0; i < cyl.attributes.uv.count; i++) {
    const v = cyl.attributes.uv.getY(i);
    if (v < vMin) vMin = v;
    if (v > vMax) vMax = v;
  }
  assert.ok(vMin >= 0.01 && vMax <= 0.99 && vMax - vMin > 0.4, `piling waterline V spans (${vMin.toFixed(2)}..${vMax.toFixed(2)})`);

  const m1 = new THREE.Mesh(plankGeo, new THREE.MeshStandardMaterial({ color: 0x8a6d48 }));
  m1.position.set(0, 0, 0);
  const m2 = new THREE.Mesh(orientBoxUVs(new THREE.BoxGeometry(0.2, 0.2, 2.0), 0.2, 0.2, 2.0), new THREE.MeshStandardMaterial({ color: 0x624a30 }));
  m2.position.set(0, -0.2, 0.5);
  const merged = mergeTexturedParts(THREE, [m1, m2], lib.mats.deck, { castShadow: true, receiveShadow: true, name: 'test-bridge' });
  assert.ok(merged && merged.geometry.attributes.uv && merged.geometry.attributes.color, 'mergeTexturedParts preserves uv & vertex colors');
  assert.equal(merged.geometry.attributes.uv.count, merged.geometry.attributes.position.count, 'uv count matches position count');
});
