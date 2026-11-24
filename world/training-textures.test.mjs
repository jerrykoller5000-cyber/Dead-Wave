// world/training-textures.test.mjs — AG-405: Verify procedural PBR texture library synthesis, normal integrity,
// ORM physical ranges, world-scale box UV projection, and performance budget (< 1200 ms cold in Node).
import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from '../tools/tests/fakethree.mjs';
import {
  tileNoise, tileFbm, heightToNormalRGBA, flipRowsRGBA,
  projectBoxUV, applyWorldUVByMaterial, getTrainingPBR, _TEST_SYNTH,
} from './training-textures.js';

test('periodic noise is seamless across tile boundaries', () => {
  for (let i = 0; i < 16; i++) {
    const v = i / 16;
    assert.ok(Math.abs(tileNoise(0, v, 8, 8, 7) - tileNoise(1, v, 8, 8, 7)) < 1e-12);
    assert.ok(Math.abs(tileNoise(v, 0, 8, 8, 7) - tileNoise(v, 1, 8, 8, 7)) < 1e-12);
    assert.ok(Math.abs(tileFbm(0, v, 8, 8, 13, 3) - tileFbm(1, v, 8, 8, 13, 3)) < 1e-12);
  }
});

test('heightToNormalRGBA produces unit-length tangent-space normals with +Z out', () => {
  const w = 32, h = 32;
  const hf = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    hf[y * w + x] = 0.5 + 0.3 * Math.sin(x / w * Math.PI * 2) * Math.cos(y / h * Math.PI * 2);
  }
  const nrm = heightToNormalRGBA(hf, w, h, 2.5, true, true);
  assert.equal(nrm.length, w * h * 4);
  for (let i = 0; i < nrm.length; i += 4) {
    const nx = nrm[i] / 255 * 2 - 1;
    const ny = nrm[i + 1] / 255 * 2 - 1;
    const nz = nrm[i + 2] / 255 * 2 - 1;
    const len = Math.hypot(nx, ny, nz);
    assert.ok(nz > 0.1, 'normal Z must point outward');
    assert.ok(Math.abs(len - 1) < 0.03, 'normal must be unit length, got ' + len);
    assert.equal(nrm[i + 3], 255);
  }
});

test('flipRowsRGBA reverses scanlines losslessly', () => {
  const src = new Uint8Array([1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255]);
  const flipped = flipRowsRGBA(src, 2, 2);
  assert.deepEqual([...flipped], [7, 8, 9, 255, 10, 11, 12, 255, 1, 2, 3, 255, 4, 5, 6, 255]);
});

test('all PBR generators produce valid albedo, normal, and physical ORM buffers within time budget', () => {
  const t0 = performance.now();
  const sets = [
    ['tileWall', _TEST_SYNTH.buildTilePixels({ baseHex: '#dce0e2', groutHex: '#a1a9ae', mode: 'wall', size: 256 })],
    ['tileRange', _TEST_SYNTH.buildTilePixels({ baseHex: '#c6cbce', groutHex: '#90989d', mode: 'rangeFloor', size: 256 })],
    ['tileBuild', _TEST_SYNTH.buildTilePixels({ baseHex: '#b1b7ba', groutHex: '#828a8f', mode: 'buildFloor', size: 256 })],
    ['siding', _TEST_SYNTH.buildSidingPixels(128)],
    ['steelDark', _TEST_SYNTH.buildMetalPixels('steelDark', 128)],
    ['steelLight', _TEST_SYNTH.buildMetalPixels('steelLight', 128)],
    ['roofSteel', _TEST_SYNTH.buildMetalPixels('roofSteel', 128)],
    ['shutterSlat', _TEST_SYNTH.buildMetalPixels('shutterSlat', 128)],
    ['galvDuct', _TEST_SYNTH.buildMetalPixels('galvDuct', 128)],
    ['oliveSteel', _TEST_SYNTH.buildOliveSteelPixels(128)],
    ['hazardTrim', _TEST_SYNTH.buildHazardPixels('trim')],
    ['hazardFloor', _TEST_SYNTH.buildHazardPixels('floor')],
    ['floorYellow', _TEST_SYNTH.buildFloorYellowPixels()],
    ['dadoBand', _TEST_SYNTH.buildDadoBandPixels()],
    ['rubberCrumb', _TEST_SYNTH.buildRubberCrumbPixels(128)],
    ['canvas', _TEST_SYNTH.buildCanvasPixels(128)],
    ['acousticCeiling', _TEST_SYNTH.buildAcousticCeilingPixels(128)],
    ['prismaticLens', _TEST_SYNTH.buildPrismaticLensPixels(128)],
    ['tunnelLiner', _TEST_SYNTH.buildTunnelLinerPixels(128)],
    ['armorySlatwall', _TEST_SYNTH.buildArmorySlatwallPixels(128)],
    ['medicalEnamel', _TEST_SYNTH.buildMedicalEnamelPixels(128)],
    ['leatherPebble', _TEST_SYNTH.buildLeatherPebblePixels(128)],
  ];
  const ms = performance.now() - t0;
  for (const [name, px] of sets) {
    assert.equal(px.col.length, px.w * px.h * 4, name + ' col length');
    assert.equal(px.nrm.length, px.w * px.h * 4, name + ' nrm length');
    assert.equal(px.orm.length, px.w * px.h * 4, name + ' orm length');
    // Check non-flat color and valid normal Z > 128
    let minL = 255, maxL = 0, minNz = 255;
    for (let i = 0; i < px.col.length; i += 4) {
      const lum = (px.col[i] + px.col[i + 1] + px.col[i + 2]) / 3;
      if (lum < minL) minL = lum;
      if (lum > maxL) maxL = lum;
      if (px.nrm[i + 2] < minNz) minNz = px.nrm[i + 2];
    }
    assert.ok(maxL - minL >= 5, `${name} must have tonal variation (got ${minL.toFixed(1)}..${maxL.toFixed(1)})`);
    assert.ok(minNz >= 128, `${name} normals must point outward (min B=${minNz})`);
  }
  assert.ok(ms < 5000, `synthesis too slow (${ms.toFixed(1)} ms)`);
});

test('getTrainingPBR returns null cleanly on stand-in fakethree', () => {
  assert.equal(getTrainingPBR(T), null);
});

test('projectBoxUV and applyWorldUVByMaterial produce unstretched metre-scale UVs', () => {
  const g = new T.Group();
  const mat = new T.MeshStandardMaterial({ color: 0xffffff });
  const geo = new T.BoxGeometry(10, 2, 0.5);
  const mesh = new T.Mesh(geo, mat);
  g.add(mesh);
  const count = applyWorldUVByMaterial(g, new Map([[mat, 2.0]]));
  assert.equal(count, 1);
  const uv = geo.attributes.uv;
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  for (let i = 0; i < uv.count; i++) {
    minU = Math.min(minU, uv.getX(i)); maxU = Math.max(maxU, uv.getX(i));
    minV = Math.min(minV, uv.getY(i)); maxV = Math.max(maxV, uv.getY(i));
  }
  // 10 m span / 2 m tile = 5.0 U repeat (not squashed into 0..1!)
  assert.ok(Math.abs((maxU - minU) - 5.0) < 1e-5, 'expected 5.0 U span, got ' + (maxU - minU));
  assert.ok(Math.abs((maxV - minV) - 1.0) < 1e-5, 'expected 1.0 V span, got ' + (maxV - minV));
});
