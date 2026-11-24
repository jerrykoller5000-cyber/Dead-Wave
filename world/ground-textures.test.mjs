import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tileNoise, tileFbm, heightToNormalRGBA, flipRowsRGBA, makeDataTexture,
  synthGrassBuffers, synthDirtBuffers, synthDuffBuffers, synthStoneBuffers, synthMacroBuffers,
  synthFobRutPBR, synthFobBlendPBR, synthCordonRoadPBR, synthDragMarksPBR, synthHollowSurface,
  getWorldGroundTextures, getFobRutPBR, getFobBlendPBR, getCordonRoadPBR, getDragMarksPBR, getHollowPBR,
} from './ground-textures.js';

function statsChannel(buf, ch) {
  let lo = 255, hi = 0, sum = 0;
  const n = buf.length / 4;
  for (let i = 0; i < n; i++) {
    const v = buf[i * 4 + ch];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
    sum += v;
  }
  return { lo, hi, mean: sum / n };
}

test('tileNoise and tileFbm are periodic and deterministic', () => {
  assert.ok(Math.abs(tileNoise(0.25, 0.75, 8, 8, 42) - tileNoise(1.25, 2.75, 8, 8, 42)) < 1e-12);
  assert.ok(Math.abs(tileFbm(0.1, 0.9, 6, 6, 17, 3) - tileFbm(1.1, 1.9, 6, 6, 17, 3)) < 1e-12);
});

test('terrain PBR archetypes synthesize fast, have real relief, AO, roughness and neutral luminance', () => {
  const t0 = performance.now();
  const grass = synthGrassBuffers(256);
  const dirt = synthDirtBuffers(256);
  const duff = synthDuffBuffers(256);
  const stone = synthStoneBuffers(256);
  const macro = synthMacroBuffers(256);
  const ms = performance.now() - t0;
  assert.ok(ms < 1500, `256px synthesis took too long: ${ms.toFixed(1)} ms`);

  for (const [name, b] of [['grass', grass], ['dirt', dirt], ['duff', duff], ['stone', stone]]) {
    assert.equal(b.colRgh.length, 256 * 256 * 4);
    assert.equal(b.nrmAoH.length, 256 * 256 * 4);
    // Normalized detail RGB stored at 0.5x -> mean should sit near 127.5 (within 112..144)
    const r = statsChannel(b.colRgh, 0);
    const g = statsChannel(b.colRgh, 1);
    const bl = statsChannel(b.colRgh, 2);
    const lum = r.mean * 0.299 + g.mean * 0.587 + bl.mean * 0.114;
    assert.ok(lum > 115 && lum < 142, `${name} colRgh mean lum out of neutral range: ${lum.toFixed(1)}`);
    assert.ok(r.hi - r.lo > 40, `${name} colRgh lacks contrast: ${r.lo}..${r.hi}`);
    // Roughness A channel in physical matte-to-stone range
    const rgh = statsChannel(b.colRgh, 3);
    assert.ok(rgh.mean > 175 && rgh.mean < 248, `${name} roughness mean unexpected: ${rgh.mean.toFixed(1)}`);
    // Normal X/Z centered near 127.5 with real perturbation
    const nx = statsChannel(b.nrmAoH, 0);
    const nz = statsChannel(b.nrmAoH, 1);
    assert.ok(Math.abs(nx.mean - 127.5) < 8, `${name} normal X biased: ${nx.mean.toFixed(1)}`);
    assert.ok(Math.abs(nz.mean - 127.5) < 8, `${name} normal Z biased: ${nz.mean.toFixed(1)}`);
    assert.ok(nx.hi - nx.lo > 60, `${name} normal X too flat: ${nx.lo}..${nx.hi}`);
    // Micro-AO B channel and Height A channel have real range
    const ao = statsChannel(b.nrmAoH, 2);
    const h = statsChannel(b.nrmAoH, 3);
    assert.ok(ao.hi - ao.lo > 40, `${name} micro-AO too flat: ${ao.lo}..${ao.hi}`);
    assert.ok(h.hi - h.lo > 90, `${name} height channel too flat: ${h.lo}..${h.hi}`);
  }
  assert.equal(macro.rgba.length, 256 * 256 * 4);
  const pud = statsChannel(macro.rgba, 3);
  assert.ok(pud.hi > 200 && pud.lo < 30, `macro puddle mask lacks dynamic range: ${pud.lo}..${pud.hi}`);
});

test('512px full terrain generation stays within startup perf budget (<650ms)', () => {
  const t0 = performance.now();
  synthGrassBuffers(512);
  synthDirtBuffers(512);
  synthDuffBuffers(512);
  synthStoneBuffers(512);
  synthMacroBuffers(512);
  const ms = performance.now() - t0;
  console.log(`512px full terrain PBR synthesis: ${ms.toFixed(1)} ms`);
  assert.ok(ms < 1200, `512px synthesis too slow: ${ms.toFixed(1)} ms`);
});

test('FOB rut, FOB blend, Cordon road, Drag marks, and Hollows PBR generators produce valid maps', () => {
  const rut = synthFobRutPBR(128, 256);
  assert.equal(rut.col.length, 128 * 256 * 4);
  assert.equal(rut.nrm.length, 128 * 256 * 4);
  assert.equal(rut.rgh.length, 128 * 256 * 4);
  // Edges of rut fade to alpha 0
  assert.equal(rut.col[3], 0);
  // Center of rut has visible alpha and normal perturbation
  assert.ok(rut.col[(128 * 128 + 64) * 4 + 3] > 120);

  const blend = synthFobBlendPBR(128);
  assert.equal(blend.col[3], 0); // corner transparent
  assert.ok(blend.col[(64 * 128 + 64) * 4 + 3] > 100);

  const road = synthCordonRoadPBR(256, 512);
  assert.equal(road.col.length, 256 * 512 * 4);
  assert.ok(statsChannel(road.nrm, 0).hi - statsChannel(road.nrm, 0).lo > 50);

  const drag = synthDragMarksPBR(64, 128);
  assert.equal(drag.col.length, 64 * 128 * 4);
  assert.equal(drag.col[3], 0);

  for (const theme of ['root', 'shale', 'iron', 'wet', 'hill']) {
    const fl = synthHollowSurface(theme, 'floor', 128);
    assert.equal(fl.col.length, 128 * 128 * 4);
    assert.ok(statsChannel(fl.nrm, 0).hi - statsChannel(fl.nrm, 0).lo > 45, `${theme} hollow floor normal flat`);
    if (theme === 'wet') {
      assert.ok(statsChannel(fl.rgh, 0).mean < 140, 'wet hollow floor should be noticeably glossier');
    }
  }
});

test('Node/stub-THREE factories degrade gracefully without DataTexture and cache with real DataTexture', () => {
  const stubT = { STAND_IN: true };
  const s = getWorldGroundTextures(stubT, 64);
  assert.equal(s.grassColRgh, null);
  assert.equal(getFobRutPBR(stubT).map, null);
  assert.equal(getFobBlendPBR(stubT).map, null);
  assert.equal(getCordonRoadPBR(stubT).map, null);
  assert.equal(getDragMarksPBR(stubT).map, null);
  assert.equal(getHollowPBR(stubT, 'iron').floor.map, null);

  class FakeDataTexture {
    constructor(data, w, h, fmt, type) { this.image = { data, width: w, height: h }; this.fmt = fmt; this.type = type; }
  }
  const mockT = {
    DataTexture: FakeDataTexture, RGBAFormat: 1, UnsignedByteType: 2,
    SRGBColorSpace: 'srgb', NoColorSpace: 'none', RepeatWrapping: 10, ClampToEdgeWrapping: 11,
    LinearFilter: 20, LinearMipmapLinearFilter: 21,
  };
  const a = getWorldGroundTextures(mockT, 64);
  const b = getWorldGroundTextures(mockT, 64);
  assert.strictEqual(a, b, 'terrain textures should be cached per THREE instance');
  assert.ok(a.grassColRgh instanceof FakeDataTexture);
  assert.equal(a.grassColRgh.image.width, 64);
  assert.equal(a.grassColRgh.colorSpace, 'none');

  const h1 = getHollowPBR(mockT, 'iron');
  const h2 = getHollowPBR(mockT, 'iron');
  assert.strictEqual(h1, h2);
  assert.equal(h1.floor.map.colorSpace, 'srgb');
});

test('heightToNormalRGBA and flipRowsRGBA match OpenGL tangent-space convention', () => {
  const h = new Float32Array([0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1]);
  const nrm = heightToNormalRGBA(h, 4, 4, 1.0, false, false);
  // At x=1, height rises to the right (dX > 0), so nx < 0 (< 128)
  assert.ok(nrm[(1 * 4 + 1) * 4] < 120);
  const fl = flipRowsRGBA(nrm, 4, 4);
  assert.equal(fl.length, nrm.length);
});
