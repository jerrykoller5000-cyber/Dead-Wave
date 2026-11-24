import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tileNoise,
  tileFbm,
  flipRowsRGBA,
  heightToNormalRGBA,
  getBuildPBR,
  applyBuildPBR,
  makeDrumPlacardTexture,
  projectBuildUVs,
  _TEST_SYNTH,
} from './build-textures.js';

function makeFakeAttr(arr, itemSize) {
  return {
    array: arr,
    itemSize,
    count: arr.length / itemSize,
    needsUpdate: false,
    getX(i) { return this.array[i * this.itemSize]; },
    getY(i) { return this.array[i * this.itemSize + 1]; },
    getZ(i) { return this.array[i * this.itemSize + 2]; },
  };
}

function makeBoxMesh(w, h, d, mat, pos = { x: 0, y: 0, z: 0 }) {
  // 2 faces: +Z face (4 verts) and +X face (4 verts) and +Y face (4 verts)
  const hw = w / 2, hh = h / 2, hd = d / 2;
  const posArr = new Float32Array([
    // +Z front face
    -hw, -hh,  hd,   hw, -hh,  hd,   hw,  hh,  hd,  -hw,  hh,  hd,
    // +X right face
     hw, -hh, -hd,   hw, -hh,  hd,   hw,  hh,  hd,   hw,  hh, -hd,
    // +Y top face
    -hw,  hh, -hd,   hw,  hh, -hd,   hw,  hh,  hd,  -hw,  hh,  hd,
  ]);
  const nrmArr = new Float32Array([
    0, 0, 1,  0, 0, 1,  0, 0, 1,  0, 0, 1,
    1, 0, 0,  1, 0, 0,  1, 0, 0,  1, 0, 0,
    0, 1, 0,  0, 1, 0,  0, 1, 0,  0, 1, 0,
  ]);
  const uvArr = new Float32Array(24);
  const geo = {
    type: 'BoxGeometry',
    userData: {},
    attributes: {
      position: makeFakeAttr(posArr, 3),
      normal: makeFakeAttr(nrmArr, 3),
      uv: makeFakeAttr(uvArr, 2),
    },
    clone() {
      return {
        type: this.type,
        userData: {},
        attributes: {
          position: makeFakeAttr(new Float32Array(this.attributes.position.array), 3),
          normal: makeFakeAttr(new Float32Array(this.attributes.normal.array), 3),
          uv: makeFakeAttr(new Float32Array(this.attributes.uv.array), 2),
        },
        clone: this.clone,
      };
    },
  };
  return {
    isMesh: true,
    geometry: geo,
    material: mat,
    position: pos,
    scale: { x: 1, y: 1, z: 1 },
    userData: {},
    traverse(fn) { fn(this); },
  };
}

test('tileNoise and tileFbm wrap seamlessly across [0, 1] period boundaries', () => {
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    assert.ok(Math.abs(tileNoise(0, t, 8, 8, 13) - tileNoise(1, t, 8, 8, 13)) < 1e-12);
    assert.ok(Math.abs(tileNoise(t, 0, 8, 8, 13) - tileNoise(t, 1, 8, 8, 13)) < 1e-12);
    assert.ok(Math.abs(tileFbm(0, t, 4, 4, 29, 3) - tileFbm(1, t, 4, 4, 29, 3)) < 1e-12);
    assert.ok(Math.abs(tileFbm(t, 0, 4, 4, 29, 3) - tileFbm(t, 1, 4, 4, 29, 3)) < 1e-12);
  }
});

test('heightToNormalRGBA produces valid unit OpenGL normals and flipRowsRGBA is involutive', () => {
  const w = 16, h = 16;
  const hf = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      hf[y * w + x] = Math.sin((x / w) * Math.PI * 2) * 0.5 + Math.cos((y / h) * Math.PI * 2) * 0.5;
    }
  }
  const nrm = heightToNormalRGBA(hf, w, h, 2.0);
  assert.equal(nrm.length, w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const nx = (nrm[i * 4] / 255) * 2 - 1;
    const ny = (nrm[i * 4 + 1] / 255) * 2 - 1;
    const nz = (nrm[i * 4 + 2] / 255) * 2 - 1;
    const len = Math.hypot(nx, ny, nz);
    assert.ok(len > 0.96 && len < 1.04, `unit length expected, got ${len}`);
    assert.ok(nz > 0.1, `positive +Z normal expected, got ${nz}`);
    assert.equal(nrm[i * 4 + 3], 255);
  }
  const flipped = flipRowsRGBA(nrm, w, h);
  const twice = flipRowsRGBA(flipped, w, h);
  assert.deepEqual(twice, nrm);
});

test('all 12 buildable PBR pixel synthesizers produce rich, calibrated, deterministic maps', () => {
  const specs = [
    ['buildStonePixels', 64, { neutralMin: 205, rghMin: 0.72, metMax: 0.06 }],
    ['buildWoodPixels', 64, { neutralMin: 205, rghMin: 0.65, metMax: 0.05 }],
    ['buildBurlapPixels', 64, { neutralMin: 195, rghMin: 0.84, metMax: 0.05 }],
    ['buildSteelPixels', 64, { neutralMin: 205, rghMin: 0.25, metMin: 0.34, metMax: 0.62 }],
    ['buildPaintPixels', 64, { neutralMin: 215, rghMin: 0.40, metMax: 0.40 }],
    ['buildRustPixels', 64, { rghMin: 0.50, metMax: 0.60 }],
    ['buildGunmetalPixels', 64, { rghMin: 0.24, metMin: 0.45, metMax: 0.75 }],
    ['buildWornSteelPixels', 64, { rghMin: 0.20, metMin: 0.65, metMax: 0.90 }],
    ['buildBrassPixels', 64, { rghMin: 0.22, metMin: 0.60, metMax: 0.90 }],
    ['buildRubberHosePixels', 64, { rghMin: 0.74, metMax: 0.05 }],
    ['buildHazardYellowPixels', 64, { rghMin: 0.40, metMax: 0.46 }],
    ['buildOpticalLensPixels', 64, {}],
  ];
  for (const [fnName, sz, rule] of specs) {
    const a = _TEST_SYNTH[fnName](sz);
    const b = _TEST_SYNTH[fnName](sz);
    assert.equal(a.w, sz);
    assert.equal(a.h, sz);
    assert.deepEqual(a.col, b.col, `${fnName} must be deterministic`);
    assert.deepEqual(a.nrm, b.nrm, `${fnName} normals must be deterministic`);
    assert.deepEqual(a.orm, b.orm, `${fnName} ORM must be deterministic`);

    let lumSum = 0, rghSum = 0, metSum = 0, nrmVar = 0;
    let minLum = 255, maxLum = 0;
    const n = sz * sz;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      const lum = (a.col[o] + a.col[o + 1] + a.col[o + 2]) / 3;
      lumSum += lum;
      if (lum < minLum) minLum = lum;
      if (lum > maxLum) maxLum = lum;
      rghSum += a.orm[o + 1] / 255;
      metSum += a.orm[o + 2] / 255;
      nrmVar += Math.abs(a.nrm[o] - 128) + Math.abs(a.nrm[o + 1] - 128);
    }
    const meanLum = lumSum / n;
    const meanRgh = rghSum / n;
    const meanMet = metSum / n;
    assert.ok(nrmVar / n > 1.5, `${fnName} normal map must have non-flat surface relief`);
    if (fnName !== 'buildOpticalLensPixels') {
      assert.ok(maxLum - minLum > 16, `${fnName} albedo must have meaningful tonal variation (got ${maxLum - minLum})`);
    }
    if (rule.neutralMin != null) {
      assert.ok(meanLum >= rule.neutralMin, `${fnName} neutral VC albedo too dark: mean=${meanLum.toFixed(1)}`);
    }
    if (rule.rghMin != null) assert.ok(meanRgh >= rule.rghMin, `${fnName} roughness too glossy: ${meanRgh}`);
    if (rule.metMin != null) assert.ok(meanMet >= rule.metMin, `${fnName} metalness too low: ${meanMet}`);
    if (rule.metMax != null) assert.ok(meanMet <= rule.metMax, `${fnName} metalness too high: ${meanMet}`);
  }
});

test('getBuildPBR is Node/fakethree safe and lazily synthesizes per-material bundles', () => {
  assert.equal(getBuildPBR(null), null);
  assert.equal(getBuildPBR({ STAND_IN: true, DataTexture() {} }), null);
  assert.equal(makeDrumPlacardTexture({ STAND_IN: true, DataTexture() {} }, 'fuel'), null);

  class FakeDataTexture {
    constructor(data, w, h, fmt, type) {
      this.image = { data, width: w, height: h };
      this.format = fmt;
      this.type = type;
    }
  }
  class FakeVec2 {
    constructor(x, y) { this.x = x; this.y = y; }
    set(x, y) { this.x = x; this.y = y; }
  }
  const FakeT = {
    DataTexture: FakeDataTexture,
    Vector2: FakeVec2,
    RGBAFormat: 1023,
    UnsignedByteType: 1009,
    SRGBColorSpace: 'srgb',
    RepeatWrapping: 1000,
    ClampToEdgeWrapping: 1001,
    LinearFilter: 1006,
    LinearMipmapLinearFilter: 1008,
  };
  const lib = getBuildPBR(FakeT);
  assert.ok(lib);
  assert.equal(getBuildPBR(FakeT), lib, 'cached per THREE instance');
  assert.equal(lib.textures.length, 0, 'lazy: zero textures built before first getter read');

  const stone = lib.stone;
  assert.equal(lib.textures.length, 3, 'stone builds exactly col + nrm + orm');
  assert.equal(stone.map.image.width, 512);
  assert.equal(stone.map.colorSpace, 'srgb');
  assert.equal(stone.ormMap.anisotropy, 4);

  const lens = lib.opticalLens;
  assert.equal(lens.map, null);
  assert.ok(lens.normalMap);
  assert.equal(lib.textures.length, 4, 'opticalLens adds 1 normal-only texture');

  const mat = {
    color: { hex: 0x666666, setHex(h) { this.hex = h; }, multiplyScalar(s) { this.boost = s; } },
    normalScale: new FakeVec2(1, 1),
    roughness: 0.5,
    metalness: 0.2,
    needsUpdate: false,
  };
  applyBuildPBR(mat, stone, { colorBoost: 1.05 });
  assert.equal(mat.map, stone.map);
  assert.equal(mat.normalMap, stone.normalMap);
  assert.equal(mat.roughnessMap, stone.ormMap);
  assert.equal(mat.metalnessMap, stone.ormMap);
  assert.equal(mat.aoMap, stone.ormMap);
  assert.equal(mat.roughness, 1.0);
  assert.equal(mat.metalness, 1.0);
  assert.equal(mat.color.boost, 1.05);
  assert.equal(mat.needsUpdate, true);
});

test('projectBuildUVs aligns wood grain along longest axis, wraps cylinders seamlessly, and offsets blocks uniquely', () => {
  const woodMat = { name: 'wood' };
  const stoneMat = { name: 'stone' };
  const paintMat = { name: 'paint' };
  const specByMat = new Map([
    [woodMat, { tile: 0.8, alignLongAxis: true }],
    [stoneMat, { tile: 0.85 }],
    [paintMat, { tile: 0.65 }],
  ]);

  // Horizontal plank (1.6m wide along X, 0.2m tall) -> front face U span should be 1.6 / 0.8 = 2.0
  const horizPlank = makeBoxMesh(1.6, 0.2, 0.08, woodMat, { x: 0, y: 0.5, z: 0 });
  // Vertical post (0.2m wide, 2.4m tall along Y) -> front face U span should be 2.4 / 0.8 = 3.0
  const vertPost = makeBoxMesh(0.2, 2.4, 0.2, woodMat, { x: -0.84, y: 1.2, z: 0 });
  // Two adjacent identical stone blocks at different positions -> must get distinct UV offsets
  const stoneA = makeBoxMesh(0.4, 0.25, 0.3, stoneMat, { x: -0.4, y: 0.2, z: 0 });
  const stoneB = makeBoxMesh(0.4, 0.25, 0.3, stoneMat, { x: 0.4, y: 0.2, z: 0 });
  // Cylinder drum (r = 0.352, h = 0.884) -> circumference ~2.21m / 0.65m = 3.4 -> rounds to integer 3!
  const cylUv = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
  const drum = {
    isMesh: true,
    material: paintMat,
    position: { x: 0, y: 0.47, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    userData: {},
    geometry: {
      type: 'CylinderGeometry',
      parameters: { radiusTop: 0.352, radiusBottom: 0.352, height: 0.884 },
      userData: {},
      attributes: {
        position: makeFakeAttr(new Float32Array(12), 3),
        uv: makeFakeAttr(cylUv, 2),
      },
    },
  };
  // Placard mesh marked skipBuildUV must stay untouched
  const placard = makeBoxMesh(0.1, 0.1, 0.01, paintMat, { x: 0, y: 0.48, z: 0.37 });
  placard.userData.skipBuildUV = true;
  placard.geometry.attributes.uv.array.set([0, 0, 1, 0, 1, 1, 0, 1]);

  const group = {
    children: [horizPlank, vertPost, stoneA, stoneB, drum, placard],
    traverse(fn) { fn(this); for (const c of this.children) fn(c); },
  };
  const projected = projectBuildUVs(group, specByMat);
  assert.equal(projected, 5, '5 meshes projected, placard skipped');

  // Check horizontal plank front face (+Z verts 0..3): U spans X (1.6 / 0.8 = 2.0), V spans Y (0.2 / 0.8 = 0.25)
  const hpUv = horizPlank.geometry.attributes.uv;
  const hpSpanU = Math.abs(hpUv.getX(1) - hpUv.getX(0));
  const hpSpanV = Math.abs(hpUv.getY(2) - hpUv.getY(1));
  assert.ok(Math.abs(hpSpanU - 2.0) < 1e-5, `expected horizontal plank U span 2.0, got ${hpSpanU}`);
  assert.ok(Math.abs(hpSpanV - 0.25) < 1e-5, `expected horizontal plank V span 0.25, got ${hpSpanV}`);

  // Check vertical post front face (+Z verts 0..3): U spans Y (2.4 / 0.8 = 3.0), V spans X (0.2 / 0.8 = 0.25)
  const vpUv = vertPost.geometry.attributes.uv;
  const vpSpanU = Math.abs(vpUv.getX(2) - vpUv.getX(1));
  const vpSpanV = Math.abs(vpUv.getY(1) - vpUv.getY(0));
  assert.ok(Math.abs(vpSpanU - 3.0) < 1e-5, `expected vertical post U span 3.0, got ${vpSpanU}`);
  assert.ok(Math.abs(vpSpanV - 0.25) < 1e-5, `expected vertical post V span 0.25, got ${vpSpanV}`);

  // Check adjacent stone blocks got distinct deterministic offsets
  assert.notEqual(stoneA.geometry.attributes.uv.getX(0), stoneB.geometry.attributes.uv.getX(0));

  // Check cylinder U span is an exact positive integer (within Float32 precision) for seamless 360 deg wrap
  const cylSpanU = drum.geometry.attributes.uv.getX(1) - drum.geometry.attributes.uv.getX(0);
  assert.ok(Math.abs(cylSpanU - 3) < 1e-5, `0.352m radius drum circumference (~2.21m) / 0.65m tile = 3 integer wraps, got ${cylSpanU}`);

  // Check placard UVs untouched
  assert.equal(placard.geometry.attributes.uv.getX(1), 1);
  assert.equal(placard.geometry.attributes.uv.getY(2), 1);
});
