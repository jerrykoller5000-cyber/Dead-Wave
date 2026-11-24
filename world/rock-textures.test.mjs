// world/rock-textures.test.mjs — AG-407 unit tests for procedural geological rock PBR library.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROCK_GEOLOGIES,
  _TEST_SYNTH,
  heightToNormalRGBA,
  flipRowsRGBA,
  getRockTextureLibrary,
  applyRockPBR,
  createRockMaterial,
} from './rock-textures.js';

function rgbToSat(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  return max > 0 ? (max - min) / max : 0;
}

test('OpenGL normal sign convention: rising +X height tilts nx negative, rising +Y tilts ny positive', () => {
  const W = 16, H = 16;
  const hX = new Float32Array(W * H);
  const hY = new Float32Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      hX[y * W + x] = x / (W - 1);
      hY[y * W + x] = y / (H - 1);
    }
  }
  const nX = heightToNormalRGBA(hX, W, H, 2.0, false, false);
  const nY = heightToNormalRGBA(hY, W, H, 2.0, false, false);
  const mid = (8 * W + 8) * 4;
  assert.ok(nX[mid] < 120, `expected nx < 120 for +X slope, got ${nX[mid]}`);
  assert.ok(Math.abs(nX[mid + 1] - 128) <= 2, `expected ny ~128 for pure +X slope, got ${nX[mid + 1]}`);
  assert.ok(nX[mid + 2] > 140, `expected nz > 140, got ${nX[mid + 2]}`);
  assert.ok(nY[mid + 1] > 136, `expected ny > 136 for +Y slope, got ${nY[mid + 1]}`);
});

test('flipRowsRGBA reverses row order cleanly and is an involution', () => {
  const src = new Uint8Array([
    10, 20, 30, 255,  40, 50, 60, 255,
    70, 80, 90, 255,  100, 110, 120, 255,
  ]);
  const flipped = flipRowsRGBA(src, 2, 2);
  assert.deepEqual([...flipped.slice(0, 4)], [70, 80, 90, 255]);
  assert.deepEqual([...flipped.slice(8, 12)], [10, 20, 30, 255]);
  assert.deepEqual([...flipRowsRGBA(flipped, 2, 2)], [...src]);
});

test('All 11 geological rock synths pass art-direction saturation, normal integrity, roughness & dielectric checks', () => {
  const synthNames = Object.keys(_TEST_SYNTH);
  assert.equal(synthNames.length, 11);
  const meanRoughs = {};
  const meanLums = {};

  for (const name of synthNames) {
    const px = _TEST_SYNTH[name](128);
    assert.equal(px.w, 128);
    assert.equal(px.h, 128);
    assert.equal(px.col.length, 128 * 128 * 4);
    assert.equal(px.nrm.length, 128 * 128 * 4);
    assert.equal(px.orm.length, 128 * 128 * 4);
    assert.equal(px.colRgh.length, 128 * 128 * 4);
    assert.equal(px.nrmAoH.length, 128 * 128 * 4);

    let sumSat = 0, sumLum = 0, sumRgh = 0, sumNrmZ = 0, sumVarX = 0, maxMet = 0;
    const count = 128 * 128;
    for (let i = 0; i < count; i++) {
      const o = i * 4;
      const r = px.col[o] / 255, g = px.col[o + 1] / 255, b = px.col[o + 2] / 255;
      sumSat += rgbToSat(r, g, b);
      sumLum += r * 0.299 + g * 0.587 + b * 0.114;

      const nx = (px.nrm[o] / 255) * 2 - 1;
      const ny = (px.nrm[o + 1] / 255) * 2 - 1;
      const nz = (px.nrm[o + 2] / 255) * 2 - 1;
      const len = Math.hypot(nx, ny, nz);
      assert.ok(len > 0.94 && len < 1.06, `${name}: non-unit normal len=${len}`);
      assert.ok(nz > 0.25, `${name}: normal Z flipped/flat nz=${nz}`);
      sumNrmZ += nz;
      sumVarX += Math.abs(nx);

      const ao = px.orm[o] / 255;
      const rgh = px.orm[o + 1] / 255;
      const met = px.orm[o + 2] / 255;
      assert.ok(ao >= 0.30 && ao <= 1.0, `${name}: AO out of range ${ao}`);
      assert.ok(rgh >= 0.14 && rgh <= 1.0, `${name}: Roughness out of range ${rgh}`);
      if (met > maxMet) maxMet = met;
      sumRgh += rgh;
    }

    const meanSat = sumSat / count;
    const meanRgh = sumRgh / count;
    const meanAbsNx = sumVarX / count;
    meanRoughs[name] = meanRgh;
    meanLums[name] = sumLum / count;

    assert.ok(meanSat < 0.45, `${name}: mean saturation ${meanSat.toFixed(3)} exceeds 0.45 art-direction cap`);
    assert.ok(meanAbsNx > 0.04, `${name}: normal relief too flat (${meanAbsNx.toFixed(4)})`);
    assert.ok(sumNrmZ / count > 0.65, `${name}: normals overly noisy`);
    assert.ok(maxMet <= 0.20, `${name}: stone metallic too high (${maxMet.toFixed(3)})`);
  }

  // Material differentiation checks: wet basalt & river cobble must be noticeably glossier than dry sandstone!
  assert.ok(meanRoughs.synthWetBasalt < meanRoughs.synthSandstone - 0.22,
    `expected wetBasalt (${meanRoughs.synthWetBasalt.toFixed(2)}) much glossier than sandstone (${meanRoughs.synthSandstone.toFixed(2)})`);
  assert.ok(meanRoughs.synthRiverCobble < meanRoughs.synthSandstone - 0.22,
    `expected riverCobble (${meanRoughs.synthRiverCobble.toFixed(2)}) much glossier than sandstone (${meanRoughs.synthSandstone.toFixed(2)})`);
  assert.ok(meanLums.synthBasalt < meanLums.synthLimestone - 0.15,
    `expected basalt (${meanLums.synthBasalt.toFixed(2)}) darker than limestone (${meanLums.synthLimestone.toFixed(2)})`);
});

test('Determinism: synthGranite produces byte-identical output across repeated calls', () => {
  const a = _TEST_SYNTH.synthGranite(64);
  const b = _TEST_SYNTH.synthGranite(64);
  assert.deepEqual([...a.col], [...b.col]);
  assert.deepEqual([...a.nrm], [...b.nrm]);
  assert.deepEqual([...a.orm], [...b.orm]);
});

test('getRockTextureLibrary caches lazily per THREE and falls back gracefully without DataTexture', () => {
  class FakeDataTexture {
    constructor(data, w, h) {
      this.image = { data, width: w, height: h };
      this.repeat = { set() {} };
    }
  }
  const fakeT = {
    DataTexture: FakeDataTexture,
    RGBAFormat: 1023,
    RepeatWrapping: 1000,
    SRGBColorSpace: 'srgb',
    NoColorSpace: '',
    LinearMipmapLinearFilter: 1008,
    LinearFilter: 1006,
    Vector2: class { constructor(x, y) { this.x = x; this.y = y; } set(x, y) { this.x = x; this.y = y; } },
    MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); this.normalScale = new fakeT.Vector2(1, 1); this.color = { setHex() {} }; } },
  };
  const libA = getRockTextureLibrary(fakeT);
  const libB = getRockTextureLibrary(fakeT);
  assert.strictEqual(libA, libB);
  assert.equal(libA.textures.length, 0, 'textures should build lazily');
  const gr = libA.granite;
  assert.ok(gr.map && gr.normalMap && gr.ormMap && gr.colRgh && gr.nrmAoH);
  assert.equal(libA.textures.length, 5);
  assert.equal(ROCK_GEOLOGIES.length, 11);

  const mat = createRockMaterial(fakeT, null, 'basalt', { nodeAllowed: false });
  assert.equal(mat.userData.rockGeology, 'basalt');
  assert.equal(mat.userData.rockPbr, true);
  assert.ok(mat.map && mat.normalMap && mat.roughnessMap && mat.aoMap);

  // Graceful fallback when DataTexture is absent (Node stub THREE)
  const stubT = { MeshStandardMaterial: class { constructor(o) { Object.assign(this, o); } } };
  const stubMat = createRockMaterial(stubT, null, 'granite', { nodeAllowed: false });
  assert.equal(stubMat.userData.rockGeology, 'granite');
  assert.equal(stubMat.userData.rockPbr, false);

  // applyRockPBR null-safety
  assert.strictEqual(applyRockPBR(stubMat, null), stubMat);
});
